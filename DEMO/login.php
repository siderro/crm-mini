<?php
session_start();
require_once 'config.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    if (isset($users[$username]) && $users[$username]['password'] === $password) {
        $_SESSION['user'] = $username;
        $_SESSION['user_role'] = $users[$username]['role'];
        $_SESSION['user_name'] = $users[$username]['name'];
        header('Location: index.php');
        exit();
    } else {
        $error = 'Invalid username or password.';
    }
}

$page_title = 'Login'; 
include 'head.php'; 
?>
<?php include 'header.php'; ?>
    <h2>Login</h2>
    <?php if ($error): ?>
        <p class="login-error"><?= htmlspecialchars($error) ?></p>
    <?php endif; ?>
    <form method="post" action="login.php">
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" required><br>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required><br>
        <button type="submit">Login</button>
    </form>
    
    <div class="login-ascii">
        <pre>░█▀█░█▀█░█▀█
░█░█░█▀▀░█▀▀
░▀▀▀░▀░░░▀░░</pre>
    </div>
</body>
</html> 