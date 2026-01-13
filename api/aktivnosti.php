<?php
/**
 * API Modul: Aktivnosti
 */

requireAuth();

switch ($endpoint) {
    case 'aktivnosti':
        if ($method === 'GET') {
            $firmaId = $_GET['firma_id'] ?? null;
            $prilikaId = $_GET['prilika_id'] ?? null;
            
            if ($firmaId) {
                $stmt = $pdo->prepare("
                    SELECT a.*, 
                           CONCAT(k.ime, ' ', k.prezime) as kontakt_ime,
                           CONCAT(u.ime, ' ', u.prezime) as korisnik_ime
                    FROM aktivnosti a
                    LEFT JOIN kontakti k ON a.kontakt_id = k.id
                    LEFT JOIN korisnici u ON a.korisnik_id = u.id
                    WHERE a.firma_id = ?
                    ORDER BY a.datum_aktivnosti DESC
                ");
                $stmt->execute([$firmaId]);
            } elseif ($prilikaId) {
                $stmt = $pdo->prepare("
                    SELECT a.*, 
                           CONCAT(k.ime, ' ', k.prezime) as kontakt_ime,
                           CONCAT(u.ime, ' ', u.prezime) as korisnik_ime
                    FROM aktivnosti a
                    LEFT JOIN kontakti k ON a.kontakt_id = k.id
                    LEFT JOIN korisnici u ON a.korisnik_id = u.id
                    WHERE a.prilika_id = ?
                    ORDER BY a.datum_aktivnosti DESC
                ");
                $stmt->execute([$prilikaId]);
            } else {
                $stmt = $pdo->query("
                    SELECT a.*, 
                           f.naziv as firma_naziv,
                           CONCAT(k.ime, ' ', k.prezime) as kontakt_ime,
                           CONCAT(u.ime, ' ', u.prezime) as korisnik_ime
                    FROM aktivnosti a
                    LEFT JOIN firme f ON a.firma_id = f.id
                    LEFT JOIN kontakti k ON a.kontakt_id = k.id
                    LEFT JOIN korisnici u ON a.korisnik_id = u.id
                    ORDER BY a.datum_aktivnosti DESC
                    LIMIT 50
                ");
            }
            sendResponse(true, $stmt->fetchAll());
            
        } elseif ($method === 'POST') {
            $firmaId = $input['firma_id'] ?? null;
            if (!$firmaId) sendResponse(false, null, 'firma_id je obavezan');

            // Odredi default status - ako je datum danas ili u budućnosti, status je 'planirana'
            $datumAkt = $input['datum_aktivnosti'] ?? date('Y-m-d H:i:s');
            $datumSamo = date('Y-m-d', strtotime($datumAkt));
            $defaultStatus = ($datumSamo >= date('Y-m-d')) ? 'planirana' : 'zavrsena';

            $stmt = $pdo->prepare("
                INSERT INTO aktivnosti
                (firma_id, kontakt_id, prilika_id, korisnik_id, tip, naslov, opis, rezultat, datum_aktivnosti, trajanje_min, sljedeci_korak, datum_sljedeceg, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $firmaId,
                ($input['kontakt_id'] ?? null) ?: null,
                ($input['prilika_id'] ?? null) ?: null,
                $_SESSION['user_id'] ?? null,
                $input['tip'] ?? 'napomena',
                $input['naslov'] ?? '',
                $input['opis'] ?? '',
                $input['rezultat'] ?? '',
                $datumAkt,
                ($input['trajanje_min'] ?? null) ?: null,
                $input['sljedeci_korak'] ?? '',
                ($input['datum_sljedeceg'] ?? null) ?: null,
                $input['status'] ?? $defaultStatus
            ]);
            
            sendResponse(true, ['id' => $pdo->lastInsertId(), 'message' => 'Aktivnost dodana']);
            
        } elseif ($method === 'PUT') {
            $id = $input['id'] ?? null;
            if (!$id) sendResponse(false, null, 'id je obavezan');
            
            $stmt = $pdo->prepare("
                UPDATE aktivnosti SET 
                    kontakt_id = ?, prilika_id = ?, tip = ?, naslov = ?, opis = ?, rezultat = ?,
                    datum_aktivnosti = ?, trajanje_min = ?, sljedeci_korak = ?, datum_sljedeceg = ?, status = ?
                WHERE id = ?
            ");
            $stmt->execute([
                ($input['kontakt_id'] ?? null) ?: null,
                ($input['prilika_id'] ?? null) ?: null,
                $input['tip'] ?? 'napomena',
                $input['naslov'] ?? '',
                $input['opis'] ?? '',
                $input['rezultat'] ?? '',
                $input['datum_aktivnosti'] ?? date('Y-m-d H:i:s'),
                ($input['trajanje_min'] ?? null) ?: null,
                $input['sljedeci_korak'] ?? '',
                ($input['datum_sljedeceg'] ?? null) ?: null,
                $input['status'] ?? 'zavrsena',
                $id
            ]);
            
            sendResponse(true, ['message' => 'Aktivnost ažurirana']);
            
        } elseif ($method === 'DELETE') {
            $id = $_GET['id'] ?? null;
            if (!$id) sendResponse(false, null, 'id je obavezan');
            
            $pdo->prepare("DELETE FROM aktivnosti WHERE id = ?")->execute([$id]);
            sendResponse(true, ['message' => 'Aktivnost obrisana']);
        }
        break;
}
