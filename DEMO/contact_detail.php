<?php
session_start();
if (!isset($_SESSION['user'])) {
    header('Location: login.php');
    exit();
}

require_once 'config.php';

// Function to format time difference in human-friendly way
function formatTimeDifference($date1, $date2) {
    $timestamp1 = strtotime($date1);
    $timestamp2 = strtotime($date2);
    
    if ($timestamp1 === false || $timestamp2 === false) {
        return '';
    }
    
    $diff_seconds = abs($timestamp2 - $timestamp1);
    
    if ($diff_seconds < 3600) {
        // Less than 1 hour - show minutes
        $minutes = floor($diff_seconds / 60);
        return $minutes . ' minute' . ($minutes != 1 ? 's' : '');
    } elseif ($diff_seconds < 86400) {
        // Less than 24 hours - show hours
        $hours = floor($diff_seconds / 3600);
        return $hours . ' hour' . ($hours != 1 ? 's' : '');
    } else {
        // 1 day or more - show days
        $days = floor($diff_seconds / 86400);
        return $days . ' day' . ($days != 1 ? 's' : '');
    }
}

// Get contact ID from URL
$contact_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if (!$contact_id) {
    header('Location: index.php');
    exit();
}

// Handle edit contact form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'edit_contact') {
    $jmeno = trim($_POST['jmeno'] ?? '');
    $prijmeni = trim($_POST['prijmeni'] ?? '');
    $poznamka = trim($_POST['poznamka'] ?? '');
    $firma_id = !empty($_POST['firma_id']) ? intval($_POST['firma_id']) : null;
    
    if (!empty($jmeno) && !empty($prijmeni)) {
        $update_query = "UPDATE contacts SET jmeno = ?, prijmeni = ?, poznamka = ?, firma_id = ? WHERE id = ?";
        $stmt = $mysqli->prepare($update_query);
        $stmt->bind_param("sssii", $jmeno, $prijmeni, $poznamka, $firma_id, $contact_id);
        
        if ($stmt->execute()) {
            header("Location: contact_detail.php?id=$contact_id&updated=1");
            exit();
        } else {
            $error_message = "Error updating contact: " . $mysqli->error;
        }
        $stmt->close();
    } else {
        $error_message = "First name and last name are required.";
    }
}

// Fetch contact information
$contact_query = "
    SELECT 
        c.id,
        c.jmeno,
        c.prijmeni,
        c.poznamka,
        c.firma_id,
        co.nazev as firma_nazev,
        co.poznamka as firma_poznamka
    FROM contacts c
    LEFT JOIN companies co ON c.firma_id = co.id
    WHERE c.id = ?
";

$stmt = $mysqli->prepare($contact_query);
$stmt->bind_param("i", $contact_id);
$stmt->execute();
$result = $stmt->get_result();
$contact = $result->fetch_assoc();
$stmt->close();

if (!$contact) {
    header('Location: index.php');
    exit();
}

// Fetch related deals
$deals_query = "
    SELECT 
        d.id,
        d.popis,
        d.hodnota,
        d.created_at,
        d.posledni_uprava,
        ds.name as stav,
        ds.id as stav_id
    FROM deals d
    INNER JOIN deal_contacts dc ON d.id = dc.deal_id
    LEFT JOIN deal_statuses ds ON d.stav_id = ds.id
    WHERE dc.contact_id = ?
    ORDER BY d.posledni_uprava DESC
";

$stmt = $mysqli->prepare($deals_query);
$stmt->bind_param("i", $contact_id);
$stmt->execute();
$result = $stmt->get_result();
$deals = [];
while ($row = $result->fetch_assoc()) {
    $deals[] = $row;
}
$stmt->close();

// Fetch companies for edit form
$companies_query = "SELECT id, nazev FROM companies ORDER BY nazev";
$companies_result = $mysqli->query($companies_query);
$companies = [];
while ($row = $companies_result->fetch_assoc()) {
    $companies[] = $row;
}

$page_title = 'Contact Detail'; 
include 'head.php'; 
?>
<?php include 'header.php'; ?>

<div class="container">
    <div class="main-layout">
        <!-- Left Column - Contact Information -->
        <div class="left-column">
            <div class="section-header">
                <h1>Contact Detail</h1>
                <div class="header-actions">
                    <a href="index.php" class="nav-link">Back to Business Cases</a>
                </div>
            </div>
            
            <?php if (isset($_GET['updated'])): ?>
                <div class="success-message">Contact updated successfully!</div>
            <?php endif; ?>

            <?php if (isset($error_message)): ?>
                <div class="error-message"><?= htmlspecialchars($error_message) ?></div>
            <?php endif; ?>

            <!-- Contact Information Card -->
            <div class="contact-card">
                <?php if (isset($_GET['edit'])): ?>
                    <form method="POST" action="contact_detail.php?id=<?= $contact_id ?>" class="edit-form">
                        <input type="hidden" name="action" value="edit_contact">
                        <div class="form-group">
                            <label>First Name:</label>
                            <input type="text" name="jmeno" value="<?= htmlspecialchars($contact['jmeno']) ?>" required>
                        </div>
                        <div class="form-group">
                            <label>Last Name:</label>
                            <input type="text" name="prijmeni" value="<?= htmlspecialchars($contact['prijmeni']) ?>" required>
                        </div>
                        <div class="form-group">
                            <label>Company:</label>
                            <select name="firma_id">
                                <option value="">No company</option>
                                <?php foreach ($companies as $company): ?>
                                    <option value="<?= $company['id'] ?>" <?= $company['id'] == $contact['firma_id'] ? 'selected' : '' ?>>
                                        <?= htmlspecialchars($company['nazev']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Notes:</label>
                            <textarea name="poznamka" rows="3"><?= htmlspecialchars($contact['poznamka']) ?></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="save-button">Save Changes</button>
                            <a href="contact_detail.php?id=<?= $contact_id ?>" class="cancel-button">Cancel</a>
                        </div>
                    </form>
                <?php else: ?>
                    <!-- Contact Overview -->
                    <div class="contact-overview">
                        <h2><?= htmlspecialchars($contact['jmeno'] . ' ' . $contact['prijmeni']) ?></h2>
                        <p>
                            <?php if (!empty($contact['firma_nazev'])): ?>
                                Pracuje ve společnosti <a href="companies.php?id=<?= $contact['firma_id'] ?>" class="deal-link"><?= htmlspecialchars($contact['firma_nazev']) ?></a>.
                            <?php else: ?>
                                Nepřiřazena k žádné společnosti.
                            <?php endif; ?>
                        </p>
                    </div>

                    <!-- Notes Section -->
                    <?php if (!empty($contact['poznamka']) || !empty($contact['firma_poznamka'])): ?>
                    <div class="notes-section">
                        <h3>Poznámky</h3>
                        <?php if (!empty($contact['poznamka'])): ?>
                            <p><?= nl2br(htmlspecialchars($contact['poznamka'])) ?></p>
                        <?php endif; ?>
                        <?php if (!empty($contact['firma_poznamka'])): ?>
                            <p><strong>Poznámky k firmě:</strong> <?= nl2br(htmlspecialchars($contact['firma_poznamka'])) ?></p>
                        <?php endif; ?>
                    </div>
                    <?php endif; ?>

                    <!-- Opportunities Section -->
                    <div class="opportunities-section">
                        <h3>Příležitosti</h3>
                        <?php
                        $total_deals = count($deals);
                        $leads = count(array_filter($deals, function($deal) { return $deal['stav'] === 'Lead'; }));
                        $won = count(array_filter($deals, function($deal) { return $deal['stav'] === 'Won'; }));
                        $total_value = array_sum(array_column($deals, 'hodnota'));
                        $most_recent_deal = !empty($deals) ? $deals[0] : null;
                        ?>
                        
                        <p>
                            V systému má vedených <strong><?= $total_deals ?></strong> dealů v celkové hodnotě 
                            <strong><?= number_format($total_value / 1000, 0, ',', ' ') ?>k Kč</strong> 
                            (<?= $leads ?> leads, <?= $won ?> vyhraných).
                        </p>
                        
                        <?php if ($most_recent_deal): ?>
                            <p>
                                Nejnovější příležitost <em><?= htmlspecialchars($most_recent_deal['popis'] ?? '') ?></em> 
                                v hodnotě <strong><?= number_format(($most_recent_deal['hodnota'] ?? 0) / 1000, 0, ',', ' ') ?>k Kč</strong>, 
                                stav <em><?= htmlspecialchars($most_recent_deal['stav'] ?? '') ?></em>, 
                                vytvořena <?= $most_recent_deal['created_at'] ? date('j. n. Y', strtotime($most_recent_deal['created_at'])) : '' ?>, 
                                naposledy upravena <?= $most_recent_deal['posledni_uprava'] ? date('j. n. Y', strtotime($most_recent_deal['posledni_uprava'])) : '' ?>.
                            </p>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>
            
            <!-- Statistics Table -->
            <div class="table-container">
                <table class="business-table">
                    <thead>
                        <tr>
                            <th colspan="2">Opportunity Volume</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Total Deals:</strong></td>
                            <td><?= count($deals) ?></td>
                        </tr>
                        <tr>
                            <td><strong>Leads:</strong></td>
                            <td><?= count(array_filter($deals, function($deal) { return $deal['stav'] === 'Lead'; })) ?></td>
                        </tr>
                        <tr>
                            <td><strong>Won:</strong></td>
                            <td><?= count(array_filter($deals, function($deal) { return $deal['stav'] === 'Won'; })) ?></td>
                        </tr>
                        <tr>
                            <td><strong>Total Value:</strong></td>
                            <td><?= number_format(array_sum(array_column($deals, 'hodnota')) / 1000, 0, ',', ' ') ?>k Kč</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Related Deals Table -->
            <div class="table-container">
                <table class="business-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Value</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Last Modified</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($deals)): ?>
                            <tr>
                                <td colspan="5" class="empty-state">No deals found for this contact</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($deals as $deal): ?>
                                <tr>
                                    <td>
                                        <a href="deal_detail.php?id=<?= $deal['id'] ?>" class="deal-link">
                                            <?= htmlspecialchars($deal['popis'] ?? '') ?>
                                        </a>
                                    </td>
                                    <td><?= number_format(($deal['hodnota'] ?? 0) / 1000, 0, ',', ' ') ?>k Kč</td>
                                    <td><?= htmlspecialchars($deal['stav'] ?? '') ?></td>
                                    <td><?= $deal['created_at'] ? date('Y-m-d', strtotime($deal['created_at'])) : '' ?></td>
                                    <td><?= $deal['posledni_uprava'] ? date('Y-m-d', strtotime($deal['posledni_uprava'])) : '' ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Right Column -->
        <div class="right-column">
            <div class="right-section">
                <h3>Quick Actions</h3>
                <div class="quick-actions">
                    <?php if (!isset($_GET['edit'])): ?>
                        <a href="contact_detail.php?id=<?= $contact_id ?>&edit=1" class="quick-action-btn">
                            Edit Contact
                        </a>
                    <?php endif; ?>
                    <a href="index.php" class="quick-action-btn">
                        Back to Business Cases
                    </a>
                    <a href="index.php?add_deal&contact=<?= $contact_id ?>" class="quick-action-btn">
                        Add Deal for This Contact
                    </a>
                    <a href="https://www.icloud.com/contacts/" target="_blank" class="quick-action-btn secondary">
                        iCloud Contact
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

</body>
</html>
