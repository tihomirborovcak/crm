// ==================== CONFIG ====================
const API_URL = 'api.php';

// ==================== STATE ====================
let currentUser = null;
let firme = [];
let zupanije = [];
let gradovi = [];
let sviGradovi = [];
let servisi = [];
let kategorije = [];
let tipoviSubjekata = [];

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    
    // Nova firma
    document.getElementById('btnNovaFirma').addEventListener('click', () => openFirmaModal());
    
    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(() => loadFirme(), 300));

    // Filters
    document.getElementById('filterKategorija').addEventListener('change', () => loadFirme());
    document.getElementById('filterTip').addEventListener('change', () => loadFirme());
    document.getElementById('filterZupanija').addEventListener('change', handleZupanijaChange);
    document.getElementById('filterGrad').addEventListener('change', handleGradChange);
    document.getElementById('filterTag').addEventListener('change', () => loadFirme());
    document.getElementById('filterStatus').addEventListener('change', () => loadFirme());
    
    // Županija u formi
    document.getElementById('firmaZupanija').addEventListener('change', loadGradoviForForm);
}

// ==================== AUTH ====================
async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}?endpoint=current-user`);
        const data = await response.json();
        
        if (data.success && data.data) {
            currentUser = data.data;
            showApp();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLogin();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_URL}?endpoint=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.data;
            showApp();
        } else {
            errorEl.textContent = data.error || 'Pogrešan email ili lozinka';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = 'Greška pri povezivanju sa serverom';
        errorEl.style.display = 'block';
    }
}

async function handleLogout() {
    await fetch(`${API_URL}?endpoint=logout`);
    currentUser = null;
    showLogin();
}

function showLogin() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('app').style.display = 'none';
}

function showApp() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('app').style.display = 'block';

    // Update user info
    if (currentUser) {
        const initials = (currentUser.ime?.[0] || '') + (currentUser.prezime?.[0] || '');
        document.getElementById('userAvatar').textContent = initials.toUpperCase();
        document.getElementById('userName').textContent = `${currentUser.ime} ${currentUser.prezime}`;

        // Sakrij Postavke link za ne-admine
        if (currentUser.uloga !== 'admin') {
            const postavkeLink = document.querySelector('a[href="admin.html"]');
            if (postavkeLink) postavkeLink.style.display = 'none';
        }
    }

    // Load data
    loadInitialData();
}

// ==================== DATA LOADING ====================
async function loadInitialData() {
    await Promise.all([
        loadZupanije(),
        loadSviGradovi(),
        loadServisi(),
        loadKategorije(),
        loadTipoviSubjekata(),
        loadDashboardStats()
    ]);
    // Ne učitavaj sve firme odmah - prikaži poruku za pretragu
    showInitialState();
}

function showInitialState() {
    const container = document.getElementById('firmeTableBody');
    document.getElementById('tableCount').textContent = '';
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">Pretražite firme</div>
            <p>Upišite naziv firme ili odaberite filter za prikaz rezultata</p>
        </div>
    `;
}

function hasActiveFilters() {
    const search = document.getElementById('searchInput').value;
    const kategorija = document.getElementById('filterKategorija').value;
    const tip = document.getElementById('filterTip').value;
    const zupanija = document.getElementById('filterZupanija').value;
    const grad = document.getElementById('filterGrad').value;
    const tag = document.getElementById('filterTag').value;
    const status = document.getElementById('filterStatus').value;

    return search || kategorija || tip || zupanija || grad || tag || status;
}

async function loadZupanije() {
    try {
        const response = await fetch(`${API_URL}?endpoint=zupanije`);
        const data = await response.json();
        if (data.success) {
            zupanije = data.data;
            populateSelect('filterZupanija', zupanije, 'Sve županije');
            populateSelect('firmaZupanija', zupanije, 'Odaberi...');
        }
    } catch (error) {
        console.error('Error loading zupanije:', error);
    }
}

async function loadSviGradovi() {
    try {
        const response = await fetch(`${API_URL}?endpoint=gradovi-opcine`);
        const data = await response.json();
        if (data.success) {
            sviGradovi = data.data;
            populateSelect('filterGrad', sviGradovi, 'Svi gradovi');
        }
    } catch (error) {
        console.error('Error loading svi gradovi:', error);
    }
}

async function loadGradovi(zupanijaId) {
    if (!zupanijaId) {
        gradovi = [];
        return;
    }
    try {
        const response = await fetch(`${API_URL}?endpoint=gradovi-opcine&zupanija_id=${zupanijaId}`);
        const data = await response.json();
        if (data.success) {
            gradovi = data.data;
        }
    } catch (error) {
        console.error('Error loading gradovi:', error);
    }
}

function handleZupanijaChange() {
    const zupanijaId = document.getElementById('filterZupanija').value;
    const filterGrad = document.getElementById('filterGrad');

    // Filtriraj gradove po županiji ili prikaži sve
    if (zupanijaId) {
        const filtriraniGradovi = sviGradovi.filter(g => g.zupanija_id == zupanijaId);
        populateSelect('filterGrad', filtriraniGradovi, 'Svi gradovi');
    } else {
        populateSelect('filterGrad', sviGradovi, 'Svi gradovi');
    }
    filterGrad.value = '';
    loadFirme();
}

function handleGradChange() {
    const gradId = document.getElementById('filterGrad').value;
    const filterZupanija = document.getElementById('filterZupanija');

    if (gradId) {
        // Pronađi grad i postavi njegovu županiju
        const grad = sviGradovi.find(g => g.id == gradId);
        if (grad && grad.zupanija_id) {
            filterZupanija.value = grad.zupanija_id;
        }
    }
    loadFirme();
}

async function loadGradoviForForm() {
    const zupanijaId = document.getElementById('firmaZupanija').value;
    if (!zupanijaId) {
        document.getElementById('firmaGrad').innerHTML = '<option value="">Odaberi...</option>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}?endpoint=gradovi-opcine&zupanija_id=${zupanijaId}`);
        const data = await response.json();
        if (data.success) {
            populateSelect('firmaGrad', data.data, 'Odaberi...');
        }
    } catch (error) {
        console.error('Error loading gradovi for form:', error);
    }
}

async function loadServisi() {
    try {
        const response = await fetch(`${API_URL}?endpoint=servisi`);
        const data = await response.json();
        if (data.success) {
            servisi = data.data;
            // Servisi se koriste samo u modal formi, tagovi imaju svoj filter
        }
    } catch (error) {
        console.error('Error loading servisi:', error);
    }
}

async function loadKategorije() {
    try {
        const response = await fetch(`${API_URL}?endpoint=kategorije`);
        const data = await response.json();
        if (data.success) {
            kategorije = data.data;
            populateSelect('firmaKategorija', kategorije, 'Odaberi...');
            populateSelect('filterKategorija', kategorije, 'Sve kategorije');
        }
    } catch (error) {
        console.error('Error loading kategorije:', error);
    }
}

async function loadTipoviSubjekata() {
    try {
        const response = await fetch(`${API_URL}?endpoint=tipovi-subjekata`);
        const data = await response.json();
        if (data.success) {
            tipoviSubjekata = data.data;
            populateSelect('firmaTip', tipoviSubjekata, 'Odaberi...');
            populateSelect('filterTip', tipoviSubjekata, 'Svi tipovi');
        }
    } catch (error) {
        console.error('Error loading tipovi:', error);
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}?endpoint=dashboard-stats`);
        const data = await response.json();
        if (data.success) {
            const stats = data.data;
            document.getElementById('statFirme').textContent = stats.ukupno_firmi || 0;
            document.getElementById('statAktivni').textContent = stats.po_statusu?.aktivan || 0;
            document.getElementById('statPotencijalni').textContent = stats.po_statusu?.potencijalan || 0;
            
            // Prilike
            let ukupnoVrijednost = 0;
            if (stats.prilike_po_fazi) {
                stats.prilike_po_fazi.forEach(p => {
                    ukupnoVrijednost += parseFloat(p.vrijednost) || 0;
                });
            }
            document.getElementById('statPrilike').textContent = ukupnoVrijednost.toLocaleString('hr-HR') + ' €';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

let firmeTotal = 0;
let firmePage = 1;
const FIRME_LIMIT = 50;

async function loadFirme(page = 1) {
    // Ako nema aktivnih filtera, prikaži početno stanje
    if (!hasActiveFilters()) {
        showInitialState();
        return;
    }

    firmePage = page;
    const offset = (page - 1) * FIRME_LIMIT;
    const container = document.getElementById('firmeTableBody');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Učitavanje...</div>';

    // Build query params
    const params = new URLSearchParams();
    params.append('endpoint', 'firme');
    params.append('limit', FIRME_LIMIT);
    params.append('offset', offset);

    const search = document.getElementById('searchInput').value;
    if (search) params.append('search', search);

    const kategorija = document.getElementById('filterKategorija').value;
    if (kategorija) params.append('kategorija_id', kategorija);

    const tip = document.getElementById('filterTip').value;
    if (tip) params.append('tip_subjekta_id', tip);

    const zupanija = document.getElementById('filterZupanija').value;
    if (zupanija) params.append('zupanija_id', zupanija);

    const grad = document.getElementById('filterGrad').value;
    if (grad) params.append('grad_opcina_id', grad);

    const tag = document.getElementById('filterTag').value;
    if (tag) params.append('tag_id', tag);

    const status = document.getElementById('filterStatus').value;
    if (status) params.append('status', status);

    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            firme = data.data.firme;
            firmeTotal = data.data.total;
            renderFirmeTable();
        } else {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Greška pri učitavanju</div></div>';
        }
    } catch (error) {
        console.error('Error loading firme:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Greška pri povezivanju</div></div>';
    }
}

function goToFirmePage(page) {
    loadFirme(page);
}

function renderFirmeTable() {
    const container = document.getElementById('firmeTableBody');
    const totalPages = Math.ceil(firmeTotal / FIRME_LIMIT);
    const countText = totalPages > 1
        ? `Stranica ${firmePage} od ${totalPages} (ukupno ${firmeTotal} firmi)`
        : `${firmeTotal} firmi`;
    document.getElementById('tableCount').textContent = countText;
    
    if (firme.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">Nema firmi</div>
                <p>Dodajte novu firmu klikom na gumb "Nova firma"</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th class="checkbox-col"><input type="checkbox" id="selectAllFirme" onchange="toggleSelectAllFirme()"></th>
                    <th>Firma</th>
                    <th>Kontakt</th>
                    <th>Prihod 2024</th>
                    <th>Zap.</th>
                    <th>Tagovi</th>
                    <th>Status</th>
                    <th>Akcije</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    firme.forEach(firma => {
        const statusClass = {
            'aktivan': 'badge-success',
            'potencijalan': 'badge-warning',
            'neaktivan': 'badge-gray'
        }[firma.status] || 'badge-gray';
        
        const statusText = {
            'aktivan': 'Aktivan',
            'potencijalan': 'Potencijalan',
            'neaktivan': 'Neaktivan'
        }[firma.status] || firma.status;
        
        // Kontakt osoba
        let kontaktHtml = '-';
        if (firma.kontakti && firma.kontakti.length > 0) {
            const primary = firma.kontakti.find(k => k.is_primary) || firma.kontakti[0];
            kontaktHtml = `
                <div class="kontakt-info">
                    <div class="kontakt-name">${escapeHtml(primary.ime || '')} ${escapeHtml(primary.prezime || '')}</div>
                    ${primary.pozicija ? `<div class="kontakt-pozicija">${escapeHtml(primary.pozicija)}</div>` : ''}
                    ${primary.email ? `<div class="kontakt-email"><a href="mailto:${escapeHtml(primary.email)}">${escapeHtml(primary.email)}</a></div>` : ''}
                    ${primary.telefon ? `<div class="kontakt-tel">${escapeHtml(primary.telefon)}</div>` : ''}
                </div>
            `;
        } else if (firma.telefon) {
            kontaktHtml = `
                <div class="kontakt-info">
                    <div class="kontakt-tel">${escapeHtml(firma.telefon)}</div>
                </div>
            `;
        }
        
        let servisiHtml = '';
        if (firma.servisi && firma.servisi.length > 0) {
            servisiHtml = '<div class="servis-tags">';
            firma.servisi.forEach(s => {
                const servisClass = {
                    1: 'servis-zl',
                    2: 'servis-sp',
                    3: 'servis-pl',
                    4: 'servis-zc'
                }[s.id] || '';
                servisiHtml += `<span class="servis-tag ${servisClass}">${s.naziv}</span>`;
            });
            servisiHtml += '</div>';
        }
        
        // Tagovi
        let tagoviHtml = '-';
        if (firma.tagovi && firma.tagovi.length > 0) {
            tagoviHtml = '<div class="tag-list">';
            firma.tagovi.forEach(t => {
                tagoviHtml += `<span class="tag-badge" style="background:${t.boja || '#6366f1'}">${escapeHtml(t.naziv)}</span>`;
            });
            tagoviHtml += '</div>';
        }
        
        // Lokacija
        let lokacija = '';
        if (firma.grad_opcina) {
            lokacija = firma.grad_opcina;
        }
        
        // Prihod formatiran
        let prihodHtml = '-';
        if (firma.prihod_2024) {
            const prihod = parseFloat(firma.prihod_2024);
            if (prihod >= 1000000) {
                prihodHtml = `<span class="prihod-value">${(prihod / 1000000).toFixed(1)}M €</span>`;
            } else if (prihod >= 1000) {
                prihodHtml = `<span class="prihod-value">${(prihod / 1000).toFixed(0)}K €</span>`;
            } else {
                prihodHtml = `<span class="prihod-value">${prihod.toFixed(0)} €</span>`;
            }
        }
        
        // Broj zaposlenih
        let zaposleniHtml = firma.broj_zaposlenih ? `<span class="zaposleni-badge">${firma.broj_zaposlenih}</span>` : '-';
        
        html += `
            <tr>
                <td class="checkbox-col"><input type="checkbox" class="firma-checkbox" value="${firma.id}" onchange="updateBulkSelection()"></td>
                <td>
                    <a href="firma.html?id=${firma.id}" class="firma-link">
                        <div class="firma-name">${escapeHtml(firma.naziv)}</div>
                        ${firma.oib ? `<div class="firma-oib">OIB: ${firma.oib}</div>` : ''}
                        ${lokacija ? `<div class="firma-lokacija">📍 ${escapeHtml(lokacija)}</div>` : ''}
                    </a>
                </td>
                <td>${kontaktHtml}</td>
                <td class="text-right">${prihodHtml}</td>
                <td class="text-center">${zaposleniHtml}</td>
                <td>${tagoviHtml}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-icon" onclick="editFirma(${firma.id})" title="Uredi">✏️</button>
                        <button class="btn-icon" onclick="deleteFirma(${firma.id})" title="Obriši">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';

    // Paginacija s brojevima stranica
    if (totalPages > 1) {
        html += '<div class="pagination">';

        // Gumb "Prethodna"
        if (firmePage > 1) {
            html += `<button class="pagination-btn" onclick="goToFirmePage(${firmePage - 1})">← Prethodna</button>`;
        }

        // Brojevi stranica
        html += '<div class="pagination-numbers">';
        for (let i = 1; i <= totalPages; i++) {
            // Prikaži prvu, zadnju, i stranice oko trenutne
            if (i === 1 || i === totalPages || (i >= firmePage - 2 && i <= firmePage + 2)) {
                html += `<button class="pagination-num ${i === firmePage ? 'active' : ''}" onclick="goToFirmePage(${i})">${i}</button>`;
            } else if (i === firmePage - 3 || i === firmePage + 3) {
                html += '<span class="pagination-dots">...</span>';
            }
        }
        html += '</div>';

        // Gumb "Sljedeća"
        if (firmePage < totalPages) {
            html += `<button class="pagination-btn" onclick="goToFirmePage(${firmePage + 1})">Sljedeća →</button>`;
        }

        html += '</div>';
    }

    container.innerHTML = html;
}

// ==================== FIRMA CRUD ====================

// Prikaz detalja firme
function showFirmaDetails(id) {
    console.log('showFirmaDetails called with id:', id);
    const firma = firme.find(f => f.id === id);
    console.log('Found firma:', firma);
    if (!firma) return;
    
    // Formatiraj prihod
    let prihodText = 'Nije dostupno';
    if (firma.prihod_2024) {
        prihodText = parseFloat(firma.prihod_2024).toLocaleString('hr-HR') + ' €';
    }
    
    // Modal sadržaj
    const content = `
        <div class="firma-details">
            <div class="details-header">
                <h2>${escapeHtml(firma.naziv)}</h2>
                ${firma.oib ? `<div class="details-oib">OIB: ${firma.oib}</div>` : ''}
            </div>
            
            <div class="details-grid">
                <div class="details-section">
                    <h4>📊 Financijski podaci</h4>
                    <div class="details-row">
                        <span class="label">Prihod 2024:</span>
                        <span class="value prihod">${prihodText}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Broj zaposlenih:</span>
                        <span class="value">${firma.broj_zaposlenih || '-'}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Djelatnost:</span>
                        <span class="value">${firma.djelatnost || '-'}</span>
                    </div>
                </div>
                
                <div class="details-section">
                    <h4>📍 Kontakt podaci</h4>
                    <div class="details-row">
                        <span class="label">Email:</span>
                        <span class="value">${firma.email ? `<a href="mailto:${firma.email}">${firma.email}</a>` : '-'}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Telefon:</span>
                        <span class="value">${firma.telefon || '-'}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Web:</span>
                        <span class="value">${firma.web && firma.web.trim() ? `<a href="${firma.web.startsWith('http') ? firma.web : 'https://' + firma.web}" target="_blank">${firma.web}</a>` : '-'}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Adresa:</span>
                        <span class="value">${firma.adresa || '-'}</span>
                    </div>
                </div>
            </div>
            
            ${firma.ovlastene_osobe ? `
            <div class="details-section full-width">
                <h4>👥 Ovlaštene osobe</h4>
                <p>${escapeHtml(firma.ovlastene_osobe)}</p>
            </div>
            ` : ''}
            
            <div class="details-actions">
                <button class="btn btn-primary" onclick="editFirma(${firma.id}); closeDetailsModal();">✏️ Uredi</button>
                <button class="btn btn-secondary" onclick="closeDetailsModal()">Zatvori</button>
            </div>
        </div>
    `;
    
    // Prikaži modal
    let modal = document.getElementById('detailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'detailsModal';
        modal.className = 'modal';
        modal.innerHTML = `<div class="modal-content modal-lg"><div id="detailsModalContent"></div></div>`;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeDetailsModal();
        });
    }
    
    document.getElementById('detailsModalContent').innerHTML = content;
    modal.classList.add('active');
}

function closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.classList.remove('active');
}

function openFirmaModal(firma = null) {
    const modal = document.getElementById('firmaModal');
    const title = document.getElementById('firmaModalTitle');
    const autocompleteWrapper = document.getElementById('autocompleteWrapper');
    const infoSection = document.getElementById('firmaInfoSection');
    
    // Reset form
    document.getElementById('firmaForm').reset();
    document.getElementById('firmaId').value = '';
    document.getElementById('centralnaKupacId').value = '';
    document.getElementById('autocompleteInput').value = '';
    document.getElementById('autocompleteResults').classList.remove('active');
    
    // Uncheck all servisi
    [1, 2, 3, 4].forEach(id => {
        document.getElementById(`servis${id}`).checked = false;
    });
    
    if (firma) {
        title.textContent = 'Uredi firmu';
        autocompleteWrapper.style.display = 'none';
        infoSection.style.display = 'block';
        
        // Popuni info sekciju
        let prihodText = '-';
        if (firma.prihod_2024) {
            const p = parseFloat(firma.prihod_2024);
            if (p >= 1000000) prihodText = (p / 1000000).toFixed(1) + 'M €';
            else if (p >= 1000) prihodText = (p / 1000).toFixed(0) + 'K €';
            else prihodText = p.toFixed(0) + ' €';
        }
        document.getElementById('infoPrihod').textContent = prihodText;
        document.getElementById('infoZaposleni').textContent = firma.broj_zaposlenih || '-';
        document.getElementById('infoDjelatnost').textContent = firma.djelatnost || '-';
        
        if (firma.ovlastene_osobe) {
            document.getElementById('infoOvlasteneWrapper').style.display = 'block';
            document.getElementById('infoOvlastene').textContent = firma.ovlastene_osobe;
        } else {
            document.getElementById('infoOvlasteneWrapper').style.display = 'none';
        }
        
        document.getElementById('firmaId').value = firma.id;
        document.getElementById('firmaNaziv').value = firma.naziv || '';
        document.getElementById('firmaOib').value = firma.oib || '';
        document.getElementById('firmaTip').value = firma.tip_subjekta_id || '';
        document.getElementById('firmaKategorija').value = firma.kategorija_id || '';
        document.getElementById('firmaTelefon').value = firma.telefon || '';
        document.getElementById('firmaWeb').value = firma.web || '';
        document.getElementById('firmaAdresa').value = firma.adresa || '';
        document.getElementById('firmaZupanija').value = firma.zupanija_id || '';
        document.getElementById('firmaStatus').value = firma.status || 'potencijalan';
        document.getElementById('firmaPotencijal').value = firma.potencijal || 'srednji';
        document.getElementById('firmaNapomena').value = firma.napomena || '';
        
        // Load gradovi for selected županija
        if (firma.zupanija_id) {
            loadGradoviForForm().then(() => {
                document.getElementById('firmaGrad').value = firma.grad_opcina_id || '';
            });
        }
        
        // Check servisi
        if (firma.servisi) {
            firma.servisi.forEach(s => {
                const checkbox = document.getElementById(`servis${s.id}`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        // Check tagovi
        const firmaTagIds = firma.tagovi ? firma.tagovi.map(t => t.id) : [];
        renderFirmaTagsSelector(firmaTagIds);
    } else {
        title.textContent = 'Nova firma';
        infoSection.style.display = 'none';
        autocompleteWrapper.style.display = 'block'; // Prikaži autocomplete
        
        // Reset tagovi
        renderFirmaTagsSelector([]);
    }
    
    modal.classList.add('active');
}

// ==================== AUTOCOMPLETE ====================
let autocompleteTimeout = null;

document.getElementById('autocompleteInput').addEventListener('input', function(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('autocompleteResults');
    
    // Clear previous timeout
    if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout);
    }
    
    if (query.length < 2) {
        resultsContainer.classList.remove('active');
        return;
    }
    
    // Debounce - wait 300ms before searching
    autocompleteTimeout = setTimeout(() => {
        searchCentralnaKupci(query);
    }, 300);
});

async function searchCentralnaKupci(query) {
    const resultsContainer = document.getElementById('autocompleteResults');
    
    try {
        const response = await fetch(`${API_URL}?endpoint=autocomplete-kupci&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            // Store results globally for selection
            window.autocompleteResults = data.data;
            
            let html = '';
            data.data.forEach((kupac, index) => {
                const details = [kupac.mjesto, kupac.kontakt, kupac.email].filter(Boolean).join(' • ');
                html += `
                    <div class="autocomplete-item" onclick="selectKupac(${index})">
                        <div class="autocomplete-item-name">${escapeHtml(kupac.naziv)}</div>
                        ${details ? `<div class="autocomplete-item-details">${escapeHtml(details)}</div>` : ''}
                        ${kupac.oib ? `<div class="autocomplete-item-oib">OIB: ${kupac.oib}</div>` : ''}
                    </div>
                `;
            });
            resultsContainer.innerHTML = html;
            resultsContainer.classList.add('active');
        } else {
            resultsContainer.innerHTML = '<div class="autocomplete-no-results">Nema rezultata. Možete unijeti novu firmu ručno.</div>';
            resultsContainer.classList.add('active');
        }
    } catch (error) {
        console.error('Autocomplete error:', error);
        resultsContainer.classList.remove('active');
    }
}

function selectKupac(index) {
    const kupac = window.autocompleteResults[index];
    if (!kupac) return;
    
    const resultsContainer = document.getElementById('autocompleteResults');
    resultsContainer.classList.remove('active');
    
    // Popuni formu s podacima iz centralne baze
    document.getElementById('centralnaKupacId').value = kupac.id;
    document.getElementById('firmaNaziv').value = kupac.naziv || '';
    document.getElementById('firmaOib').value = kupac.oib || '';
    document.getElementById('firmaTelefon').value = kupac.telefon || '';
    document.getElementById('firmaAdresa').value = kupac.adresa || '';
    document.getElementById('firmaNapomena').value = kupac.napomena || '';
    
    // Postavi autocomplete input da prikaže odabrani naziv
    document.getElementById('autocompleteInput').value = kupac.naziv;
    
    // Pokušaj naći županiju po imenu
    if (kupac.zupanija) {
        const zupanijaSelect = document.getElementById('firmaZupanija');
        for (let option of zupanijaSelect.options) {
            if (option.text.toLowerCase().includes(kupac.zupanija.toLowerCase().replace(' županija', '').replace('-', ''))) {
                zupanijaSelect.value = option.value;
                // Trigger change to load gradovi
                loadGradoviForForm().then(() => {
                    // Pokušaj naći grad po imenu
                    if (kupac.mjesto) {
                        const gradSelect = document.getElementById('firmaGrad');
                        for (let opt of gradSelect.options) {
                            if (opt.text.toLowerCase() === kupac.mjesto.toLowerCase()) {
                                gradSelect.value = opt.value;
                                break;
                            }
                        }
                    }
                });
                break;
            }
        }
    }
    
    // Toast obavijest
    showToast(`Učitano: ${kupac.naziv}`, 'success');
}

// Close autocomplete when clicking outside
document.addEventListener('click', function(e) {
    const autocompleteContainer = document.querySelector('.autocomplete-container');
    const resultsContainer = document.getElementById('autocompleteResults');
    
    if (autocompleteContainer && !autocompleteContainer.contains(e.target)) {
        resultsContainer.classList.remove('active');
    }
});

async function editFirma(id) {
    const firma = firme.find(f => f.id === id);
    if (firma) {
        openFirmaModal(firma);
    }
}

async function saveFirma() {
    const id = document.getElementById('firmaId').value;
    
    // Collect servisi
    const selectedServisi = [];
    [1, 2, 3, 4].forEach(servisId => {
        if (document.getElementById(`servis${servisId}`).checked) {
            selectedServisi.push(servisId);
        }
    });
    
    const firmaData = {
        id: id || null,
        naziv: document.getElementById('firmaNaziv').value,
        oib: document.getElementById('firmaOib').value,
        tip_subjekta_id: document.getElementById('firmaTip').value || null,
        kategorija_id: document.getElementById('firmaKategorija').value || null,
        telefon: document.getElementById('firmaTelefon').value,
        web: document.getElementById('firmaWeb').value,
        adresa: document.getElementById('firmaAdresa').value,
        zupanija_id: document.getElementById('firmaZupanija').value || null,
        grad_opcina_id: document.getElementById('firmaGrad').value || null,
        status: document.getElementById('firmaStatus').value,
        potencijal: document.getElementById('firmaPotencijal').value,
        napomena: document.getElementById('firmaNapomena').value,
        servisi: selectedServisi,
        tagovi: getSelectedTagIds()
    };
    
    try {
        const response = await fetch(`${API_URL}?endpoint=firme`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(firmaData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(id ? 'Firma ažurirana' : 'Firma dodana', 'success');
            closeModal('firmaModal');
            loadFirme();
            loadDashboardStats();
        } else {
            showToast(data.error || 'Greška pri spremanju', 'error');
        }
    } catch (error) {
        showToast('Greška pri povezivanju', 'error');
    }
}

async function deleteFirma(id) {
    if (!confirm('Jeste li sigurni da želite obrisati ovu firmu?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}?endpoint=firme`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Firma obrisana', 'success');
            loadFirme();
            loadDashboardStats();
        } else {
            showToast(data.error || 'Greška pri brisanju', 'error');
        }
    } catch (error) {
        showToast('Greška pri povezivanju', 'error');
    }
}

// ==================== NAVIGATION ====================
function switchView(view) {
    // Redirect za Prilike na pipeline.html
    if (view === 'prilike') {
        window.location.href = 'pipeline.html';
        return;
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    document.getElementById('pageTitle').textContent = {
        'firme': 'Firme',
        'prilike': 'Prodajne prilike',
        'email': 'Email kampanje',
        'postavke': 'Postavke'
    }[view] || view;
    
    // TODO: Implement other views
    if (view !== 'firme') {
        showToast(`Sekcija "${view}" uskoro dolazi`, 'info');
    }
}

// ==================== HELPERS ====================
function populateSelect(selectId, items, placeholder) {
    const select = document.getElementById(selectId);
    select.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
        select.innerHTML += `<option value="${item.id}">${escapeHtml(item.naziv)}</option>`;
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// ==================== BULK TAGIRANJE ====================
let sviTagovi = [];
let selectedFirmaIds = [];

async function loadTagovi() {
    const res = await fetch(API_URL + '?endpoint=tagovi');
    const data = await res.json();
    if (data.success) {
        sviTagovi = data.data;
        renderBulkTagSelect();
        
        // Popuni filter dropdown
        const filterTag = document.getElementById('filterTag');
        filterTag.innerHTML = '<option value="">Svi tagovi</option>' +
            sviTagovi.map(t => `<option value="${t.id}">${t.naziv}</option>`).join('');
        
        // Renderaj tagove u formi
        renderFirmaTagsSelector();
    }
}

function renderFirmaTagsSelector(selectedTagIds = []) {
    const container = document.getElementById('firmaTagsContainer');
    if (!container) return;
    
    container.innerHTML = sviTagovi.map(tag => `
        <label class="tag-checkbox ${selectedTagIds.includes(tag.id) ? 'selected' : ''}" data-tag-id="${tag.id}">
            <input type="checkbox" value="${tag.id}" ${selectedTagIds.includes(tag.id) ? 'checked' : ''} onchange="toggleTagCheckbox(this)">
            <span class="tag-dot" style="background: ${tag.boja || '#6366f1'}"></span>
            ${escapeHtml(tag.naziv)}
        </label>
    `).join('');
}

function toggleTagCheckbox(checkbox) {
    const label = checkbox.closest('.tag-checkbox');
    if (checkbox.checked) {
        label.classList.add('selected');
    } else {
        label.classList.remove('selected');
    }
}

async function dodajNoviTagFirmi() {
    const input = document.getElementById('noviTagInput');
    const naziv = input.value.trim();
    if (!naziv) return;
    
    try {
        const res = await fetch(API_URL + '?endpoint=tag-ensure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ naziv, boja: '#6366f1' })
        });
        const data = await res.json();
        if (data.success) {
            input.value = '';
            // Reload tagovi i označi novi
            await loadTagovi();
            
            // Označi novi tag
            const checkbox = document.querySelector(`.tag-checkbox[data-tag-id="${data.data.id}"] input`);
            if (checkbox) {
                checkbox.checked = true;
                toggleTagCheckbox(checkbox);
            }
            
            showToast('Tag dodan: ' + naziv, 'success');
        }
    } catch (e) {
        showToast('Greška pri kreiranju taga', 'error');
    }
}

function getSelectedTagIds() {
    const checkboxes = document.querySelectorAll('#firmaTagsContainer input:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

function renderBulkTagSelect() {
    const select = document.getElementById('bulkTagSelect');
    select.innerHTML = '<option value="">Odaberi tag...</option>' +
        sviTagovi.map(t => `<option value="${t.id}">${t.naziv}</option>`).join('');
}

function toggleSelectAllFirme() {
    const checked = document.getElementById('selectAllFirme').checked;
    document.querySelectorAll('.firma-checkbox').forEach(cb => {
        cb.checked = checked;
    });
    updateBulkSelection();
}

function updateBulkSelection() {
    selectedFirmaIds = [];
    document.querySelectorAll('.firma-checkbox:checked').forEach(cb => {
        selectedFirmaIds.push(parseInt(cb.value));
    });
    
    document.getElementById('selectedCount').textContent = selectedFirmaIds.length;
    document.getElementById('bulkActionsBar').style.display = selectedFirmaIds.length > 0 ? 'flex' : 'none';
    
    // Update select all checkbox
    const allCheckboxes = document.querySelectorAll('.firma-checkbox');
    const allChecked = allCheckboxes.length > 0 && selectedFirmaIds.length === allCheckboxes.length;
    document.getElementById('selectAllFirme').checked = allChecked;
}

function clearSelection() {
    document.querySelectorAll('.firma-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('selectAllFirme').checked = false;
    updateBulkSelection();
}

async function bulkAddTag() {
    const tagId = document.getElementById('bulkTagSelect').value;
    if (!tagId) {
        showToast('Odaberi tag', 'warning');
        return;
    }
    
    if (selectedFirmaIds.length === 0) {
        showToast('Nema odabranih firmi', 'warning');
        return;
    }
    
    const res = await fetch(API_URL + '?endpoint=bulk-tagovi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            firma_ids: selectedFirmaIds,
            tag_id: parseInt(tagId),
            action: 'add'
        })
    });
    
    const data = await res.json();
    if (data.success) {
        showToast(data.data.message, 'success');
        clearSelection();
        loadFirme(); // Refreshaj listu
    } else {
        showToast(data.error || 'Greška', 'error');
    }
}

async function bulkRemoveTag() {
    const tagId = document.getElementById('bulkTagSelect').value;
    if (!tagId) {
        showToast('Odaberi tag', 'warning');
        return;
    }
    
    if (selectedFirmaIds.length === 0) {
        showToast('Nema odabranih firmi', 'warning');
        return;
    }
    
    const res = await fetch(API_URL + '?endpoint=bulk-tagovi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            firma_ids: selectedFirmaIds,
            tag_id: parseInt(tagId),
            action: 'remove'
        })
    });
    
    const data = await res.json();
    if (data.success) {
        showToast(data.data.message, 'success');
        clearSelection();
        loadFirme(); // Refreshaj listu
    } else {
        showToast(data.error || 'Greška', 'error');
    }
}

// Load tagovi on page load
document.addEventListener('DOMContentLoaded', loadTagovi);

