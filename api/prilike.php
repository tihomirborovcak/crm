<?php
/**
 * API Modul: Prilike (Opportunities) i Pipeline
 */

requireAuth();

switch ($endpoint) {
    
    // =====================================================
    // PRILIKE CRUD
    // =====================================================
    case 'prilike':
        if ($method === 'GET') {
            $id = $_GET['id'] ?? null;
            $firmaId = $_GET['firma_id'] ?? null;
            
            if ($id) {
                // Jedna prilika s detaljima
                $stmt = $pdo->prepare("
                    SELECT p.*, 
                           f.naziv as firma_naziv,
                           f.oib as firma_oib,
                           fp.naziv as faza_naziv,
                           fp.boja as faza_boja,
                           fp.vjerojatnost,
                           fp.is_won,
                           fp.is_lost,
                           CONCAT(k.ime, ' ', k.prezime) as kontakt_ime,
                           k.email as kontakt_email,
                           k.telefon as kontakt_telefon,
                           CONCAT(u.ime, ' ', u.prezime) as vlasnik_ime,
                           s.naziv as servis_naziv,
                           (p.vrijednost * fp.vjerojatnost / 100) as ocekivani_prihod
                    FROM prilike p
                    LEFT JOIN firme f ON p.firma_id = f.id
                    LEFT JOIN faze_pipeline fp ON p.faza_id = fp.id
                    LEFT JOIN kontakti k ON p.kontakt_id = k.id
                    LEFT JOIN korisnici u ON p.korisnik_id = u.id
                    LEFT JOIN servisi s ON p.servis_id = s.id
                    WHERE p.id = ?
                ");
                $stmt->execute([$id]);
                $prilika = $stmt->fetch();
                
                if ($prilika) {
                    // Dodaj stavke
                    $stmt = $pdo->prepare("SELECT * FROM prilika_stavke WHERE prilika_id = ?");
                    $stmt->execute([$id]);
                    $prilika['stavke'] = $stmt->fetchAll();
                    
                    // Dodaj aktivnosti
                    $stmt = $pdo->prepare("
                        SELECT a.*, CONCAT(k.ime, ' ', k.prezime) as kontakt_ime
                        FROM aktivnosti a
                        LEFT JOIN kontakti k ON a.kontakt_id = k.id
                        WHERE a.prilika_id = ?
                        ORDER BY a.datum_aktivnosti DESC
                    ");
                    $stmt->execute([$id]);
                    $prilika['aktivnosti'] = $stmt->fetchAll();
                }
                
                sendResponse(true, $prilika);
                
            } elseif ($firmaId) {
                // Prilike za jednu firmu
                $stmt = $pdo->prepare("
                    SELECT p.*, 
                           fp.naziv as faza_naziv,
                           fp.boja as faza_boja,
                           fp.vjerojatnost,
                           fp.is_won,
                           fp.is_lost,
                           s.naziv as servis_naziv,
                           (p.vrijednost * fp.vjerojatnost / 100) as ocekivani_prihod
                    FROM prilike p
                    LEFT JOIN faze_pipeline fp ON p.faza_id = fp.id
                    LEFT JOIN servisi s ON p.servis_id = s.id
                    WHERE p.firma_id = ?
                    ORDER BY p.created_at DESC
                ");
                $stmt->execute([$firmaId]);
                sendResponse(true, $stmt->fetchAll());
                
            } else {
                // Sve prilike (za pipeline view)
                $fazaId = $_GET['faza_id'] ?? null;
                $korisnikId = $_GET['korisnik_id'] ?? null;
                $servisId = $_GET['servis_id'] ?? null;
                $aktivne = $_GET['aktivne'] ?? '1';
                $samoMoje = $_GET['samo_moje'] ?? null;

                $where = ["1=1"];
                $params = [];

                if ($fazaId) {
                    $where[] = "p.faza_id = ?";
                    $params[] = $fazaId;
                }
                // Ako je samo_moje=1, filtriraj po trenutnom korisniku
                if ($samoMoje === '1' && isset($_SESSION['user_id'])) {
                    $where[] = "p.korisnik_id = ?";
                    $params[] = $_SESSION['user_id'];
                } elseif ($korisnikId) {
                    $where[] = "p.korisnik_id = ?";
                    $params[] = $korisnikId;
                }
                if ($servisId) {
                    $where[] = "p.servis_id = ?";
                    $params[] = $servisId;
                }
                if ($aktivne === '1') {
                    $where[] = "fp.is_won = 0 AND fp.is_lost = 0";
                }
                
                $whereClause = implode(' AND ', $where);
                
                $stmt = $pdo->prepare("
                    SELECT p.*, 
                           f.naziv as firma_naziv,
                           fp.naziv as faza_naziv,
                           fp.boja as faza_boja,
                           fp.vjerojatnost,
                           fp.is_won,
                           fp.is_lost,
                           fp.redoslijed as faza_redoslijed,
                           CONCAT(u.ime, ' ', u.prezime) as vlasnik_ime,
                           s.naziv as servis_naziv,
                           (p.vrijednost * fp.vjerojatnost / 100) as ocekivani_prihod
                    FROM prilike p
                    LEFT JOIN firme f ON p.firma_id = f.id
                    LEFT JOIN faze_pipeline fp ON p.faza_id = fp.id
                    LEFT JOIN korisnici u ON p.korisnik_id = u.id
                    LEFT JOIN servisi s ON p.servis_id = s.id
                    WHERE $whereClause
                    ORDER BY fp.redoslijed ASC, p.datum_ocekivanog_zatvaranja ASC
                ");
                $stmt->execute($params);
                sendResponse(true, $stmt->fetchAll());
            }
            
        } elseif ($method === 'POST') {
            $firmaId = $input['firma_id'] ?? null;
            if (!$firmaId) sendResponse(false, null, 'firma_id je obavezan');
            
            $defaultFaza = $pdo->query("SELECT id FROM faze_pipeline WHERE aktivan = 1 ORDER BY redoslijed ASC LIMIT 1")->fetchColumn();
            
            $stmt = $pdo->prepare("
                INSERT INTO prilike 
                (firma_id, kontakt_id, korisnik_id, servis_id, naziv, opis, faza_id, vrijednost, valuta, datum_otvaranja, datum_ocekivanog_zatvaranja, napomena)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $firmaId,
                $input['kontakt_id'] ?: null,
                $_SESSION['user_id'] ?? $input['korisnik_id'] ?? null,
                $input['servis_id'] ?: null,
                $input['naziv'] ?? 'Nova prilika',
                $input['opis'] ?? '',
                $input['faza_id'] ?? $defaultFaza,
                $input['vrijednost'] ?? 0,
                $input['valuta'] ?? 'EUR',
                $input['datum_otvaranja'] ?? date('Y-m-d'),
                $input['datum_ocekivanog_zatvaranja'] ?: null,
                $input['napomena'] ?? ''
            ]);
            
            $prilikaId = $pdo->lastInsertId();
            
            // Dodaj stavke ako postoje
            if (!empty($input['stavke'])) {
                $stmtStavka = $pdo->prepare("
                    INSERT INTO prilika_stavke (prilika_id, naziv, opis, kolicina, jedinica, cijena, popust)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                foreach ($input['stavke'] as $s) {
                    $stmtStavka->execute([
                        $prilikaId,
                        $s['naziv'] ?? '',
                        $s['opis'] ?? '',
                        $s['kolicina'] ?? 1,
                        $s['jedinica'] ?? 'kom',
                        $s['cijena'] ?? 0,
                        $s['popust'] ?? 0
                    ]);
                }
            }
            
            sendResponse(true, ['id' => $prilikaId, 'message' => 'Prilika kreirana']);
            
        } elseif ($method === 'PUT') {
            $id = $input['id'] ?? null;
            if (!$id) sendResponse(false, null, 'id je obavezan');

            // Ako korisnik_id nije poslan, zadrži postojeći
            if (!isset($input['korisnik_id']) || $input['korisnik_id'] === null) {
                $stmt = $pdo->prepare("SELECT korisnik_id FROM prilike WHERE id = ?");
                $stmt->execute([$id]);
                $result = $stmt->fetchColumn();
                $input['korisnik_id'] = $result !== false ? $result : null;
            }

            // Provjeri je li zatvaranje
            $novaFaza = $input['faza_id'] ?? null;
            if ($novaFaza) {
                $faza = $pdo->prepare("SELECT is_won, is_lost FROM faze_pipeline WHERE id = ?");
                $faza->execute([$novaFaza]);
                $fazaInfo = $faza->fetch();
                
                if ($fazaInfo && ($fazaInfo['is_won'] || $fazaInfo['is_lost'])) {
                    if (empty($input['datum_zatvaranja'])) {
                        $input['datum_zatvaranja'] = date('Y-m-d');
                    }
                }
            }
            
            $stmt = $pdo->prepare("
                UPDATE prilike SET
                    kontakt_id = ?, korisnik_id = ?, servis_id = ?, naziv = ?, opis = ?,
                    faza_id = ?, vrijednost = ?, valuta = ?, datum_ocekivanog_zatvaranja = ?,
                    datum_zatvaranja = ?, razlog_gubitka = ?, konkurent = ?, napomena = ?
                WHERE id = ?
            ");
            $stmt->execute([
                ($input['kontakt_id'] ?? null) ?: null,
                ($input['korisnik_id'] ?? null) ?: null,
                ($input['servis_id'] ?? null) ?: null,
                $input['naziv'] ?? '',
                $input['opis'] ?? '',
                $input['faza_id'] ?? 1,
                $input['vrijednost'] ?? 0,
                $input['valuta'] ?? 'EUR',
                ($input['datum_ocekivanog_zatvaranja'] ?? null) ?: null,
                ($input['datum_zatvaranja'] ?? null) ?: null,
                $input['razlog_gubitka'] ?? null,
                $input['konkurent'] ?? null,
                $input['napomena'] ?? '',
                $id
            ]);
            
            sendResponse(true, ['message' => 'Prilika ažurirana']);
            
        } elseif ($method === 'DELETE') {
            $id = $_GET['id'] ?? $input['id'] ?? null;
            if (!$id) sendResponse(false, null, 'id je obavezan');
            
            $pdo->prepare("DELETE FROM prilike WHERE id = ?")->execute([$id]);
            sendResponse(true, ['message' => 'Prilika obrisana']);
        }
        break;
    
    // =====================================================
    // BRZA PROMJENA FAZE (drag & drop)
    // =====================================================
    case 'prilike-faza':
        if ($method !== 'PUT') sendResponse(false, null, 'Samo PUT metoda');
        
        $id = $input['id'] ?? null;
        $fazaId = $input['faza_id'] ?? null;
        
        if (!$id || !$fazaId) sendResponse(false, null, 'id i faza_id su obavezni');
        
        $faza = $pdo->prepare("SELECT is_won, is_lost FROM faze_pipeline WHERE id = ?");
        $faza->execute([$fazaId]);
        $fazaInfo = $faza->fetch();
        
        if ($fazaInfo && ($fazaInfo['is_won'] || $fazaInfo['is_lost'])) {
            $pdo->prepare("
                UPDATE prilike SET faza_id = ?, datum_zatvaranja = ?, razlog_gubitka = ?
                WHERE id = ?
            ")->execute([
                $fazaId,
                date('Y-m-d'),
                $input['razlog_gubitka'] ?? null,
                $id
            ]);
        } else {
            $pdo->prepare("UPDATE prilike SET faza_id = ? WHERE id = ?")->execute([$fazaId, $id]);
        }
        
        sendResponse(true, ['message' => 'Faza ažurirana']);
        break;
    
    // =====================================================
    // STAVKE PRILIKE
    // =====================================================
    case 'prilika-stavke':
        if ($method === 'GET') {
            $prilikaId = $_GET['prilika_id'] ?? null;
            if (!$prilikaId) sendResponse(false, null, 'prilika_id je obavezan');
            
            $stmt = $pdo->prepare("SELECT * FROM prilika_stavke WHERE prilika_id = ?");
            $stmt->execute([$prilikaId]);
            sendResponse(true, $stmt->fetchAll());
            
        } elseif ($method === 'POST') {
            $prilikaId = $input['prilika_id'] ?? null;
            if (!$prilikaId) sendResponse(false, null, 'prilika_id je obavezan');
            
            $stmt = $pdo->prepare("
                INSERT INTO prilika_stavke (prilika_id, naziv, opis, kolicina, jedinica, cijena, popust)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $prilikaId,
                $input['naziv'] ?? '',
                $input['opis'] ?? '',
                $input['kolicina'] ?? 1,
                $input['jedinica'] ?? 'kom',
                $input['cijena'] ?? 0,
                $input['popust'] ?? 0
            ]);
            
            // Ažuriraj ukupnu vrijednost
            $pdo->prepare("
                UPDATE prilike SET vrijednost = (
                    SELECT COALESCE(SUM(ukupno), 0) FROM prilika_stavke WHERE prilika_id = ?
                ) WHERE id = ?
            ")->execute([$prilikaId, $prilikaId]);
            
            sendResponse(true, ['id' => $pdo->lastInsertId(), 'message' => 'Stavka dodana']);
            
        } elseif ($method === 'PUT') {
            $id = $input['id'] ?? null;
            if (!$id) sendResponse(false, null, 'id je obavezan');
            
            $stmt = $pdo->prepare("
                UPDATE prilika_stavke SET naziv = ?, opis = ?, kolicina = ?, jedinica = ?, cijena = ?, popust = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $input['naziv'] ?? '',
                $input['opis'] ?? '',
                $input['kolicina'] ?? 1,
                $input['jedinica'] ?? 'kom',
                $input['cijena'] ?? 0,
                $input['popust'] ?? 0,
                $id
            ]);
            
            $prilikaId = $pdo->query("SELECT prilika_id FROM prilika_stavke WHERE id = $id")->fetchColumn();
            $pdo->prepare("
                UPDATE prilike SET vrijednost = (
                    SELECT COALESCE(SUM(ukupno), 0) FROM prilika_stavke WHERE prilika_id = ?
                ) WHERE id = ?
            ")->execute([$prilikaId, $prilikaId]);
            
            sendResponse(true, ['message' => 'Stavka ažurirana']);
            
        } elseif ($method === 'DELETE') {
            $id = $_GET['id'] ?? null;
            if (!$id) sendResponse(false, null, 'id je obavezan');
            
            $prilikaId = $pdo->query("SELECT prilika_id FROM prilika_stavke WHERE id = $id")->fetchColumn();
            $pdo->prepare("DELETE FROM prilika_stavke WHERE id = ?")->execute([$id]);
            
            if ($prilikaId) {
                $pdo->prepare("
                    UPDATE prilike SET vrijednost = (
                        SELECT COALESCE(SUM(ukupno), 0) FROM prilika_stavke WHERE prilika_id = ?
                    ) WHERE id = ?
                ")->execute([$prilikaId, $prilikaId]);
            }
            
            sendResponse(true, ['message' => 'Stavka obrisana']);
        }
        break;
    
    // =====================================================
    // FAZE PIPELINE-a
    // =====================================================
    case 'faze-pipeline':
        $stmt = $pdo->query("SELECT * FROM faze_pipeline WHERE aktivan = 1 ORDER BY redoslijed ASC");
        sendResponse(true, $stmt->fetchAll());
        break;
    
    // =====================================================
    // RAZLOZI GUBITKA
    // =====================================================
    case 'razlozi-gubitka':
        $stmt = $pdo->query("SELECT * FROM razlozi_gubitka WHERE aktivan = 1 ORDER BY redoslijed ASC");
        sendResponse(true, $stmt->fetchAll());
        break;
    
    // =====================================================
    // PIPELINE STATISTIKA
    // =====================================================
    case 'pipeline-stats':
        $stmt = $pdo->query("
            SELECT 
                fp.id as faza_id,
                fp.naziv as faza_naziv,
                fp.boja,
                fp.vjerojatnost,
                fp.is_won,
                fp.is_lost,
                COUNT(p.id) as broj_prilika,
                COALESCE(SUM(p.vrijednost), 0) as ukupna_vrijednost,
                COALESCE(SUM(p.vrijednost * fp.vjerojatnost / 100), 0) as ocekivani_prihod
            FROM faze_pipeline fp
            LEFT JOIN prilike p ON fp.id = p.faza_id
            WHERE fp.aktivan = 1
            GROUP BY fp.id
            ORDER BY fp.redoslijed ASC
        ");
        $poFazama = $stmt->fetchAll();
        
        $aktivne = $pdo->query("
            SELECT 
                COUNT(*) as broj,
                COALESCE(SUM(p.vrijednost), 0) as vrijednost,
                COALESCE(SUM(p.vrijednost * fp.vjerojatnost / 100), 0) as ocekivano
            FROM prilike p
            JOIN faze_pipeline fp ON p.faza_id = fp.id
            WHERE fp.is_won = 0 AND fp.is_lost = 0
        ")->fetch();
        
        $dobiveneMjesec = $pdo->query("
            SELECT COUNT(*) as broj, COALESCE(SUM(vrijednost), 0) as vrijednost
            FROM prilike p
            JOIN faze_pipeline fp ON p.faza_id = fp.id
            WHERE fp.is_won = 1 
            AND MONTH(p.datum_zatvaranja) = MONTH(CURRENT_DATE())
            AND YEAR(p.datum_zatvaranja) = YEAR(CURRENT_DATE())
        ")->fetch();
        
        $izgubljeneMjesec = $pdo->query("
            SELECT COUNT(*) as broj, COALESCE(SUM(vrijednost), 0) as vrijednost
            FROM prilike p
            JOIN faze_pipeline fp ON p.faza_id = fp.id
            WHERE fp.is_lost = 1
            AND MONTH(p.datum_zatvaranja) = MONTH(CURRENT_DATE())
            AND YEAR(p.datum_zatvaranja) = YEAR(CURRENT_DATE())
        ")->fetch();
        
        sendResponse(true, [
            'po_fazama' => $poFazama,
            'aktivne' => $aktivne,
            'dobiveno_mjesec' => $dobiveneMjesec,
            'izgubljeno_mjesec' => $izgubljeneMjesec
        ]);
        break;
}
