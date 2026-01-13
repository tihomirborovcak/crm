# Signal CRM 2.0 - Korisničke upute

## Sadržaj
1. [Prijava u sustav](#1-prijava-u-sustav)
2. [Dashboard](#2-dashboard)
3. [Firme](#3-firme)
4. [Kontakti](#4-kontakti)
5. [Pipeline (Prilike)](#5-pipeline-prilike)
6. [Administracija](#6-administracija)

---

## 1. Prijava u sustav

1. Otvorite aplikaciju u pregledniku
2. Unesite vaš **email** i **lozinku**
3. Kliknite **Prijava**

Nakon uspješne prijave, bit ćete preusmjereni na Dashboard.

Za odjavu kliknite **Odjava** u gornjem desnom kutu.

---

## 2. Dashboard

Dashboard je početna stranica s pregledom najvažnijih informacija.

### Statistike
- **Ukupno firmi** - broj svih firmi u sustavu
- **Aktivni klijenti** - firme sa statusom "aktivan"
- **Prilike u tijeku** - očekivana vrijednost aktivnih prilika
- **Follow-up danas** - broj aktivnosti zakazanih za danas

### Pretraga
- Upišite naziv firme, OIB ili email u polje pretrage
- Autocomplete će prikazati rezultate dok tipkate
- Kliknite na firmu za otvaranje detalja

### Nadolazeće aktivnosti
- Popis aktivnosti koje su zakazane u bliskoj budućnosti
- Kliknite na aktivnost za otvaranje firme

### Pipeline pregled
- Mini pregled prodajnog lijevka
- Kliknite "Otvori" za detaljan prikaz

### Statistike po kategorijama
Kliknite na bilo koju stavku (tag, servis, status, županiju) za prikaz pripadajućih firmi.

---

## 3. Firme

### Pregled liste firmi

Stranica prikazuje tablicu svih firmi s paginacijom (50 po stranici).

**Prikazani podaci:**
- Naziv i OIB
- Lokacija (grad, županija)
- Kontakt osoba i email
- Status (aktivan/potencijalan/neaktivan)
- Tagovi

### Filtriranje

Koristite filtere iznad tablice:
- **Pretraga** - po nazivu, OIB-u, telefonu
- **Kategorija** - vrsta djelatnosti
- **Tip subjekta** - d.o.o., obrt, JLS...
- **Županija/Grad** - geografski filter
- **Status** - aktivan, potencijalan, neaktivan
- **Tag** - segmentacija

### Nova firma

1. Kliknite **+ Nova firma**
2. Opcijski: Pretražite centralnu bazu kupaca
3. Ispunite podatke:
   - **Naziv firme** (obavezno)
   - OIB
   - Tip subjekta i kategorija
   - Kontakt podaci (telefon, web)
   - Adresa, županija, grad
   - Status i potencijal
   - Servisi za koje je zainteresirana
   - Tagovi
   - Napomena
4. Kliknite **Spremi**

### Uređivanje firme

1. Kliknite na red firme u tablici
2. Izmijenite podatke u modalu
3. Kliknite **Spremi**

### Bulk operacije s tagovima

1. Označite firme kvačicama lijevo
2. Pojavit će se traka s opcijama
3. Odaberite tag iz padajućeg izbornika
4. Kliknite **+ Dodaj tag** ili **- Ukloni tag**

---

## 4. Kontakti

### Pregled kontakata

Stranica prikazuje sve kontakte iz svih firmi.

**Statistike na vrhu:**
- Ukupno kontakata
- S emailom (zeleno)
- Bez emaila (crveno)
- Firme bez kontakta s emailom (upozorenje)

### Filtriranje

- **Pretraga** - po imenu, emailu, firmi
- **S emailom / Bez emaila** - filter po email statusu
- **Firme bez emaila** - prikazuje samo kontakte iz firmi koje nemaju niti jedan email
- **Samo primarni** - glavni kontakti firmi

### Uređivanje kontakta

1. Kliknite na kontakt u tablici
2. Izmijenite podatke:
   - Ime i prezime
   - Email
   - Telefon i mobitel
   - Pozicija
   - Primarni kontakt (da/ne)
3. Kliknite **Spremi**

**Napomena:** Novi kontakti se dodaju kroz stranicu detalja firme.

---

## 5. Pipeline (Prilike)

Pipeline je Kanban ploča koja prikazuje prodajne prilike po fazama.

### Prikaz

Svaka kolona predstavlja jednu fazu prodajnog procesa:
- **Novi kontakt** - početna faza
- **Kvalifikacija** - provjera potencijala
- **Ponuda** - poslana ponuda
- **Pregovori** - u tijeku pregovori
- **Dobiveno** - uspješno zatvoreno
- **Izgubljeno** - neuspješno

### Filtriranje

- **Moje prilike / Sve prilike** - toggle za prikaz
- **Servis** - filter po servisu
- **Samo aktivne** - skriva dobivene i izgubljene

### Nova prilika

1. Kliknite **+ Nova prilika**
2. Ispunite podatke:
   - **Firma** - upišite naziv, odaberite iz autocomplete-a
   - **Kontakt** - odaberite kontakt iz firme
   - **Naziv prilike** - npr. "Božićno oglašavanje 2024"
   - **Servis** - za koji servis je prilika
   - **Faza** - trenutna faza
   - **Vrijednost** - iznos u EUR
   - **Očekivano zatvaranje** - datum
   - **Opis** - dodatni detalji
3. Kliknite **Spremi**

### Premještanje prilike (Drag & Drop)

1. Kliknite i držite karticu prilike
2. Povucite na drugu kolonu (fazu)
3. Pustite karticu

Prilika će automatski biti ažurirana.

### Zatvaranje prilike

**Dobiveno:**
1. Premjestite karticu u kolonu "Dobiveno"
2. Datum zatvaranja se automatski postavlja

**Izgubljeno:**
1. Premjestite karticu u kolonu "Izgubljeno"
2. Ili otvorite priliku i odaberite fazu "Izgubljeno"
3. Odaberite **razlog gubitka**
4. Opcionalno unesite **konkurenta** koji je dobio posao

### Uređivanje prilike

1. Kliknite na karticu prilike
2. Izmijenite podatke u modalu
3. Kliknite **Spremi**

### Brisanje prilike

1. Otvorite priliku
2. Kliknite **Obriši** (crveni gumb lijevo dolje)
3. Potvrdite brisanje

---

## 6. Administracija

Administracija je dostupna korisnicima s ulogom **Administrator**.

### Korisnici

Upravljanje korisnicima sustava:
- **Novi korisnik** - dodavanje novog korisnika
- **Ime, prezime, email** - osnovni podaci
- **Lozinka** - kod uređivanja ostavite prazno za zadržati postojeću
- **Uloga** - Prodavač ili Administrator
- **Status** - Aktivan ili Neaktivan

### Servisi

Usluge koje Signal nudi:
- Zagorski list
- Signalprint
- Plakati/Outdoor
- Zagorje.com

Svaki servis ima naziv, kraticu i boju.

### Kategorije

Kategorije firmi prema djelatnosti:
- Ugostiteljstvo
- Trgovina
- Proizvodnja
- itd.

### Tagovi

Tagovi za segmentaciju klijenata:
- Omogućuju grupiranje firmi
- Koriste se za ciljane kampanje
- Bulk dodavanje/uklanjanje na stranici Firme

### Faze pipeline-a

Definiranje prodajnog procesa:
- **Redoslijed** - pozicija kolone
- **Naziv** - ime faze
- **Vjerojatnost** - postotak uspjeha (za izračun očekivanog prihoda)
- **Boja** - boja kolone
- **Završna faza** - označiti ako je "Dobiveno" ili "Izgubljeno"

### Razlozi gubitka

Razlozi zašto je prilika izgubljena:
- Preskupo
- Konkurencija
- Odustali
- Nije relevantno
- itd.

Koriste se za analizu i poboljšanje prodaje.

---

## Česta pitanja

### Kako dodati novi kontakt firmi?
1. Otvorite stranicu firme (kliknite na firmu u tablici)
2. U sekciji "Kontakti" kliknite **+ Novi kontakt**
3. Ispunite podatke i spremite

### Kako vidjeti sve prilike jedne firme?
1. Otvorite stranicu firme
2. Sekcija "Prilike" prikazuje sve prilike te firme

### Kako promijeniti vlasnika prilike?
Trenutno se vlasnik automatski postavlja na korisnika koji kreira priliku. Za promjenu kontaktirajte administratora.

### Zašto ne vidim neke prilike?
Provjerite:
- Je li uključen filter "Moje prilike" - prebacite na "Sve prilike"
- Je li uključen filter "Samo aktivne" - isključite za prikaz svih

### Kako exportirati podatke?
Export funkcionalnost trenutno nije dostupna kroz sučelje. Kontaktirajte administratora.

---

## Podrška

Za tehničku podršku ili pitanja:
- **Email:** info@signal.hr
- **Telefon:** kontaktirajte IT odjel

---

*Signal CRM 2.0 - Signal d.o.o.*
