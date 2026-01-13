# Signal CRM 2.0 - Dokumentacija

## Pregled projekta

Signal CRM je web aplikacija za upravljanje odnosima s klijentima (Customer Relationship Management) razvijena za Signal d.o.o. Aplikacija omogućuje praćenje firmi, kontakata, prodajnih prilika i aktivnosti.

**Verzija:** 2.0
**Jezik sučelja:** Hrvatski
**Tehnologije:** PHP, MySQL, JavaScript (Vanilla), HTML5, CSS3

---

## Arhitektura sustava

### Backend
- **PHP** - RESTful API arhitektura
- **MySQL** - Dvije baze podataka:
  - `slatkidar_signal_crm` - Glavna CRM baza
  - `slatkidar_gradovi` - Baza s geografskim podacima (županije, gradovi, općine)
- **Brevo API** - Integracija za slanje emailova

### Frontend
- **Vanilla JavaScript** - Bez frameworka
- **CSS3** - Custom styling, CSS varijable
- **HTML5** - Semantički markup

---

## Struktura datoteka

```
crm/
├── api.php                 # Glavni API router
├── config.php              # Konfiguracija (credentials, DB connection)
├── config.example.php      # Primjer konfiguracije
├── BrevoMailer.php         # Email integracija
├── .gitignore              # Git ignoriranje
│
├── api/                    # API moduli
│   ├── auth.php            # Autentikacija (login, logout)
│   ├── firme.php           # CRUD za firme/klijente
│   ├── kontakti.php        # CRUD za kontakte
│   ├── prilike.php         # Pipeline i prilike
│   ├── aktivnosti.php      # Aktivnosti/zadaci
│   ├── dashboard.php       # Statistike za dashboard
│   ├── admin.php           # Admin postavke
│   ├── korisnici.php       # Upravljanje korisnicima
│   ├── tagovi.php          # Tagovi za segmentaciju
│   ├── lookup.php          # Lookup tablice (servisi, kategorije, lokacije)
│   ├── email.php           # Slanje emailova
│   └── import.php          # Import podataka
│
├── css/                    # Stilovi
│   ├── common.css          # Zajednički stilovi
│   ├── index.css           # Dashboard stilovi
│   ├── firme.css           # Lista firmi
│   ├── firma.css           # Detalji firme
│   ├── kontakti.css        # Lista kontakata
│   ├── pipeline.css        # Kanban pipeline
│   └── admin.css           # Admin panel
│
├── js/                     # JavaScript
│   ├── index.js            # Dashboard logika
│   ├── firme.js            # Lista firmi
│   ├── firma.js            # Detalji firme
│   ├── kontakti.js         # Lista kontakata
│   ├── pipeline.js         # Kanban pipeline
│   └── admin.js            # Admin funkcionalnosti
│
├── index.html              # Dashboard
├── firme.html              # Lista firmi
├── firma.html              # Detalji firme
├── kontakti.html           # Lista kontakata
├── pipeline.html           # Prodajni pipeline (Kanban)
├── admin.html              # Administracija
└── import.html             # Import podataka
```

---

## Stranice i funkcionalnosti

### 1. Dashboard (`index.html`)
- Pregled statistika (ukupno firmi, aktivni klijenti, vrijednost prilika)
- Globalna pretraga firmi s autocomplete
- Nadolazeće aktivnosti
- Mini pipeline pregled
- Statistike po tagovima, servisima, statusu i županijama
- Klikabilne statistike za brzi pregled firmi

### 2. Firme (`firme.html`)
- Lista svih firmi s paginacijom
- Filtriranje po:
  - Kategoriji
  - Tipu subjekta (d.o.o., obrt, JLS...)
  - Županiji i gradu
  - Statusu (aktivan, potencijalan, neaktivan)
  - Tagovima
- Pretraga po nazivu, OIB-u, telefonu
- Bulk operacije - dodavanje/uklanjanje tagova
- Modal za kreiranje/uređivanje firme
- Autocomplete pretraga iz centralne baze kupaca

### 3. Detalji firme (`firma.html`)
- Prikaz svih podataka o firmi
- Lista kontakata s mogućnošću dodavanja
- Lista prilika
- Povijest aktivnosti
- Dodavanje novih aktivnosti
- Tagovi i servisi

### 4. Kontakti (`kontakti.html`)
- Lista svih kontakata
- Statistike (ukupno, s emailom, bez emaila)
- Upozorenje za firme bez kontakta s emailom
- Filtriranje po email statusu i primarnosti
- Modal za uređivanje kontakata

### 5. Pipeline (`pipeline.html`)
- Kanban board za prodajne prilike
- Drag & drop između faza
- Filtriranje:
  - Moje prilike / Sve prilike
  - Po servisu
  - Samo aktivne / Sve
- Modal za kreiranje/uređivanje prilike
- Autocomplete za firmu
- Odabir kontakta iz firme
- Razlog gubitka za izgubljene prilike

### 6. Administracija (`admin.html`)
Upravljanje:
- **Korisnicima** - dodavanje, uloge (admin/prodavač), status
- **Servisima** - Zagorski list, Signalprint, Plakati, Zagorje.com
- **Kategorijama** - vrste djelatnosti
- **Tagovima** - segmentacija klijenata
- **Fazama pipeline-a** - prodajni proces s vjerojatnostima
- **Razlozima gubitka** - analiza izgubljenih prilika

---

## API Endpointi

### Autentikacija
| Endpoint | Metoda | Opis |
|----------|--------|------|
| `login` | POST | Prijava korisnika |
| `logout` | POST | Odjava |
| `current-user` | GET | Trenutni korisnik |

### Firme
| Endpoint | Metoda | Opis |
|----------|--------|------|
| `firme` | GET | Lista firmi (s paginacijom i filterima) |
| `firme?id=X` | GET | Detalji jedne firme |
| `firme` | POST | Kreiranje/ažuriranje firme |
| `firme` | DELETE | Brisanje firme |

### Kontakti
| Endpoint | Metoda | Opis |
|----------|--------|------|
| `kontakti?firma_id=X` | GET | Kontakti firme |
| `kontakti-admin` | GET | Lista s filterima i paginacijom |
| `kontakti-stats` | GET | Statistike kontakata |
| `kontakti` | POST | Kreiranje/ažuriranje kontakta |
| `kontakti` | DELETE | Brisanje kontakta |

### Prilike i Pipeline
| Endpoint | Metoda | Opis |
|----------|--------|------|
| `prilike` | GET | Lista prilika |
| `prilike?id=X` | GET | Detalji prilike |
| `prilike?firma_id=X` | GET | Prilike firme |
| `prilike` | POST | Nova prilika |
| `prilike` | PUT | Ažuriranje prilike |
| `prilike` | DELETE | Brisanje prilike |
| `prilike-faza` | PUT | Promjena faze (drag & drop) |
| `faze-pipeline` | GET | Lista faza |
| `razlozi-gubitka` | GET | Lista razloga gubitka |
| `pipeline-stats` | GET | Statistike pipeline-a |

### Dashboard
| Endpoint | Metoda | Opis |
|----------|--------|------|
| `dashboard-stats` | GET | Glavne statistike |
| `status-stats` | GET | Statistike po statusu |
| `servisi-stats` | GET | Statistike po servisima |
| `zupanije-stats` | GET | Statistike po županijama |
| `aktivnosti-nadolazece` | GET | Nadolazeće aktivnosti |
| `firme-by-tag` | GET | Firme po tagu |

### Lookup tablice
| Endpoint | Metoda | Opis |
|----------|--------|------|
| `servisi` | GET | Lista servisa |
| `kategorije` | GET | Lista kategorija |
| `tipovi-subjekata` | GET | Tipovi (d.o.o., obrt...) |
| `zupanije` | GET | Lista županija |
| `gradovi-opcine?zupanija_id=X` | GET | Gradovi/općine |

### Tagovi
| Endpoint | Metoda | Opis |
|----------|--------|------|
| `tagovi` | GET | Lista tagova s brojem firmi |
| `firma-tagovi` | POST | Dodavanje taga firmi |
| `bulk-tagovi` | POST | Bulk operacije s tagovima |
| `admin-tagovi` | POST/DELETE | Upravljanje tagovima |

---

## Baza podataka

### Glavne tablice

#### `korisnici`
```sql
id, ime, prezime, email, lozinka, uloga, status, telefon, last_login, created_at
```

#### `firme`
```sql
id, naziv, oib, tip_subjekta_id, kategorija_id, adresa, postanski_broj,
grad_opcina_id, zupanija_id, telefon, mobitel, web, status, potencijal,
napomena, centralna_kupac_id, created_by, created_at, updated_at
```

#### `kontakti`
```sql
id, firma_id, ime, prezime, pozicija, email, telefon, mobitel, is_primary, created_at
```

#### `prilike`
```sql
id, firma_id, kontakt_id, korisnik_id, servis_id, naziv, opis, faza_id,
vrijednost, valuta, datum_otvaranja, datum_ocekivanog_zatvaranja,
datum_zatvaranja, razlog_gubitka, konkurent, napomena, created_at, updated_at
```

#### `aktivnosti`
```sql
id, firma_id, prilika_id, kontakt_id, korisnik_id, tip, naslov, opis,
datum_aktivnosti, datum_sljedeceg, status, created_at
```

### Lookup tablice
- `servisi` - Usluge (Zagorski list, Signalprint, Plakati, Zagorje.com)
- `kategorije` - Kategorije firmi
- `tipovi_subjekata` - Tipovi (d.o.o., obrt, JLS, ustanova...)
- `faze_pipeline` - Faze prodajnog procesa
- `razlozi_gubitka` - Razlozi gubitka posla
- `tagovi` - Tagovi za segmentaciju

### Povezne tablice
- `firma_servisi` - Veza firma-servis
- `firma_tagovi` - Veza firma-tag
- `prilika_stavke` - Stavke ponude prilike

### Geografska baza (`slatkidar_gradovi`)
- `zupanije` - 21 županija
- `gradovi_opcine` - Gradovi i općine s tipom

---

## Konfiguracija

### config.php
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'slatkidar_signal_crm');
define('DB_USER', 'slatkidar_mufo');
define('DB_PASS', '...');
define('DB_GRADOVI', 'slatkidar_gradovi');

define('BREVO_API_KEY', '...');
define('BREVO_API_URL', 'https://api.brevo.com/v3');
define('DEFAULT_SENDER_EMAIL', 'info@signal.hr');
define('DEFAULT_SENDER_NAME', 'Signal d.o.o.');

$EMAIL_SENDERS = [
    'zagorski-list' => ['email' => 'info@zagorski-list.hr', 'name' => 'Zagorski list'],
    'signalprint' => ['email' => 'info@signalprint.hr', 'name' => 'Signalprint'],
    'plakati' => ['email' => 'oglasavanje@signal.hr', 'name' => 'Signal Oglasavanje'],
    'zagorje-portal' => ['email' => 'oglasi@zagorje.com', 'name' => 'Zagorje.com']
];
```

---

## Autentikacija i sigurnost

- Session-based autentikacija
- Password hashing s `password_hash()` / `password_verify()`
- Provjera sesije na svakom API pozivu (`requireAuth()`)
- Priprema SQL upita s PDO prepared statements
- Role-based pristup (admin / prodavač)

---

## Deployment

### Zahtjevi
- PHP 7.4+
- MySQL 5.7+
- Apache s mod_rewrite

### Koraci
1. Kloniraj repozitorij
2. Kopiraj `config.example.php` u `config.php`
3. Konfiguriraj database credentials
4. Importaj SQL dump u baze
5. Postavi dozvole: folderi 755, datoteke 644

### Git repozitorij
- GitHub: `tihomirborovcak/crm`
- Branch: `main`

---

## Poznati problemi i rješenja

### JavaScript truthy/falsy s string "0"
**Problem:** `!"0"` vraća `false` jer je neprazan string truthy.
**Rješenje:** Uspoređivati s `== 0` umjesto `!variable`.

### cPanel config.php whitespace
**Problem:** cPanel File Manager editor dodaje razmake/uvlake.
**Rješenje:** Upload datoteke direktno umjesto copy-paste.

---

## Verzije i changelog

### v2.0 (trenutna)
- Kompletni redizajn sučelja
- Kanban pipeline s drag & drop
- Paginacija na svim listama
- Bulk operacije s tagovima
- Poboljšane statistike
- Autocomplete pretraga firmi
- Integracija s centralnom bazom kupaca
- Email integracija (Brevo)

---

## Kontakt

**Signal d.o.o.**
Web: signal.hr
Email: info@signal.hr
