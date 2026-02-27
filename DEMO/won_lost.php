<?php
session_start();
if (!isset($_SESSION['user'])) {
    header('Location: login.php');
    exit();
}

require_once 'config.php';

// Get filter parameter
$filter = $_GET['filter'] ?? 'this_month';

// Build date filter for SQL
$date_filter = '';
switch ($filter) {
    case 'this_month':
        $date_filter = "AND YEAR(d.created_at) = YEAR(CURDATE()) AND MONTH(d.created_at) = MONTH(CURDATE())";
        break;
    case 'last_month':
        $date_filter = "AND YEAR(d.created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(d.created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))";
        break;
    case 'this_year':
        $date_filter = "AND YEAR(d.created_at) = YEAR(CURDATE())";
        break;
    case 'last_3_years':
        $date_filter = "AND d.created_at >= DATE_SUB(CURDATE(), INTERVAL 3 YEAR)";
        break;
    default:
        $date_filter = '';
}

// Fetch won deals (Work in progress and Done)
$won_deals_query = "
    SELECT 
        d.id,
        d.popis,
        d.hodnota,
        d.created_at,
        d.posledni_uprava,
        GROUP_CONCAT(CONCAT(c.jmeno, ' ', c.prijmeni) SEPARATOR ', ') as kontakt_jmeno
    FROM deals d
    LEFT JOIN deal_contacts dc ON d.id = dc.deal_id
    LEFT JOIN contacts c ON dc.contact_id = c.id
    LEFT JOIN deal_statuses ds ON d.stav_id = ds.id
    WHERE ds.name IN ('Work in progress', 'Done') $date_filter
    GROUP BY d.id, d.popis, d.hodnota, d.created_at, d.posledni_uprava
    ORDER BY d.posledni_uprava DESC
";

$won_result = $mysqli->query($won_deals_query);
$won_deals = [];
if ($won_result) {
    while ($row = $won_result->fetch_assoc()) {
        $won_deals[] = $row;
    }
}

// Fetch lost deals
$lost_deals_query = "
    SELECT 
        d.id,
        d.popis,
        d.hodnota,
        d.created_at,
        d.posledni_uprava,
        GROUP_CONCAT(CONCAT(c.jmeno, ' ', c.prijmeni) SEPARATOR ', ') as kontakt_jmeno
    FROM deals d
    LEFT JOIN deal_contacts dc ON d.id = dc.deal_id
    LEFT JOIN contacts c ON dc.contact_id = c.id
    LEFT JOIN deal_statuses ds ON d.stav_id = ds.id
    WHERE ds.name = 'Lost' $date_filter
    GROUP BY d.id, d.popis, d.hodnota, d.created_at, d.posledni_uprava
    ORDER BY d.posledni_uprava DESC
";

$lost_result = $mysqli->query($lost_deals_query);
$lost_deals = [];
if ($lost_result) {
    while ($row = $lost_result->fetch_assoc()) {
        $lost_deals[] = $row;
    }
}

$page_title = 'Won & Lost'; 
include 'head.php'; 
?>
<?php include 'header.php'; ?>

<div class="container">
    <div class="main-layout">
        <!-- Left Column - Won & Lost Content (2/3 width) -->
        <div class="left-column">
            <div class="section-header">
                <h1>Won & Lost Deals</h1>
                <div class="header-actions">
                    <a href="index.php" class="nav-link">Back to Business Cases</a>
                </div>
            </div>
            
            <!-- Filter Buttons -->
            <div class="filter-section">
                <div class="filter-buttons">
                    <a href="?filter=this_month" class="filter-btn <?= $filter === 'this_month' ? 'active' : '' ?>">This Month</a>
                    <a href="?filter=last_month" class="filter-btn <?= $filter === 'last_month' ? 'active' : '' ?>">Last Month</a>
                    <a href="?filter=this_year" class="filter-btn <?= $filter === 'this_year' ? 'active' : '' ?>">This Year</a>
                    <a href="?filter=whole_time" class="filter-btn <?= $filter === 'whole_time' ? 'active' : '' ?>">Whole Time</a>
                    <a href="?filter=last_3_years" class="filter-btn <?= $filter === 'last_3_years' ? 'active' : '' ?>">Last 3 Years</a>
                </div>
            </div>
            
            <!-- Won & Lost Deals Sub-columns -->
            <div class="deals-container">
                <!-- Won Deals Column -->
                <div class="deals-column">
                    <h3>Won Deals</h3>
                    <div class="deals-list">
                        <?php if (empty($won_deals)): ?>
                            <div class="empty-deals">No won deals found</div>
                        <?php else: ?>
                            <?php foreach ($won_deals as $deal): ?>
                                <div class="deal-item won">
                                    <div class="deal-name"><?= htmlspecialchars($deal['popis'] ?? 'Untitled') ?></div>
                                    <div class="deal-value"><?= number_format(($deal['hodnota'] ?? 0) / 1000, 0, ',', ' ') ?>k Kč</div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
                
                <!-- Lost Deals Column -->
                <div class="deals-column">
                    <h3>Lost Deals</h3>
                    <div class="deals-list">
                        <?php if (empty($lost_deals)): ?>
                            <div class="empty-deals">No lost deals found</div>
                        <?php else: ?>
                            <?php foreach ($lost_deals as $deal): ?>
                                <div class="deal-item lost">
                                    <div class="deal-name"><?= htmlspecialchars($deal['popis'] ?? 'Untitled') ?></div>
                                    <div class="deal-value"><?= number_format(($deal['hodnota'] ?? 0) / 1000, 0, ',', ' ') ?>k Kč</div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Right Column (1/3 width) -->
        <div class="right-column">
            <div class="right-section">
                <h3>Quick Stats</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number"><?= count($won_deals) ?></div>
                        <div class="stat-label">Won Deals</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= count($lost_deals) ?></div>
                        <div class="stat-label">Lost Deals</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= (count($won_deals) + count($lost_deals)) > 0 ? round((count($won_deals) / (count($won_deals) + count($lost_deals))) * 100) : 0 ?>%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= number_format((array_sum(array_column($won_deals, 'hodnota')) + array_sum(array_column($lost_deals, 'hodnota'))) / 1000, 0, ',', ' ') ?>k Kč</div>
                        <div class="stat-label">Total Value</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

</body>
</html>
