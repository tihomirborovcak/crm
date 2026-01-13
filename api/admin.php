<?php
/**
 * API Modul: Admin (Servisi, Kategorije, Faze, Razlozi gubitka)
 */

requireAuth();

// Provjera admin prava za write operacije
$currentUser = getCurrentUser();
$isAdmin = ($currentUser && $currentUser['uloga'] === 'admin');

switch ($endpoint) {
    
    // =====================================================
    // SERVISI
    // =====================================================
    case 'admin-servisi':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM servisi ORDER BY naziv");
            sendResponse(true, $stmt->fetchAll());
            
        } elseif ($method === 'POST') {
            if (!$isAdmin) sendResponse(false, null, 'Samo admin može uređivati servise');
            
            $id = $input['id'] ?? null;
            $data = [
                'naziv' => $input['naziv'] ?? '',
                'kratica' => $input['kratica'] ?? null,
                'boja' => $input['boja'] ?? '#3b82f6',
                'opis' => $input['opis'] ?? null,
                'aktivan' => $input['aktivan'] ?? 1
            ];
            
            if ($id) {
                $pdo->prepare("UPDATE servisi SET naziv=?, kratica=?, boja=?, opis=?, aktivan=? WHERE id=?")
                    ->execute([$data['naziv'], $data['kratica'], $data['boja'], $data['opis'], $data['aktivan'], $id]);
            } else {
                $pdo->prepare("INSERT INTO servisi (naziv, kratica, boja, opis, aktivan) VALUES (?, ?, ?, ?, ?)")
                    ->execute([$data['naziv'], $data['kratica'], $data['boja'], $data['opis'], $data['aktivan']]);
                $id = $pdo->lastInsertId();
            }
            sendResponse(true, ['id' => $id]);
            
        } elseif ($method === 'DELETE') {
            if (!$isAdmin) sendResponse(false, null, 'Samo admin može brisati servise');
            
            $id = $input['id'] ?? null;
            if (!$id) sendResponse(false, null, 'ID je obavezan');
            
            // Soft delete - samo deaktiviraj
            $pdo->prepare("UPDATE servisi SET aktivan = 0 WHERE id = ?")->execute([$id]);
            sendResponse(true);
        }
        break;
    
    // =====================================================
    // KATEGORIJE
    // =====================================================
    case 'admin-kategorije':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM kategorije ORDER BY naziv");
            sendResponse(true, $stmt->fetchAll());
            
        } elseif ($method === 'POST') {
            if (!$isAdmin) sendResponse(false, null, 'Samo admin može uređivati kategorije');
            
            $id = $input['id'] ?? null;
            $data = [
                'naziv' => $input['naziv'] ?? '',
                'boja' => $input['boja'] ?? '#22c55e',
                'aktivan' => $input['aktivan'] ?? 1
            ];
            
            if ($id) {
                $pdo->prepare("UPDATE kategorije SET naziv=?, boja=?, aktivan=? WHERE id=?")
                    ->execute([$data['naziv'], $data['boja'], $data['aktivan'], $id]);
            } else {
                $pdo->prepare("INSERT INTO kategorije (naziv, boja, aktivan) VALUES (?, ?, ?)")
                    ->execute([$data['naziv'], $data['boja'], $data['aktivan']]);
                $id = $pdo->lastInsertId();
            }
            sendResponse(true, ['id' => $id]);
            
        } elseif ($method === 'DELETE') {
            if (!$isAdmin) sendResponse(false, null, 'Samo admin može brisati kategorije');
            
            $id = $input['id'] ?? null;
            if (!$id) sendResponse(false, null, 'ID je obavezan');
            
            $pdo->prepare("UPDATE kategorije SET aktivan = 0 WHERE id = ?")->execute([$id]);
            sendResponse(true);
        }
        break;
    
    // =====================================================
    // FAZE PIPELINE
    // =====================================================
    case 'admin-faze':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM faze_pipeline ORDER BY redoslijed");
            sendResponse(true, $stmt->fetchAll());
            
        } elseif ($method === 'POST') {
            if (!$isAdmin) sendResponse(false, null, 'Samo admin može uređivati faze');
            
            $id = $input['id'] ?? null;
            $data = [
                'naziv' => $input['naziv'] ?? '',
                'redoslijed' => $input['redoslijed'] ?? 1,
                'vjerojatnost' => $input['vjerojatnost'] ?? 50,
                'boja' => $input['boja'] ?? '#3b82f6',
                'opis' => $input['opis'] ?? null,
                'is_won' => $input['is_won'] ?? 0,
                'is_lost' => $input['is_lost'] ?? 0,
                'aktivan' => $input['aktivan'] ?? 1
            ];
            
            if ($id) {
                $pdo->prepare("UPDATE faze_pipeline SET naziv=?, redoslijed=?, vjerojatnost=?, boja=?, opis=?, is_won=?, is_lost=?, aktivan=? WHERE id=?")
                    ->execute([$data['naziv'], $data['redoslijed'], $data['vjerojatnost'], $data['boja'], $data['opis'], $data['is_won'], $data['is_lost'], $data['aktivan'], $id]);
            } else {
                $pdo->prepare("INSERT INTO faze_pipeline (naziv, redoslijed, vjerojatnost, boja, opis, is_won, is_lost, aktivan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                    ->execute([$data['naziv'], $data['redoslijed'], $data['vjerojatnost'], $data['boja'], $data['opis'], $data['is_won'], $data['is_lost'], $data['aktivan']]);
                $id = $pdo->lastInsertId();
            }
            sendResponse(true, ['id' => $id]);
            
        } elseif ($method === 'DELETE') {
            if (!$isAdmin) sendResponse(false, null, 'Samo admin može brisati faze');
            
            $id = $input['id'] ?? null;
            if (!$id) sendResponse(false, null, 'ID je obavezan');
            
            // Provjeri ima li prilika u ovoj fazi
            $count = $pdo->query("SELECT COUNT(*) FROM prilike WHERE faza_id = $id")->fetchColumn();
            if ($count > 0) {
                sendResponse(false, null, "Ne možete obrisati fazu - postoji $count prilika u njoj");
            }
            
            $pdo->prepare("UPDATE faze_pipeline SET aktivan = 0 WHERE id = ?")->execute([$id]);
            sendResponse(true);
        }
        break;
    
    // =====================================================
    // RAZLOZI GUBITKA
    // =====================================================
    case 'admin-razlozi':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM razlozi_gubitka ORDER BY redoslijed");
            sendResponse(true, $stmt->fetchAll());
            
        } elseif ($method === 'POST') {
            if (!$isAdmin) sendResponse(false, null, 'Samo admin može uređivati razloge');
            
            $id = $input['id'] ?? null;
            $data = [
                'naziv' => $input['naziv'] ?? '',
                'redoslijed' => $input['redoslijed'] ?? 1,
                'aktivan' => $input['aktivan'] ?? 1
            ];
            
            if ($id) {
                $pdo->prepare("UPDATE razlozi_gubitka SET naziv=?, redoslijed=?, aktivan=? WHERE id=?")
                    ->execute([$data['naziv'], $data['redoslijed'], $data['aktivan'], $id]);
            } else {
                $pdo->prepare("INSERT INTO razlozi_gubitka (naziv, redoslijed, aktivan) VALUES (?, ?, ?)")
                    ->execute([$data['naziv'], $data['redoslijed'], $data['aktivan']]);
                $id = $pdo->lastInsertId();
            }
            sendResponse(true, ['id' => $id]);
            
        } elseif ($method === 'DELETE') {
            if (!$isAdmin) sendResponse(false, null, 'Samo admin može brisati razloge');
            
            $id = $input['id'] ?? null;
            if (!$id) sendResponse(false, null, 'ID je obavezan');
            
            $pdo->prepare("UPDATE razlozi_gubitka SET aktivan = 0 WHERE id = ?")->execute([$id]);
            sendResponse(true);
        }
        break;
}
