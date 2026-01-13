<?php
/**
 * SIGNAL CRM - API
 * Modularni RESTful API
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/BrevoMailer.php';

// =====================================================
// HELPER FUNKCIJE
// =====================================================
function sendResponse($success, $data = null, $error = null) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAuth() {
    if (!isset($_SESSION['user_id'])) {
        sendResponse(false, null, 'Neovlašteni pristup');
    }
}

function getCurrentUser() {
    if (!isset($_SESSION['user_id'])) return null;
    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT id, ime, prezime, email, uloga FROM korisnici WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch();
}

function sanitize($value) {
    return $value !== null ? trim($value) : null;
}

// =====================================================
// ROUTING
// =====================================================
$endpoint = $_GET['endpoint'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$input = null;

if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    $input = json_decode(file_get_contents('php://input'), true);
}

$pdo = getDB();

// Učitaj odgovarajući modul
$handled = false;

// Auth endpoints
if (in_array($endpoint, ['login', 'logout', 'current-user'])) {
    require_once __DIR__ . '/api/auth.php';
    $handled = true;
}

// Firme/Klijenti
if (in_array($endpoint, ['firme', 'klijenti'])) {
    require_once __DIR__ . '/api/firme.php';
    $handled = true;
}

// Kontakti
if (in_array($endpoint, ['kontakti', 'kontakti-admin', 'kontakti-stats'])) {
    require_once __DIR__ . '/api/kontakti.php';
    $handled = true;
}

// Aktivnosti
if ($endpoint === 'aktivnosti') {
    require_once __DIR__ . '/api/aktivnosti.php';
    $handled = true;
}

// Prilike i Pipeline
if (in_array($endpoint, ['prilike', 'prilike-faza', 'prilika-stavke', 'faze-pipeline', 'razlozi-gubitka', 'pipeline-stats'])) {
    require_once __DIR__ . '/api/prilike.php';
    $handled = true;
}

// Lookup tablice (servisi, kategorije, lokacije)
if (in_array($endpoint, ['servisi', 'kategorije', 'tipovi-subjekata', 'zupanije', 'gradovi-opcine', 'naselja'])) {
    require_once __DIR__ . '/api/lookup.php';
    $handled = true;
}

// Korisnici
if ($endpoint === 'korisnici') {
    require_once __DIR__ . '/api/korisnici.php';
    $handled = true;
}

// Admin (servisi, kategorije, faze, razlozi)
if (in_array($endpoint, ['admin-servisi', 'admin-kategorije', 'admin-faze', 'admin-razlozi'])) {
    require_once __DIR__ . '/api/admin.php';
    $handled = true;
}

// Tagovi
if (in_array($endpoint, ['tagovi', 'firma-tagovi', 'bulk-tagovi', 'admin-tagovi'])) {
    require_once __DIR__ . '/api/tagovi.php';
    $handled = true;
}

// Email
if (in_array($endpoint, ['send-email', 'kampanje', 'brevo-test'])) {
    require_once __DIR__ . '/api/email.php';
    $handled = true;
}

// Dashboard i statistike
if (in_array($endpoint, ['dashboard-stats', 'status-stats', 'servisi-stats', 'zupanije-stats', 'aktivnosti-nadolazece', 'firme-by-tag'])) {
    require_once __DIR__ . '/api/dashboard.php';
    $handled = true;
}

// Import
if (in_array($endpoint, ['import-csv-klijenti', 'autocomplete-kupci', 'import-firma', 'import-jls', 'import-bulk', 'check-oibs', 'tag-ensure'])) {
    require_once __DIR__ . '/api/import.php';
    $handled = true;
}

// Ako endpoint nije obrađen
if (!$handled) {
    sendResponse(false, null, 'Nepoznat endpoint: ' . $endpoint);
}
