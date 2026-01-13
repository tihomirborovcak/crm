<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'slatkidar_signal_crm');
define('DB_USER', 'slatkidar_mufo');
define('DB_PASS', 'Mufo9867!');
define('DB_GRADOVI', 'slatkidar_gradovi');
define('BREVO_API_KEY', 'xkeysib-eb5ef98ce5df2e2077534c8d47bdf893dbfc2ea9d8611fd68432a30d04-4aLjvQtJVoR3n51S');
define('BREVO_API_URL', 'https://api.brevo.com/v3');
define('DEFAULT_SENDER_EMAIL', 'info@signal.hr');
define('DEFAULT_SENDER_NAME', 'Signal d.o.o.');
$EMAIL_SENDERS = ['zagorski-list' => ['email' => 'info@zagorski-list.hr', 'name' => 'Zagorski list'], 'signalprint' => ['email' => 'info@signalprint.hr', 'name' => 'Signalprint'], 'plakati' => ['email' => 'oglasavanje@signal.hr', 'name' => 'Signal Oglasavanje'], 'zagorje-portal' => ['email' => 'oglasi@zagorje.com', 'name' => 'Zagorje.com']];
define('BASE_PATH', __DIR__);
define('UPLOAD_PATH', __DIR__ . '/uploads');
define('APP_NAME', 'Signal CRM');
define('APP_VERSION', '2.0');
define('DEBUG_MODE', true);
date_default_timezone_set('Europe/Zagreb');
error_reporting(E_ALL);
ini_set('display_errors', 1);
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4", DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    }
    return $pdo;
}
function getGradoviDB() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO("mysql:host=".DB_HOST.";dbname=".DB_GRADOVI.";charset=utf8mb4", DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    }
    return $pdo;
}
