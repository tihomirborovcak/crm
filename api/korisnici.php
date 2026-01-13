<?php
/**
 * API Modul: Korisnici
 */

requireAuth();
$currentUser = getCurrentUser();

if ($method === 'GET') {
    $korisnici = $pdo->query("SELECT id, ime, prezime, email, uloga, telefon, status, last_login FROM korisnici ORDER BY ime")->fetchAll();
    sendResponse(true, $korisnici);
    
} elseif ($method === 'POST') {
    if ($currentUser['uloga'] !== 'admin') {
        sendResponse(false, null, 'Samo admin može upravljati korisnicima');
    }
    
    $id = $input['id'] ?? null;
    
    if ($id) {
        $sql = "UPDATE korisnici SET ime = ?, prezime = ?, email = ?, uloga = ?, telefon = ?, status = ?";
        $params = [
            $input['ime'],
            $input['prezime'],
            $input['email'],
            $input['uloga'],
            $input['telefon'] ?? '',
            $input['status']
        ];
        
        if (!empty($input['lozinka'])) {
            $sql .= ", lozinka = ?";
            $params[] = password_hash($input['lozinka'], PASSWORD_DEFAULT);
        }
        
        $sql .= " WHERE id = ?";
        $params[] = $id;
        
        $pdo->prepare($sql)->execute($params);
    } else {
        $pdo->prepare("
            INSERT INTO korisnici (ime, prezime, email, lozinka, uloga, telefon, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ")->execute([
            $input['ime'],
            $input['prezime'],
            $input['email'],
            password_hash($input['lozinka'], PASSWORD_DEFAULT),
            $input['uloga'],
            $input['telefon'] ?? '',
            $input['status'] ?? 'aktivan'
        ]);
        $id = $pdo->lastInsertId();
    }
    
    sendResponse(true, ['id' => $id]);
    
} elseif ($method === 'DELETE') {
    if ($currentUser['uloga'] !== 'admin') {
        sendResponse(false, null, 'Samo admin može brisati korisnike');
    }
    
    $id = $input['id'];
    if ($id === $_SESSION['user_id']) {
        sendResponse(false, null, 'Ne možete obrisati sami sebe');
    }
    
    $pdo->prepare("DELETE FROM korisnici WHERE id = ?")->execute([$id]);
    sendResponse(true);
}
