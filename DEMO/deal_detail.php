<?php
session_start();
if (!isset($_SESSION['user'])) {
    header('Location: login.php');
    exit();
}

require_once 'config.php';

// Create deal_contacts table if it doesn't exist
$table_exists = $mysqli->query("SHOW TABLES LIKE 'deal_contacts'");
if (!$table_exists || $table_exists->num_rows == 0) {
    // Table doesn't exist, create it
    $create_table_query = "
        CREATE TABLE deal_contacts (
            deal_id INT NOT NULL,
            contact_id INT NOT NULL,
            PRIMARY KEY (deal_id, contact_id)
        )
    ";
    $mysqli->query($create_table_query);
}

// Handle edit deal form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'edit_deal') {
    $deal_id = isset($_GET['id']) ? intval($_GET['id']) : (isset($_POST['id']) ? intval($_POST['id']) : 0);
    $popis = trim($_POST['popis'] ?? '');
    $hodnota = !empty($_POST['hodnota']) ? floatval($_POST['hodnota']) : 0; // Keep as decimal
    $stav_id = !empty($_POST['stav_id']) ? intval($_POST['stav_id']) : null;
    $company_id = !empty($_POST['company_id']) ? intval($_POST['company_id']) : null;
    $contact_ids = isset($_POST['contact_ids']) ? array_map('intval', $_POST['contact_ids']) : [];
    
    if (!empty($popis) && $deal_id > 0) {
        $update_query = "UPDATE deals SET popis = ?, hodnota = ?, stav_id = ?, company_id = ?, posledni_uprava = NOW() WHERE id = ?";
        $stmt = $mysqli->prepare($update_query);
        $stmt->bind_param("sdiii", $popis, $hodnota, $stav_id, $company_id, $deal_id);
        
        if ($stmt->execute()) {
            // Clear existing deal contacts
            $delete_contacts = $mysqli->prepare("DELETE FROM deal_contacts WHERE deal_id = ?");
            $delete_contacts->bind_param("i", $deal_id);
            $delete_contacts->execute();
            $delete_contacts->close();
            
            // Add new deal contacts
            if (!empty($contact_ids)) {
                $insert_contact = $mysqli->prepare("INSERT INTO deal_contacts (deal_id, contact_id) VALUES (?, ?)");
                foreach ($contact_ids as $contact_id) {
                    $insert_contact->bind_param("ii", $deal_id, $contact_id);
                    $insert_contact->execute();
                }
                $insert_contact->close();
            }
            
            // Update deals statistics JSON
            updateDealsStats();
            
            header("Location: deal_detail.php?id=$deal_id&updated=1");
            exit();
        } else {
            $error_message = "Error updating deal: " . $mysqli->error;
        }
        $stmt->close();
    } else {
        $error_message = "Deal description is required.";
    }
}

// Handle add note
if (isset($_POST['add_note']) && isset($_POST['note_content']) && !empty(trim($_POST['note_content']))) {
    $note_content = trim($_POST['note_content']);
    $deal_id = intval($_GET['id']);
    
    $stmt = $mysqli->prepare("INSERT INTO notes (deal_id, content, created_at) VALUES (?, ?, NOW())");
    $stmt->bind_param("is", $deal_id, $note_content);
    
    if ($stmt->execute()) {
        // Update deal modified date
        $update_deal = $mysqli->prepare("UPDATE deals SET posledni_uprava = NOW() WHERE id = ?");
        $update_deal->bind_param("i", $deal_id);
        $update_deal->execute();
        $update_deal->close();
        
        header('Location: deal_detail.php?id=' . $deal_id . '&message=note_added');
        exit();
    } else {
        $error_message = 'Error adding note.';
    }
    $stmt->close();
}

// Handle edit note
if (isset($_POST['edit_note']) && isset($_POST['note_id']) && isset($_POST['note_content']) && !empty(trim($_POST['note_content']))) {
    $note_id = intval($_POST['note_id']);
    $note_content = trim($_POST['note_content']);
    $deal_id = intval($_GET['id']);
    
    $stmt = $mysqli->prepare("UPDATE notes SET content = ? WHERE id = ? AND deal_id = ?");
    $stmt->bind_param("sii", $note_content, $note_id, $deal_id);
    
    if ($stmt->execute()) {
        // Update deal modified date
        $update_deal = $mysqli->prepare("UPDATE deals SET posledni_uprava = NOW() WHERE id = ?");
        $update_deal->bind_param("i", $deal_id);
        $update_deal->execute();
        $update_deal->close();
        
        header('Location: deal_detail.php?id=' . $deal_id . '&message=note_updated');
        exit();
    } else {
        $error_message = 'Error updating note.';
    }
    $stmt->close();
}

// Handle delete note
if (isset($_GET['delete_note']) && is_numeric($_GET['delete_note'])) {
    $note_id = intval($_GET['delete_note']);
    $deal_id = intval($_GET['id']);
    
    $stmt = $mysqli->prepare("DELETE FROM notes WHERE id = ? AND deal_id = ?");
    $stmt->bind_param("ii", $note_id, $deal_id);
    
    if ($stmt->execute()) {
        // Update deal modified date
        $update_deal = $mysqli->prepare("UPDATE deals SET posledni_uprava = NOW() WHERE id = ?");
        $update_deal->bind_param("i", $deal_id);
        $update_deal->execute();
        $update_deal->close();
        
        header('Location: deal_detail.php?id=' . $deal_id . '&message=note_deleted');
        exit();
    } else {
        $error_message = 'Error deleting note.';
    }
    $stmt->close();
}

// Handle status change to "Work in progress" (Won!)
if (isset($_GET['won']) && $_GET['won'] == '1') {
    $deal_id = intval($_GET['id']);
    
    // Find the "Work in progress" status ID
    $status_query = "SELECT id FROM deal_statuses WHERE name = 'Work in progress'";
    $status_result = $mysqli->query($status_query);
    if ($status_result && $status_row = $status_result->fetch_assoc()) {
        $status_id = $status_row['id'];
        
        $stmt = $mysqli->prepare("UPDATE deals SET stav_id = ?, posledni_uprava = NOW() WHERE id = ?");
        $stmt->bind_param("ii", $status_id, $deal_id);
        
        if ($stmt->execute()) {
            // Update deals statistics JSON
            updateDealsStats();
            header('Location: deal_detail.php?id=' . $deal_id . '&message=status_updated');
            exit();
        } else {
            $error_message = 'Error updating deal status.';
        }
        $stmt->close();
    } else {
        $error_message = 'Status "Work in progress" not found.';
    }
}

// Handle status change to "Frozen"
if (isset($_GET['freeze']) && $_GET['freeze'] == '1') {
    $deal_id = intval($_GET['id']);
    
    // Find the "Frozen" status ID (or create it if it doesn't exist)
    $status_query = "SELECT id FROM deal_statuses WHERE name = 'Frozen'";
    $status_result = $mysqli->query($status_query);
    if ($status_result && $status_row = $status_result->fetch_assoc()) {
        $status_id = $status_row['id'];
    } else {
        // Create "Frozen" status if it doesn't exist
        $create_status = $mysqli->prepare("INSERT INTO deal_statuses (name) VALUES ('Frozen')");
        $create_status->execute();
        $status_id = $mysqli->insert_id;
        $create_status->close();
    }
    
    $stmt = $mysqli->prepare("UPDATE deals SET stav_id = ?, posledni_uprava = NOW() WHERE id = ?");
    $stmt->bind_param("ii", $status_id, $deal_id);
    
    if ($stmt->execute()) {
        // Update deals statistics JSON
        updateDealsStats();
        header('Location: deal_detail.php?id=' . $deal_id . '&message=status_updated');
        exit();
    } else {
        $error_message = 'Error updating deal status.';
    }
    $stmt->close();
}

// Handle status change to "Lost"
if (isset($_GET['lost']) && $_GET['lost'] == '1') {
    $deal_id = intval($_GET['id']);
    
    // Find the "Lost" status ID (or create it if it doesn't exist)
    $status_query = "SELECT id FROM deal_statuses WHERE name = 'Lost'";
    $status_result = $mysqli->query($status_query);
    if ($status_result && $status_row = $status_result->fetch_assoc()) {
        $status_id = $status_row['id'];
    } else {
        // Create "Lost" status if it doesn't exist
        $create_status = $mysqli->prepare("INSERT INTO deal_statuses (name) VALUES ('Lost')");
        $create_status->execute();
        $status_id = $mysqli->insert_id;
        $create_status->close();
    }
    
    $stmt = $mysqli->prepare("UPDATE deals SET stav_id = ?, posledni_uprava = NOW() WHERE id = ?");
    $stmt->bind_param("ii", $status_id, $deal_id);
    
    if ($stmt->execute()) {
        // Update deals statistics JSON
        updateDealsStats();
        header('Location: deal_detail.php?id=' . $deal_id . '&message=status_updated');
        exit();
    } else {
        $error_message = 'Error updating deal status.';
    }
    $stmt->close();
}

// Handle status change to "Opp" (defrost)
if (isset($_GET['defrost']) && $_GET['defrost'] == '1') {
    $deal_id = intval($_GET['id']);
    
    // Find the "Opp" status ID
    $status_query = "SELECT id FROM deal_statuses WHERE name = 'Opp'";
    $status_result = $mysqli->query($status_query);
    if ($status_result && $status_row = $status_result->fetch_assoc()) {
        $status_id = $status_row['id'];
        
        $stmt = $mysqli->prepare("UPDATE deals SET stav_id = ?, posledni_uprava = NOW() WHERE id = ?");
        $stmt->bind_param("ii", $status_id, $deal_id);
        
        if ($stmt->execute()) {
            // Update deals statistics JSON
            updateDealsStats();
            header('Location: deal_detail.php?id=' . $deal_id . '&message=status_updated');
            exit();
        } else {
            $error_message = 'Error updating deal status.';
        }
        $stmt->close();
    } else {
        $error_message = 'Status "Opp" not found.';
    }
}

// Handle assign company
if (isset($_GET['assign_company']) && is_numeric($_GET['assign_company'])) {
    $company_id = intval($_GET['assign_company']);
    $deal_id = intval($_GET['id']);
    
    $stmt = $mysqli->prepare("UPDATE deals SET company_id = ?, posledni_uprava = NOW() WHERE id = ?");
    if ($stmt) {
        $stmt->bind_param("ii", $company_id, $deal_id);
        
        if ($stmt->execute()) {
            header('Location: deal_detail.php?id=' . $deal_id . '&message=company_assigned');
            exit();
        } else {
            $error_message = 'Error assigning company: ' . $mysqli->error;
        }
        $stmt->close();
    } else {
        $error_message = 'Error preparing company assignment: ' . $mysqli->error;
    }
}

// Handle unassign company
if (isset($_GET['unassign_company']) && $_GET['unassign_company'] == '1') {
    $deal_id = intval($_GET['id']);
    
    $stmt = $mysqli->prepare("UPDATE deals SET company_id = NULL, posledni_uprava = NOW() WHERE id = ?");
    if ($stmt) {
        $stmt->bind_param("i", $deal_id);
        
        if ($stmt->execute()) {
            header('Location: deal_detail.php?id=' . $deal_id . '&message=company_unassigned');
            exit();
        } else {
            $error_message = 'Error unassigning company: ' . $mysqli->error;
        }
        $stmt->close();
    } else {
        $error_message = 'Error preparing company unassignment: ' . $mysqli->error;
    }
}

// Handle assign contact
if (isset($_GET['assign_contact']) && is_numeric($_GET['assign_contact'])) {
    $contact_id = intval($_GET['assign_contact']);
    $deal_id = intval($_GET['id']);
    
    // Check if contact is already assigned
    $check_stmt = $mysqli->prepare("SELECT deal_id FROM deal_contacts WHERE deal_id = ? AND contact_id = ?");
    if ($check_stmt) {
        $check_stmt->bind_param("ii", $deal_id, $contact_id);
        $check_stmt->execute();
        $result = $check_stmt->get_result();
        
        if ($result->num_rows == 0) {
            $stmt = $mysqli->prepare("INSERT INTO deal_contacts (deal_id, contact_id) VALUES (?, ?)");
            if ($stmt) {
                $stmt->bind_param("ii", $deal_id, $contact_id);
                
                if ($stmt->execute()) {
                    // Update deal modified date
                    $update_deal = $mysqli->prepare("UPDATE deals SET posledni_uprava = NOW() WHERE id = ?");
                    if ($update_deal) {
                        $update_deal->bind_param("i", $deal_id);
                        $update_deal->execute();
                        $update_deal->close();
                    }
                    
                    header('Location: deal_detail.php?id=' . $deal_id . '&message=contact_assigned');
                    exit();
                } else {
                    $error_message = 'Error assigning contact: ' . $mysqli->error;
                }
                $stmt->close();
            } else {
                $error_message = 'Error preparing contact assignment: ' . $mysqli->error;
            }
        } else {
            $error_message = 'Contact is already assigned to this deal.';
        }
        $check_stmt->close();
    } else {
        $error_message = 'Error checking contact assignment: ' . $mysqli->error;
    }
}

// Handle unassign contact
if (isset($_GET['unassign_contact']) && is_numeric($_GET['unassign_contact'])) {
    $contact_id = intval($_GET['unassign_contact']);
    $deal_id = intval($_GET['id']);
    
    $stmt = $mysqli->prepare("DELETE FROM deal_contacts WHERE deal_id = ? AND contact_id = ?");
    if ($stmt) {
        $stmt->bind_param("ii", $deal_id, $contact_id);
        
        if ($stmt->execute()) {
            // Update deal modified date
            $update_deal = $mysqli->prepare("UPDATE deals SET posledni_uprava = NOW() WHERE id = ?");
            if ($update_deal) {
                $update_deal->bind_param("i", $deal_id);
                $update_deal->execute();
                $update_deal->close();
            }
            
            header('Location: deal_detail.php?id=' . $deal_id . '&message=contact_unassigned');
            exit();
        } else {
            $error_message = 'Error unassigning contact: ' . $mysqli->error;
        }
        $stmt->close();
    } else {
        $error_message = 'Error preparing contact unassignment: ' . $mysqli->error;
    }
}

// Handle delete
if (isset($_GET['delete']) && is_numeric($_GET['delete'])) {
    $id = intval($_GET['delete']);
    $stmt = $mysqli->prepare("DELETE FROM deals WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        // Update deals statistics JSON
        updateDealsStats();
        header('Location: index.php?message=deleted');
        exit();
    } else {
        $error_message = 'Error deleting deal.';
    }
    $stmt->close();
}

// Get deal ID from URL
$deal_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($deal_id <= 0) {
    header('Location: index.php');
    exit();
}

// Fetch deal details
$deal_query = "
    SELECT 
        d.id,
        d.popis,
        d.hodnota,
        d.created_at,
        d.posledni_uprava,
        ds.name as stav,
        ds.id as stav_id,
        comp.id as company_id,
        comp.nazev as company_name,
        comp.poznamka as company_note
    FROM deals d
    LEFT JOIN companies comp ON d.company_id = comp.id
    LEFT JOIN deal_statuses ds ON d.stav_id = ds.id
    WHERE d.id = ?
";

$stmt = $mysqli->prepare($deal_query);
$stmt->bind_param("i", $deal_id);
$stmt->execute();
$result = $stmt->get_result();
$deal = $result->fetch_assoc();
$stmt->close();

if (!$deal) {
    header('Location: index.php');
    exit();
}

// Fetch notes for this deal
$notes_query = "SELECT * FROM notes WHERE deal_id = ? ORDER BY created_at DESC";
$stmt = $mysqli->prepare($notes_query);
$stmt->bind_param("i", $deal_id);
$stmt->execute();
$notes_result = $stmt->get_result();
$notes = $notes_result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

// Fetch deal statuses for edit form
$statuses_query = "SELECT id, name FROM deal_statuses ORDER BY name";
$statuses_result = $mysqli->query($statuses_query);
$statuses = [];
while ($row = $statuses_result->fetch_assoc()) {
    $statuses[] = $row;
}

// Fetch deal contacts
$deal_contacts_query = "
    SELECT 
        dc.contact_id,
        c.jmeno,
        c.prijmeni,
        c.poznamka
    FROM deal_contacts dc
    LEFT JOIN contacts c ON dc.contact_id = c.id
    WHERE dc.deal_id = ?
    ORDER BY c.jmeno, c.prijmeni
";
$stmt = $mysqli->prepare($deal_contacts_query);
$stmt->bind_param("i", $deal_id);
$stmt->execute();
$deal_contacts_result = $stmt->get_result();
$deal_contacts = [];
while ($row = $deal_contacts_result->fetch_assoc()) {
    $deal_contacts[] = $row;
}
$stmt->close();

// Fetch all contacts for edit form
$contacts_query = "SELECT id, jmeno, prijmeni FROM contacts ORDER BY jmeno, prijmeni";
$contacts_result = $mysqli->query($contacts_query);
$contacts = [];
while ($row = $contacts_result->fetch_assoc()) {
    $contacts[] = $row;
}

// Fetch companies for edit form
$companies_query = "SELECT id, nazev FROM companies ORDER BY nazev";
$companies_result = $mysqli->query($companies_query);
$companies = [];
while ($row = $companies_result->fetch_assoc()) {
    $companies[] = $row;
}

// Function to format deal data into human-readable card format
function formatDealCard($deal, $deal_contacts = []) {
    $output = '';
    
    // Hero block - deal name, value, and status
    $deal_name = htmlspecialchars($deal['popis'] ?? '');
    $value = number_format($deal['hodnota'] ?? 0, 0, ',', ' ');
    $status = htmlspecialchars($deal['stav'] ?? 'No status');
    
    $output .= "<div class='deal-card-hero'>";
    $output .= "<h2><strong>{$deal_name}</strong></h2>";
    $output .= "<p>The deal value is <strong>{$value} CZK</strong> and it is currently in the <em>{$status}</em> stage.</p>";
    
    // Add Won!/Freeze/Lost links if status is "Opp"
    if ($status === 'Opp') {
        $deal_id = $deal['id'];
        $output .= "<div style='margin-top: 10px;'>";
        $output .= "<a href='?id={$deal_id}&won=1' class='action-link' style='background: #28a745; color: white; padding: 5px 10px; text-decoration: none; margin-right: 10px; border-radius: 3px;'>Won!</a>";
        $output .= "<a href='?id={$deal_id}&freeze=1' class='action-link' style='background: #6c757d; color: white; padding: 5px 10px; text-decoration: none; margin-right: 10px; border-radius: 3px;'>Freeze</a>";
        $output .= "<a href='?id={$deal_id}&lost=1' class='action-link' style='background: #dc3545; color: white; padding: 5px 10px; text-decoration: none; border-radius: 3px;'>Lost!</a>";
        $output .= "</div>";
    }
    
    // Add Defrost link if status is "Frozen"
    if ($status === 'Frozen') {
        $deal_id = $deal['id'];
        $output .= "<div style='margin-top: 10px;'>";
        $output .= "<a href='?id={$deal_id}&defrost=1' class='action-link' style='background: #00AAAA; color: white; padding: 5px 10px; text-decoration: none; border-radius: 3px;'>Defrost</a>";
        $output .= "</div>";
    }
    
    $output .= "</div>";
    
    // Company section
    if (!empty($deal['company_name'])) {
        $company_name = htmlspecialchars($deal['company_name']);
        $deal_id = $deal['id'];
        $output .= "<div class='deal-card-company'>";
        $output .= "<p>This deal is with <strong>{$company_name}</strong>.</p>";
        if (!empty($deal['company_note'])) {
            $company_note = htmlspecialchars($deal['company_note']);
            $output .= "<p><em>Company note: {$company_note}</em></p>";
        }
        $output .= "<p><a href='?id={$deal_id}&unassign_company=1' style='color: #dc3545; text-decoration: none;'>Unassign Company</a></p>";
        $output .= "</div>";
    } else {
        $deal_id = $deal['id'];
        $output .= "<div class='deal-card-company'>";
        $output .= "<p>No company is assigned to this deal. <a href='?id={$deal_id}&show_assign_company=1' style='color: #007bff; text-decoration: none;'>Assign Company</a></p>";
        $output .= "</div>";
    }
    
    // Contacts section
    if (!empty($deal_contacts)) {
        $deal_id = $deal['id'];
        $output .= "<div class='deal-card-contacts'>";
        $output .= "<p><strong>Contacts involved in this deal:</strong></p>";
        $output .= "<ul>";
        foreach ($deal_contacts as $contact) {
            $contact_name = htmlspecialchars($contact['jmeno'] . ' ' . $contact['prijmeni']);
            $contact_id = $contact['contact_id'];
            $output .= "<li>{$contact_name} <a href='?id={$deal_id}&unassign_contact={$contact_id}' style='color: #dc3545; text-decoration: none; margin-left: 10px;'>(unassign)</a></li>";
        }
        $output .= "</ul>";
        $output .= "<p><a href='?id={$deal_id}&show_assign_contact=1' style='color: #007bff; text-decoration: none;'>Assign Another Contact</a></p>";
        $output .= "</div>";
    } else {
        $deal_id = $deal['id'];
        $output .= "<div class='deal-card-contacts'>";
        $output .= "<p>No contacts are assigned to this deal. <a href='?id={$deal_id}&show_assign_contact=1' style='color: #007bff; text-decoration: none;'>Assign Contact</a></p>";
        $output .= "</div>";
    }
    
    // History section
    $created_date = $deal['created_at'] ? date('F j, Y', strtotime($deal['created_at'])) : 'Unknown';
    $modified_date = $deal['posledni_uprava'] ? date('F j, Y', strtotime($deal['posledni_uprava'])) : 'Unknown';
    
    $output .= "<div class='deal-card-history'>";
    $output .= "<p>The deal was created on <strong>{$created_date}</strong> and last updated on <strong>{$modified_date}</strong>.</p>";
    $output .= "</div>";
    
    return $output;
}

$page_title = 'Deal Detail'; 
include 'head.php'; 
?>
<?php include 'header.php'; ?>

<div class="container">
    <div class="main-layout">
        <!-- Left Column - Notes -->
        <div class="left-column">
            <div class="section-header">
                <h1>Deal Detail</h1>
                <div class="header-actions">
                    <a href="index.php" class="nav-link">Back to Business Cases</a>
                </div>
            </div>
            
            <?php if (isset($_GET['updated'])): ?>
                <div class="success-message">Deal updated successfully!</div>
            <?php endif; ?>

            <?php if (isset($_GET['message']) && $_GET['message'] == 'note_added'): ?>
                <div class="success-message">Note added successfully!</div>
            <?php endif; ?>
            
            <?php if (isset($_GET['message']) && $_GET['message'] == 'note_updated'): ?>
                <div class="success-message">Note updated successfully!</div>
            <?php endif; ?>
            
            <?php if (isset($_GET['message']) && $_GET['message'] == 'note_deleted'): ?>
                <div class="success-message">Note deleted successfully!</div>
            <?php endif; ?>
            
            <?php if (isset($_GET['message']) && $_GET['message'] == 'status_updated'): ?>
                <div class="success-message">Deal status updated successfully!</div>
            <?php endif; ?>
            
            <?php if (isset($_GET['message']) && $_GET['message'] == 'company_assigned'): ?>
                <div class="success-message">Company assigned successfully!</div>
            <?php endif; ?>
            
            <?php if (isset($_GET['message']) && $_GET['message'] == 'company_unassigned'): ?>
                <div class="success-message">Company unassigned successfully!</div>
            <?php endif; ?>
            
            <?php if (isset($_GET['message']) && $_GET['message'] == 'contact_assigned'): ?>
                <div class="success-message">Contact assigned successfully!</div>
            <?php endif; ?>
            
            <?php if (isset($_GET['message']) && $_GET['message'] == 'contact_unassigned'): ?>
                <div class="success-message">Contact unassigned successfully!</div>
            <?php endif; ?>
            
            <?php if (isset($error_message)): ?>
                <div class="error-message"><?= htmlspecialchars($error_message) ?></div>
            <?php endif; ?>

            <!-- Notes Section -->
            <div class="notes-section">
                <h3>Notes for project <?= htmlspecialchars($deal['popis']) ?></h3>
                
                <!-- Add/Edit Note Form -->
                <div class="add-note-form">
                    <?php if (isset($_GET['edit_note'])): ?>
                        <?php
                        $edit_note_id = intval($_GET['edit_note']);
                        $edit_note = null;
                        foreach ($notes as $note) {
                            if ($note['id'] == $edit_note_id) {
                                $edit_note = $note;
                                break;
                            }
                        }
                        ?>
                        <?php if ($edit_note): ?>
                            <form method="POST" action="">
                                <input type="hidden" name="note_id" value="<?= $edit_note['id'] ?>">
                                <textarea id="note_content" name="note_content" rows="3" placeholder="Enter your note here..." required style="width: 100%; font-family: inherit; font-size: inherit; padding: 4px; border: 1px solid #000000; resize: vertical;"><?= htmlspecialchars($edit_note['content']) ?></textarea>
                                <div style="text-align: right; margin-top: 8px;">
                                    <button type="submit" name="edit_note" class="save-button">Update Note</button>
                                    <a href="deal_detail.php?id=<?= $deal_id ?>" class="cancel-button" style="margin-left: 10px;">Cancel</a>
                                </div>
                            </form>
                        <?php endif; ?>
                    <?php else: ?>
                        <form method="POST" action="">
                            <textarea id="note_content" name="note_content" rows="3" placeholder="Enter your note here..." required style="width: 100%; font-family: inherit; font-size: inherit; padding: 4px; border: 1px solid #000000; resize: vertical;"></textarea>
                            <div style="text-align: right; margin-top: 8px;">
                                <button type="submit" name="add_note" class="save-button">Add Note</button>
                            </div>
                        </form>
                    <?php endif; ?>
                </div>
                
                <!-- Display Notes -->
                <div class="notes-feed">
                    <?php if (empty($notes)): ?>
                        <div class="no-notes">No notes yet. Add the first note above.</div>
                    <?php else: ?>
                        <?php foreach ($notes as $note): ?>
                            <div class="note-feed-item">
                                <?php 
                                $created_time = strtotime($note['created_at']);
                                $now = time();
                                $diff = $now - $created_time;
                                
                                if ($diff < 3600) {
                                    $time_ago = floor($diff / 60) . ' minutes ago';
                                } elseif ($diff < 86400) {
                                    $time_ago = floor($diff / 3600) . ' hours ago';
                                } elseif ($diff < 2592000) {
                                    $time_ago = floor($diff / 86400) . ' days ago';
                                } else {
                                    $time_ago = date('Y-m-d', $created_time);
                                }
                                ?>
                                <div class="note-feed-content">
                                    <span class="note-date"><?= $time_ago ?>:</span> 
                                    <?= htmlspecialchars($note['content']) ?>
                                    <div class="note-actions">
                                        <a href="?id=<?= $deal_id ?>&edit_note=<?= $note['id'] ?>">Edit</a>
                                        <a href="?id=<?= $deal_id ?>&delete_note=<?= $note['id'] ?>" onclick="return confirm('Are you sure you want to delete this note?')">Delete</a>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
            
        </div>
        
        <!-- Right Column - Deal Information -->
        <div class="right-column">
            <!-- Action Links -->
            <div class="action-links" style="margin-bottom: 20px;">
                <?php if (!isset($_GET['edit'])): ?>
                    <a href="deal_detail.php?id=<?= $deal_id ?>&edit=1" class="action-link">Edit Deal</a>
                <?php endif; ?>
                <a href="index.php" class="action-link">← Back</a>
                <a href="?delete=<?= $deal['id'] ?>" class="action-link danger" onclick="return confirm('Are you sure you want to delete this deal?')">Delete Deal</a>
            </div>

            <!-- Deal Information Card -->
            <?php if (isset($_GET['edit'])): ?>
                <div class="table-container">
                    <table class="business-table">
                        <thead>
                            <tr>
                                <th colspan="2">Edit Deal Information</th>
                            </tr>
                        </thead>
                        <tbody>
                            <form method="POST" action="deal_detail.php?id=<?= $deal_id ?>">
                                <input type="hidden" name="action" value="edit_deal">
                                <tr>
                                    <td><strong>Description:</strong></td>
                                    <td><input type="text" name="popis" value="<?= htmlspecialchars($deal['popis']) ?>" required style="width: 100%; font-family: inherit; font-size: inherit; padding: 4px; border: 1px solid #ccc;"></td>
                                </tr>
                                <tr>
                                    <td><strong>Value (CZK):</strong></td>
                                    <td><input type="number" name="hodnota" value="<?= $deal['hodnota'] ?? 0 ?>" step="0.01" style="width: 100%; font-family: inherit; font-size: inherit; padding: 4px; border: 1px solid #ccc;"></td>
                                </tr>
                                <tr>
                                    <td><strong>Status:</strong></td>
                                    <td>
                                        <select name="stav_id" style="width: 100%; font-family: inherit; font-size: inherit; padding: 4px; border: 1px solid #ccc;">
                                            <option value="">No status</option>
                                            <?php foreach ($statuses as $status): ?>
                                                <option value="<?= $status['id'] ?>" <?= $status['id'] == $deal['stav_id'] ? 'selected' : '' ?>>
                                                    <?= htmlspecialchars($status['name']) ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Company:</strong></td>
                                    <td>
                                        <select name="company_id" style="width: 100%; font-family: inherit; font-size: inherit; padding: 4px; border: 1px solid #ccc;">
                                            <option value="">No company</option>
                                            <?php foreach ($companies as $company): ?>
                                                <option value="<?= $company['id'] ?>" <?= $company['id'] == $deal['company_id'] ? 'selected' : '' ?>>
                                                    <?= htmlspecialchars($company['nazev']) ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Contacts:</strong></td>
                                    <td>
                                        <div id="contacts-container">
                                            <?php 
                                            $existing_contacts = [];
                                            foreach ($deal_contacts as $dc) {
                                                $existing_contacts[] = $dc['contact_id'];
                                            }
                                            ?>
                                            <?php foreach ($deal_contacts as $index => $dc): ?>
                                                <div class="contact-row" style="margin-bottom: 10px;">
                                                    <select name="contact_ids[]" style="width: 80%; font-family: inherit; font-size: inherit; padding: 4px; border: 1px solid #ccc; margin-right: 10px;">
                                                        <option value="">Select contact</option>
                                                        <?php foreach ($contacts as $contact): ?>
                                                            <option value="<?= $contact['id'] ?>" <?= $contact['id'] == $dc['contact_id'] ? 'selected' : '' ?>>
                                                                <?= htmlspecialchars($contact['jmeno'] . ' ' . $contact['prijmeni']) ?>
                                                            </option>
                                                        <?php endforeach; ?>
                                                    </select>
                                                    <button type="button" onclick="removeContactRow(this)" style="background: #dc3545; color: white; border: none; padding: 4px 8px; cursor: pointer;">Remove</button>
                                                </div>
                                            <?php endforeach; ?>
                                            <?php if (empty($deal_contacts)): ?>
                                                <div class="contact-row" style="margin-bottom: 10px;">
                                                    <select name="contact_ids[]" style="width: 80%; font-family: inherit; font-size: inherit; padding: 4px; border: 1px solid #ccc; margin-right: 10px;">
                                                        <option value="">Select contact</option>
                                                        <?php foreach ($contacts as $contact): ?>
                                                            <option value="<?= $contact['id'] ?>">
                                                                <?= htmlspecialchars($contact['jmeno'] . ' ' . $contact['prijmeni']) ?>
                                                            </option>
                                                        <?php endforeach; ?>
                                                    </select>
                                                    <button type="button" onclick="removeContactRow(this)" style="background: #dc3545; color: white; border: none; padding: 4px 8px; cursor: pointer;">Remove</button>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                        <button type="button" onclick="addContactRow()" style="background: #28a745; color: white; border: none; padding: 8px 16px; cursor: pointer; margin-top: 10px;">Add Contact</button>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="text-align: right; padding: 10px;">
                                        <button type="submit" class="save-button" style="margin-right: 10px;">Save Changes</button>
                                        <a href="deal_detail.php?id=<?= $deal_id ?>" class="cancel-button">Cancel</a>
                                    </td>
                                </tr>
                            </form>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="deal-card">
                    <?= formatDealCard($deal, $deal_contacts) ?>
                </div>
                
                <!-- Company Assignment Form -->
                <?php if (isset($_GET['show_assign_company'])): ?>
                    <div class="assignment-form" style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; background: #f9f9f9;">
                        <h3>Assign Company</h3>
                        <form method="GET" action="">
                            <input type="hidden" name="id" value="<?= $deal_id ?>">
                            <select name="assign_company" required style="width: 100%; padding: 8px; margin-bottom: 10px;">
                                <option value="">Select a company</option>
                                <?php foreach ($companies as $company): ?>
                                    <option value="<?= $company['id'] ?>">
                                        <?= htmlspecialchars($company['nazev']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <div style="text-align: right;">
                                <button type="submit" class="save-button" style="margin-right: 10px;">Assign Company</button>
                                <a href="deal_detail.php?id=<?= $deal_id ?>" class="cancel-button">Cancel</a>
                            </div>
                        </form>
                    </div>
                <?php endif; ?>
                
                <!-- Contact Assignment Form -->
                <?php if (isset($_GET['show_assign_contact'])): ?>
                    <div class="assignment-form" style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; background: #f9f9f9;">
                        <h3>Assign Contact</h3>
                        <form method="GET" action="">
                            <input type="hidden" name="id" value="<?= $deal_id ?>">
                            <select name="assign_contact" required style="width: 100%; padding: 8px; margin-bottom: 10px;">
                                <option value="">Select a contact</option>
                                <?php foreach ($contacts as $contact): ?>
                                    <option value="<?= $contact['id'] ?>">
                                        <?= htmlspecialchars($contact['jmeno'] . ' ' . $contact['prijmeni']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <div style="text-align: right;">
                                <button type="submit" class="save-button" style="margin-right: 10px;">Assign Contact</button>
                                <a href="deal_detail.php?id=<?= $deal_id ?>" class="cancel-button">Cancel</a>
                            </div>
                        </form>
                    </div>
                <?php endif; ?>
            <?php endif; ?>
            
        </div>
    </div>
</div>

<script>
function addContactRow() {
    const container = document.getElementById('contacts-container');
    const contactRow = document.createElement('div');
    contactRow.className = 'contact-row';
    contactRow.style.marginBottom = '10px';
    
    contactRow.innerHTML = `
        <select name="contact_ids[]" style="width: 80%; font-family: inherit; font-size: inherit; padding: 4px; border: 1px solid #ccc; margin-right: 10px;">
            <option value="">Select contact</option>
            <?php foreach ($contacts as $contact): ?>
                <option value="<?= $contact['id'] ?>">
                    <?= htmlspecialchars($contact['jmeno'] . ' ' . $contact['prijmeni']) ?>
                </option>
            <?php endforeach; ?>
        </select>
        <button type="button" onclick="removeContactRow(this)" style="background: #dc3545; color: white; border: none; padding: 4px 8px; cursor: pointer;">Remove</button>
    `;
    
    container.appendChild(contactRow);
}

function removeContactRow(button) {
    const contactRow = button.parentElement;
    contactRow.remove();
}
</script>

</body>
</html>
