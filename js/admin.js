const API_URL = 'api.php?endpoint=';

let korisnici = [];
let servisi = [];
let kategorije = [];
let tagovi = [];
let faze = [];
let razlozi = [];
let currentUser = null;

// =====================================================
// AUTH
// =====================================================
async function checkAuth() {
    console.log('checkAuth started');
    try {
        const res = await fetch('api.php?endpoint=current-user');
        const data = await res.json();
        console.log('current-user response:', data);
        if (data.success && data.data) {
            currentUser = data.data;
            console.log('currentUser:', currentUser);

            // Samo admin može pristupiti postavkama
            if (currentUser.uloga !== 'admin') {
                alert('Nemate pristup postavkama.');
                window.location.href = 'index.html';
                return false;
            }

            const ime = currentUser.ime || '';
            const prezime = currentUser.prezime || '';
            const userNameEl = document.getElementById('userName');
            const userAvatarEl = document.getElementById('userAvatar');
            console.log('Elements found:', { userNameEl: !!userNameEl, userAvatarEl: !!userAvatarEl });
            if (userNameEl) userNameEl.textContent = `${ime} ${prezime}`;
            if (userAvatarEl) userAvatarEl.textContent = `${ime[0] || ''}${prezime[0] || ''}`;
            return true;
        } else {
            console.log('No user data, redirecting');
            window.location.href = 'firme.html';
            return false;
        }
    } catch (e) {
        console.error('Auth error:', e);
        window.location.href = 'firme.html';
        return false;
    }
}

async function logout() {
    await fetch('api.php?endpoint=logout', { method: 'POST' });
    window.location.href = 'firme.html';
}
window.logout = logout;

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!await checkAuth()) return;
    loadAll();
});

async function loadAll() {
    await Promise.all([
        loadKorisnici(),
        loadServisi(),
        loadKategorije(),
        loadTagovi(),
        loadFaze(),
        loadRazlozi()
    ]);
}

// =====================================================
// TABS
// =====================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`.tab[onclick*="${tabId}"]`).classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

// =====================================================
// KORISNICI
// =====================================================
async function loadKorisnici() {
    const res = await fetch(API_URL + 'korisnici');
    const data = await res.json();
    if (data.success) {
        korisnici = data.data;
        renderKorisnici();
    }
}

function renderKorisnici() {
    const tbody = document.getElementById('korisniciTable');
    tbody.innerHTML = korisnici.map(k => `
        <tr>
            <td><strong>${esc(k.ime)} ${esc(k.prezime)}</strong></td>
            <td>${esc(k.email)}</td>
            <td><span class="badge ${k.uloga === 'admin' ? 'badge-info' : 'badge-success'}">${k.uloga}</span></td>
            <td><span class="badge ${k.status === 'aktivan' ? 'badge-success' : 'badge-danger'}">${k.status}</span></td>
            <td>${k.last_login ? formatDate(k.last_login) : '-'}</td>
            <td class="actions">
                <button class="btn btn-outline btn-sm" onclick="editKorisnik(${k.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteKorisnik(${k.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function openModal(type, id = null) {
    const modal = document.getElementById(`${type}Modal`);
    const title = document.getElementById(`${type}ModalTitle`);
    
    if (type === 'korisnik') {
        title.textContent = id ? 'Uredi korisnika' : 'Novi korisnik';
        document.getElementById('lozinkaHint').style.display = id ? 'inline' : 'none';
        document.getElementById('korisnikId').value = '';
        document.getElementById('korisnikIme').value = '';
        document.getElementById('korisnikPrezime').value = '';
        document.getElementById('korisnikEmail').value = '';
        document.getElementById('korisnikLozinka').value = '';
        document.getElementById('korisnikUloga').value = 'prodavac';
        document.getElementById('korisnikStatus').value = 'aktivan';
        document.getElementById('korisnikTelefon').value = '';
    } else if (type === 'servis') {
        title.textContent = id ? 'Uredi servis' : 'Novi servis';
        document.getElementById('servisId').value = '';
        document.getElementById('servisNaziv').value = '';
        document.getElementById('servisKratica').value = '';
        document.getElementById('servisBoja').value = '#3b82f6';
        document.getElementById('servisOpis').value = '';
        document.getElementById('servisAktivan').value = '1';
    } else if (type === 'kategorija') {
        title.textContent = id ? 'Uredi kategoriju' : 'Nova kategorija';
        document.getElementById('kategorijaId').value = '';
        document.getElementById('kategorijaNaziv').value = '';
        document.getElementById('kategorijaBoja').value = '#22c55e';
        document.getElementById('kategorijaAktivan').value = '1';
    } else if (type === 'faza') {
        title.textContent = id ? 'Uredi fazu' : 'Nova faza';
        document.getElementById('fazaId').value = '';
        document.getElementById('fazaNaziv').value = '';
        document.getElementById('fazaRedoslijed').value = faze.length + 1;
        document.getElementById('fazaVjerojatnost').value = '50';
        document.getElementById('fazaBoja').value = '#3b82f6';
        document.getElementById('fazaAktivan').value = '1';
        document.getElementById('fazaIsWon').checked = false;
        document.getElementById('fazaIsLost').checked = false;
        document.getElementById('fazaOpis').value = '';
    } else if (type === 'razlog') {
        title.textContent = id ? 'Uredi razlog' : 'Novi razlog';
        document.getElementById('razlogId').value = '';
        document.getElementById('razlogNaziv').value = '';
        document.getElementById('razlogRedoslijed').value = razlozi.length + 1;
        document.getElementById('razlogAktivan').value = '1';
    } else if (type === 'tag') {
        title.textContent = id ? 'Uredi tag' : 'Novi tag';
        document.getElementById('tagId').value = '';
        document.getElementById('tagNaziv').value = '';
        document.getElementById('tagBoja').value = '#3b82f6';
    }
    
    modal.classList.add('active');
}

function editKorisnik(id) {
    const k = korisnici.find(x => x.id === id);
    if (!k) return;
    
    document.getElementById('korisnikModalTitle').textContent = 'Uredi korisnika';
    document.getElementById('lozinkaHint').style.display = 'inline';
    document.getElementById('korisnikId').value = k.id;
    document.getElementById('korisnikIme').value = k.ime;
    document.getElementById('korisnikPrezime').value = k.prezime;
    document.getElementById('korisnikEmail').value = k.email;
    document.getElementById('korisnikLozinka').value = '';
    document.getElementById('korisnikUloga').value = k.uloga;
    document.getElementById('korisnikStatus').value = k.status;
    document.getElementById('korisnikTelefon').value = k.telefon || '';
    
    document.getElementById('korisnikModal').classList.add('active');
}

async function saveKorisnik() {
    const id = document.getElementById('korisnikId').value;
    const data = {
        ime: document.getElementById('korisnikIme').value.trim(),
        prezime: document.getElementById('korisnikPrezime').value.trim(),
        email: document.getElementById('korisnikEmail').value.trim(),
        uloga: document.getElementById('korisnikUloga').value,
        status: document.getElementById('korisnikStatus').value,
        telefon: document.getElementById('korisnikTelefon').value.trim()
    };
    
    const lozinka = document.getElementById('korisnikLozinka').value;
    if (lozinka) data.lozinka = lozinka;
    
    if (!data.ime || !data.email) {
        showToast('Ime i email su obavezni', 'error');
        return;
    }
    
    if (!id && !lozinka) {
        showToast('Lozinka je obavezna za novog korisnika', 'error');
        return;
    }
    
    if (id) data.id = parseInt(id);
    
    const res = await fetch(API_URL + 'korisnici', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Korisnik spremljen', 'success');
        closeModal('korisnikModal');
        loadKorisnici();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

async function deleteKorisnik(id) {
    if (!confirm('Obrisati korisnika?')) return;
    
    const res = await fetch(API_URL + 'korisnici', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Korisnik obrisan', 'success');
        loadKorisnici();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

// =====================================================
// SERVISI
// =====================================================
async function loadServisi() {
    const res = await fetch(API_URL + 'admin-servisi');
    const data = await res.json();
    if (data.success) {
        servisi = data.data;
        renderServisi();
    }
}

function renderServisi() {
    const tbody = document.getElementById('servisiTable');
    tbody.innerHTML = servisi.map(s => `
        <tr>
            <td><strong>${esc(s.naziv)}</strong></td>
            <td>${esc(s.kratica || '-')}</td>
            <td><span class="color-preview" style="background: ${s.boja || '#ccc'}"></span> ${s.boja || '-'}</td>
            <td><span class="badge ${s.aktivan == 1 ? 'badge-success' : 'badge-danger'}">${s.aktivan == 1 ? 'Aktivan' : 'Neaktivan'}</span></td>
            <td class="actions">
                <button class="btn btn-outline btn-sm" onclick="editServis(${s.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteServis(${s.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function editServis(id) {
    const s = servisi.find(x => x.id === id);
    if (!s) return;
    
    document.getElementById('servisModalTitle').textContent = 'Uredi servis';
    document.getElementById('servisId').value = s.id;
    document.getElementById('servisNaziv').value = s.naziv;
    document.getElementById('servisKratica').value = s.kratica || '';
    document.getElementById('servisBoja').value = s.boja || '#3b82f6';
    document.getElementById('servisOpis').value = s.opis || '';
    document.getElementById('servisAktivan').value = s.aktivan;
    
    document.getElementById('servisModal').classList.add('active');
}

async function saveServis() {
    const id = document.getElementById('servisId').value;
    const data = {
        naziv: document.getElementById('servisNaziv').value.trim(),
        kratica: document.getElementById('servisKratica').value.trim(),
        boja: document.getElementById('servisBoja').value,
        opis: document.getElementById('servisOpis').value.trim(),
        aktivan: parseInt(document.getElementById('servisAktivan').value)
    };
    
    if (!data.naziv) {
        showToast('Naziv je obavezan', 'error');
        return;
    }
    
    if (id) data.id = parseInt(id);
    
    const res = await fetch(API_URL + 'admin-servisi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Servis spremljen', 'success');
        closeModal('servisModal');
        loadServisi();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

async function deleteServis(id) {
    if (!confirm('Obrisati servis?')) return;
    
    const res = await fetch(API_URL + 'admin-servisi', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Servis obrisan', 'success');
        loadServisi();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

// =====================================================
// KATEGORIJE
// =====================================================
async function loadKategorije() {
    const res = await fetch(API_URL + 'admin-kategorije');
    const data = await res.json();
    if (data.success) {
        kategorije = data.data;
        renderKategorije();
    }
}

function renderKategorije() {
    const tbody = document.getElementById('kategorijeTable');
    tbody.innerHTML = kategorije.map(k => `
        <tr>
            <td><strong>${esc(k.naziv)}</strong></td>
            <td><span class="color-preview" style="background: ${k.boja || '#ccc'}"></span> ${k.boja || '-'}</td>
            <td><span class="badge ${k.aktivan == 1 ? 'badge-success' : 'badge-danger'}">${k.aktivan == 1 ? 'Aktivna' : 'Neaktivna'}</span></td>
            <td class="actions">
                <button class="btn btn-outline btn-sm" onclick="editKategorija(${k.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteKategorija(${k.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function editKategorija(id) {
    const k = kategorije.find(x => x.id === id);
    if (!k) return;
    
    document.getElementById('kategorijaModalTitle').textContent = 'Uredi kategoriju';
    document.getElementById('kategorijaId').value = k.id;
    document.getElementById('kategorijaNaziv').value = k.naziv;
    document.getElementById('kategorijaBoja').value = k.boja || '#22c55e';
    document.getElementById('kategorijaAktivan').value = k.aktivan;
    
    document.getElementById('kategorijaModal').classList.add('active');
}

async function saveKategorija() {
    const id = document.getElementById('kategorijaId').value;
    const data = {
        naziv: document.getElementById('kategorijaNaziv').value.trim(),
        boja: document.getElementById('kategorijaBoja').value,
        aktivan: parseInt(document.getElementById('kategorijaAktivan').value)
    };
    
    if (!data.naziv) {
        showToast('Naziv je obavezan', 'error');
        return;
    }
    
    if (id) data.id = parseInt(id);
    
    const res = await fetch(API_URL + 'admin-kategorije', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Kategorija spremljena', 'success');
        closeModal('kategorijaModal');
        loadKategorije();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

async function deleteKategorija(id) {
    if (!confirm('Obrisati kategoriju?')) return;
    
    const res = await fetch(API_URL + 'admin-kategorije', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Kategorija obrisana', 'success');
        loadKategorije();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

// =====================================================
// TAGOVI
// =====================================================
async function loadTagovi() {
    const res = await fetch(API_URL + 'admin-tagovi');
    const data = await res.json();
    if (data.success) {
        tagovi = data.data;
        renderTagovi();
    }
}

function renderTagovi() {
    const tbody = document.getElementById('tagoviTable');
    tbody.innerHTML = tagovi.map(t => `
        <tr>
            <td><strong>${esc(t.naziv)}</strong></td>
            <td><span class="color-preview" style="background: ${t.boja || '#ccc'}"></span> ${t.boja || '-'}</td>
            <td>${t.broj_firmi || 0}</td>
            <td class="actions">
                <button class="btn btn-outline btn-sm" onclick="editTag(${t.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTag(${t.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function editTag(id) {
    const t = tagovi.find(x => x.id === id);
    if (!t) return;
    
    document.getElementById('tagModalTitle').textContent = 'Uredi tag';
    document.getElementById('tagId').value = t.id;
    document.getElementById('tagNaziv').value = t.naziv;
    document.getElementById('tagBoja').value = t.boja || '#3b82f6';
    
    document.getElementById('tagModal').classList.add('active');
}

async function saveTag() {
    const id = document.getElementById('tagId').value;
    const data = {
        naziv: document.getElementById('tagNaziv').value.trim(),
        boja: document.getElementById('tagBoja').value
    };
    
    if (!data.naziv) {
        showToast('Naziv je obavezan', 'error');
        return;
    }
    
    if (id) data.id = parseInt(id);
    
    const res = await fetch(API_URL + 'admin-tagovi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Tag spremljen', 'success');
        closeModal('tagModal');
        loadTagovi();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

async function deleteTag(id) {
    if (!confirm('Obrisati tag? Uklonit će se sa svih firmi.')) return;
    
    const res = await fetch(API_URL + 'admin-tagovi', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Tag obrisan', 'success');
        loadTagovi();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

// =====================================================
// FAZE PIPELINE
// =====================================================
async function loadFaze() {
    const res = await fetch(API_URL + 'admin-faze');
    const data = await res.json();
    if (data.success) {
        faze = data.data;
        renderFaze();
    }
}

function renderFaze() {
    const tbody = document.getElementById('fazeTable');
    tbody.innerHTML = faze.map(f => `
        <tr>
            <td>${f.redoslijed}</td>
            <td><strong>${esc(f.naziv)}</strong></td>
            <td>${f.vjerojatnost}%</td>
            <td><span class="color-preview" style="background: ${f.boja}"></span> ${f.boja}</td>
            <td>
                ${f.is_won == 1 ? '<span class="badge badge-success">Dobiveno</span>' : ''}
                ${f.is_lost == 1 ? '<span class="badge badge-danger">Izgubljeno</span>' : ''}
                ${f.is_won == 0 && f.is_lost == 0 ? '<span class="badge badge-info">Aktivna</span>' : ''}
            </td>
            <td><span class="badge ${f.aktivan == 1 ? 'badge-success' : 'badge-danger'}">${f.aktivan == 1 ? 'Da' : 'Ne'}</span></td>
            <td class="actions">
                <button class="btn btn-outline btn-sm" onclick="editFaza(${f.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteFaza(${f.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function editFaza(id) {
    const f = faze.find(x => x.id === id);
    if (!f) return;
    
    document.getElementById('fazaModalTitle').textContent = 'Uredi fazu';
    document.getElementById('fazaId').value = f.id;
    document.getElementById('fazaNaziv').value = f.naziv;
    document.getElementById('fazaRedoslijed').value = f.redoslijed;
    document.getElementById('fazaVjerojatnost').value = f.vjerojatnost;
    document.getElementById('fazaBoja').value = f.boja;
    document.getElementById('fazaAktivan').value = f.aktivan;
    document.getElementById('fazaIsWon').checked = f.is_won == 1;
    document.getElementById('fazaIsLost').checked = f.is_lost == 1;
    document.getElementById('fazaOpis').value = f.opis || '';
    
    document.getElementById('fazaModal').classList.add('active');
}

async function saveFaza() {
    const id = document.getElementById('fazaId').value;
    const data = {
        naziv: document.getElementById('fazaNaziv').value.trim(),
        redoslijed: parseInt(document.getElementById('fazaRedoslijed').value),
        vjerojatnost: parseInt(document.getElementById('fazaVjerojatnost').value),
        boja: document.getElementById('fazaBoja').value,
        aktivan: parseInt(document.getElementById('fazaAktivan').value),
        is_won: document.getElementById('fazaIsWon').checked ? 1 : 0,
        is_lost: document.getElementById('fazaIsLost').checked ? 1 : 0,
        opis: document.getElementById('fazaOpis').value.trim()
    };
    
    if (!data.naziv) {
        showToast('Naziv je obavezan', 'error');
        return;
    }
    
    if (id) data.id = parseInt(id);
    
    const res = await fetch(API_URL + 'admin-faze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Faza spremljena', 'success');
        closeModal('fazaModal');
        loadFaze();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

async function deleteFaza(id) {
    if (!confirm('Obrisati fazu?')) return;
    
    const res = await fetch(API_URL + 'admin-faze', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Faza obrisana', 'success');
        loadFaze();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

// =====================================================
// RAZLOZI GUBITKA
// =====================================================
async function loadRazlozi() {
    const res = await fetch(API_URL + 'admin-razlozi');
    const data = await res.json();
    if (data.success) {
        razlozi = data.data;
        renderRazlozi();
    }
}

function renderRazlozi() {
    const tbody = document.getElementById('razloziTable');
    tbody.innerHTML = razlozi.map(r => `
        <tr>
            <td>${r.redoslijed}</td>
            <td><strong>${esc(r.naziv)}</strong></td>
            <td><span class="badge ${r.aktivan == 1 ? 'badge-success' : 'badge-danger'}">${r.aktivan == 1 ? 'Aktivan' : 'Neaktivan'}</span></td>
            <td class="actions">
                <button class="btn btn-outline btn-sm" onclick="editRazlog(${r.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteRazlog(${r.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function editRazlog(id) {
    const r = razlozi.find(x => x.id === id);
    if (!r) return;
    
    document.getElementById('razlogModalTitle').textContent = 'Uredi razlog';
    document.getElementById('razlogId').value = r.id;
    document.getElementById('razlogNaziv').value = r.naziv;
    document.getElementById('razlogRedoslijed').value = r.redoslijed;
    document.getElementById('razlogAktivan').value = r.aktivan;
    
    document.getElementById('razlogModal').classList.add('active');
}

async function saveRazlog() {
    const id = document.getElementById('razlogId').value;
    const data = {
        naziv: document.getElementById('razlogNaziv').value.trim(),
        redoslijed: parseInt(document.getElementById('razlogRedoslijed').value),
        aktivan: parseInt(document.getElementById('razlogAktivan').value)
    };
    
    if (!data.naziv) {
        showToast('Naziv je obavezan', 'error');
        return;
    }
    
    if (id) data.id = parseInt(id);
    
    const res = await fetch(API_URL + 'admin-razlozi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Razlog spremljen', 'success');
        closeModal('razlogModal');
        loadRazlozi();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

async function deleteRazlog(id) {
    if (!confirm('Obrisati razlog?')) return;
    
    const res = await fetch(API_URL + 'admin-razlozi', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    
    const result = await res.json();
    if (result.success) {
        showToast('Razlog obrisan', 'success');
        loadRazlozi();
    } else {
        showToast(result.error || 'Greška', 'error');
    }
}

// =====================================================
// HELPERS
// =====================================================
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function esc(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('hr-HR') + ' ' + d.toLocaleTimeString('hr-HR', {hour: '2-digit', minute: '2-digit'});
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Expose functions to window for onclick handlers
window.switchTab = switchTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.editKorisnik = editKorisnik;
window.saveKorisnik = saveKorisnik;
window.deleteKorisnik = deleteKorisnik;
window.editServis = editServis;
window.saveServis = saveServis;
window.deleteServis = deleteServis;
window.editKategorija = editKategorija;
window.saveKategorija = saveKategorija;
window.deleteKategorija = deleteKategorija;
window.editTag = editTag;
window.saveTag = saveTag;
window.deleteTag = deleteTag;
window.editFaza = editFaza;
window.saveFaza = saveFaza;
window.deleteFaza = deleteFaza;
window.editRazlog = editRazlog;
window.saveRazlog = saveRazlog;
window.deleteRazlog = deleteRazlog;
