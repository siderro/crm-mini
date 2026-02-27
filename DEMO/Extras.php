<?php
session_start();
if (!isset($_SESSION['user'])) {
    header('Location: login.php');
    exit();
}

require_once 'config.php';

// Handle CSV download
if (isset($_GET['export']) && $_GET['export'] === 'csv' && isset($_GET['type']) && $_GET['type'] === 'projects') {
    // Fetch all projects (deals)
    $projects_query = "
        SELECT 
            d.popis as name,
            d.hodnota as value,
            d.created_at as date_added,
            d.posledni_uprava as date_changed
        FROM deals d
        ORDER BY d.created_at DESC
    ";
    
    $projects_result = $mysqli->query($projects_query);
    
    // Set headers for CSV download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="list_of_projects_' . date('Y-m-d') . '.csv"');
    
    // Create output stream
    $output = fopen('php://output', 'w');
    
    // Add BOM for UTF-8 (helps Excel display special characters correctly)
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // Write CSV header
    fputcsv($output, ['Name', 'Value', 'Date Added', 'Date Changed'], ';');
    
    // Write data rows
    if ($projects_result) {
        while ($row = $projects_result->fetch_assoc()) {
            fputcsv($output, [
                $row['name'],
                number_format($row['value'], 2, ',', ' '),
                date('Y-m-d H:i:s', strtotime($row['date_added'])),
                date('Y-m-d H:i:s', strtotime($row['date_changed']))
            ], ';');
        }
    }
    
    fclose($output);
    exit();
}

// Handle Markdown download
if (isset($_GET['export']) && $_GET['export'] === 'md' && isset($_GET['type']) && $_GET['type'] === 'projects') {
    // Fetch all projects (deals)
    $projects_query = "
        SELECT 
            d.popis as name,
            d.hodnota as value,
            d.created_at as date_added,
            d.posledni_uprava as date_changed
        FROM deals d
        ORDER BY d.created_at DESC
    ";
    
    $projects_result = $mysqli->query($projects_query);
    
    // Set headers for Markdown download
    header('Content-Type: text/markdown; charset=utf-8');
    header('Content-Disposition: attachment; filename="list_of_projects_' . date('Y-m-d') . '.md"');
    
    // Start Markdown content
    echo "# List of Projects\n\n";
    echo "Generated: " . date('Y-m-d H:i:s') . "\n\n";
    echo "| Name | Value | Date Added | Date Changed |\n";
    echo "|------|-------|------------|--------------|\n";
    
    // Write data rows
    if ($projects_result) {
        while ($row = $projects_result->fetch_assoc()) {
            $name = htmlspecialchars($row['name'] ?? '');
            $value = number_format($row['value'], 2, ',', ' ') . ' Kč';
            $date_added = date('Y-m-d H:i:s', strtotime($row['date_added']));
            $date_changed = date('Y-m-d H:i:s', strtotime($row['date_changed']));
            
            echo "| " . $name . " | " . $value . " | " . $date_added . " | " . $date_changed . " |\n";
        }
    }
    
    exit();
}

// Fetch all projects for display
$projects_query = "
    SELECT 
        d.popis as name,
        d.hodnota as value,
        d.created_at as date_added,
        d.posledni_uprava as date_changed
    FROM deals d
    ORDER BY d.created_at DESC
";

$projects_result = $mysqli->query($projects_query);
$projects = [];
if ($projects_result) {
    while ($row = $projects_result->fetch_assoc()) {
        $projects[] = $row;
    }
}

$page_title = 'Extras'; 
include 'head.php'; 
?>
<?php include 'header.php'; ?>

<div class="container">
    <div class="main-layout">
        <!-- Left Column -->
        <div class="left-column">
            <div class="section-header">
                <h1>Extras</h1>
                <div class="header-actions">
                    <a href="index.php" class="nav-link">Back to Business Cases</a>
                </div>
            </div>
            
            <!-- List of Projects Export Section -->
            <div class="content-section" style="margin-bottom: 30px;">
                <h2>List of Projects</h2>
                <p>Export list of all projects with Name, Value, Date Added, and Date Changed.</p>
                
                <div style="margin: 20px 0;">
                    <a href="?export=csv&type=projects" class="save-button" style="display: inline-block; margin-right: 10px; text-decoration: none;">
                        Download CSV
                    </a>
                    <a href="?export=md&type=projects" class="save-button" style="display: inline-block; text-decoration: none;">
                        Download Markdown
                    </a>
                </div>
                
                <div class="table-container">
                    <table class="business-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Value</th>
                                <th>Date Added</th>
                                <th>Date Changed</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($projects)): ?>
                                <tr>
                                    <td colspan="4" class="empty-state">
                                        No projects found
                                    </td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($projects as $project): ?>
                                    <tr>
                                        <td><?= htmlspecialchars($project['name'] ?? '') ?></td>
                                        <td><?= number_format(($project['value'] ?? 0) / 1000, 0, ',', ' ') ?>k Kč</td>
                                        <td><?= date('Y-m-d H:i:s', strtotime($project['date_added'])) ?></td>
                                        <td><?= date('Y-m-d H:i:s', strtotime($project['date_changed'])) ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Future export sections can be added here -->
            
        </div>
        
        <!-- Right Column -->
        <div class="right-column">
            <div class="right-section">
                <h3>Quick Stats</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number"><?= count($projects) ?></div>
                        <div class="stat-label">Total Projects</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number"><?= number_format(array_sum(array_column($projects, 'value')) / 1000, 0, ',', ' ') ?>k</div>
                        <div class="stat-label">Total Value</div>
                    </div>
                </div>
            </div>
            
            <div class="right-section">
                <h3>Quick Actions</h3>
                <div class="quick-actions">
                    <a href="index.php" class="quick-action-btn">
                        Back to Business Cases
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

</body>
</html>

