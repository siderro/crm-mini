<?php
session_start();
if (!isset($_SESSION['user'])) {
    header('Location: login.php');
    exit();
}

require_once 'config.php';

// Handle form submissions
$message = '';
$message_type = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'add':
                $nazev = $_POST['nazev'] ?? '';
                $email = $_POST['email'] ?? '';
                $ico = $_POST['ico'] ?? '';
                $web = $_POST['web'] ?? '';
                $poznamka = $_POST['poznamka'] ?? '';
                
                $stmt = $mysqli->prepare("INSERT INTO companies (nazev, email, ico, web, poznamka) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("sssss", $nazev, $email, $ico, $web, $poznamka);
                
                if ($stmt->execute()) {
                    $message = 'Company has been successfully added.';
                    $message_type = 'success';
                } else {
                    $message = 'Error adding company.';
                    $message_type = 'error';
                }
                $stmt->close();
                break;
                
            case 'edit':
                $id = intval($_POST['id']);
                $nazev = $_POST['nazev'] ?? '';
                $email = $_POST['email'] ?? '';
                $ico = $_POST['ico'] ?? '';
                $web = $_POST['web'] ?? '';
                $poznamka = $_POST['poznamka'] ?? '';
                
                $stmt = $mysqli->prepare("UPDATE companies SET nazev = ?, email = ?, ico = ?, web = ?, poznamka = ? WHERE id = ?");
                $stmt->bind_param("sssssi", $nazev, $email, $ico, $web, $poznamka, $id);
                
                if ($stmt->execute()) {
                    $message = 'Company has been successfully updated.';
                    $message_type = 'success';
                } else {
                    $message = 'Error updating company.';
                    $message_type = 'error';
                }
                $stmt->close();
                break;
        }
    }
}

// Handle delete
if (isset($_GET['delete']) && is_numeric($_GET['delete'])) {
    $id = intval($_GET['delete']);
    $stmt = $mysqli->prepare("DELETE FROM companies WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        $message = 'Company has been successfully deleted.';
        $message_type = 'success';
    } else {
        $message = 'Error deleting company.';
        $message_type = 'error';
    }
    $stmt->close();
}

// Fetch companies data
$companies_query = "
    SELECT 
        c.id,
        c.nazev,
        c.email,
        c.ico,
        c.web,
        c.poznamka,
        COUNT(co.id) as contact_count
    FROM companies c
    LEFT JOIN contacts co ON c.id = co.firma_id
    GROUP BY c.id, c.nazev, c.email, c.ico, c.web, c.poznamka
    ORDER BY c.nazev
";

$companies_result = $mysqli->query($companies_query);
$companies = [];
if ($companies_result) {
    while ($row = $companies_result->fetch_assoc()) {
        $companies[] = $row;
    }
}

// Get company for editing
$edit_company = null;
if (isset($_GET['edit']) && is_numeric($_GET['edit'])) {
    $edit_id = intval($_GET['edit']);
    $stmt = $mysqli->prepare("SELECT * FROM companies WHERE id = ?");
    $stmt->bind_param("i", $edit_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $edit_company = $result->fetch_assoc();
    $stmt->close();
}

$page_title = 'Companies'; 
include 'head.php'; 
?>
<?php include 'header.php'; ?>

<div class="container">
    <div class="main-layout">
        <!-- Left Column - Companies Table (2/3 width) -->
        <div class="left-column">
            <div class="section-header">
                <h1>Companies</h1>
                <div class="header-actions">
                    <button onclick="toggleForm()" class="add-button">
                        Add New Company
                    </button>
                    <a href="index.php" class="nav-link">Back to Business Cases</a>
                    <a href="contacts.php" class="nav-link">Manage Contacts</a>
                </div>
            </div>
            
            <?php if ($message): ?>
                <div class="message <?= $message_type ?>">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>
            
            <!-- Add/Edit Form -->
            <div id="companyForm" class="add-form <?= $edit_company ? 'form-display-block' : 'form-display-none' ?>">
                <h3><?= $edit_company ? 'Edit Company' : 'Add New Company' ?></h3>
                <form method="POST">
                    <input type="hidden" name="action" value="<?= $edit_company ? 'edit' : 'add' ?>">
                    <?php if ($edit_company): ?>
                        <input type="hidden" name="id" value="<?= $edit_company['id'] ?>">
                    <?php endif; ?>
                    
                    <div class="form-row">
                        <label>Company Name:</label>
                        <input type="text" name="nazev" value="<?= htmlspecialchars($edit_company['nazev'] ?? '') ?>" required>
                    </div>
                    
                    <div class="form-row">
                        <label>Email:</label>
                        <input type="email" name="email" value="<?= htmlspecialchars($edit_company['email'] ?? '') ?>">
                    </div>
                    
                    <div class="form-row">
                        <label>ICO:</label>
                        <input type="text" name="ico" value="<?= htmlspecialchars($edit_company['ico'] ?? '') ?>" maxlength="20">
                    </div>
                    
                    <div class="form-row">
                        <label>Website:</label>
                        <input type="url" name="web" value="<?= htmlspecialchars($edit_company['web'] ?? '') ?>">
                    </div>
                    
                    <div class="form-row">
                        <label>Notes:</label>
                        <textarea name="poznamka" rows="3"><?= htmlspecialchars($edit_company['poznamka'] ?? '') ?></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="save-button">
                            <?= $edit_company ? 'Update Company' : 'Add Company' ?>
                        </button>
                        <button type="button" onclick="toggleForm()" class="cancel-button">Cancel</button>
                    </div>
                </form>
            </div>
            
            <div class="table-container">
                <table class="business-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Company Name</th>
                            <th>Email</th>
                            <th>ICO</th>
                            <th>Website</th>
                            <th>Contacts</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($companies)): ?>
                            <tr>
                                <td colspan="8" class="empty-state">
                                    No companies found
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($companies as $company): ?>
                                <tr>
                                    <td><?= htmlspecialchars($company['id']) ?></td>
                                    <td><?= htmlspecialchars($company['nazev']) ?></td>
                                    <td><?= htmlspecialchars($company['email'] ?? '') ?></td>
                                    <td><?= htmlspecialchars($company['ico'] ?? '') ?></td>
                                    <td>
                                        <?php if (!empty($company['web'])): ?>
                                            <a href="<?= htmlspecialchars($company['web']) ?>" target="_blank" rel="noopener noreferrer">
                                                <?= htmlspecialchars($company['web']) ?>
                                            </a>
                                        <?php else: ?>
                                            -
                                        <?php endif; ?>
                                    </td>
                                    <td><?= $company['contact_count'] ?></td>
                                    <td><?= htmlspecialchars($company['poznamka'] ?? '') ?></td>
                                    <td>
                                        <a href="?edit=<?= $company['id'] ?>" class="action-link">Edit</a>
                                        <a href="?delete=<?= $company['id'] ?>" class="action-link" onclick="return confirm('Are you sure you want to delete this company?')">Delete</a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Right Column (1/3 width) -->
        <div class="right-column">
            <div class="right-section">
                <h3>Quick Stats</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number"><?= count($companies) ?></div>
                        <div class="stat-label">Total Companies</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= array_sum(array_column($companies, 'contact_count')) ?></div>
                        <div class="stat-label">Total Contacts</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= count(array_filter($companies, function($company) { return $company['contact_count'] > 0; })) ?></div>
                        <div class="stat-label">With Contacts</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= count(array_filter($companies, function($company) { return !empty($company['poznamka']); })) ?></div>
                        <div class="stat-label">With Notes</div>
                    </div>
                </div>
            </div>
            
            <div class="right-section">
                <h3>Recent Companies</h3>
                <div class="activity-list">
                    <?php if (empty($companies)): ?>
                        <div class="activity-item">No companies found</div>
                    <?php else: ?>
                        <?php foreach (array_slice($companies, 0, 5) as $company): ?>
                            <div class="activity-item">
                                <div class="activity-title"><?= htmlspecialchars($company['nazev']) ?></div>
                                <div class="activity-meta">
                                    <?= $company['contact_count'] ?> contact<?= $company['contact_count'] != 1 ? 's' : '' ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
            
            <div class="right-section">
                <h3>Quick Actions</h3>
                <div class="quick-actions">
                    <button onclick="toggleForm()" class="quick-action-btn">
                        Add New Company
                    </button>
                    <a href="contacts.php" class="quick-action-btn">
                        Manage Contacts
                    </a>
                    <a href="index.php" class="quick-action-btn">
                        Back to Business Cases
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
function toggleForm() {
    const form = document.getElementById('companyForm');
    if (form.classList.contains('form-display-none')) {
        form.classList.remove('form-display-none');
        form.classList.add('form-display-block');
    } else {
        form.classList.remove('form-display-block');
        form.classList.add('form-display-none');
    }
}
</script>

</body>
</html>
