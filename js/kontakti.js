const API_URL = 'api.php';
let kontakti = [];
let currentUser = null;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', debounce(() => loadKontakti(), 300));
    document.getElementById('filterEmail').addEventListener('change', () => loadKontakti());
    document.getElementById('filterFirma').addEventListener('change', () => loadKontakti());
    document.getElementById('filterPrimary').addEventListener('change', () => loadKontakti());
}

// ==================== AUTH ====================
async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}?endpoint=current-user`);
        const data = await res.json();
        if (data.success && data.data) {
            currentUser = data.data;
            document.getElementById('userName').textContent = `${currentUser.ime} ${currentUser.prezime}`;
            document.getElementById('userAvatar').textContent = `${currentUser.ime[0]}${currentUser.prezime[0]}`;

            // Sakrij Postavke link za ne-admine
            if (currentUser.uloga !== 'admin') {
                const postavkeLink = document.querySelector('a[href="admin.html"]');
                if (postavkeLink) postavkeLink.style.display = 'none';
            }

            showInitialState();
            loadStats();
        } else {
            window.location.href = 'firme.html';
        }
    } catch (e) {
        window.location.href = 'firme.html';
    }
}

async function logout() {
    await fetch(`${API_URL}?endpoint=logout`, { method: 'POST' });
    window.location.href = 'firme.html';
}

// ==================== LOAD DATA ====================
function hasActiveFilters() {
    const search = document.getElementById('searchInput').value;
    const filterEmail = document.getElementById('filterEmail').value;
    const filterFirma = document.getElementById('filterFirma').value;
    const filterPrimary = document.getElementById('filterPrimary').value;
    return search || filterEmail || filterFirma || filterPrimary;
}

function showInitialState() {
    const container = document.getElementById('kontaktiTableBody');
    document.getElementById('tableCount').textContent = '';
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">Pretražite kontakte</div>
            <p>Upišite ime kontakta ili odaberite filter za prikaz rezultata</p>
        </div>
    `;
}

let kontaktiTotal = 0;
let kontaktiPage = 1;
const KONTAKTI_LIMIT = 50;

async function loadKontakti(page = 1) {
    if (!hasActiveFilters()) {
        showInitialState();
        return;
    }

    kontaktiPage = page;
    const offset = (page - 1) * KONTAKTI_LIMIT;
    const container = document.getElementById('kontaktiTableBody');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Učitavanje...</div>';

    const params = new URLSearchParams({ endpoint: 'kontakti-admin' });
    params.append('limit', KONTAKTI_LIMIT);
    params.append('offset', offset);

    const search = document.getElementById('searchInput').value;
    if (search) params.append('search', search);

    const filterEmail = document.getElementById('filterEmail').value;
    if (filterEmail) params.append('has_email', filterEmail === 'with' ? '1' : '0');

    const filterFirma = document.getElementById('filterFirma').value;
    if (filterFirma === 'bez-emaila') params.append('firma_bez_emaila', '1');

    const filterPrimary = document.getElementById('filterPrimary').value;
    if (filterPrimary) params.append('is_primary', filterPrimary);

    try {
        const res = await fetch(`${API_URL}?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
            kontakti = data.data.kontakti;
            kontaktiTotal = data.data.total;
            renderKontaktiTable();
        } else {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Greška pri učitavanju</div></div>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Greška pri povezivanju</div></div>';
    }
}

function goToKontaktiPage(page) {
    loadKontakti(page);
}

async function loadStats() {
    try {
        const res = await fetch(`${API_URL}?endpoint=kontakti-stats`);
        const data = await res.json();
        
        if (data.success) {
            const stats = data.data;
            document.getElementById('statTotal').textContent = stats.total || 0;
            document.getElementById('statWithEmail').textContent = stats.with_email || 0;
            document.getElementById('statWithoutEmail').textContent = stats.without_email || 0;
            document.getElementById('statFirmeBezEmaila').textContent = stats.firme_bez_emaila || 0;
            
            // Show alert if there are firms without email
            const alertBox = document.getElementById('alertFirmeBezEmaila');
            if (stats.firme_bez_emaila > 0) {
                document.getElementById('alertCount').textContent = stats.firme_bez_emaila;
                alertBox.style.display = 'flex';
            } else {
                alertBox.style.display = 'none';
            }
        }
    } catch (e) {
        console.error(e);
    }
}

function renderKontaktiTable() {
    const container = document.getElementById('kontaktiTableBody');
    const totalPages = Math.ceil(kontaktiTotal / KONTAKTI_LIMIT);
    const countText = totalPages > 1
        ? `Stranica ${kontaktiPage} od ${totalPages} (ukupno ${kontaktiTotal} kontakata)`
        : `${kontaktiTotal} kontakata`;
    document.getElementById('tableCount').textContent = countText;
    
    if (kontakti.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-title">Nema kontakata</div>
                <p>Promijeni filtere ili dodaj novi kontakt</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Kontakt</th>
                    <th>Firma</th>
                    <th>Email</th>
                    <th>Telefon</th>
                    <th>Status</th>
                    <th>Akcije</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    kontakti.forEach(k => {
        const hasEmail = k.email && k.email.trim() !== '';
        const emailStatus = hasEmail 
            ? `<span class="email-status has-email">✓ Ima email</span>`
            : `<span class="email-status no-email">✗ Nema email</span>`;
        
        const emailDisplay = hasEmail 
            ? `<a href="mailto:${escapeHtml(k.email)}">${escapeHtml(k.email)}</a>`
            : '<span style="color: var(--gray-400);">-</span>';
        
        const primaryBadge = k.is_primary ? '<span class="primary-badge">PRIMARY</span>' : '';
        
        html += `
            <tr>
                <td>
                    <div class="contact-name">${escapeHtml(k.ime || '')} ${escapeHtml(k.prezime || '')}${primaryBadge}</div>
                    ${k.pozicija ? `<div class="contact-position">${escapeHtml(k.pozicija)}</div>` : ''}
                </td>
                <td>
                    <a href="firma.html?id=${k.firma_id}" class="firma-link">${escapeHtml(k.firma_naziv || 'N/A')}</a>
                </td>
                <td class="contact-email">${emailDisplay}</td>
                <td>${escapeHtml(k.telefon || k.mobitel || '-')}</td>
                <td>${emailStatus}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-icon" onclick="editKontakt(${k.id})" title="Uredi">✏️</button>
                        <button class="btn-icon" onclick="deleteKontakt(${k.id})" title="Obriši">🗑️</button>
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
        if (kontaktiPage > 1) {
            html += `<button class="pagination-btn" onclick="goToKontaktiPage(${kontaktiPage - 1})">← Prethodna</button>`;
        }

        // Brojevi stranica
        html += '<div class="pagination-numbers">';
        for (let i = 1; i <= totalPages; i++) {
            // Prikaži prvu, zadnju, i stranice oko trenutne
            if (i === 1 || i === totalPages || (i >= kontaktiPage - 2 && i <= kontaktiPage + 2)) {
                html += `<button class="pagination-num ${i === kontaktiPage ? 'active' : ''}" onclick="goToKontaktiPage(${i})">${i}</button>`;
            } else if (i === kontaktiPage - 3 || i === kontaktiPage + 3) {
                html += '<span class="pagination-dots">...</span>';
            }
        }
        html += '</div>';

        // Gumb "Sljedeća"
        if (kontaktiPage < totalPages) {
            html += `<button class="pagination-btn" onclick="goToKontaktiPage(${kontaktiPage + 1})">Sljedeća →</button>`;
        }

        html += '</div>';
    }

    container.innerHTML = html;
}

// ==================== CRUD ====================
function openKontaktModal(kontakt = null) {
    const modal = document.getElementById('kontaktModal');
    const title = document.getElementById('kontaktModalTitle');
    
    document.getElementById('kontaktForm').reset();
    document.getElementById('kontaktId').value = '';
    document.getElementById('kontaktFirmaId').value = '';
    
    if (kontakt) {
        title.textContent = 'Uredi kontakt';
        document.getElementById('kontaktId').value = kontakt.id;
        document.getElementById('kontaktFirmaId').value = kontakt.firma_id;
        document.getElementById('kontaktFirmaNaziv').value = kontakt.firma_naziv || '';
        document.getElementById('kontaktIme').value = kontakt.ime || '';
        document.getElementById('kontaktPrezime').value = kontakt.prezime || '';
        document.getElementById('kontaktEmail').value = kontakt.email || '';
        document.getElementById('kontaktTelefon').value = kontakt.telefon || '';
        document.getElementById('kontaktMobitel').value = kontakt.mobitel || '';
        document.getElementById('kontaktPozicija').value = kontakt.pozicija || '';
        document.getElementById('kontaktPrimary').checked = kontakt.is_primary == 1;
    } else {
        title.textContent = 'Novi kontakt';
        // TODO: Add firm selector for new contacts
    }
    
    modal.classList.add('active');
}

function editKontakt(id) {
    const kontakt = kontakti.find(k => k.id === id);
    if (kontakt) {
        openKontaktModal(kontakt);
    }
}

async function saveKontakt() {
    const id = document.getElementById('kontaktId').value;
    
    const data = {
        id: id || null,
        firma_id: document.getElementById('kontaktFirmaId').value,
        ime: document.getElementById('kontaktIme').value,
        prezime: document.getElementById('kontaktPrezime').value,
        email: document.getElementById('kontaktEmail').value,
        telefon: document.getElementById('kontaktTelefon').value,
        mobitel: document.getElementById('kontaktMobitel').value,
        pozicija: document.getElementById('kontaktPozicija').value,
        is_primary: document.getElementById('kontaktPrimary').checked ? 1 : 0
    };
    
    try {
        const res = await fetch(`${API_URL}?endpoint=kontakti`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await res.json();
        
        if (result.success) {
            showToast('Kontakt spremljen', 'success');
            closeModal('kontaktModal');
            loadKontakti();
            loadStats();
        } else {
            showToast(result.error || 'Greška pri spremanju', 'error');
        }
    } catch (e) {
        showToast('Greška pri povezivanju', 'error');
    }
}

async function deleteKontakt(id) {
    if (!confirm('Obrisati ovaj kontakt?')) return;
    
    try {
        const res = await fetch(`${API_URL}?endpoint=kontakti`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        const result = await res.json();
        
        if (result.success) {
            showToast('Kontakt obrisan', 'success');
            loadKontakti();
            loadStats();
        } else {
            showToast(result.error || 'Greška pri brisanju', 'error');
        }
    } catch (e) {
        showToast('Greška pri povezivanju', 'error');
    }
}

function filterBezEmaila() {
    document.getElementById('filterFirma').value = 'bez-emaila';
    loadKontakti();
}

// ==================== HELPERS ====================
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});
