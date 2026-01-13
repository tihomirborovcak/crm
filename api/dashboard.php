<?php
/**
 * API Modul: Dashboard i statistike
 */

requireAuth();
$gradoviDB = DB_GRADOVI;

switch ($endpoint) {
    
    case 'dashboard-stats':
        $stats = [];
        
        // Ukupno firmi
        $stats['ukupno_firmi'] = $pdo->query("SELECT COUNT(*) FROM firme")->fetchColumn();
        
        // Aktivni klijenti
        $stats['aktivni_klijenti'] = $pdo->query("SELECT COUNT(*) FROM firme WHERE status = 'aktivan'")->fetchColumn();
        
        // Prilike u tijeku (vrijednost)
        $stats['prilike_vrijednost'] = $pdo->query("
            SELECT COALESCE(SUM(p.vrijednost * (fp.vjerojatnost / 100)), 0)
            FROM prilike p
            JOIN faze_pipeline fp ON p.faza_id = fp.id
            WHERE fp.is_won = 0 AND fp.is_lost = 0
        ")->fetchColumn();
        
        // Follow-up danas
        $stats['followup_danas'] = $pdo->query("
            SELECT COUNT(*) FROM aktivnosti 
            WHERE datum_sljedeceg = CURDATE() 
            AND status != 'otkazana'
        ")->fetchColumn();
        
        sendResponse(true, $stats);
        break;
    
    case 'status-stats':
        $stmt = $pdo->query("
            SELECT status, COUNT(*) as broj 
            FROM firme 
            GROUP BY status 
            ORDER BY broj DESC
        ");
        sendResponse(true, $stmt->fetchAll());
        break;
    
    case 'servisi-stats':
        try {
            $stmt = $pdo->query("
                SELECT s.id, s.naziv, COUNT(fs.firma_id) as broj_firmi
                FROM servisi s
                LEFT JOIN firma_servisi fs ON s.id = fs.servis_id
                GROUP BY s.id
                ORDER BY broj_firmi DESC
            ");
            sendResponse(true, $stmt->fetchAll());
        } catch (Exception $e) {
            sendResponse(false, null, $e->getMessage());
        }
        break;
    
    case 'zupanije-stats':
        $stmt = $pdo->query("
            SELECT z.id, z.naziv, COUNT(f.id) as broj
            FROM {$gradoviDB}.zupanije z
            LEFT JOIN firme f ON z.id = f.zupanija_id
            GROUP BY z.id
            HAVING broj > 0
            ORDER BY broj DESC
            LIMIT 10
        ");
        sendResponse(true, $stmt->fetchAll());
        break;
    
    case 'aktivnosti-nadolazece':
        $user = getCurrentUser();
        $isAdmin = ($user && $user['uloga'] === 'admin');

        $sql = "
            SELECT
                a.*,
                COALESCE(f.naziv, pf.naziv) as firma_naziv,
                COALESCE(a.firma_id, p.firma_id) as display_firma_id,
                p.naziv as prilika_naziv,
                COALESCE(a.datum_sljedeceg, DATE(a.datum_aktivnosti)) as display_datum,
                CONCAT(u.ime, ' ', u.prezime) as korisnik_ime
            FROM aktivnosti a
            LEFT JOIN firme f ON a.firma_id = f.id
            LEFT JOIN prilike p ON a.prilika_id = p.id
            LEFT JOIN firme pf ON p.firma_id = pf.id
            LEFT JOIN korisnici u ON a.korisnik_id = u.id
            WHERE (
                (a.datum_sljedeceg IS NOT NULL AND a.datum_sljedeceg >= CURDATE())
                OR (a.datum_aktivnosti IS NOT NULL AND DATE(a.datum_aktivnosti) >= CURDATE())
            )
            AND (a.status IS NULL OR a.status NOT IN ('otkazana', 'zavrsena'))
        ";

        // Ako nije admin, prikaži samo svoje aktivnosti
        if (!$isAdmin) {
            $sql .= " AND a.korisnik_id = ?";
            $stmt = $pdo->prepare($sql . " ORDER BY display_datum ASC LIMIT 10");
            $stmt->execute([$_SESSION['user_id']]);
        } else {
            $stmt = $pdo->query($sql . " ORDER BY display_datum ASC LIMIT 10");
        }

        sendResponse(true, $stmt->fetchAll());
        break;
    
    case 'firme-by-tag':
        $tagId = $_GET['tag_id'] ?? null;
        if (!$tagId) sendResponse(false, null, 'tag_id je obavezan');
        
        $stmt = $pdo->prepare("
            SELECT f.*, 
                   CONCAT(k.ime, ' ', k.prezime) as kontakt_ime, 
                   k.email as kontakt_email,
                   k.telefon as kontakt_telefon
            FROM firme f
            JOIN firma_tagovi ft ON f.id = ft.firma_id
            LEFT JOIN kontakti k ON f.id = k.firma_id AND k.is_primary = 1
            WHERE ft.tag_id = ?
            ORDER BY f.naziv
            LIMIT 100
        ");
        $stmt->execute([$tagId]);
        $firme = $stmt->fetchAll();
        
        // Dodaj tagove
        foreach ($firme as &$firma) {
            $stmt2 = $pdo->prepare("
                SELECT t.id, t.naziv, t.boja 
                FROM tagovi t 
                JOIN firma_tagovi ft ON t.id = ft.tag_id 
                WHERE ft.firma_id = ?
            ");
            $stmt2->execute([$firma['id']]);
            $firma['tagovi'] = $stmt2->fetchAll();
        }
        
        sendResponse(true, $firme);
        break;
    
    default:
        // Stari format za kompatibilnost
        $stats = [];
        $stats['ukupno_firmi'] = $pdo->query("SELECT COUNT(*) FROM firme")->fetchColumn();
        
        $stmt = $pdo->query("SELECT status, COUNT(*) as broj FROM firme GROUP BY status");
        $stats['po_statusu'] = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        $stmt = $pdo->query("
            SELECT s.naziv, COUNT(fs.firma_id) as broj
            FROM servisi s
            LEFT JOIN firma_servisi fs ON s.id = fs.servis_id
            GROUP BY s.id
        ");
        $stats['po_servisu'] = $stmt->fetchAll();
        
        $stmt = $pdo->query("
            SELECT fp.naziv as faza, COUNT(p.id) as broj, COALESCE(SUM(p.vrijednost), 0) as vrijednost
            FROM faze_pipeline fp
            LEFT JOIN prilike p ON fp.id = p.faza_id
            WHERE fp.aktivan = 1
            GROUP BY fp.id
            ORDER BY fp.redoslijed
        ");
        $stats['prilike_po_fazi'] = $stmt->fetchAll();
        
        $stmt = $pdo->query("
            SELECT go.naziv, go.tip, COUNT(f.id) as broj
            FROM firme f
            JOIN {$gradoviDB}.gradovi_opcine go ON f.grad_opcina_id = go.id
            WHERE f.zupanija_id = 2
            GROUP BY go.id
            ORDER BY broj DESC
            LIMIT 10
        ");
        $stats['top_lokacije'] = $stmt->fetchAll();
        
        $stats['aktivnosti_tjedan'] = $pdo->query("
            SELECT COUNT(*) FROM aktivnosti
            WHERE datum_sljedeceg IS NOT NULL 
            AND datum_sljedeceg >= CURDATE()
            AND datum_sljedeceg <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            AND status != 'otkazana'
        ")->fetchColumn();
        
        sendResponse(true, $stats);
        break;
}
