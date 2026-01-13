<?php
/**
 * API Modul: Autentifikacija
 */

switch ($endpoint) {
    case 'login':
        if ($method !== 'POST') sendResponse(false, null, 'Metoda nije dozvoljena');
        
        $email = sanitize($input['email'] ?? '');
        $password = $input['password'] ?? '';
        
        $stmt = $pdo->prepare("SELECT * FROM korisnici WHERE email = ? AND status = 'aktivan'");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['lozinka'])) {
            $_SESSION['user_id'] = $user['id'];
            $pdo->prepare("UPDATE korisnici SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);
            unset($user['lozinka']);
            sendResponse(true, $user);
        }
        
        sendResponse(false, null, 'Pogrešan email ili lozinka');
        break;
        
    case 'logout':
        session_destroy();
        sendResponse(true);
        break;
        
    case 'current-user':
        $user = getCurrentUser();
        if ($user) {
            sendResponse(true, $user);
        }
        sendResponse(false, null, 'Nije prijavljen');
        break;
}
