<?php
/**
 * Debug version of API endpoint to diagnose issues
 * Remove this file after fixing the issue
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');

$debug_info = [];

try {
    // Test 1: Check if config.php can be included
    $debug_info['test_config_include'] = 'Starting...';
    require_once __DIR__ . '/config.php';
    $debug_info['test_config_include'] = 'Success';
    
    // Test 2: Check database connection
    if (isset($mysqli)) {
        $debug_info['test_db_connection'] = 'mysqli object exists';
        if ($mysqli->connect_error) {
            $debug_info['test_db_connection'] = 'Error: ' . $mysqli->connect_error;
        } else {
            $debug_info['test_db_connection'] = 'Connected successfully';
        }
    } else {
        $debug_info['test_db_connection'] = 'mysqli not set';
    }
    
    // Test 3: Check if function exists
    if (function_exists('updateDealsStats')) {
        $debug_info['test_function_exists'] = 'updateDealsStats function exists';
        
        // Test 4: Try to call the function
        $stats = updateDealsStats();
        if ($stats !== false) {
            $debug_info['test_function_call'] = 'Success';
            $debug_info['stats'] = $stats;
        } else {
            $debug_info['test_function_call'] = 'Failed (returned false)';
        }
    } else {
        $debug_info['test_function_exists'] = 'updateDealsStats function NOT found';
    }
    
    // Test 5: Check file permissions
    $json_file = __DIR__ . '/api/stats.json';
    $api_dir = dirname($json_file);
    $debug_info['test_file_permissions'] = [
        'api_dir_exists' => is_dir($api_dir),
        'api_dir_writable' => is_writable($api_dir),
        'json_file_exists' => file_exists($json_file),
        'json_file_readable' => file_exists($json_file) ? is_readable($json_file) : false,
        'json_file_writable' => file_exists($json_file) ? is_writable($json_file) : false
    ];
    
    // Test 6: Check if JSON file can be read
    if (file_exists($json_file)) {
        $json_content = file_get_contents($json_file);
        if ($json_content !== false) {
            $json_data = json_decode($json_content, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $debug_info['test_json_read'] = 'Success';
                $debug_info['json_content'] = $json_data;
            } else {
                $debug_info['test_json_read'] = 'Invalid JSON: ' . json_last_error_msg();
            }
        } else {
            $debug_info['test_json_read'] = 'Failed to read file';
        }
    } else {
        $debug_info['test_json_read'] = 'File does not exist';
    }
    
} catch (Exception $e) {
    $debug_info['exception'] = [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ];
} catch (Error $e) {
    $debug_info['fatal_error'] = [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ];
}

echo json_encode($debug_info, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

?>
