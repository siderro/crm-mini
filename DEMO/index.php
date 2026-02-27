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
                $popis = $_POST['popis'] ?? '';
                $hodnota = floatval($_POST['hodnota'] ?? 0);
                $stav_id = !empty($_POST['stav_id']) ? intval($_POST['stav_id']) : null;
                
                $stmt = $mysqli->prepare("INSERT INTO deals (popis, hodnota, stav_id, created_at, posledni_uprava) VALUES (?, ?, ?, NOW(), NOW())");
                $stmt->bind_param("sdi", $popis, $hodnota, $stav_id);
                
                if ($stmt->execute()) {
                    $message = 'Business case has been successfully added.';
                    $message_type = 'success';
                    // Update deals statistics JSON
                    updateDealsStats();
                } else {
                    $message = 'Error adding business case.';
                    $message_type = 'error';
                }
                $stmt->close();
                break;
                
            case 'edit':
                $id = intval($_POST['id']);
                $popis = $_POST['popis'] ?? '';
                $hodnota = floatval($_POST['hodnota'] ?? 0);
                
                $stmt = $mysqli->prepare("UPDATE deals SET popis = ?, hodnota = ?, posledni_uprava = NOW() WHERE id = ?");
                $stmt->bind_param("sdi", $popis, $hodnota, $id);
                
                if ($stmt->execute()) {
                    $message = 'Business case has been successfully updated.';
                    $message_type = 'success';
                    // Update deals statistics JSON
                    updateDealsStats();
                } else {
                    $message = 'Error updating business case.';
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
    $stmt = $mysqli->prepare("DELETE FROM deals WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        $message = 'Business case has been successfully deleted.';
        $message_type = 'success';
        // Update deals statistics JSON
        updateDealsStats();
    } else {
        $message = 'Error deleting business case.';
        $message_type = 'error';
    }
    $stmt->close();
}

// Fetch contacts for dropdown
$contacts_query = "SELECT id, jmeno, prijmeni FROM contacts ORDER BY jmeno, prijmeni";
$contacts_result = $mysqli->query($contacts_query);
$contacts = [];
if ($contacts_result) {
    while ($row = $contacts_result->fetch_assoc()) {
        $contacts[] = $row;
    }
}

// Fetch deal statuses for dropdown
$statuses_query = "SELECT id, name FROM deal_statuses ORDER BY name";
$statuses_result = $mysqli->query($statuses_query);
$deal_statuses = [];
if ($statuses_result) {
    while ($row = $statuses_result->fetch_assoc()) {
        $deal_statuses[] = $row;
    }
}

// Fetch contacts related to Opp business cases only
$open_deals_contacts_query = "
    SELECT DISTINCT 
        c.id,
        c.jmeno,
        c.prijmeni,
        c.poznamka,
        COUNT(d.id) as deal_count,
        SUM(d.hodnota) as total_value
    FROM contacts c
    INNER JOIN deal_contacts dc ON c.id = dc.contact_id
    INNER JOIN deals d ON dc.deal_id = d.id
    INNER JOIN deal_statuses ds ON d.stav_id = ds.id
    WHERE ds.name = 'Opp'
    GROUP BY c.id, c.jmeno, c.prijmeni, c.poznamka
    ORDER BY deal_count DESC, total_value DESC
";

$open_deals_contacts_result = $mysqli->query($open_deals_contacts_query);
$open_deals_contacts = [];
if ($open_deals_contacts_result) {
    while ($row = $open_deals_contacts_result->fetch_assoc()) {
        $open_deals_contacts[] = $row;
    }
}

// Fetch deals data with status information - only Opp status
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
    LEFT JOIN deal_statuses ds ON d.stav_id = ds.id
    WHERE ds.name = 'Opp'
    ORDER BY d.posledni_uprava DESC
";

$deals_result = $mysqli->query($deals_query);
$deals = [];
if ($deals_result) {
    while ($row = $deals_result->fetch_assoc()) {
        $deals[] = $row;
    }
}

// Fetch frozen cases (deals with status 'Frozen')
$frozen_deals_query = "
    SELECT 
        d.id,
        d.popis,
        d.hodnota,
        d.created_at,
        d.posledni_uprava,
        ds.name as stav,
        ds.id as stav_id
    FROM deals d
    LEFT JOIN deal_statuses ds ON d.stav_id = ds.id
    WHERE ds.name = 'Frozen'
    ORDER BY d.posledni_uprava DESC
";

$frozen_deals_result = $mysqli->query($frozen_deals_query);
$frozen_deals = [];
if ($frozen_deals_result) {
    while ($row = $frozen_deals_result->fetch_assoc()) {
        $frozen_deals[] = $row;
    }
}

// Calculate total value for percentage calculation
$total_value = 0;
$max_value = 0;
if (!empty($deals)) {
    $total_value = array_sum(array_column($deals, 'hodnota'));
    $max_value = max(array_column($deals, 'hodnota'));
}

// Function to create text-based bar chart
function createTextBarChart($percentage, $maxWidth = 10) {
    $filledBlocks = round(($percentage / 100) * $maxWidth);
    $bar = str_repeat('█', $filledBlocks) . str_repeat('░', $maxWidth - $filledBlocks);
    return $bar . $percentage . '%';
}

// Function to format time difference in human-friendly way
function formatTimeDifference($now, $pastDate, $threshold = null) {
    $now_timestamp = $now->getTimestamp();
    $past_timestamp = $pastDate->getTimestamp();
    $diff = $now_timestamp - $past_timestamp;
    
    if ($diff < 3600) { // Less than 1 hour
        $minutes = floor($diff / 60);
        $result = $minutes . ' minute' . ($minutes != 1 ? 's' : '');
    } elseif ($diff < 86400) { // Less than 1 day
        $hours = floor($diff / 3600);
        $result = $hours . ' hour' . ($hours != 1 ? 's' : '');
    } else { // 1 day or more
        $days = floor($diff / 86400);
        $result = $days . ' day' . ($days != 1 ? 's' : '');
    }
    
    // Apply conditional formatting if threshold is provided and exceeded
    if ($threshold !== null && $diff >= ($threshold * 86400)) {
        $result = '<span style="color: #FF5555;">' . $result . '</span>';
    }
    
    return $result;
}


$page_title = 'CRM'; 
include 'head.php'; 
?>
<?php 
// Pass deals to header for Quick Stats (already filtered to Opp only)
$header_deals = $deals;
include 'header.php'; 
?>

<div class="container">
    <div class="main-layout">
        <!-- Left Column - Business Cases Table (2/3 width) -->
        <div class="left-column">
            <div class="section-header">
                <h1>Business Cases</h1>
                <div class="header-actions">
                    <button onclick="toggleForm()" class="add-button">
                        Add New Deal
                    </button>
                    <a href="contacts.php" class="secondary-link">Manage Contacts</a>
                    <a href="companies.php" class="secondary-link">Manage Companies</a>
                </div>
            </div>
            
            <?php if ($message): ?>
                <div class="message <?= $message_type ?>">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>
            
            <!-- Add Form -->
            <div id="dealForm" class="add-form form-display-none">
                <h3>Add New Business Case</h3>
                <form method="POST">
                    <input type="hidden" name="action" value="add">
                    
                    <div class="form-row">
                        <label>Description:</label>
                        <input type="text" name="popis" required>
                    </div>
                    
                    <div class="form-row">
                        <label>Value:</label>
                        <input type="number" name="hodnota" step="0.01">
                    </div>
                    
                    <div class="form-row">
                        <label>Status:</label>
                        <select name="stav_id" required>
                            <option value="">-- Select Status --</option>
                            <?php foreach ($deal_statuses as $status): ?>
                                <option value="<?= $status['id'] ?>" <?= $status['name'] === 'Opp' ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($status['name']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    
                    <div class="form-actions">
                        <button type="submit" class="save-button">Add Business Case</button>
                        <button type="button" onclick="toggleForm()" class="cancel-button">Cancel</button>
                    </div>
                </form>
            </div>
            
            <div class="table-container">
                <table class="business-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Percentage</th>
                            <th>Value</th>
                            <th>Days (Added / Modified)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($deals)): ?>
                            <tr>
                                <td colspan="5" class="empty-state">
                                    No business cases found
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($deals as $deal): ?>
                                <tr id="row-<?= $deal['id'] ?>" <?= ($deal['hodnota'] ?? 0) == $max_value ? 'style="background-color: #FFFF55;"' : '' ?>>
                                    <td>
                                        <span class="display-mode" id="popis-<?= $deal['id'] ?>">
                                            <a href="deal_detail.php?id=<?= $deal['id'] ?>" class="deal-link"><?= htmlspecialchars($deal['popis'] ?? '') ?></a>
                                        </span>
                                        <input type="text" class="edit-mode" id="edit-popis-<?= $deal['id'] ?>" value="<?= htmlspecialchars($deal['popis'] ?? '') ?>">
                                    </td>
                                    <td>
                                        <?php
                                        $percentage = 0;
                                        if ($total_value > 0) {
                                            $percentage = round((($deal['hodnota'] ?? 0) / $total_value) * 100, 1);
                                        }
                                        ?>
                                        <span class="display-mode monospace-text" id="percentage-<?= $deal['id'] ?>"><?= createTextBarChart($percentage) ?></span>
                                    </td>
                                    <td>
                                        <span class="display-mode" id="hodnota-<?= $deal['id'] ?>"><?= number_format(($deal['hodnota'] ?? 0) / 1000, 0, ',', ' ') ?>k Kč</span>
                                        <input type="number" class="edit-mode" id="edit-hodnota-<?= $deal['id'] ?>" value="<?= $deal['hodnota'] ?? 0 ?>" step="0.01">
                                    </td>
                                    <td>
                                        <?php
                                        $now = new DateTime();
                                        $created_at = new DateTime($deal['created_at']);
                                        $last_modified = new DateTime($deal['posledni_uprava']);
                                        
                                        $created_diff = formatTimeDifference($now, $created_at, $DAYS_THRESHOLD_CREATED);
                                        $modified_diff = formatTimeDifference($now, $last_modified, $DAYS_THRESHOLD_LAST_MODIFIED);
                                        
                                        echo "({$created_diff} / {$modified_diff})";
                                        ?>
                                    </td>
                                    <td>
                                        <div class="display-mode" id="actions-display-<?= $deal['id'] ?>">
                                            <a href="#" onclick="startEdit(<?= $deal['id'] ?>)" class="action-link">Edit</a>
                                            <a href="?delete=<?= $deal['id'] ?>" class="action-link" onclick="return confirm('Are you sure you want to delete this business case: <?= htmlspecialchars($deal['popis'] ?? 'Untitled') ?>?')">Delete</a>
                                        </div>
                                        <div class="edit-mode" id="actions-edit-<?= $deal['id'] ?>">
                                            <a href="#" onclick="saveEdit(<?= $deal['id'] ?>)" class="action-link">Save</a>
                                            <a href="#" onclick="cancelEdit(<?= $deal['id'] ?>)" class="action-link">Cancel</a>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
            
            <!-- Frozen Cases Table -->
            <div class="section-header">
                <h2>Frozen cases</h2>
            </div>
            
            <div class="table-container">
                <table class="business-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Value</th>
                            <th>Days (Added / Modified)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($frozen_deals)): ?>
                            <tr>
                                <td colspan="5" class="empty-state">
                                    No frozen cases found
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($frozen_deals as $deal): ?>
                                <tr id="frozen-row-<?= $deal['id'] ?>">
                                    <td>
                                        <span class="display-mode" id="frozen-popis-<?= $deal['id'] ?>">
                                            <a href="deal_detail.php?id=<?= $deal['id'] ?>" class="deal-link"><?= htmlspecialchars($deal['popis'] ?? '') ?></a>
                                        </span>
                                        <input type="text" class="edit-mode" id="edit-frozen-popis-<?= $deal['id'] ?>" value="<?= htmlspecialchars($deal['popis'] ?? '') ?>">
                                    </td>
                                    <td>
                                        <span class="display-mode" id="frozen-stav-<?= $deal['id'] ?>"><?= htmlspecialchars($deal['stav'] ?? 'No Status') ?></span>
                                    </td>
                                    <td>
                                        <span class="display-mode" id="frozen-hodnota-<?= $deal['id'] ?>"><?= number_format(($deal['hodnota'] ?? 0) / 1000, 0, ',', ' ') ?>k Kč</span>
                                        <input type="number" class="edit-mode" id="edit-frozen-hodnota-<?= $deal['id'] ?>" value="<?= $deal['hodnota'] ?? 0 ?>" step="0.01">
                                    </td>
                                    <td>
                                        <?php
                                        $now = new DateTime();
                                        $created_at = new DateTime($deal['created_at']);
                                        $last_modified = new DateTime($deal['posledni_uprava']);
                                        
                                        $created_diff = formatTimeDifference($now, $created_at, $DAYS_THRESHOLD_CREATED);
                                        $modified_diff = formatTimeDifference($now, $last_modified, $DAYS_THRESHOLD_LAST_MODIFIED);
                                        
                                        echo "({$created_diff} / {$modified_diff})";
                                        ?>
                                    </td>
                                    <td>
                                        <div class="display-mode" id="frozen-actions-display-<?= $deal['id'] ?>">
                                            <a href="#" onclick="startFrozenEdit(<?= $deal['id'] ?>)" class="action-link">Edit</a>
                                            <a href="?delete=<?= $deal['id'] ?>" class="action-link" onclick="return confirm('Are you sure you want to delete this frozen case: <?= htmlspecialchars($deal['popis'] ?? 'Untitled') ?>?')">Delete</a>
                                        </div>
                                        <div class="edit-mode" id="frozen-actions-edit-<?= $deal['id'] ?>">
                                            <a href="#" onclick="saveFrozenEdit(<?= $deal['id'] ?>)" class="action-link">Save</a>
                                            <a href="#" onclick="cancelFrozenEdit(<?= $deal['id'] ?>)" class="action-link">Cancel</a>
                                        </div>
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
            <!-- Contacts Section -->
            <div>
                <h3>Related Contacts</h3>
                <?php if (empty($open_deals_contacts)): ?>
                    <div>No contacts with open deals</div>
                <?php else: ?>
                    <?php foreach ($open_deals_contacts as $contact): ?>
                        <div>
                            <a href="contact_detail.php?id=<?= $contact['id'] ?>">
                                <?= htmlspecialchars($contact['jmeno'] . ' ' . $contact['prijmeni']) ?>
                            </a>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
            
        </div>
    </div>
</div>

<script>
function toggleForm() {
    const form = document.getElementById('dealForm');
    if (form.classList.contains('form-display-none')) {
        form.classList.remove('form-display-none');
        form.classList.add('form-display-block');
    } else {
        form.classList.remove('form-display-block');
        form.classList.add('form-display-none');
    }
}

function startEdit(dealId) {
    // Hide display elements and show edit elements
    document.getElementById('popis-' + dealId).style.display = 'none';
    document.getElementById('hodnota-' + dealId).style.display = 'none';
    document.getElementById('actions-display-' + dealId).style.display = 'none';
    
    document.getElementById('edit-popis-' + dealId).style.display = 'block';
    document.getElementById('edit-hodnota-' + dealId).style.display = 'block';
    document.getElementById('actions-edit-' + dealId).style.display = 'block';
}

function cancelEdit(dealId) {
    // Show display elements and hide edit elements
    document.getElementById('popis-' + dealId).style.display = 'block';
    document.getElementById('hodnota-' + dealId).style.display = 'block';
    document.getElementById('actions-display-' + dealId).style.display = 'block';
    
    document.getElementById('edit-popis-' + dealId).style.display = 'none';
    document.getElementById('edit-hodnota-' + dealId).style.display = 'none';
    document.getElementById('actions-edit-' + dealId).style.display = 'none';
}

function saveEdit(dealId) {
    const popis = document.getElementById('edit-popis-' + dealId).value;
    const hodnota = document.getElementById('edit-hodnota-' + dealId).value;
    
    // Create form data
    const formData = new FormData();
    formData.append('action', 'edit');
    formData.append('id', dealId);
    formData.append('popis', popis);
    formData.append('hodnota', hodnota);
    
    // Submit form
    fetch(window.location.href, {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.ok) {
            // Reload page to show updated data
            window.location.reload();
        } else {
            alert('Error saving changes');
        }
    }).catch(error => {
        alert('Error saving changes: ' + error);
    });
}

function exportData() {
    // Simple CSV export functionality
    const table = document.querySelector('.business-table');
    let csv = [];
    
    // Get headers
    const headers = [];
    table.querySelectorAll('thead th').forEach(th => {
        headers.push(th.textContent);
    });
    csv.push(headers.join(','));
    
    // Get data rows
    table.querySelectorAll('tbody tr').forEach(tr => {
        const row = [];
        tr.querySelectorAll('td').forEach(td => {
            row.push('"' + td.textContent.replace(/"/g, '""') + '"');
        });
        csv.push(row.join(','));
    });
    
    // Download CSV
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business_cases.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function refreshPage() {
    window.location.reload();
}

// Frozen cases edit functions
function startFrozenEdit(dealId) {
    // Hide display elements and show edit elements
    document.getElementById('frozen-popis-' + dealId).style.display = 'none';
    document.getElementById('frozen-hodnota-' + dealId).style.display = 'none';
    document.getElementById('frozen-actions-display-' + dealId).style.display = 'none';
    
    document.getElementById('edit-frozen-popis-' + dealId).style.display = 'block';
    document.getElementById('edit-frozen-hodnota-' + dealId).style.display = 'block';
    document.getElementById('frozen-actions-edit-' + dealId).style.display = 'block';
}

function cancelFrozenEdit(dealId) {
    // Show display elements and hide edit elements
    document.getElementById('frozen-popis-' + dealId).style.display = 'block';
    document.getElementById('frozen-hodnota-' + dealId).style.display = 'block';
    document.getElementById('frozen-actions-display-' + dealId).style.display = 'block';
    
    document.getElementById('edit-frozen-popis-' + dealId).style.display = 'none';
    document.getElementById('edit-frozen-hodnota-' + dealId).style.display = 'none';
    document.getElementById('frozen-actions-edit-' + dealId).style.display = 'none';
}

function saveFrozenEdit(dealId) {
    const popis = document.getElementById('edit-frozen-popis-' + dealId).value;
    const hodnota = document.getElementById('edit-frozen-hodnota-' + dealId).value;
    
    // Create form data
    const formData = new FormData();
    formData.append('action', 'edit');
    formData.append('id', dealId);
    formData.append('popis', popis);
    formData.append('hodnota', hodnota);
    
    // Submit form
    fetch(window.location.href, {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.ok) {
            // Reload page to show updated data
            window.location.reload();
        } else {
            alert('Error saving changes');
        }
    }).catch(error => {
        alert('Error saving changes: ' + error);
    });
}
</script>

</body>
</html>