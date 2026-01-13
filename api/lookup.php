<?php
/**
 * API Modul: Lookup tablice
 */

switch ($endpoint) {
    case 'servisi':
        requireAuth();
        $servisi = $pdo->query("SELECT * FROM servisi WHERE aktivan = 1 ORDER BY naziv")->fetchAll();
        sendResponse(true, $servisi);
        break;
        
    case 'kategorije':
        requireAuth();
        $kategorije = $pdo->query("SELECT * FROM kategorije WHERE aktivan = 1 ORDER BY naziv")->fetchAll();
        sendResponse(true, $kategorije);
        break;
        
    case 'tipovi-subjekata':
        requireAuth();
        $tipovi = $pdo->query("SELECT * FROM tipovi_subjekata ORDER BY naziv")->fetchAll();
        sendResponse(true, $tipovi);
        break;
        
    case 'tagovi':
        requireAuth();
        $tagovi = $pdo->query("SELECT * FROM tagovi ORDER BY naziv")->fetchAll();
        sendResponse(true, $tagovi);
        break;
        
    case 'zupanije':
        $pdoGradovi = getGradoviDB();
        $zupanije = $pdoGradovi->query("SELECT * FROM zupanije ORDER BY naziv")->fetchAll();
        sendResponse(true, $zupanije);
        break;
        
    case 'gradovi-opcine':
        $pdoGradovi = getGradoviDB();
        
        $where = "1=1";
        $params = [];
        
        if (!empty($_GET['zupanija_id'])) {
            $where .= " AND zupanija_id = ?";
            $params[] = $_GET['zupanija_id'];
        }
        
        if (!empty($_GET['tip'])) {
            $where .= " AND tip = ?";
            $params[] = $_GET['tip'];
        }
        
        $stmt = $pdoGradovi->prepare("SELECT * FROM gradovi_opcine WHERE $where ORDER BY tip DESC, naziv");
        $stmt->execute($params);
        sendResponse(true, $stmt->fetchAll());
        break;
        
    case 'naselja':
        $pdoGradovi = getGradoviDB();
        
        if (empty($_GET['grad_opcina_id'])) {
            sendResponse(false, null, 'grad_opcina_id je obavezan');
        }
        
        $stmt = $pdoGradovi->prepare("SELECT * FROM naselja WHERE grad_opcina_id = ? ORDER BY naziv");
        $stmt->execute([$_GET['grad_opcina_id']]);
        sendResponse(true, $stmt->fetchAll());
        break;
}
