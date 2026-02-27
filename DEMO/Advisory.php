<?php
session_start();
if (!isset($_SESSION['user'])) {
    header('Location: login.php');
    exit();
}

require_once 'config.php';

// Fetch open deals (Opp status) with all related information
$open_deals_query = "
    SELECT 
        d.id,
        d.popis,
        d.hodnota,
        d.created_at,
        d.posledni_uprava,
        ds.name as stav,
        comp.nazev as company_name,
        GROUP_CONCAT(DISTINCT CONCAT(c.jmeno, ' ', c.prijmeni) SEPARATOR ', ') as contacts,
        GROUP_CONCAT(DISTINCT n.content ORDER BY n.created_at DESC SEPARATOR ' | ') as notes
    FROM deals d
    LEFT JOIN deal_statuses ds ON d.stav_id = ds.id
    LEFT JOIN companies comp ON d.company_id = comp.id
    LEFT JOIN deal_contacts dc ON d.id = dc.deal_id
    LEFT JOIN contacts c ON dc.contact_id = c.id
    LEFT JOIN notes n ON d.id = n.deal_id
    WHERE ds.name = 'Opp'
    GROUP BY d.id, d.popis, d.hodnota, d.created_at, d.posledni_uprava, ds.name, comp.nazev
    ORDER BY d.hodnota DESC
";

$open_deals_result = $mysqli->query($open_deals_query);
$open_deals = [];
if ($open_deals_result) {
    while ($row = $open_deals_result->fetch_assoc()) {
        $open_deals[] = $row;
    }
}

// Fetch frozen deals with all related information
$frozen_deals_query = "
    SELECT 
        d.id,
        d.popis,
        d.hodnota,
        d.created_at,
        d.posledni_uprava,
        ds.name as stav,
        comp.nazev as company_name,
        GROUP_CONCAT(DISTINCT CONCAT(c.jmeno, ' ', c.prijmeni) SEPARATOR ', ') as contacts,
        GROUP_CONCAT(DISTINCT n.content ORDER BY n.created_at DESC SEPARATOR ' | ') as notes
    FROM deals d
    LEFT JOIN deal_statuses ds ON d.stav_id = ds.id
    LEFT JOIN companies comp ON d.company_id = comp.id
    LEFT JOIN deal_contacts dc ON d.id = dc.deal_id
    LEFT JOIN contacts c ON dc.contact_id = c.id
    LEFT JOIN notes n ON d.id = n.deal_id
    WHERE ds.name = 'Frozen'
    GROUP BY d.id, d.popis, d.hodnota, d.created_at, d.posledni_uprava, ds.name, comp.nazev
    ORDER BY d.hodnota DESC
";

$frozen_deals_result = $mysqli->query($frozen_deals_query);
$frozen_deals = [];
if ($frozen_deals_result) {
    while ($row = $frozen_deals_result->fetch_assoc()) {
        $frozen_deals[] = $row;
    }
}

// Function to format deal information
function formatDealInfo($deals, $title) {
    $output = "=== " . strtoupper($title) . " ===\n\n";
    
    if (empty($deals)) {
        $output .= "No deals found.\n\n";
        return $output;
    }
    
    foreach ($deals as $deal) {
        $output .= "DEAL: " . htmlspecialchars($deal['popis']) . "\n";
        $output .= "Value: " . number_format($deal['hodnota'] / 1000, 0, ',', ' ') . "k Kč\n";
        $output .= "Status: " . htmlspecialchars($deal['stav']) . "\n";
        
        if (!empty($deal['company_name'])) {
            $output .= "Company: " . htmlspecialchars($deal['company_name']) . "\n";
        }
        
        if (!empty($deal['contacts'])) {
            $output .= "Contacts: " . htmlspecialchars($deal['contacts']) . "\n";
        }
        
        if (!empty($deal['notes'])) {
            $output .= "Notes: " . htmlspecialchars($deal['notes']) . "\n";
        }
        
        $output .= "Created: " . date('Y-m-d', strtotime($deal['created_at'])) . "\n";
        $output .= "Last Modified: " . date('Y-m-d', strtotime($deal['posledni_uprava'])) . "\n";
        $output .= "\n" . str_repeat("-", 50) . "\n\n";
    }
    
    return $output;
}

// Prepare export options (current setup under label "Open Deals")
$export_options = [
    // NOTE: Although labeled "Open Deals", we keep current combined output (open + frozen)
    'open_deals' => formatDealInfo($open_deals, "Open Deals") . "\n\n" . formatDealInfo($frozen_deals, "Frozen Deals"),
];

$page_title = 'Advisory'; 
include 'head.php'; 
?>
<?php include 'header.php'; ?>

<div class="container">
    <div class="main-layout">
        <!-- Left Column -->
        <div class="left-column">
            <div class="section-header">
                <h1>Advisory</h1>
                <div class="header-actions">
                    <a href="index.php" class="nav-link">Back to Business Cases</a>
                </div>
            </div>
            
            <div class="content-section">
                <div style="margin: 20px 0;">
                    <label for="promptSelect" style="display: block; margin-bottom: 10px; font-weight: bold;">Select Advisory Prompt:</label>
                    <select id="promptSelect" style="width: 300px; padding: 8px; margin-bottom: 15px; font-size: 14px;">
                        <option value="">None</option>
                        <?php foreach ($advisoryprompts as $key => $prompt): ?>
                            <option value="<?= htmlspecialchars($key) ?>"><?= htmlspecialchars($key) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div style="margin: 20px 0;">
                    <label for="exportSelect" style="display: block; margin-bottom: 10px; font-weight: bold;">Select Export:</label>
                    <select id="exportSelect" style="width: 300px; padding: 8px; margin-bottom: 15px; font-size: 14px;">
                        <option value="">None</option>
                        <option value="open_deals">Open Deals</option>
                    </select>
                </div>
                
                <div style="margin: 20px 0;">
                    <button onclick="copyToClipboard()" class="save-button" style="margin-bottom: 10px;">Copy Text</button>
                    <button onclick="selectAllText()" class="secondary-button" style="margin-bottom: 10px;">Select All</button>
                </div>
                
                <textarea id="advisoryText" readonly style="width: 100%; height: 500px; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #ccc; resize: vertical;"></textarea>
            </div>
        </div>
        
        <!-- Right Column -->
        <div class="right-column">
            <div class="right-section">
                <h3>Quick Stats</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number"><?= count($open_deals) ?></div>
                        <div class="stat-label">Open Deals</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= count($frozen_deals) ?></div>
                        <div class="stat-label">Frozen Deals</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= number_format(array_sum(array_column($open_deals, 'hodnota')) / 1000, 0, ',', ' ') ?>k</div>
                        <div class="stat-label">Open Value</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= number_format(array_sum(array_column($frozen_deals, 'hodnota')) / 1000, 0, ',', ' ') ?>k</div>
                        <div class="stat-label">Frozen Value</div>
                    </div>
                </div>
            </div>
            
            <div class="right-section">
                <h3>Quick Actions</h3>
                <div class="quick-actions">
                    <a href="index.php" class="quick-action-btn">
                        Back to Business Cases
                    </a>
                    <button onclick="copyToClipboard()" class="quick-action-btn">
                        Copy Advisory Text
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// Data sources from PHP
const PROMPTS = <?php echo json_encode($advisoryprompts, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT); ?>;
const EXPORTS = <?php echo json_encode($export_options, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT); ?>;

function updateTextarea() {
    const promptKey = document.getElementById('promptSelect').value;
    const exportKey = document.getElementById('exportSelect').value;

    let parts = [];

    if (promptKey && PROMPTS[promptKey]) {
        parts.push(PROMPTS[promptKey]);
    }
    if (exportKey && EXPORTS[exportKey]) {
        if (parts.length > 0) parts.push(''); // empty line between prompt and export
        parts.push(EXPORTS[exportKey]);
    }

    document.getElementById('advisoryText').value = parts.join("\n");
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('promptSelect').addEventListener('change', updateTextarea);
    document.getElementById('exportSelect').addEventListener('change', updateTextarea);
    updateTextarea();
});

function copyToClipboard() {
    const textarea = document.getElementById('advisoryText');
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        alert('Text copied to clipboard!');
    } catch (err) {
        // Fallback for modern browsers
        navigator.clipboard.writeText(textarea.value).then(function() {
            alert('Text copied to clipboard!');
        }, function(err) {
            alert('Failed to copy text. Please select and copy manually.');
        });
    }
}

function selectAllText() {
    const textarea = document.getElementById('advisoryText');
    textarea.select();
    textarea.setSelectionRange(0, 99999);
}
</script>

</body>
</html>
