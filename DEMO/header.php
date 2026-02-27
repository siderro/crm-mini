<?php
// header.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once 'config.php';

// Get today's date info
$today = new DateTime();
$date_str = $today->format('j.n');
$day_of_week = strtolower($today->format('l'));
$day_of_week_cz = [
    'monday' => 'pondělí',
    'tuesday' => 'úterý',
    'wednesday' => 'středa',
    'thursday' => 'čtvrtek',
    'friday' => 'pátek',
    'saturday' => 'sobota',
    'sunday' => 'neděle',
];
$day_str = isset($day_of_week_cz[$day_of_week]) ? $day_of_week_cz[$day_of_week] : $day_of_week;

// Quick Stats for header (Opp status only)
$total_cases = isset($header_deals) ? count($header_deals) : 0;
$total_value = isset($header_deals) ? array_sum(array_column($header_deals, 'hodnota')) : 0;
?>
<div class="header">
    <div class="header-left">
        <a href="index.php"><img src="logo SG.svg" alt="Logo"></a>
    </div>
    <div class="header-center">
        <div>
            <pre>░█▀█░█▀█░█▀█
░█░█░█▀▀░█▀▀
░▀▀▀░▀░░░▀░░</pre>
        </div>
    </div>
    <div class="header-right">
        <div class="date-info">
            Today: <span><?= $date_str ?></span>
            <span class="day">(<?= $day_str ?>)</span>
        </div>
        <div class="stats-info">
            Opp Cases: <span><?= $total_cases ?></span>
            Opp Value: <span><?= number_format($total_value / 1000, 0, ',', ' ') ?>k Kč</span>
        </div>
        <?php if (isset($_SESSION['user'])): ?>
            <span class="user-info">Logged in as: <?= htmlspecialchars($_SESSION['user']) ?></span>
            <a href="Extras.php" class="nav-link">Extras</a>
            <a href="Advisory.php" class="nav-link">Advisory</a>
            <a href="won_lost.php" class="nav-link">Won&Lost</a>
            <a href="logout.php" class="nav-link">Logout</a>
        <?php else: ?>
            <a href="login.php" class="nav-link">Login</a>
        <?php endif; ?>
    </div>
</div> 