<?php
/**
 * API Modul: Kontakti Admin
 * Administracija kontakata s filterima i statistikama
 */

requireAuth();

switch ($endpoint) {
    
    // =====================================================
    // KONTAKTI-ADMIN - Lista kontakata s filterima
    // =====================================================
    case 'kontakti-admin':
        if ($method !== 'GET') sendResponse(false, null, 'Metoda nije dozvoljena');
        
        $where = ["1=1"];
        $params = [];
        
        // Pretraga
        if (!empty($_GET['search'])) {
            $search = '%' . $_GET['search'] . '%';
            $where[] = "(k.ime LIKE ? OR k.prezime LIKE ? OR k.email LIKE ?)";
            $params = array_merge($params, [$search, $search, $search]);
        }
        
        // Filter: ima email
        if (isset($_GET['has_email'])) {
            if ($_GET['has_email'] === '1') {
                $where[] = "k.email IS NOT NULL AND k.email != ''";
            } else {
                $where[] = "(k.email IS NULL OR k.email = '')";
            }
        }
        
        // Filter: samo primarni
        if (!empty($_GET['is_primary'])) {
            $where[] = "k.is_primary = 1";
        }
        
        // Filter: firme bez ijednog emaila
        if (!empty($_GET['firma_bez_emaila'])) {
            $where[] = "NOT EXISTS (
                SELECT 1 FROM kontakti k2 
                WHERE k2.firma_id = k.firma_id 
                AND k2.email IS NOT NULL AND k2.email != ''
            )";
        }
        
        $whereClause = implode(' AND ', $where);

        // Paginacija
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        // Ukupan broj
        $countSql = "SELECT COUNT(*) FROM kontakti k LEFT JOIN firme f ON k.firma_id = f.id WHERE $whereClause";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $totalCount = (int)$countStmt->fetchColumn();

        $sql = "
            SELECT
                k.*,
                f.naziv AS firma_naziv
            FROM kontakti k
            LEFT JOIN firme f ON k.firma_id = f.id
            WHERE $whereClause
            ORDER BY
                CASE WHEN k.email IS NULL OR k.email = '' THEN 0 ELSE 1 END,
                f.naziv,
                k.is_primary DESC,
                k.ime
            LIMIT $limit OFFSET $offset
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $kontakti = $stmt->fetchAll();

        sendResponse(true, [
            'kontakti' => $kontakti,
            'total' => $totalCount,
            'limit' => $limit,
            'offset' => $offset
        ]);
        break;
    
    // =====================================================
    // KONTAKTI-STATS - Statistike kontakata
    // =====================================================
    case 'kontakti-stats':
        if ($method !== 'GET') sendResponse(false, null, 'Metoda nije dozvoljena');
        
        // Ukupno kontakata
        $total = $pdo->query("SELECT COUNT(*) FROM kontakti")->fetchColumn();
        
        // S emailom
        $withEmail = $pdo->query("SELECT COUNT(*) FROM kontakti WHERE email IS NOT NULL AND email != ''")->fetchColumn();
        
        // Bez emaila
        $withoutEmail = $pdo->query("SELECT COUNT(*) FROM kontakti WHERE email IS NULL OR email = ''")->fetchColumn();
        
        // Firme koje nemaju niti jedan kontakt s emailom
        $firmeBezEmaila = $pdo->query("
            SELECT COUNT(DISTINCT f.id) 
            FROM firme f
            WHERE NOT EXISTS (
                SELECT 1 FROM kontakti k 
                WHERE k.firma_id = f.id 
                AND k.email IS NOT NULL AND k.email != ''
            )
        ")->fetchColumn();
        
        sendResponse(true, [
            'total' => (int)$total,
            'with_email' => (int)$withEmail,
            'without_email' => (int)$withoutEmail,
            'firme_bez_emaila' => (int)$firmeBezEmaila
        ]);
        break;
    
    // =====================================================
    // KONTAKTI - CRUD (POST/DELETE)
    // =====================================================
    case 'kontakti':
        if ($method === 'GET') {
            // Dohvat kontakata za firmu
            if (!empty($_GET['firma_id'])) {
                $stmt = $pdo->prepare("SELECT * FROM kontakti WHERE firma_id = ? ORDER BY is_primary DESC, ime");
                $stmt->execute([$_GET['firma_id']]);
                sendResponse(true, $stmt->fetchAll());
            }
            
            // Dohvat jednog kontakta
            if (!empty($_GET['id'])) {
                $stmt = $pdo->prepare("
                    SELECT k.*, f.naziv AS firma_naziv 
                    FROM kontakti k 
                    LEFT JOIN firme f ON k.firma_id = f.id 
                    WHERE k.id = ?
                ");
                $stmt->execute([$_GET['id']]);
                sendResponse(true, $stmt->fetch());
            }
            
            sendResponse(false, null, 'Potreban je firma_id ili id');
        }
        
        if ($method === 'POST') {
            $id = $input['id'] ?? null;
            $firmaId = $input['firma_id'] ?? null;
            
            if (!$firmaId && !$id) {
                sendResponse(false, null, 'Potreban je firma_id');
            }
            
            // Ako je is_primary = 1, makni primary sa svih ostalih kontakata te firme
            if (!empty($input['is_primary'])) {
                if ($id) {
                    // Dohvati firma_id iz postojećeg kontakta
                    $stmt = $pdo->prepare("SELECT firma_id FROM kontakti WHERE id = ?");
                    $stmt->execute([$id]);
                    $firmaId = $stmt->fetchColumn();
                }
                if ($firmaId) {
                    $pdo->prepare("UPDATE kontakti SET is_primary = 0 WHERE firma_id = ?")->execute([$firmaId]);
                }
            }
            
            $data = [
                'ime' => sanitize($input['ime'] ?? ''),
                'prezime' => sanitize($input['prezime'] ?? ''),
                'email' => sanitize($input['email'] ?? '') ?: null,
                'telefon' => sanitize($input['telefon'] ?? ''),
                'mobitel' => sanitize($input['mobitel'] ?? ''),
                'pozicija' => sanitize($input['pozicija'] ?? ''),
                'is_primary' => $input['is_primary'] ?? 0
            ];
            
            if ($id) {
                // Update
                $sets = [];
                $params = [];
                foreach ($data as $key => $value) {
                    $sets[] = "$key = ?";
                    $params[] = $value;
                }
                $params[] = $id;
                
                $pdo->prepare("UPDATE kontakti SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);
                sendResponse(true, ['id' => $id]);
            } else {
                // Insert
                $data['firma_id'] = $firmaId;
                $columns = implode(', ', array_keys($data));
                $placeholders = implode(', ', array_fill(0, count($data), '?'));
                $pdo->prepare("INSERT INTO kontakti ($columns) VALUES ($placeholders)")->execute(array_values($data));
                sendResponse(true, ['id' => $pdo->lastInsertId()]);
            }
        }
        
        if ($method === 'DELETE') {
            $id = $input['id'] ?? null;
            if (!$id) sendResponse(false, null, 'ID je obavezan');

            // Provjeri vezane prilike
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM prilike WHERE kontakt_id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetchColumn() > 0) {
                sendResponse(false, null, 'Kontakt ima vezane prilike. Prvo uklonite kontakt s prilika.');
            }

            // Provjeri vezane aktivnosti
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM aktivnosti WHERE kontakt_id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetchColumn() > 0) {
                sendResponse(false, null, 'Kontakt ima vezane aktivnosti. Prvo obrišite aktivnosti.');
            }

            $pdo->prepare("DELETE FROM kontakti WHERE id = ?")->execute([$id]);
            sendResponse(true);
        }
        break;
}
