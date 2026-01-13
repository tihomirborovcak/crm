const API_URL = 'api.php';
let firmaId = null;
let firma = null;
let kontakti = [];
let aktivnosti = [];
let prilike = [];
let faze = [];
let sviTagovi = [];
let firmaTagovi = [];

// Init
document.addEventListener('DOMContentLoaded', async () => {
    // Provjeri autentifikaciju
    const authRes = await fetch(`${API_URL}?endpoint=current-user`);
    const authData = await authRes.json();
    if (!authData.success || !authData.data) {
        window.location.href = 'index.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    firmaId = params.get('id');

    if (!firmaId) {
        window.location = 'index.html';
        return;
    }

    loadFirma();
});

// API Helper
async function api(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    };
    
    if (data) options.body = JSON.stringify(data);
    
    let url = `${API_URL}?endpoint=${endpoint}`;
    if (method === 'GET' && data) {
        Object.keys(data).forEach(k => url += `&${k}=${data[k]}`);
    }
    
    const res = await fetch(url, options);
    return res.json();
}

// Load Firma
async function loadFirma() {
    const res = await api(`firme&id=${firmaId}`);
    if (!res.success || !res.data) {
        alert('Firma nije pronađena');
        window.location = 'index.html';
        return;
    }
    
    // API vraća objekt direktno kad je id zadan, inače array
    firma = Array.isArray(res.data) ? res.data[0] : res.data;
    renderFirmaInfo();
    loadKontakti();
    loadAktivnosti();
    loadPrilike();
    loadFaze();
    loadSviTagovi();
    loadFirmaTagovi();
}

// Render Firma Info
function renderFirmaInfo() {
    document.getElementById('firmaNaziv').textContent = firma.naziv;
    document.getElementById('firmaOib').innerHTML = firma.oib ? `OIB: ${firma.oib}` : '';
    document.getElementById('firmaStatus').innerHTML = `<span style="color: ${firma.status === 'aktivan' ? 'var(--success)' : 'var(--warning)'}">● ${firma.status}</span>`;
    document.getElementById('firmaKategorija').textContent = firma.kategorija_naziv || '';
    
    // Prihod
    if (firma.prihod_2024) {
        const p = parseFloat(firma.prihod_2024);
        document.getElementById('firmaPrihod').textContent = p >= 1000000 
            ? (p/1000000).toFixed(1) + 'M €' 
            : (p/1000).toFixed(0) + 'K €';
    }
    
    document.getElementById('firmaZaposleni').textContent = firma.broj_zaposlenih || '-';
    document.getElementById('firmaDjelatnost').textContent = firma.djelatnost || '-';
    document.getElementById('firmaTelefon').textContent = firma.telefon || '-';
    document.getElementById('firmaWeb').innerHTML = firma.web ? `<a href="${firma.web.startsWith('http') ? firma.web : 'https://'+firma.web}" target="_blank">${firma.web}</a>` : '-';
    document.getElementById('firmaAdresa').textContent = firma.adresa || '-';
    
    if (firma.ovlastene_osobe) {
        document.getElementById('ovlasteneCard').style.display = 'block';
        document.getElementById('firmaOvlastene').textContent = firma.ovlastene_osobe;
    }
}

// Load Kontakti
async function loadKontakti() {
    const res = await api(`kontakti&firma_id=${firmaId}`);
    kontakti = res.success ? res.data : [];
    document.getElementById('statKontakti').textContent = kontakti.length;
    renderKontakti();
    renderSidebarKontakti();
    updateKontaktSelect();
}

// Render Sidebar Kontakti
function renderSidebarKontakti() {
    const container = document.getElementById('sidebarKontakti');
    
    if (!kontakti.length) {
        container.innerHTML = '<p class="no-kontakti">Nema kontakata</p>';
        return;
    }
    
    container.innerHTML = kontakti.map(k => `
        <div class="sidebar-kontakt">
            <div class="sidebar-kontakt-name">
                ${k.ime || ''} ${k.prezime || ''}
                ${k.is_primary ? '<span class="primary-badge">PRIMARY</span>' : ''}
            </div>
            ${k.email ? `<div class="sidebar-kontakt-email"><a href="mailto:${k.email}">${k.email}</a></div>` : ''}
            ${k.telefon ? `<div class="sidebar-kontakt-tel">📞 ${k.telefon}</div>` : ''}
        </div>
    `).join('');
}

// Render Kontakti
function renderKontakti() {
    const container = document.getElementById('kontaktiList');
    
    if (!kontakti.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><p>Nema kontakata</p></div>`;
        return;
    }
    
    container.innerHTML = kontakti.map(k => `
        <div class="kontakt-card">
            <div class="kontakt-avatar">${(k.ime?.[0] || '') + (k.prezime?.[0] || '')}</div>
            <div class="kontakt-info">
                <div class="kontakt-name">${k.ime || ''} ${k.prezime || ''} ${k.is_primary ? '⭐' : ''}</div>
                <div class="kontakt-pozicija">${k.pozicija || ''}</div>
                <div class="kontakt-details">
                    ${k.email ? `<a href="mailto:${k.email}">${k.email}</a>` : ''}
                    ${k.telefon ? `<span>📞 ${k.telefon}</span>` : ''}
                    ${k.mobitel ? `<span>📱 ${k.mobitel}</span>` : ''}
                </div>
            </div>
            <div class="kontakt-actions">
                <button class="btn-sm btn-secondary" onclick="editKontakt(${k.id})">✏️</button>
                <button class="btn-sm btn-danger" onclick="deleteKontakt(${k.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Update Kontakt Select in Aktivnost Modal
function updateKontaktSelect() {
    const select = document.getElementById('aktivnostKontakt');
    select.innerHTML = '<option value="">-- Odaberi --</option>' + 
        kontakti.map(k => `<option value="${k.id}">${k.ime} ${k.prezime}</option>`).join('');
}

// Load Aktivnosti
async function loadAktivnosti() {
    const res = await api(`aktivnosti&firma_id=${firmaId}`);
    aktivnosti = res.success ? res.data : [];
    document.getElementById('statAktivnosti').textContent = aktivnosti.length;
    renderAktivnosti();
    // Ažuriraj prilike da prikažu vezane aktivnosti
    if (prilike && prilike.length > 0) {
        renderPrilike();
    }
}

// Render Aktivnosti
function renderAktivnosti() {
    const container = document.getElementById('aktivnostiList');
    
    if (!aktivnosti.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><p>Nema aktivnosti</p></div>`;
        return;
    }
    
    container.innerHTML = aktivnosti.map(a => `
        <div class="aktivnost-item ${a.tip}">
            <div class="aktivnost-header">
                <span class="aktivnost-tip">${getTipIcon(a.tip)} ${a.tip}</span>
                <div class="aktivnost-actions">
                    ${a.korisnik_ime ? `<span class="aktivnost-korisnik">${a.korisnik_ime}</span>` : ''}
                    <button class="btn-icon" onclick="editAktivnost(${a.id})" title="Uredi">✏️</button>
                    <button class="btn-icon" onclick="deleteAktivnost(${a.id})" title="Obriši">🗑️</button>
                    <span class="aktivnost-datum">${formatDate(a.datum_aktivnosti)}</span>
                </div>
            </div>
            <div class="aktivnost-naslov">${a.naslov || '(bez naslova)'}</div>
            ${a.opis ? `<div class="aktivnost-opis">${a.opis}</div>` : ''}
            ${a.kontakt_ime ? `<div class="aktivnost-kontakt">👤 ${a.kontakt_ime}</div>` : ''}
            ${a.prilika_id ? `<div class="aktivnost-prilika">💰 Vezano uz priliku</div>` : ''}
            ${a.sljedeci_korak ? `<div class="aktivnost-followup">🔔 ${a.sljedeci_korak} ${a.datum_sljedeceg ? '- ' + a.datum_sljedeceg : ''}</div>` : ''}
        </div>
    `).join('');
}

function getTipIcon(tip) {
    const icons = { poziv: '📞', email: '✉️', sastanak: '🤝', ponuda: '📄', napomena: '📝', zadatak: '✅' };
    return icons[tip] || '📋';
}

function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('hr-HR') + ' ' + date.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
}

// Tab Switch
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    document.querySelector(`.tab[onclick*="${tab}"]`).classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// Modal Functions
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Kontakt Modal
function openKontaktModal(kontakt = null) {
    document.getElementById('kontaktId').value = kontakt?.id || '';
    document.getElementById('kontaktIme').value = kontakt?.ime || '';
    document.getElementById('kontaktPrezime').value = kontakt?.prezime || '';
    document.getElementById('kontaktPozicija').value = kontakt?.pozicija || '';
    document.getElementById('kontaktEmail').value = kontakt?.email || '';
    document.getElementById('kontaktTelefon').value = kontakt?.telefon || '';
    document.getElementById('kontaktMobitel').value = kontakt?.mobitel || '';
    document.getElementById('kontaktNapomena').value = kontakt?.napomena || '';
    document.getElementById('kontaktPrimary').checked = kontakt?.is_primary == 1;
    
    document.getElementById('kontaktModalTitle').textContent = kontakt ? 'Uredi kontakt' : 'Novi kontakt';
    openModal('kontaktModal');
}

function editKontakt(id) {
    const k = kontakti.find(x => x.id == id);
    openKontaktModal(k);
}

async function saveKontakt() {
    const id = document.getElementById('kontaktId').value;
    const data = {
        firma_id: firmaId,
        ime: document.getElementById('kontaktIme').value,
        prezime: document.getElementById('kontaktPrezime').value,
        pozicija: document.getElementById('kontaktPozicija').value,
        email: document.getElementById('kontaktEmail').value,
        telefon: document.getElementById('kontaktTelefon').value,
        mobitel: document.getElementById('kontaktMobitel').value,
        napomena: document.getElementById('kontaktNapomena').value,
        is_primary: document.getElementById('kontaktPrimary').checked ? 1 : 0
    };
    
    if (id) data.id = id;
    
    const res = await api('kontakti', id ? 'PUT' : 'POST', data);
    if (res.success) {
        showToast('Kontakt spremljen');
        closeModal('kontaktModal');
        loadKontakti();
    } else {
        alert('Greška: ' + res.error);
    }
}

async function deleteKontakt(id) {
    if (!confirm('Obrisati kontakt?')) return;
    const res = await api(`kontakti&id=${id}`, 'DELETE');
    if (res.success) {
        showToast('Kontakt obrisan');
        loadKontakti();
    }
}

// Edit Aktivnost
function editAktivnost(id) {
    const a = aktivnosti.find(x => x.id == id);
    if (!a) return;

    document.getElementById('aktivnostId').value = a.id;
    document.getElementById('aktivnostTip').value = a.tip || 'napomena';
    document.getElementById('aktivnostKontakt').value = a.kontakt_id || '';
    document.getElementById('aktivnostNaslov').value = a.naslov || '';
    document.getElementById('aktivnostOpis').value = a.opis || '';
    document.getElementById('aktivnostRezultat').value = a.rezultat || '';
    document.getElementById('aktivnostDatum').value = a.datum_aktivnosti ? a.datum_aktivnosti.slice(0, 16) : '';
    document.getElementById('aktivnostTrajanje').value = a.trajanje_min || '';
    document.getElementById('aktivnostSljedeci').value = a.sljedeci_korak || '';
    document.getElementById('aktivnostDatumSljedeceg').value = a.datum_sljedeceg || '';
    document.getElementById('aktivnostStatus').value = a.status || 'zavrsena';

    // Popuni prilike dropdown
    const prilikaGroup = document.getElementById('aktivnostPrilikaGroup');
    const prilikaSelect = document.getElementById('aktivnostPrilika');
    if (prilike && prilike.length > 0) {
        prilikaSelect.innerHTML = '<option value="">-- Nije vezano uz priliku --</option>' +
            prilike.map(p => `<option value="${p.id}">💰 ${p.naziv} (${p.faza_naziv || p.faza || ''})</option>`).join('');
        prilikaGroup.style.display = 'block';
        prilikaSelect.value = a.prilika_id || '';
    } else {
        prilikaGroup.style.display = 'none';
    }

    document.getElementById('aktivnostModalTitle').textContent = 'Uredi aktivnost';
    openModal('aktivnostModal');
}

// Delete Aktivnost
async function deleteAktivnost(id) {
    if (!confirm('Obrisati aktivnost?')) return;
    const res = await api(`aktivnosti&id=${id}`, 'DELETE');
    if (res.success) {
        showToast('Aktivnost obrisana');
        loadAktivnosti();
    }
}

// Aktivnost Modal
function openAktivnostModal(tip = 'napomena') {
    document.getElementById('aktivnostId').value = '';
    document.getElementById('aktivnostTip').value = tip;
    document.getElementById('aktivnostKontakt').value = '';
    document.getElementById('aktivnostNaslov').value = '';
    document.getElementById('aktivnostOpis').value = '';
    document.getElementById('aktivnostRezultat').value = '';
    document.getElementById('aktivnostDatum').value = new Date().toISOString().slice(0, 16);
    document.getElementById('aktivnostTrajanje').value = '';
    document.getElementById('aktivnostSljedeci').value = '';
    document.getElementById('aktivnostDatumSljedeceg').value = '';
    document.getElementById('aktivnostStatus').value = 'zavrsena';

    // Popuni prilike dropdown ako firma ima prilike
    const prilikaGroup = document.getElementById('aktivnostPrilikaGroup');
    const prilikaSelect = document.getElementById('aktivnostPrilika');
    if (prilike && prilike.length > 0) {
        prilikaSelect.innerHTML = '<option value="">-- Nije vezano uz priliku --</option>' +
            prilike.map(p => `<option value="${p.id}">💰 ${p.naziv} (${p.faza_naziv || p.faza || ''})</option>`).join('');
        prilikaGroup.style.display = 'block';
    } else {
        prilikaGroup.style.display = 'none';
    }
    prilikaSelect.value = '';

    document.getElementById('aktivnostModalTitle').textContent = 'Nova aktivnost';
    openModal('aktivnostModal');
}

async function saveAktivnost() {
    const data = {
        firma_id: firmaId,
        kontakt_id: document.getElementById('aktivnostKontakt').value || null,
        prilika_id: document.getElementById('aktivnostPrilika').value || null,
        tip: document.getElementById('aktivnostTip').value,
        naslov: document.getElementById('aktivnostNaslov').value,
        opis: document.getElementById('aktivnostOpis').value,
        rezultat: document.getElementById('aktivnostRezultat').value,
        datum_aktivnosti: document.getElementById('aktivnostDatum').value,
        trajanje_min: document.getElementById('aktivnostTrajanje').value || null,
        sljedeci_korak: document.getElementById('aktivnostSljedeci').value,
        datum_sljedeceg: document.getElementById('aktivnostDatumSljedeceg').value || null,
        status: document.getElementById('aktivnostStatus').value
    };
    
    const id = document.getElementById('aktivnostId').value;
    if (id) data.id = id;
    
    const res = await api('aktivnosti', id ? 'PUT' : 'POST', data);
    if (res.success) {
        showToast('Aktivnost spremljena');
        closeModal('aktivnostModal');
        loadAktivnosti();
    } else {
        alert('Greška: ' + res.error);
    }
}

// Toast
function showToast(msg) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Logout
function logout() {
    fetch('api.php?endpoint=logout', { method: 'POST' })
        .then(() => window.location.href = 'index.html');
}

// =====================================================
// PRILIKE
// =====================================================
async function loadFaze() {
    const res = await api('faze-pipeline');
    if (res.success) {
        faze = res.data;
    }
}

async function loadPrilike() {
    // Prilike su već učitane s firmom ako API vraća ih
    if (firma && firma.prilike) {
        prilike = firma.prilike;
    } else {
        const res = await api(`prilike&firma_id=${firmaId}`);
        prilike = res.success ? res.data : [];
    }
    document.getElementById('statPrilike').textContent = prilike.length;
    renderPrilike();
}

function renderPrilike() {
    const container = document.getElementById('prilikeList');
    
    if (prilike.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <p>Nema prilika za ovu firmu</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = prilike.map(p => {
        const datumClass = getDateClass(p.datum_ocekivanog_zatvaranja);
        const fazaBoja = p.faza_boja || '#94a3b8';

        // Filtriraj aktivnosti vezane uz ovu priliku
        const prilikaAktivnosti = aktivnosti.filter(a => a.prilika_id == p.id);
        const aktivnostiHtml = prilikaAktivnosti.length > 0 ? `
            <div class="prilika-aktivnosti">
                <div class="prilika-aktivnosti-title">📋 Aktivnosti (${prilikaAktivnosti.length})</div>
                ${prilikaAktivnosti.slice(0, 3).map(a => `
                    <div class="prilika-aktivnost-item">
                        <span>${getTipIcon(a.tip)}</span>
                        <span>${escapeHtml(a.naslov || a.tip)}</span>
                        <span class="aktivnost-datum">${formatDate(a.datum_aktivnosti)}</span>
                    </div>
                `).join('')}
                ${prilikaAktivnosti.length > 3 ? `<div class="prilika-aktivnosti-more">...i još ${prilikaAktivnosti.length - 3}</div>` : ''}
            </div>
        ` : '';

        return `
            <div class="prilika-card" style="border-left-color: ${fazaBoja}">
                <div class="prilika-header">
                    <div class="prilika-naziv">${escapeHtml(p.naziv)}</div>
                    <div class="prilika-vrijednost">${formatMoney(p.vrijednost)}</div>
                </div>
                <div class="prilika-meta">
                    <span class="prilika-faza" style="background: ${fazaBoja}20; color: ${fazaBoja}">
                        ${escapeHtml(p.faza_naziv || 'Nepoznato')}
                    </span>
                    ${p.servis_naziv ? `<span>${escapeHtml(p.servis_naziv)}</span>` : ''}
                    ${p.datum_ocekivanog_zatvaranja ?
                        `<span class="prilika-datum ${datumClass}">📅 ${formatDate(p.datum_ocekivanog_zatvaranja)}</span>` :
                        ''
                    }
                </div>
                ${p.opis ? `<p style="font-size: 13px; color: var(--gray-500); margin-top: 8px;">${escapeHtml(p.opis)}</p>` : ''}
                ${aktivnostiHtml}
                <div class="prilika-actions">
                    <button class="btn-sm btn-secondary" onclick="editPrilika(${p.id})">✏️ Uredi</button>
                    <button class="btn-sm btn-secondary" onclick="deletePrilika(${p.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function getDateClass(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'soon';
    return '';
}

function formatMoney(value) {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('hr-HR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openPrilikaModal(id = null) {
    document.getElementById('prilikaModalTitle').textContent = id ? 'Uredi priliku' : 'Nova prilika';
    document.getElementById('prilikaId').value = id || '';
    
    // Popuni faze dropdown
    const fazaSelect = document.getElementById('prilikaFazaId');
    fazaSelect.innerHTML = faze.map(f => 
        `<option value="${f.id}">${f.naziv}</option>`
    ).join('');
    
    if (id) {
        const p = prilike.find(x => x.id == id);
        if (p) {
            document.getElementById('prilikaNaziv').value = p.naziv || '';
            document.getElementById('prilikaOpis').value = p.opis || '';
            document.getElementById('prilikaFazaId').value = p.faza_id || '';
            document.getElementById('prilikaVrijednost').value = p.vrijednost || 0;
            document.getElementById('prilikaDatumZatvaranja').value = p.datum_ocekivanog_zatvaranja || '';
        }
    } else {
        document.getElementById('prilikaNaziv').value = '';
        document.getElementById('prilikaOpis').value = '';
        document.getElementById('prilikaFazaId').value = faze.length ? faze[0].id : '';
        document.getElementById('prilikaVrijednost').value = '';
        document.getElementById('prilikaDatumZatvaranja').value = '';
    }
    
    document.getElementById('prilikaModal').classList.add('active');
}

function editPrilika(id) {
    openPrilikaModal(id);
}

async function savePrilika() {
    const id = document.getElementById('prilikaId').value;
    const data = {
        firma_id: parseInt(firmaId),
        naziv: document.getElementById('prilikaNaziv').value.trim(),
        opis: document.getElementById('prilikaOpis').value.trim(),
        faza_id: parseInt(document.getElementById('prilikaFazaId').value),
        vrijednost: parseFloat(document.getElementById('prilikaVrijednost').value) || 0,
        datum_ocekivanog_zatvaranja: document.getElementById('prilikaDatumZatvaranja').value || null
    };
    
    if (!data.naziv) {
        alert('Naziv je obavezan');
        return;
    }
    
    if (id) data.id = parseInt(id);
    
    const res = await api('prilike', id ? 'PUT' : 'POST', data);
    
    if (res.success) {
        closeModal('prilikaModal');
        showToast(id ? 'Prilika ažurirana' : 'Prilika dodana');
        loadPrilike();
    } else {
        alert('Greška: ' + res.error);
    }
}

async function deletePrilika(id) {
    if (!confirm('Obrisati ovu priliku?')) return;
    
    const res = await api(`prilike&id=${id}`, 'DELETE');
    
    if (res.success) {
        showToast('Prilika obrisana');
        loadPrilike();
    } else {
        alert('Greška: ' + res.error);
    }
}

// =====================================================
// TAGOVI
// =====================================================
async function loadSviTagovi() {
    const res = await api('tagovi');
    if (res.success) {
        sviTagovi = res.data;
        renderTagSelect();
    }
}

async function loadFirmaTagovi() {
    const res = await api(`firma-tagovi&firma_id=${firmaId}`);
    if (res.success) {
        firmaTagovi = res.data;
        renderFirmaTagovi();
    }
}

function renderTagSelect() {
    const select = document.getElementById('tagSelect');
    const firmaTagIds = firmaTagovi.map(t => t.id);
    
    select.innerHTML = '<option value="">+ Dodaj tag...</option>' +
        sviTagovi
            .filter(t => !firmaTagIds.includes(t.id))
            .map(t => `<option value="${t.id}" data-boja="${t.boja}">${t.naziv}</option>`)
            .join('');
    
    select.onchange = function() {
        if (this.value) {
            addTagToFirma(this.value);
            this.value = '';
        }
    };
}

function renderFirmaTagovi() {
    const container = document.getElementById('firmaTagovi');
    
    if (firmaTagovi.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-400); font-size: 13px;">Nema tagova</p>';
    } else {
        container.innerHTML = firmaTagovi.map(t => `
            <span class="tag" style="background: ${t.boja}">
                ${escapeHtml(t.naziv)}
                <span class="tag-remove" onclick="removeTagFromFirma(${t.id})">×</span>
            </span>
        `).join('');
    }
    
    renderTagSelect();
}

async function addTagToFirma(tagId) {
    const res = await api('firma-tagovi', 'POST', {
        firma_id: parseInt(firmaId),
        tag_id: parseInt(tagId)
    });
    
    if (res.success) {
        loadFirmaTagovi();
        showToast('Tag dodan');
    } else {
        alert('Greška: ' + res.error);
    }
}

async function removeTagFromFirma(tagId) {
    const res = await api(`firma-tagovi&firma_id=${firmaId}&tag_id=${tagId}`, 'DELETE');
    
    if (res.success) {
        loadFirmaTagovi();
        showToast('Tag uklonjen');
    } else {
        alert('Greška: ' + res.error);
    }
}
