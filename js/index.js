const API_URL = 'api.php?endpoint=';

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    // Login form handler
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Check auth
    checkAuth();
});

async function checkAuth() {
    try {
        const res = await fetch(API_URL + 'current-user');
        const data = await res.json();
        if (data.success && data.data) {
            showApp(data.data);
        } else {
            showLogin();
        }
    } catch (e) {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('app').style.display = 'none';
}

function showApp(user) {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('app').style.display = 'block';

    // Set today's date
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('todayDate').textContent = today.toLocaleDateString('hr-HR', options);

    // Set user info
    if (user) {
        document.getElementById('userName').textContent = user.ime + ' ' + user.prezime;
        document.getElementById('userAvatar').textContent = (user.ime[0] || '') + (user.prezime[0] || '');

        // Sakrij Postavke link za ne-admine
        if (user.uloga !== 'admin') {
            const postavkeLink = document.querySelector('a[href="admin.html"]');
            if (postavkeLink) postavkeLink.style.display = 'none';
        }
    }

    // Load dashboard data
    loadDashboardStats();
    loadPipeline();
    loadTagovi();
    loadServisi();
    loadActivities();
    loadStatusStats();
    loadZupanijeStats();

    // Search on Enter
    document.getElementById('globalSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            hideAutocomplete();
            searchFirme();
        }
    });

    // Autocomplete setup
    initAutocomplete();
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    try {
        const res = await fetch(API_URL + 'login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            errorEl.style.display = 'none';
            showApp(data.data);
        } else {
            errorEl.textContent = data.error || 'Pogrešan email ili lozinka';
            errorEl.style.display = 'block';
        }
    } catch (e) {
        errorEl.textContent = 'Greška pri povezivanju';
        errorEl.style.display = 'block';
    }
}

function logout() {
    fetch(API_URL + 'logout', { method: 'POST' })
        .then(() => showLogin());
}
window.logout = logout;

// =====================================================
// DASHBOARD STATS
// =====================================================
async function loadDashboardStats() {
    try {
        const res = await fetch(API_URL + 'dashboard-stats');
        const data = await res.json();
        if (data.success) {
            document.getElementById('statFirme').textContent = data.data.ukupno_firmi || 0;
            document.getElementById('statAktivni').textContent = data.data.aktivni_klijenti || 0;
            document.getElementById('statPrilike').textContent = formatMoney(data.data.prilike_vrijednost || 0);
            document.getElementById('statFollowUp').textContent = data.data.followup_danas || 0;
        }
    } catch (e) {
        console.error('Error loading stats:', e);
    }
}

// =====================================================
// PIPELINE
// =====================================================
async function loadPipeline() {
    try {
        const res = await fetch(API_URL + 'pipeline-stats');
        const data = await res.json();
        if (data.success && data.data.po_fazama) {
            renderPipelineMini(data.data.po_fazama);
            renderPipelineList(data.data.po_fazama);
        }
    } catch (e) {
        console.error('Error loading pipeline:', e);
    }
}

function renderPipelineMini(faze) {
    const container = document.getElementById('pipelineMini');
    if (!faze || !Array.isArray(faze)) return;
    const aktivne = faze.filter(f => !f.is_won && !f.is_lost);
    
    container.innerHTML = aktivne.slice(0, 5).map(f => `
        <div class="pipeline-stage" style="background: ${f.boja}20; color: ${f.boja};" 
             onclick="window.location='pipeline.html'">
            <div class="pipeline-stage-count">${f.broj_prilika || 0}</div>
            <div class="pipeline-stage-name">${esc((f.faza_naziv || f.naziv || '').substring(0, 10))}</div>
        </div>
    `).join('');
}

function renderPipelineList(faze) {
    const container = document.getElementById('pipelineList');
    if (!faze || !Array.isArray(faze)) return;
    
    container.innerHTML = faze.map(f => `
        <div class="stat-item" onclick="window.location='pipeline.html'">
            <div class="stat-item-left">
                <div class="stat-dot" style="background: ${f.boja}"></div>
                <span class="stat-label">${esc(f.faza_naziv || f.naziv)}</span>
            </div>
            <div>
                <span class="stat-value">${f.broj_prilika || 0}</span>
                <span class="stat-value money" style="margin-left: 0.5rem;">${formatMoney(f.ukupna_vrijednost || 0)}</span>
            </div>
        </div>
    `).join('');
}

// =====================================================
// TAGOVI
// =====================================================
async function loadTagovi() {
    try {
        const res = await fetch(API_URL + 'admin-tagovi');
        const data = await res.json();
        if (data.success) {
            renderTagovi(data.data);
        }
    } catch (e) {
        console.error('Error loading tagovi:', e);
    }
}

function renderTagovi(tagovi) {
    const container = document.getElementById('tagoviList');
    
    if (tagovi.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏷️</div><p>Nema tagova</p></div>';
        return;
    }
    
    container.innerHTML = tagovi.map(t => `
        <div class="stat-item" onclick="showFirmeByTag(${t.id}, '${esc(t.naziv)}')">
            <div class="stat-item-left">
                <div class="stat-dot" style="background: ${t.boja}"></div>
                <span class="stat-label">${esc(t.naziv)}</span>
            </div>
            <span class="stat-value">${t.broj_firmi || 0}</span>
        </div>
    `).join('');
}

// =====================================================
// SERVISI
// =====================================================
async function loadServisi() {
    try {
        const res = await fetch(API_URL + 'servisi-stats');
        const data = await res.json();
        if (data.success) {
            renderServisi(data.data);
        }
    } catch (e) {
        console.error('Error loading servisi:', e);
    }
}

function renderServisi(servisi) {
    const container = document.getElementById('servisiList');
    
    if (!servisi || servisi.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>Nema servisa</p></div>';
        return;
    }
    
    container.innerHTML = servisi.map(s => `
        <div class="stat-item" onclick="showFirmeByServis(${s.id}, '${esc(s.naziv)}')">
            <div class="stat-item-left">
                <div class="stat-dot" style="background: ${s.boja || '#64748b'}"></div>
                <span class="stat-label">${esc(s.naziv)}</span>
            </div>
            <span class="stat-value">${s.broj_firmi || 0}</span>
        </div>
    `).join('');
}

// =====================================================
// AKTIVNOSTI
// =====================================================
async function loadActivities() {
    try {
        const res = await fetch(API_URL + 'aktivnosti-nadolazece');
        const data = await res.json();
        if (data.success) {
            renderActivities(data.data);
        }
    } catch (e) {
        console.error('Error loading activities:', e);
    }
}

function renderActivities(activities) {
    const container = document.getElementById('activityList');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><p>Nema nadolazećih aktivnosti</p></div>';
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    container.innerHTML = activities.slice(0, 5).map(a => {
        const datum = a.display_datum || a.datum_sljedeceg;
        const isOverdue = datum && datum < today;
        const icon = {
            'poziv': '📞',
            'email': '✉️',
            'sastanak': '🤝',
            'zadatak': '✅'
        }[a.tip] || '📋';

        // Prikaži firmu i priliku ako postoji
        let meta = a.firma_naziv || '';
        if (a.prilika_naziv) {
            meta += (meta ? ' • ' : '') + '💰 ' + a.prilika_naziv;
        }

        // Link na priliku ako postoji, inače na firmu
        const firmaId = a.display_firma_id || a.firma_id;
        const link = a.prilika_id
            ? `pipeline.html?prilika=${a.prilika_id}`
            : `firma.html?id=${firmaId}`;

        // Korisnik badge
        const korisnikBadge = a.korisnik_ime
            ? `<span class="activity-user">👤 ${esc(a.korisnik_ime)}</span>`
            : '';

        return `
            <div class="activity-item ${isOverdue ? 'overdue' : ''}"
                 onclick="window.location='${link}'">
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <div class="activity-title">${esc(a.sljedeci_korak || a.naslov)}</div>
                    <div class="activity-meta">${esc(meta)}${korisnikBadge}</div>
                </div>
                <div class="activity-date ${isOverdue ? 'overdue' : ''}">
                    ${formatDate(datum)}
                </div>
            </div>
        `;
    }).join('');
}

// =====================================================
// STATUS STATS
// =====================================================
async function loadStatusStats() {
    try {
        const res = await fetch(API_URL + 'status-stats');
        const data = await res.json();
        if (data.success) {
            renderStatusStats(data.data);
        }
    } catch (e) {
        console.error('Error loading status stats:', e);
    }
}

function renderStatusStats(stats) {
    const container = document.getElementById('statusList');
    
    const statusConfig = {
        'aktivan': { label: 'Aktivni klijenti', color: '#22c55e' },
        'potencijalan': { label: 'Potencijalni', color: '#f59e0b' },
        'neaktivan': { label: 'Neaktivni', color: '#94a3b8' }
    };
    
    container.innerHTML = (stats || []).map(s => {
        const config = statusConfig[s.status] || { label: s.status, color: '#64748b' };
        return `
            <div class="stat-item" onclick="showFirmeByStatus('${s.status}', '${config.label}')">
                <div class="stat-item-left">
                    <div class="stat-dot" style="background: ${config.color}"></div>
                    <span class="stat-label">${config.label}</span>
                </div>
                <span class="stat-value">${s.broj || 0}</span>
            </div>
        `;
    }).join('');
}

// =====================================================
// ZUPANIJE STATS
// =====================================================
async function loadZupanijeStats() {
    try {
        const res = await fetch(API_URL + 'zupanije-stats');
        const data = await res.json();
        if (data.success) {
            renderZupanijeStats(data.data);
        }
    } catch (e) {
        console.error('Error loading zupanije stats:', e);
    }
}

function renderZupanijeStats(stats) {
    const container = document.getElementById('zupanijeList');
    
    if (!stats || stats.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📍</div><p>Nema podataka</p></div>';
        return;
    }
    
    container.innerHTML = stats.slice(0, 6).map(z => `
        <div class="stat-item" onclick="showFirmeByZupanija(${z.id}, '${esc(z.naziv)}')">
            <div class="stat-item-left">
                <div class="stat-dot" style="background: #6366f1"></div>
                <span class="stat-label">${esc(z.naziv)}</span>
            </div>
            <span class="stat-value">${z.broj || 0}</span>
        </div>
    `).join('');
}

// =====================================================
// SHOW FIRMS BY FILTER
// =====================================================
async function showFirmeByTag(tagId, tagName) {
    document.getElementById('firmsSectionTitle').textContent = `Firme s tagom: ${tagName}`;
    const res = await fetch(API_URL + `firme-by-tag&tag_id=${tagId}`);
    const data = await res.json();
    renderFirmsTable(data.success ? data.data : []);
}

async function showFirmeByServis(servisId, servisName) {
    document.getElementById('firmsSectionTitle').textContent = `Firme sa servisom: ${servisName}`;
    const res = await fetch(API_URL + `firme&servis_id=${servisId}`);
    const data = await res.json();
    renderFirmsTable(data.success ? data.data : []);
}

async function showFirmeByStatus(status, statusName) {
    document.getElementById('firmsSectionTitle').textContent = `Firme: ${statusName}`;
    const res = await fetch(API_URL + `firme&status=${status}`);
    const data = await res.json();
    renderFirmsTable(data.success ? data.data : []);
}

async function showFirmeByZupanija(zupanijaId, zupanijaName) {
    document.getElementById('firmsSectionTitle').textContent = `Firme: ${zupanijaName}`;
    const res = await fetch(API_URL + `firme&zupanija_id=${zupanijaId}`);
    const data = await res.json();
    renderFirmsTable(data.success ? data.data : []);
}

async function searchFirme() {
    const query = document.getElementById('globalSearch').value.trim();
    if (!query) return;
    
    document.getElementById('firmsSectionTitle').textContent = `Rezultati za: "${query}"`;
    const res = await fetch(API_URL + `firme&search=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderFirmsTable(data.success ? data.data : []);
}

function renderFirmsTable(firme) {
    const container = document.getElementById('firmsTableBody');
    const section = document.getElementById('firmsSection');
    
    if (firme.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="empty-state">Nema rezultata</td></tr>';
    } else {
        container.innerHTML = firme.map(f => {
            // Kontakt - može biti u kontakti array ili direktno kao kontakt_ime
            let kontaktIme = '-';
            let kontaktEmail = f.email || '-';
            
            if (f.kontakti && f.kontakti.length > 0) {
                const primary = f.kontakti.find(k => k.is_primary) || f.kontakti[0];
                kontaktIme = `${primary.ime || ''} ${primary.prezime || ''}`.trim() || '-';
                kontaktEmail = primary.email || f.email || '-';
            } else if (f.kontakt_ime && f.kontakt_ime.trim()) {
                kontaktIme = f.kontakt_ime;
                kontaktEmail = f.kontakt_email || f.email || '-';
            }
            
            return `
                <tr>
                    <td>
                        <span class="firma-name">${esc(f.naziv)}</span>
                        ${f.oib ? `<div class="firma-oib">OIB: ${f.oib}</div>` : ''}
                    </td>
                    <td>${esc(kontaktIme)}</td>
                    <td>${esc(kontaktEmail)}</td>
                    <td>${renderTagBadges(f.tagovi)}</td>
                    <td><a href="firma.html?id=${f.id}" class="btn btn-sm btn-outline">✏️ Uredi</a></td>
                </tr>
            `;
        }).join('');
    }
    
    section.classList.add('active');
    section.scrollIntoView({ behavior: 'smooth' });
}

function renderTagBadges(tagovi) {
    if (!tagovi || tagovi.length === 0) return '-';
    return tagovi.map(t => 
        `<span class="tag-badge" style="background: ${t.boja}">${esc(t.naziv)}</span>`
    ).join(' ');
}

function closeFirmsSection() {
    document.getElementById('firmsSection').classList.remove('active');
}

// =====================================================
// HELPERS
// =====================================================
function esc(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMoney(value) {
    const num = parseFloat(value) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M €';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K €';
    return num.toFixed(0) + ' €';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// =====================================================
// AUTOCOMPLETE
// =====================================================
let autocompleteTimeout = null;
let autocompleteActiveIndex = -1;
let autocompleteResults = [];

function initAutocomplete() {
    const input = document.getElementById('globalSearch');
    const dropdown = document.getElementById('autocompleteDropdown');

    // Input event with debounce
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (autocompleteTimeout) {
            clearTimeout(autocompleteTimeout);
        }

        if (query.length < 2) {
            hideAutocomplete();
            return;
        }

        autocompleteTimeout = setTimeout(() => {
            fetchAutocomplete(query);
        }, 250);
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        if (!dropdown.classList.contains('show')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            autocompleteActiveIndex = Math.min(autocompleteActiveIndex + 1, autocompleteResults.length - 1);
            updateActiveItem();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            autocompleteActiveIndex = Math.max(autocompleteActiveIndex - 1, 0);
            updateActiveItem();
        } else if (e.key === 'Escape') {
            hideAutocomplete();
        } else if (e.key === 'Enter' && autocompleteActiveIndex >= 0) {
            e.preventDefault();
            const selected = autocompleteResults[autocompleteActiveIndex];
            if (selected) {
                openFirma(selected.id);
            }
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            hideAutocomplete();
        }
    });

    // Show dropdown on focus if there's content
    input.addEventListener('focus', () => {
        if (autocompleteResults.length > 0) {
            dropdown.classList.add('show');
        }
    });
}

async function fetchAutocomplete(query) {
    const dropdown = document.getElementById('autocompleteDropdown');

    // Show loading
    dropdown.innerHTML = '<div class="autocomplete-loading">Tražim...</div>';
    dropdown.classList.add('show');

    try {
        const res = await fetch(API_URL + `firme&search=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json();

        if (data.success && data.data) {
            autocompleteResults = data.data;
            renderAutocomplete(autocompleteResults);
        } else if (data.error) {
            console.error('API error:', data.error);
            autocompleteResults = [];
            dropdown.innerHTML = `<div class="autocomplete-empty">${esc(data.error)}</div>`;
        } else {
            autocompleteResults = [];
            dropdown.innerHTML = '<div class="autocomplete-empty">Nema rezultata</div>';
        }
    } catch (e) {
        console.error('Autocomplete error:', e);
        dropdown.innerHTML = '<div class="autocomplete-empty">Greška: ' + esc(e.message) + '</div>';
    }
}

function renderAutocomplete(firme) {
    const dropdown = document.getElementById('autocompleteDropdown');
    autocompleteActiveIndex = -1;

    if (firme.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-empty">Nema rezultata</div>';
        return;
    }

    const statusColors = {
        'aktivan': { bg: '#dcfce7', color: '#166534' },
        'potencijalan': { bg: '#fef3c7', color: '#92400e' },
        'neaktivan': { bg: '#f1f5f9', color: '#64748b' }
    };

    dropdown.innerHTML = firme.map((f, idx) => {
        const statusStyle = statusColors[f.status] || statusColors['neaktivan'];
        const meta = [f.oib, f.mjesto].filter(Boolean).join(' • ');

        return `
            <div class="autocomplete-item" data-index="${idx}" onclick="openFirma(${f.id})">
                <div class="autocomplete-item-main">
                    <span class="autocomplete-item-name">${esc(f.naziv)}</span>
                    ${meta ? `<span class="autocomplete-item-meta">${esc(meta)}</span>` : ''}
                </div>
                <span class="autocomplete-item-status" style="background: ${statusStyle.bg}; color: ${statusStyle.color}">
                    ${f.status || 'neaktivan'}
                </span>
            </div>
        `;
    }).join('');
}

function updateActiveItem() {
    const items = document.querySelectorAll('.autocomplete-item');
    items.forEach((item, idx) => {
        item.classList.toggle('active', idx === autocompleteActiveIndex);
    });

    // Scroll into view
    if (autocompleteActiveIndex >= 0 && items[autocompleteActiveIndex]) {
        items[autocompleteActiveIndex].scrollIntoView({ block: 'nearest' });
    }
}

function hideAutocomplete() {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.classList.remove('show');
    autocompleteActiveIndex = -1;
}

function openFirma(id) {
    window.location.href = `firma.html?id=${id}`;
}

// Expose functions to window for onclick handlers
window.searchFirme = searchFirme;
window.closeFirmsSection = closeFirmsSection;
window.openFirma = openFirma;
