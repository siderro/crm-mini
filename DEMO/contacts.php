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
                $jmeno = $_POST['jmeno'] ?? '';
                $prijmeni = $_POST['prijmeni'] ?? '';
                $email = $_POST['email'] ?? '';
                $phone = $_POST['phone'] ?? '';
                $poznamka = $_POST['poznamka'] ?? '';
                
                $stmt = $mysqli->prepare("INSERT INTO contacts (jmeno, prijmeni, email, phone, poznamka) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("sssss", $jmeno, $prijmeni, $email, $phone, $poznamka);
                
                if ($stmt->execute()) {
                    $message = 'Contact has been successfully added.';
                    $message_type = 'success';
                } else {
                    $message = 'Error adding contact.';
                    $message_type = 'error';
                }
                $stmt->close();
                break;
                
            case 'edit':
                $id = intval($_POST['id']);
                $jmeno = $_POST['jmeno'] ?? '';
                $prijmeni = $_POST['prijmeni'] ?? '';
                $email = $_POST['email'] ?? '';
                $phone = $_POST['phone'] ?? '';
                $poznamka = $_POST['poznamka'] ?? '';
                
                $stmt = $mysqli->prepare("UPDATE contacts SET jmeno = ?, prijmeni = ?, email = ?, phone = ?, poznamka = ? WHERE id = ?");
                $stmt->bind_param("sssssi", $jmeno, $prijmeni, $email, $phone, $poznamka, $id);
                
                if ($stmt->execute()) {
                    $message = 'Contact has been successfully updated.';
                    $message_type = 'success';
                } else {
                    $message = 'Error updating contact.';
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
    $stmt = $mysqli->prepare("DELETE FROM contacts WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        $message = 'Contact has been successfully deleted.';
        $message_type = 'success';
    } else {
        $message = 'Error deleting contact.';
        $message_type = 'error';
    }
    $stmt->close();
}

// No longer need to fetch companies for contacts

// Fetch contacts data
$contacts_query = "
    SELECT 
        c.id,
        c.jmeno,
        c.prijmeni,
        c.email,
        c.phone,
        c.poznamka
    FROM contacts c
    ORDER BY c.jmeno, c.prijmeni
";

$contacts_result = $mysqli->query($contacts_query);
$contacts = [];
if ($contacts_result) {
    while ($row = $contacts_result->fetch_assoc()) {
        $contacts[] = $row;
    }
}

// Get contact for editing
$edit_contact = null;
if (isset($_GET['edit']) && is_numeric($_GET['edit'])) {
    $edit_id = intval($_GET['edit']);
    $stmt = $mysqli->prepare("SELECT * FROM contacts WHERE id = ?");
    $stmt->bind_param("i", $edit_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $edit_contact = $result->fetch_assoc();
    $stmt->close();
}

$page_title = 'Contacts'; 
include 'head.php'; 
?>
<?php include 'header.php'; ?>

<div class="container">
    <div class="main-layout">
        <!-- Left Column - Contacts Table (2/3 width) -->
        <div class="left-column">
            <div class="section-header">
                <h1>Contacts</h1>
                <div class="header-actions">
                    <button onclick="toggleForm()" class="add-button">
                        Add New Contact
                    </button>
                    <a href="index.php" class="nav-link">Back to Business Cases</a>
                    <a href="companies.php" class="nav-link">Manage Companies</a>
                </div>
            </div>
            
            <?php if ($message): ?>
                <div class="message <?= $message_type ?>">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>
            
            <!-- Add/Edit Form -->
            <div id="contactForm" class="add-form <?= $edit_contact ? 'form-display-block' : 'form-display-none' ?>">
                <h3><?= $edit_contact ? 'Edit Contact' : 'Add New Contact' ?></h3>
                <form method="POST">
                    <input type="hidden" name="action" value="<?= $edit_contact ? 'edit' : 'add' ?>">
                    <?php if ($edit_contact): ?>
                        <input type="hidden" name="id" value="<?= $edit_contact['id'] ?>">
                    <?php endif; ?>
                    
                    <div class="form-row">
                        <label>First Name:</label>
                        <input type="text" name="jmeno" value="<?= htmlspecialchars($edit_contact['jmeno'] ?? '') ?>" required>
                    </div>
                    
                    <div class="form-row">
                        <label>Last Name:</label>
                        <input type="text" name="prijmeni" value="<?= htmlspecialchars($edit_contact['prijmeni'] ?? '') ?>" required>
                    </div>
                    
                    <div class="form-row">
                        <label>Email:</label>
                        <input type="email" name="email" value="<?= htmlspecialchars($edit_contact['email'] ?? '') ?>">
                    </div>
                    
                    <div class="form-row">
                        <label>Phone:</label>
                        <input type="tel" name="phone" value="<?= htmlspecialchars($edit_contact['phone'] ?? '') ?>">
                    </div>
                    
                    
                    <div class="form-row">
                        <label>Notes:</label>
                        <textarea name="poznamka" rows="3"><?= htmlspecialchars($edit_contact['poznamka'] ?? '') ?></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="save-button">
                            <?= $edit_contact ? 'Update Contact' : 'Add Contact' ?>
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
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($contacts)): ?>
                            <tr>
                                <td colspan="7" class="empty-state">
                                    No contacts found
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($contacts as $contact): ?>
                                <tr>
                                    <td><?= htmlspecialchars($contact['id']) ?></td>
                                    <td><?= htmlspecialchars($contact['jmeno']) ?></td>
                                    <td><?= htmlspecialchars($contact['prijmeni']) ?></td>
                                    <td><?= htmlspecialchars($contact['email'] ?? '') ?></td>
                                    <td><?= htmlspecialchars($contact['phone'] ?? '') ?></td>
                                    <td><?= htmlspecialchars($contact['poznamka'] ?? '') ?></td>
                                    <td>
                                        <a href="?edit=<?= $contact['id'] ?>" class="action-link">Edit</a>
                                        <a href="?delete=<?= $contact['id'] ?>" class="action-link" onclick="return confirm('Are you sure you want to delete this contact?')">Delete</a>
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
                        <div class="stat-number"><?= count($contacts) ?></div>
                        <div class="stat-label">Total Contacts</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= count(array_filter($contacts, function($contact) { return !empty($contact['email']); })) ?></div>
                        <div class="stat-label">With Email</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= count(array_filter($contacts, function($contact) { return !empty($contact['phone']); })) ?></div>
                        <div class="stat-label">With Phone</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= count(array_filter($contacts, function($contact) { return !empty($contact['poznamka']); })) ?></div>
                        <div class="stat-label">With Notes</div>
                    </div>
                </div>
            </div>
            
            <div class="right-section">
                <h3>Recent Contacts</h3>
                <div class="activity-list">
                    <?php if (empty($contacts)): ?>
                        <div class="activity-item">No contacts found</div>
                    <?php else: ?>
                        <?php foreach (array_slice($contacts, 0, 5) as $contact): ?>
                            <div class="activity-item">
                                <div class="activity-title"><?= htmlspecialchars($contact['jmeno'] . ' ' . $contact['prijmeni']) ?></div>
                                <div class="activity-meta">
                                    <?= htmlspecialchars($contact['email'] ?? 'No email') ?>
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
                        Add New Contact
                    </button>
                    <a href="companies.php" class="quick-action-btn">
                        Manage Companies
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
    const form = document.getElementById('contactForm');
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
