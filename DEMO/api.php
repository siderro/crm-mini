<?php
/**
 * Public API endpoint for deals statistics
 * This endpoint is accessible without authentication
 */

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors, but log them

// Set CORS headers to allow external access
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Content-Type: application/json; charset=utf-8');

// Path to the JSON file
$json_file = __DIR__ . '/api/stats.json';

try {
    // Check if JSON file exists
    if (file_exists($json_file)) {
        // Read and output JSON file
        $json_content = file_get_contents($json_file);
        if ($json_content === false) {
            throw new Exception('Failed to read JSON file');
        }
        // Validate JSON
        $json_data = json_decode($json_content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON file: ' . json_last_error_msg());
        }
        echo $json_content;
    } else {
        // If file doesn't exist, try to generate it
        // Define a constant to signal we're loading from API (prevents die() in config.php)
        define('API_MODE', true);
        
        // Use output buffering to catch any die() output from config.php
        ob_start();
        
        // Try to include config.php
        $config_loaded = false;
        $db_error = false;
        
        try {
            // Suppress errors and capture output
            $old_error_handler = set_error_handler(function($errno, $errstr, $errfile, $errline) {
                return true; // Suppress error
            });
            
            $config_loaded = @include_once __DIR__ . '/config.php';
            
            restore_error_handler();
            
            // Check if die() was called (output buffer will contain it)
            $output = ob_get_clean();
            if (!empty($output) && (strpos($output, 'Connect Error') !== false || strpos($output, 'Error') !== false)) {
                $db_error = true;
            }
            
        } catch (Exception $e) {
            ob_end_clean();
            $db_error = true;
        } catch (Error $e) {
            ob_end_clean();
            $db_error = true;
        }
        
        // Check if config.php was loaded successfully
        if ($config_loaded === false) {
            $stats = [
                'openDeals' => 0,
                'frozenDeals' => 0,
                'openValue' => 0,
                'frozenValue' => 0,
                'pipelineCZK' => 0,
                'lastUpdated' => date('Y-m-d H:i:s'),
                'error' => 'Failed to load config.php'
            ];
            echo json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // Check if function exists first (it should be defined even if DB connection fails)
        if (!function_exists('updateDealsStats')) {
            $stats = [
                'openDeals' => 0,
                'frozenDeals' => 0,
                'openValue' => 0,
                'frozenValue' => 0,
                'pipelineCZK' => 0,
                'lastUpdated' => date('Y-m-d H:i:s'),
                'error' => 'updateDealsStats function not found - config.php may not have loaded properly'
            ];
            echo json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // Check if database connection is available
        $db_available = isset($mysqli) && $mysqli !== null && (!isset($mysqli->connect_error) || !$mysqli->connect_error);
        
        if (!$db_available && !$db_error) {
            // If we detected output that suggests die() was called, that's a DB error
            $db_error = true;
        }
        
        // Try to update stats (this will create the file)
        // The function will handle DB errors internally
        $stats = updateDealsStats();
        
        if ($stats === false) {
            // Return default stats if update failed
            $stats = [
                'openDeals' => 0,
                'frozenDeals' => 0,
                'openValue' => 0,
                'frozenValue' => 0,
                'pipelineCZK' => 0,
                'lastUpdated' => date('Y-m-d H:i:s'),
                'error' => 'Failed to update statistics'
            ];
        }
        
        // Output the stats
        echo json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    // Return error as JSON
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Internal server error',
        'details' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Error $e) {
    // Catch fatal errors (like from die() in config.php)
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Internal server error',
        'details' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

?>
