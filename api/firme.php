<?php
/**
 * API Modul: Firme (Klijenti)
 */

requireAuth();

if ($method === 'GET') {
    // Ako je tražen specifičan ID, vrati samo tu firmu
    if (!empty($_GET['id'])) {
        $gradoviDB = DB_GRADOVI;
        $stmt = $pdo->prepare("
            SELECT 
                f.*,
                k.naziv AS kategorija_naziv,
                k.boja AS kategorija_boja,
                ts.naziv AS tip_naziv,
                ts.kratica AS tip_kratica,
                go.naziv AS grad_opcina,
                go.tip AS lokacija_tip,
                z.naziv AS zupanija
            FROM firme f
            LEFT JOIN kategorije k ON f.kategorija_id = k.id
            LEFT JOIN tipovi_subjekata ts ON f.tip_subjekta_id = ts.id
            LEFT JOIN {$gradoviDB}.gradovi_opcine go ON f.grad_opcina_id = go.id
            LEFT JOIN {$gradoviDB}.zupanije z ON f.zupanija_id = z.id
            WHERE f.id = ?
        ");
        $stmt->execute([$_GET['id']]);
        $firma = $stmt->fetch();
        
        if ($firma) {
            // Kontakti
            $stmt = $pdo->prepare("SELECT * FROM kontakti WHERE firma_id = ? ORDER BY is_primary DESC");
            $stmt->execute([$firma['id']]);
            $firma['kontakti'] = $stmt->fetchAll();
            
            // Servisi
            $stmt = $pdo->prepare("
                SELECT s.*, fs.status as servis_status 
                FROM servisi s 
                JOIN firma_servisi fs ON s.id = fs.servis_id 
                WHERE fs.firma_id = ?
            ");
            $stmt->execute([$firma['id']]);
            $firma['servisi'] = $stmt->fetchAll();
            
            // Tagovi
            $stmt = $pdo->prepare("
                SELECT t.* FROM tagovi t 
                JOIN firma_tagovi ft ON t.id = ft.tag_id 
                WHERE ft.firma_id = ?
            ");
            $stmt->execute([$firma['id']]);
            $firma['tagovi'] = $stmt->fetchAll();
            
            // Prilike
            $stmt = $pdo->prepare("
                SELECT p.*, fp.naziv as faza_naziv, fp.boja as faza_boja
                FROM prilike p
                LEFT JOIN faze_pipeline fp ON p.faza_id = fp.id
                WHERE p.firma_id = ?
                ORDER BY p.created_at DESC
            ");
            $stmt->execute([$firma['id']]);
            $firma['prilike'] = $stmt->fetchAll();
        }
        
        sendResponse(true, $firma);
    }
    
    $where = ["1=1"];
    $params = [];
    
    $searchTerm = '';
    if (!empty($_GET['search'])) {
        $searchTerm = $_GET['search'];
        $search = '%' . $searchTerm . '%';
        $where[] = "(f.naziv LIKE ? OR f.oib LIKE ? OR f.telefon LIKE ?)";
        $params = array_merge($params, [$search, $search, $search]);
    }
    
    if (!empty($_GET['status'])) {
        $where[] = "f.status = ?";
        $params[] = $_GET['status'];
    }
    
    if (!empty($_GET['kategorija_id'])) {
        $where[] = "f.kategorija_id = ?";
        $params[] = $_GET['kategorija_id'];
    }

    if (!empty($_GET['tip_subjekta_id'])) {
        $where[] = "f.tip_subjekta_id = ?";
        $params[] = $_GET['tip_subjekta_id'];
    }

    if (!empty($_GET['zupanija_id'])) {
        $where[] = "f.zupanija_id = ?";
        $params[] = $_GET['zupanija_id'];
    }
    
    if (!empty($_GET['grad_opcina_id'])) {
        $where[] = "f.grad_opcina_id = ?";
        $params[] = $_GET['grad_opcina_id'];
    }
    
    if (!empty($_GET['servis_id'])) {
        $where[] = "EXISTS (SELECT 1 FROM firma_servisi fs WHERE fs.firma_id = f.id AND fs.servis_id = ?)";
        $params[] = $_GET['servis_id'];
    }
    
    if (!empty($_GET['tag_id'])) {
        $where[] = "EXISTS (SELECT 1 FROM firma_tagovi ft WHERE ft.firma_id = f.id AND ft.tag_id = ?)";
        $params[] = $_GET['tag_id'];
    }
    
    if (!empty($_GET['tip'])) {
        $where[] = "go.tip = ?";
        $params[] = $_GET['tip'];
    }
    
    $whereClause = implode(' AND ', $where);
    $gradoviDB = DB_GRADOVI;

    // Ako je search aktivan, prioritiziraj firme čiji naziv počinje s traženim pojmom
    $orderBy = "f.naziv";
    if ($searchTerm) {
        $orderBy = "(CASE WHEN f.naziv LIKE ? THEN 0 ELSE 1 END), f.naziv";
        $params[] = $searchTerm . '%';
    }

    // Paginacija
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    // Ukupan broj za paginaciju
    $countSql = "
        SELECT COUNT(*)
        FROM firme f
        LEFT JOIN {$gradoviDB}.gradovi_opcine go ON f.grad_opcina_id = go.id
        WHERE $whereClause
    ";
    $countParams = array_slice($params, 0, count($params) - ($searchTerm ? 1 : 0)); // bez ORDER BY parametra
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($countParams);
    $totalCount = (int)$countStmt->fetchColumn();

    $sql = "
        SELECT
            f.*,
            k.naziv AS kategorija_naziv,
            k.boja AS kategorija_boja,
            ts.naziv AS tip_naziv,
            ts.kratica AS tip_kratica,
            go.naziv AS grad_opcina,
            go.tip AS lokacija_tip,
            z.naziv AS zupanija
        FROM firme f
        LEFT JOIN kategorije k ON f.kategorija_id = k.id
        LEFT JOIN tipovi_subjekata ts ON f.tip_subjekta_id = ts.id
        LEFT JOIN {$gradoviDB}.gradovi_opcine go ON f.grad_opcina_id = go.id
        LEFT JOIN {$gradoviDB}.zupanije z ON f.zupanija_id = z.id
        WHERE $whereClause
        ORDER BY $orderBy
        LIMIT $limit OFFSET $offset
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $firme = $stmt->fetchAll();
    
    // Dodaj kontakte, servise i tagove za svaku firmu
    foreach ($firme as &$firma) {
        $stmt = $pdo->prepare("SELECT * FROM kontakti WHERE firma_id = ? ORDER BY is_primary DESC");
        $stmt->execute([$firma['id']]);
        $firma['kontakti'] = $stmt->fetchAll();
        
        $stmt = $pdo->prepare("
            SELECT s.*, fs.status as servis_status 
            FROM servisi s 
            JOIN firma_servisi fs ON s.id = fs.servis_id 
            WHERE fs.firma_id = ?
        ");
        $stmt->execute([$firma['id']]);
        $firma['servisi'] = $stmt->fetchAll();
        
        $stmt = $pdo->prepare("
            SELECT t.* FROM tagovi t 
            JOIN firma_tagovi ft ON t.id = ft.tag_id 
            WHERE ft.firma_id = ?
        ");
        $stmt->execute([$firma['id']]);
        $firma['tagovi'] = $stmt->fetchAll();
    }
    
    sendResponse(true, [
        'firme' => $firme,
        'total' => $totalCount,
        'limit' => $limit,
        'offset' => $offset
    ]);

} elseif ($method === 'POST') {
    $id = $input['id'] ?? null;
    
    $data = [
        'naziv' => sanitize($input['naziv']),
        'oib' => sanitize($input['oib']) ?: null,
        'tip_subjekta_id' => $input['tip_subjekta_id'] ?? null,
        'kategorija_id' => $input['kategorija_id'] ?? null,
        'adresa' => sanitize($input['adresa']),
        'postanski_broj' => sanitize($input['postanski_broj'] ?? $input['posta'] ?? ''),
        'grad_opcina_id' => $input['grad_opcina_id'] ?? null,
        'zupanija_id' => $input['zupanija_id'] ?? null,
        'telefon' => sanitize($input['telefon']),
        'mobitel' => sanitize($input['mobitel'] ?? ''),
        'web' => sanitize($input['web'] ?? ''),
        'status' => $input['status'] ?? 'potencijalan',
        'potencijal' => $input['potencijal'] ?? 'srednji',
        'napomena' => sanitize($input['napomena'] ?? '')
    ];
    
    if ($id) {
        $sets = [];
        $params = [];
        foreach ($data as $key => $value) {
            $sets[] = "$key = ?";
            $params[] = $value;
        }
        $params[] = $id;
        
        $pdo->prepare("UPDATE firme SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);
    } else {
        $data['created_by'] = $_SESSION['user_id'];
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $pdo->prepare("INSERT INTO firme ($columns) VALUES ($placeholders)")->execute(array_values($data));
        $id = $pdo->lastInsertId();
    }
    
    // Spremi kontakte
    if (isset($input['kontakti'])) {
        $pdo->prepare("DELETE FROM kontakti WHERE firma_id = ?")->execute([$id]);
        
        $stmtKontakt = $pdo->prepare("
            INSERT INTO kontakti (firma_id, ime, prezime, pozicija, email, telefon, is_primary)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($input['kontakti'] as $i => $kontakt) {
            $imePrezime = explode(' ', $kontakt['ime'] ?? '', 2);
            $stmtKontakt->execute([
                $id,
                $imePrezime[0] ?? '',
                $imePrezime[1] ?? ($kontakt['prezime'] ?? ''),
                $kontakt['pozicija'] ?? '',
                $kontakt['email'] ?? '',
                $kontakt['telefon'] ?? '',
                $i === 0 ? 1 : 0
            ]);
        }
    }
    
    // Spremi servise
    if (isset($input['servisi'])) {
        $pdo->prepare("DELETE FROM firma_servisi WHERE firma_id = ?")->execute([$id]);
        
        $stmtServis = $pdo->prepare("INSERT INTO firma_servisi (firma_id, servis_id, status) VALUES (?, ?, 'zainteresiran')");
        foreach ($input['servisi'] as $servisId) {
            $stmtServis->execute([$id, $servisId]);
        }
    }
    
    // Spremi tagove
    if (isset($input['tagovi'])) {
        $pdo->prepare("DELETE FROM firma_tagovi WHERE firma_id = ?")->execute([$id]);
        
        $stmtTag = $pdo->prepare("INSERT INTO firma_tagovi (firma_id, tag_id) VALUES (?, ?)");
        foreach ($input['tagovi'] as $tagId) {
            $stmtTag->execute([$id, $tagId]);
        }
    }
    
    sendResponse(true, ['id' => $id]);
    
} elseif ($method === 'DELETE') {
    $id = $input['id'] ?? null;
    if (!$id) sendResponse(false, null, 'ID je obavezan');

    // Provjeri vezane prilike
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM prilike WHERE firma_id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetchColumn() > 0) {
        sendResponse(false, null, 'Firma ima vezane prilike. Prvo obrišite prilike.');
    }

    // Provjeri vezane aktivnosti
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM aktivnosti WHERE firma_id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetchColumn() > 0) {
        sendResponse(false, null, 'Firma ima vezane aktivnosti. Prvo obrišite aktivnosti.');
    }

    // Obriši povezane podatke (tagovi, servisi, kontakti)
    $pdo->prepare("DELETE FROM firma_tagovi WHERE firma_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM firma_servisi WHERE firma_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM kontakti WHERE firma_id = ?")->execute([$id]);

    // Obriši firmu
    $pdo->prepare("DELETE FROM firme WHERE id = ?")->execute([$id]);
    sendResponse(true);
}
