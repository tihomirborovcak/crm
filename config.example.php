<?php
/**
 * SIGNAL CRM - Konfiguracija
 *
 * Kopirajte ovu datoteku kao config.php i unesite svoje podatke
 */

// =====================================================
// BAZA PODATAKA
// =====================================================
define('DB_HOST', 'localhost');
define('DB_NAME', 'signal_crm');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');

// Baza lokacija (postojeća)
define('DB_GRADOVI', 'gradovi');

// =====================================================
// BREVO API
// =====================================================
define('BREVO_API_KEY', 'your_brevo_api_key');
define('BREVO_API_URL', 'https://api.brevo.com/v3');

// =====================================================
// EMAIL POSTAVKE
// =====================================================
define('DEFAULT_SENDER_EMAIL', 'info@signal.hr');
define('DEFAULT_SENDER_NAME', 'Signal d.o.o.');

// Senderi po servisu
$EMAIL_SENDERS = [
    'zagorski-list' => [
        'email' => 'info@zagorski-list.hr',
        'name' => 'Zagorski list'
    ],
    'signalprint' => [
        'email' => 'info@signalprint.hr',
        'name' => 'Signalprint'
    ],
    'plakati' => [
        'email' => 'oglasavanje@signal.hr',
        'name' => 'Signal Oglašavanje'
    ],
    'zagorje-portal' => [
        'email' => 'oglasi@zagorje.com',
        'name' => 'Zagorje.com'
    ]
];

// =====================================================
// PUTANJE
// =====================================================
define('BASE_PATH', __DIR__);
define('UPLOAD_PATH', __DIR__ . '/uploads');

// =====================================================
// OSTALO
// =====================================================
define('APP_NAME', 'Signal CRM');
define('APP_VERSION', '2.0');
define('DEBUG_MODE', false);  // Set to false in production

// Timezone
date_default_timezone_set('Europe/Zagreb');

// Error reporting
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// =====================================================
// DATABASE CONNECTION
// =====================================================
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ]
            );
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                die("Database connection failed: " . $e->getMessage());
            }
            die("Database connection failed");
        }
    }
    return $pdo;
}

// Baza lokacija
function getGradoviDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_GRADOVI . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                die("Gradovi DB connection failed: " . $e->getMessage());
            }
            die("Database connection failed");
        }
    }
    return $pdo;
}
