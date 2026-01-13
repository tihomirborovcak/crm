<?php
/**
 * API Modul: Import i autocomplete
 */

requireAuth();

switch ($endpoint) {
    // Bulk provjera OIB-ova
    case 'check-oibs':
        if ($method !== 'POST') sendResponse(false, null, 'Metoda nije dozvoljena');
        
        $oibs = $input['oibs'] ?? [];
        if (empty($oibs)) {
            sendResponse(true, ['existing' => []]);
        }
        
        // Normaliziraj OIB-ove
        $oibs = array_map(function($o) {
            return str_pad(trim($o), 11, '0', STR_PAD_LEFT);
        }, $oibs);
        
        $placeholders = implode(',', array_fill(0, count($oibs), '?'));
        $stmt = $pdo->prepare("SELECT oib FROM firme WHERE oib IN ($placeholders)");
        $stmt->execute($oibs);
        $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        sendResponse(true, ['existing' => $existing]);
        break;
    
    case 'autocomplete-kupci':
        $search = $_GET['q'] ?? '';
        if (strlen($search) < 2) {
            sendResponse(true, []);
        }
        
        try {
            $pdoCentralna = getCentralnaDB();
            $searchTerm = '%' . $search . '%';
            
            $stmt = $pdoCentralna->prepare("
                SELECT 
                    id, naziv, kontakt, email, telefon, oib,
                    adresa, postanskiBroj, mjesto, zupanija, drzava, napomena
                FROM kupci 
                WHERE naziv LIKE ? OR oib LIKE ? OR email LIKE ? OR mjesto LIKE ? OR kontakt LIKE ?
                ORDER BY naziv 
                LIMIT 20
            ");
            $stmt->execute([$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
            sendResponse(true, $stmt->fetchAll());
        } catch (PDOException $e) {
            sendResponse(false, null, 'Greška pri pretrazi: ' . $e->getMessage());
        }
        break;
    
    // Dohvati sve tagove
    case 'tagovi':
        $stmt = $pdo->query("SELECT id, naziv, boja FROM tagovi ORDER BY naziv");
        sendResponse(true, $stmt->fetchAll());
        break;
    
    // Kreiraj tag ako ne postoji
    case 'tag-ensure':
        if ($method !== 'POST') sendResponse(false, null, 'Metoda nije dozvoljena');
        
        $naziv = trim($input['naziv'] ?? '');
        if (empty($naziv)) {
            sendResponse(false, null, 'Naziv taga je obavezan');
        }
        
        // Provjeri postoji li
        $stmt = $pdo->prepare("SELECT id FROM tagovi WHERE LOWER(naziv) = LOWER(?)");
        $stmt->execute([$naziv]);
        $tagId = $stmt->fetchColumn();
        
        if (!$tagId) {
            // Kreiraj novi tag
            $boja = $input['boja'] ?? '#6366f1';
            $pdo->prepare("INSERT INTO tagovi (naziv, boja) VALUES (?, ?)")->execute([$naziv, $boja]);
            $tagId = $pdo->lastInsertId();
        }
        
        sendResponse(true, ['id' => $tagId, 'naziv' => $naziv]);
        break;
        
    case 'import-csv-klijenti':
        if ($method !== 'POST') sendResponse(false, null, 'Metoda nije dozvoljena');
        
        $importKlijenti = $input['klijenti'] ?? [];
        $imported = 0;
        $updated = 0;
        
        foreach ($importKlijenti as $k) {
            $existing = null;
            if (!empty($k['oib'])) {
                $stmt = $pdo->prepare("SELECT id FROM firme WHERE oib = ?");
                $stmt->execute([$k['oib']]);
                $existing = $stmt->fetchColumn();
            }
            
            if ($existing) {
                $pdo->prepare("
                    UPDATE firme SET naziv = ?, email = ?, telefon = ?, adresa = ?, postanski_broj = ?
                    WHERE id = ?
                ")->execute([
                    $k['naziv'],
                    $k['email'],
                    $k['telefon'],
                    $k['adresa'] ?? '',
                    $k['posta'] ?? '',
                    $existing
                ]);
                $updated++;
            } else {
                $pdo->prepare("
                    INSERT INTO firme (naziv, oib, email, telefon, adresa, postanski_broj, status, potencijal)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ")->execute([
                    $k['naziv'],
                    $k['oib'] ?? null,
                    $k['email'],
                    $k['telefon'],
                    $k['adresa'] ?? '',
                    $k['posta'] ?? '',
                    $k['status'] ?? 'potencijalan',
                    $k['potencijal'] ?? 'srednji'
                ]);
                $imported++;
            }
        }
        
        sendResponse(true, [
            'klijenti_dodano' => $imported,
            'klijenti_azurirano' => $updated
        ]);
        break;
    
    case 'import-firma':
        if ($method !== 'POST') sendResponse(false, null, 'Metoda nije dozvoljena');
        
        $oib = $input['oib'] ?? null;
        if (!$oib || strlen($oib) !== 11) {
            sendResponse(false, null, 'OIB je obavezan (11 znamenki)');
        }
        
        // Provjeri postoji li već
        $stmt = $pdo->prepare("SELECT id FROM firme WHERE oib = ?");
        $stmt->execute([$oib]);
        $existing = $stmt->fetchColumn();
        
        if ($existing) {
            // Ako postoji i ima tag, samo dodaj tag
            if (!empty($input['tag_id'])) {
                // Provjeri da tag već nije dodan
                $stmt = $pdo->prepare("SELECT 1 FROM firma_tagovi WHERE firma_id = ? AND tag_id = ?");
                $stmt->execute([$existing, $input['tag_id']]);
                if (!$stmt->fetchColumn()) {
                    $pdo->prepare("INSERT INTO firma_tagovi (firma_id, tag_id) VALUES (?, ?)")
                        ->execute([$existing, $input['tag_id']]);
                }
            }
            sendResponse(false, null, 'Firma s ovim OIB-om već postoji (ID: ' . $existing . ')', ['existing_id' => $existing]);
        }
        
        // Mapiraj tip subjekta
        $tipSubjekta = null;
        $vrstaSubjekta = strtolower($input['tip_subjekta'] ?? '');
        if (strpos($vrstaSubjekta, 'obrt') !== false) {
            $tipSubjekta = 4;
        } elseif (strpos($vrstaSubjekta, 'd.o.o') !== false || strpos($vrstaSubjekta, 'društvo') !== false) {
            $tipSubjekta = 1;
        } elseif (strpos($vrstaSubjekta, 'd.d') !== false) {
            $tipSubjekta = 2;
        }
        
        // Pronađi županiju i grad/općinu
        $zupanijaId = null;
        $gradOpcinaId = null;
        
        $gradoviDB = DB_GRADOVI;
        
        if (!empty($input['zupanija'])) {
            $zupanijaNaziv = trim($input['zupanija']);
            $stmt = $pdo->prepare("SELECT id FROM {$gradoviDB}.zupanije WHERE naziv = ?");
            $stmt->execute([$zupanijaNaziv]);
            $zupanijaId = $stmt->fetchColumn();
            
            if (!$zupanijaId) {
                $stmt = $pdo->prepare("SELECT id FROM {$gradoviDB}.zupanije WHERE naziv LIKE ?");
                $stmt->execute(['%' . $zupanijaNaziv . '%']);
                $zupanijaId = $stmt->fetchColumn() ?: null;
            }
        }
        
        if (!empty($input['grad_opcina'])) {
            $gradNaziv = trim($input['grad_opcina']);
            $gradNaziv = preg_replace('/^(GRAD|OPĆINA|Grad|Općina)\s+/i', '', $gradNaziv);
            $gradNaziv = mb_convert_case(mb_strtolower($gradNaziv), MB_CASE_TITLE, 'UTF-8');
            
            if ($zupanijaId) {
                $stmt = $pdo->prepare("SELECT id FROM {$gradoviDB}.gradovi_opcine WHERE naziv LIKE ? AND zupanija_id = ?");
                $stmt->execute(['%' . $gradNaziv . '%', $zupanijaId]);
                $gradOpcinaId = $stmt->fetchColumn() ?: null;
            }
            
            if (!$gradOpcinaId) {
                $stmt = $pdo->prepare("SELECT id, zupanija_id FROM {$gradoviDB}.gradovi_opcine WHERE naziv LIKE ? LIMIT 1");
                $stmt->execute(['%' . $gradNaziv . '%']);
                $result = $stmt->fetch();
                if ($result) {
                    $gradOpcinaId = $result['id'];
                    if (!$zupanijaId) {
                        $zupanijaId = $result['zupanija_id'];
                    }
                }
            }
        }
        
        // Insert - BEZ emaila (email ide na kontakt)
        $stmt = $pdo->prepare("
            INSERT INTO firme (
                oib, naziv, adresa, postanski_broj, grad_opcina_id, zupanija_id,
                web, tip_subjekta_id, djelatnost, ovlastene_osobe, prihod_2024, broj_zaposlenih,
                status, potencijal, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'potencijalan', 'srednji', ?)
        ");
        
        $stmt->execute([
            $oib,
            $input['naziv'] ?? '',
            $input['adresa'] ?? '',
            $input['postanski_broj'] ?? '',
            $gradOpcinaId,
            $zupanijaId,
            $input['web'] ?? null,
            $tipSubjekta,
            $input['djelatnost'] ?? null,
            $input['ovlastene_osobe'] ?? null,
            $input['prihod_2024'] ?? null,
            $input['broj_zaposlenih'] ?? null,
            $_SESSION['user_id'] ?? null
        ]);
        
        $firmaId = $pdo->lastInsertId();
        
        // Dodaj tag ako je poslan
        if (!empty($input['tag_id'])) {
            $pdo->prepare("INSERT INTO firma_tagovi (firma_id, tag_id) VALUES (?, ?)")
                ->execute([$firmaId, $input['tag_id']]);
        }
        
        // Dodaj kontakt iz ovlaštenih osoba S EMAILOM
        $kontaktEmail = $input['email'] ?? null;
        if (!empty($input['ovlastene_osobe'])) {
            $osobe = explode(',', $input['ovlastene_osobe']);
            $prvaOsoba = trim($osobe[0]);
            if ($prvaOsoba) {
                $dijelovi = explode(' ', $prvaOsoba, 2);
                $pdo->prepare("
                    INSERT INTO kontakti (firma_id, ime, prezime, email, is_primary)
                    VALUES (?, ?, ?, ?, 1)
                ")->execute([
                    $firmaId,
                    $dijelovi[0] ?? '',
                    $dijelovi[1] ?? '',
                    $kontaktEmail
                ]);
            }
        } elseif ($kontaktEmail) {
            // Ako nema ovlaštene osobe ali ima email, kreiraj kontakt "Ured"
            $pdo->prepare("
                INSERT INTO kontakti (firma_id, ime, prezime, email, is_primary)
                VALUES (?, 'Ured', '', ?, 1)
            ")->execute([$firmaId, $kontaktEmail]);
        }
        
        sendResponse(true, ['id' => $firmaId, 'message' => 'Firma importana']);
        break;
    
    // BULK IMPORT - više firmi odjednom s tagom
    case 'import-bulk':
        if ($method !== 'POST') sendResponse(false, null, 'Metoda nije dozvoljena');
        
        $firme = $input['firme'] ?? [];
        $tagId = $input['tag_id'] ?? null;
        $skipExisting = $input['skip_existing'] ?? true;
        
        if (empty($firme)) {
            sendResponse(false, null, 'Nema firmi za import');
        }
        
        $gradoviDB = DB_GRADOVI;
        $imported = 0;
        $skipped = 0;
        $taggedExisting = 0;
        $errors = [];
        
        foreach ($firme as $firma) {
            $oib = str_pad(trim($firma['oib'] ?? ''), 11, '0', STR_PAD_LEFT);
            
            if (strlen($oib) !== 11) {
                $errors[] = "Nevažeći OIB: {$oib}";
                continue;
            }
            
            // Provjeri duplikat
            $stmt = $pdo->prepare("SELECT id FROM firme WHERE oib = ?");
            $stmt->execute([$oib]);
            $existingId = $stmt->fetchColumn();
            
            if ($existingId) {
                if ($skipExisting) {
                    // Samo dodaj tag ako nije već dodan
                    if ($tagId) {
                        $stmt = $pdo->prepare("SELECT 1 FROM firma_tagovi WHERE firma_id = ? AND tag_id = ?");
                        $stmt->execute([$existingId, $tagId]);
                        if (!$stmt->fetchColumn()) {
                            $pdo->prepare("INSERT INTO firma_tagovi (firma_id, tag_id) VALUES (?, ?)")
                                ->execute([$existingId, $tagId]);
                            $taggedExisting++;
                        }
                    }
                    $skipped++;
                    continue;
                }
            }
            
            // Pronađi županiju
            $zupanijaId = null;
            $gradOpcinaId = null;
            
            if (!empty($firma['zupanija'])) {
                $zupanijaNaziv = trim($firma['zupanija']);
                $stmt = $pdo->prepare("SELECT id FROM {$gradoviDB}.zupanije WHERE naziv LIKE ?");
                $stmt->execute(['%' . $zupanijaNaziv . '%']);
                $zupanijaId = $stmt->fetchColumn() ?: null;
            }
            
            if (!empty($firma['grad_opcina'])) {
                $gradNaziv = trim($firma['grad_opcina']);
                $gradNaziv = preg_replace('/^(GRAD|OPĆINA|Grad|Općina)\s+/i', '', $gradNaziv);
                
                if ($zupanijaId) {
                    $stmt = $pdo->prepare("SELECT id FROM {$gradoviDB}.gradovi_opcine WHERE naziv LIKE ? AND zupanija_id = ?");
                    $stmt->execute(['%' . $gradNaziv . '%', $zupanijaId]);
                    $gradOpcinaId = $stmt->fetchColumn() ?: null;
                }
                
                if (!$gradOpcinaId) {
                    $stmt = $pdo->prepare("SELECT id, zupanija_id FROM {$gradoviDB}.gradovi_opcine WHERE naziv LIKE ? LIMIT 1");
                    $stmt->execute(['%' . $gradNaziv . '%']);
                    $result = $stmt->fetch();
                    if ($result) {
                        $gradOpcinaId = $result['id'];
                        if (!$zupanijaId) $zupanijaId = $result['zupanija_id'];
                    }
                }
            }
            
            // Tip subjekta
            $tipSubjekta = null;
            $vrsta = strtolower($firma['tip_subjekta'] ?? '');
            if (strpos($vrsta, 'obrt') !== false) $tipSubjekta = 4;
            elseif (strpos($vrsta, 'd.o.o') !== false) $tipSubjekta = 1;
            elseif (strpos($vrsta, 'd.d') !== false) $tipSubjekta = 2;
            
            try {
                // Insert firme BEZ emaila
                $stmt = $pdo->prepare("
                    INSERT INTO firme (
                        oib, naziv, adresa, postanski_broj, grad_opcina_id, zupanija_id,
                        web, tip_subjekta_id, djelatnost, ovlastene_osobe, prihod_2024, broj_zaposlenih,
                        status, potencijal, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'potencijalan', 'srednji', ?)
                ");
                
                $stmt->execute([
                    $oib,
                    $firma['naziv'] ?? '',
                    $firma['adresa'] ?? '',
                    $firma['postanski_broj'] ?? '',
                    $gradOpcinaId,
                    $zupanijaId,
                    $firma['web'] ?? null,
                    $tipSubjekta,
                    $firma['djelatnost'] ?? null,
                    $firma['ovlastene_osobe'] ?? null,
                    $firma['prihod_2024'] ?? null,
                    $firma['broj_zaposlenih'] ?? null,
                    $_SESSION['user_id'] ?? null
                ]);
                
                $firmaId = $pdo->lastInsertId();
                
                // Dodaj tag
                if ($tagId) {
                    $pdo->prepare("INSERT INTO firma_tagovi (firma_id, tag_id) VALUES (?, ?)")
                        ->execute([$firmaId, $tagId]);
                }
                
                // Kontakt S EMAILOM
                $kontaktEmail = $firma['email'] ?? null;
                if (!empty($firma['ovlastene_osobe'])) {
                    $osobe = explode(',', $firma['ovlastene_osobe']);
                    $prvaOsoba = trim($osobe[0]);
                    if ($prvaOsoba) {
                        $dijelovi = explode(' ', $prvaOsoba, 2);
                        $pdo->prepare("INSERT INTO kontakti (firma_id, ime, prezime, email, is_primary) VALUES (?, ?, ?, ?, 1)")
                            ->execute([$firmaId, $dijelovi[0] ?? '', $dijelovi[1] ?? '', $kontaktEmail]);
                    }
                } elseif ($kontaktEmail) {
                    // Ako nema ovlaštene osobe ali ima email, kreiraj kontakt "Ured"
                    $pdo->prepare("INSERT INTO kontakti (firma_id, ime, prezime, email, is_primary) VALUES (?, 'Ured', '', ?, 1)")
                        ->execute([$firmaId, $kontaktEmail]);
                }
                
                $imported++;
            } catch (PDOException $e) {
                $errors[] = "OIB {$oib}: " . $e->getMessage();
            }
        }
        
        sendResponse(true, [
            'imported' => $imported,
            'skipped' => $skipped,
            'tagged_existing' => $taggedExisting,
            'errors' => $errors
        ]);
        break;
    
    case 'import-jls':
        if ($method !== 'POST') sendResponse(false, null, 'Metoda nije dozvoljena');
        
        $oib = $input['oib'] ?? null;
        if (!$oib || strlen($oib) !== 11) {
            sendResponse(false, null, 'OIB je obavezan (11 znamenki)');
        }
        
        $stmt = $pdo->prepare("SELECT id FROM firme WHERE oib = ?");
        $stmt->execute([$oib]);
        $existing = $stmt->fetchColumn();
        
        if ($existing) {
            sendResponse(false, null, 'JLS s ovim OIB-om već postoji');
        }
        
        $tip = strtoupper(trim($input['tip'] ?? ''));
        $zupanijaId = null;
        $gradOpcinaId = null;
        $gradoviDB = DB_GRADOVI;
        
        if (!empty($input['zupanija'])) {
            $zupanijaNaziv = trim($input['zupanija']);
            $zupanijaNaziv = preg_replace('/\s*ŽUPANIJA\s*/i', '', $zupanijaNaziv);
            $zupanijaNaziv = trim($zupanijaNaziv);
            
            $zupanije_map = [
                'ZAGREBAČKA' => 'Zagrebačka',
                'KRAPINSKO-ZAGORSKA' => 'Krapinsko-zagorska',
                'SISAČKO-MOSLAVAČKA' => 'Sisačko-moslavačka',
                'KARLOVAČKA' => 'Karlovačka',
                'VARAŽDINSKA' => 'Varaždinska',
                'KOPRIVNIČKO-KRIŽEVAČKA' => 'Koprivničko-križevačka',
                'BJELOVARSKO-BILOGORSKA' => 'Bjelovarsko-bilogorska',
                'PRIMORSKO-GORANSKA' => 'Primorsko-goranska',
                'LIČKO-SENJSKA' => 'Ličko-senjska',
                'VIROVITIČKO-PODRAVSKA' => 'Virovitičko-podravska',
                'POŽEŠKO-SLAVONSKA' => 'Požeško-slavonska',
                'BRODSKO-POSAVSKA' => 'Brodsko-posavska',
                'ZADARSKA' => 'Zadarska',
                'OSJEČKO-BARANJSKA' => 'Osječko-baranjska',
                'ŠIBENSKO-KNINSKA' => 'Šibensko-kninska',
                'VUKOVARSKO-SRIJEMSKA' => 'Vukovarsko-srijemska',
                'SPLITSKO-DALMATINSKA' => 'Splitsko-dalmatinska',
                'ISTARSKA' => 'Istarska',
                'DUBROVAČKO-NERETVANSKA' => 'Dubrovačko-neretvanska',
                'MEĐIMURSKA' => 'Međimurska',
                'GRAD ZAGREB' => 'Grad Zagreb'
            ];
            
            $zupanijaSearch = $zupanije_map[strtoupper(trim($zupanijaNaziv))] ?? $zupanijaNaziv;
            
            $stmt = $pdo->prepare("SELECT id FROM {$gradoviDB}.zupanije WHERE naziv LIKE ?");
            $stmt->execute(['%' . $zupanijaSearch . '%']);
            $zupanijaId = $stmt->fetchColumn() ?: null;
        }
        
        if (!empty($input['naziv']) && $zupanijaId) {
            $naziv = trim($input['naziv']);
            $stmt = $pdo->prepare("SELECT id FROM {$gradoviDB}.gradovi_opcine WHERE naziv LIKE ? AND zupanija_id = ?");
            $stmt->execute(['%' . $naziv . '%', $zupanijaId]);
            $gradOpcinaId = $stmt->fetchColumn() ?: null;
        }
        
        $tagId = null;
        $stmt = $pdo->prepare("SELECT id FROM tagovi WHERE naziv = ?");
        if ($tip === 'GRAD') {
            $stmt->execute(['Grad']);
            $tagId = $stmt->fetchColumn();
        } elseif ($tip === 'OPĆINA') {
            $stmt->execute(['Općina']);
            $tagId = $stmt->fetchColumn();
        } elseif ($tip === 'ŽUPANIJA') {
            $stmt->execute(['Županija']);
            $tagId = $stmt->fetchColumn();
        }
        
        if (!$tagId && $tip) {
            $tagNaziv = ucfirst(strtolower($tip));
            $tagBoja = $tip === 'GRAD' ? '#3b82f6' : ($tip === 'OPĆINA' ? '#22c55e' : '#f59e0b');
            $pdo->prepare("INSERT INTO tagovi (naziv, boja) VALUES (?, ?)")->execute([$tagNaziv, $tagBoja]);
            $tagId = $pdo->lastInsertId();
        }
        
        $adresa = trim($input['ulica'] ?? '');
        
        $stmt = $pdo->prepare("
            INSERT INTO firme (
                oib, naziv, email, telefon, web, adresa, postanski_broj,
                grad_opcina_id, zupanija_id, ovlastene_osobe, 
                prihod_2024, broj_zaposlenih, status, potencijal, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'potencijalan', 'srednji', ?)
        ");
        
        $stmt->execute([
            $oib,
            $input['naziv'] ?? '',
            $input['email'] ?? null,
            $input['telefon'] ?? null,
            $input['web'] ?? null,
            $adresa,
            $input['postanski_broj'] ?? '',
            $gradOpcinaId,
            $zupanijaId,
            $input['ovlastene_osobe'] ?? null,
            $input['prihod_2024'] ?? null,
            $input['broj_zaposlenih'] ?? null,
            $_SESSION['user_id'] ?? null
        ]);
        
        $firmaId = $pdo->lastInsertId();
        
        if ($tagId) {
            $pdo->prepare("INSERT INTO firma_tagovi (firma_id, tag_id) VALUES (?, ?)")
                ->execute([$firmaId, $tagId]);
        }
        
        if (!empty($input['nacelnik'])) {
            $nacelnik = trim($input['nacelnik']);
            $dijelovi = explode(' ', $nacelnik, 2);
            $pdo->prepare("
                INSERT INTO kontakti (firma_id, ime, prezime, pozicija, email, is_primary)
                VALUES (?, ?, ?, ?, ?, 1)
            ")->execute([
                $firmaId,
                $dijelovi[0] ?? '',
                $dijelovi[1] ?? '',
                $tip === 'ŽUPANIJA' ? 'Župan' : ($tip === 'GRAD' ? 'Gradonačelnik' : 'Načelnik'),
                $input['email'] ?? null
            ]);
        }
        
        sendResponse(true, ['id' => $firmaId, 'message' => 'JLS importan']);
        break;
}
