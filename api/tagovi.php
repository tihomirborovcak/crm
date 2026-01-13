<?php
/**
 * API Modul: Tagovi
 */

requireAuth();

switch ($endpoint) {
    
    // =====================================================
    // TAGOVI - Lista svih tagova
    // =====================================================
    case 'tagovi':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM tagovi ORDER BY naziv");
            sendResponse(true, $stmt->fetchAll());
            
        } elseif ($method === 'POST') {
            $naziv = $input['naziv'] ?? '';
            $boja = $input['boja'] ?? '#3B82F6';
            
            if (!$naziv) sendResponse(false, null, 'Naziv je obavezan');
            
            $stmt = $pdo->prepare("INSERT INTO tagovi (naziv, boja) VALUES (?, ?)");
            $stmt->execute([$naziv, $boja]);
            
            sendResponse(true, ['id' => $pdo->lastInsertId()]);
            
        } elseif ($method === 'DELETE') {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            if (!$id) sendResponse(false, null, 'ID je obavezan');
            
            // Obriši veze pa tag
            $pdo->prepare("DELETE FROM firma_tagovi WHERE tag_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM tagovi WHERE id = ?")->execute([$id]);
            
            sendResponse(true);
        }
        break;
    
    // =====================================================
    // FIRMA-TAGOVI - Tagovi za pojedinu firmu
    // =====================================================
    case 'firma-tagovi':
        $firmaId = $_GET['firma_id'] ?? $input['firma_id'] ?? null;
        
        if ($method === 'GET') {
            if (!$firmaId) sendResponse(false, null, 'firma_id je obavezan');
            
            $stmt = $pdo->prepare("
                SELECT t.* 
                FROM tagovi t
                JOIN firma_tagovi ft ON t.id = ft.tag_id
                WHERE ft.firma_id = ?
                ORDER BY t.naziv
            ");
            $stmt->execute([$firmaId]);
            sendResponse(true, $stmt->fetchAll());
            
        } elseif ($method === 'POST') {
            // Dodaj tag firmi
            $tagId = $input['tag_id'] ?? null;
            $firmaId = $input['firma_id'] ?? null;
            
            if (!$tagId || !$firmaId) sendResponse(false, null, 'firma_id i tag_id su obavezni');
            
            // Provjeri postoji li već
            $stmt = $pdo->prepare("SELECT 1 FROM firma_tagovi WHERE firma_id = ? AND tag_id = ?");
            $stmt->execute([$firmaId, $tagId]);
            if ($stmt->fetch()) {
                sendResponse(true, ['message' => 'Tag već postoji']);
            } else {
                $pdo->prepare("INSERT INTO firma_tagovi (firma_id, tag_id) VALUES (?, ?)")
                    ->execute([$firmaId, $tagId]);
                sendResponse(true, ['message' => 'Tag dodan']);
            }
            
        } elseif ($method === 'DELETE') {
            // Ukloni tag s firme
            $tagId = $input['tag_id'] ?? $_GET['tag_id'] ?? null;
            $firmaId = $input['firma_id'] ?? $_GET['firma_id'] ?? null;
            
            if (!$tagId || !$firmaId) sendResponse(false, null, 'firma_id i tag_id su obavezni');
            
            $pdo->prepare("DELETE FROM firma_tagovi WHERE firma_id = ? AND tag_id = ?")
                ->execute([$firmaId, $tagId]);
            sendResponse(true);
        }
        break;
    
    // =====================================================
    // BULK-TAGOVI - Dodaj tag više firmama odjednom
    // =====================================================
    case 'bulk-tagovi':
        if ($method !== 'POST') sendResponse(false, null, 'Samo POST metoda');
        
        $firmaIds = $input['firma_ids'] ?? [];
        $tagId = $input['tag_id'] ?? null;
        $action = $input['action'] ?? 'add'; // add ili remove
        
        if (empty($firmaIds) || !$tagId) {
            sendResponse(false, null, 'firma_ids i tag_id su obavezni');
        }
        
        $affected = 0;
        
        if ($action === 'add') {
            $stmt = $pdo->prepare("INSERT IGNORE INTO firma_tagovi (firma_id, tag_id) VALUES (?, ?)");
            foreach ($firmaIds as $firmaId) {
                $stmt->execute([$firmaId, $tagId]);
                $affected += $stmt->rowCount();
            }
        } else {
            $stmt = $pdo->prepare("DELETE FROM firma_tagovi WHERE firma_id = ? AND tag_id = ?");
            foreach ($firmaIds as $firmaId) {
                $stmt->execute([$firmaId, $tagId]);
                $affected += $stmt->rowCount();
            }
        }
        
        sendResponse(true, [
            'affected' => $affected,
            'message' => $action === 'add' ? "Tag dodan na $affected firmi" : "Tag uklonjen s $affected firmi"
        ]);
        break;
    
    // =====================================================
    // ADMIN-TAGOVI - Za admin panel s brojem firmi
    // =====================================================
    case 'admin-tagovi':
        if ($method === 'GET') {
            $stmt = $pdo->query("
                SELECT t.*, COUNT(ft.firma_id) as broj_firmi
                FROM tagovi t
                LEFT JOIN firma_tagovi ft ON t.id = ft.tag_id
                GROUP BY t.id
                ORDER BY t.naziv
            ");
            sendResponse(true, $stmt->fetchAll());
            
        } elseif ($method === 'POST') {
            $id = $input['id'] ?? null;
            $naziv = $input['naziv'] ?? '';
            $boja = $input['boja'] ?? '#3b82f6';
            
            if (!$naziv) sendResponse(false, null, 'Naziv je obavezan');
            
            if ($id) {
                $pdo->prepare("UPDATE tagovi SET naziv = ?, boja = ? WHERE id = ?")
                    ->execute([$naziv, $boja, $id]);
            } else {
                $pdo->prepare("INSERT INTO tagovi (naziv, boja) VALUES (?, ?)")
                    ->execute([$naziv, $boja]);
                $id = $pdo->lastInsertId();
            }
            
            sendResponse(true, ['id' => $id]);
            
        } elseif ($method === 'DELETE') {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            if (!$id) sendResponse(false, null, 'ID je obavezan');
            
            // Obriši veze pa tag
            $pdo->prepare("DELETE FROM firma_tagovi WHERE tag_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM tagovi WHERE id = ?")->execute([$id]);
            
            sendResponse(true);
        }
        break;
}
