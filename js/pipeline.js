const API_URL = 'api.php?endpoint=';

let faze = [];
let prilike = [];
let firme = [];
let servisi = [];
let korisnici = [];
let razloziGubitka = [];
let draggedCard = null;
let firmaAutocompleteTimeout = null;
let firmaAutocompleteIndex = -1;
let viewMode = 'moje'; // 'moje' ili 'sve'
let currentUser = null;

// =====================================================
// AUTH
// =====================================================
async function checkAuth() {
    try {
        const res = await fetch('api.php?endpoint=current-user');
        const data = await res.json();
        if (data.success && data.data) {
            currentUser = data.data;
            const ime = currentUser.ime || '';
            const prezime = currentUser.prezime || '';
            const userNameEl = document.getElementById('userName');
            const userAvatarEl = document.getElementById('userAvatar');
            if (userNameEl) userNameEl.textContent = `${ime} ${prezime}`;
            if (userAvatarEl) userAvatarEl.textContent = `${ime[0] || ''}${prezime[0] || ''}`;

            // Sakrij Postavke link za ne-admine
            if (currentUser.uloga !== 'admin') {
                const postavkeLink = document.querySelector('a[href="admin.html"]');
                if (postavkeLink) postavkeLink.style.display = 'none';
            }

            return true;
        } else {
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
    await loadInitialData();
    await loadPrilike();
    await loadStats();
    initFirmaAutocomplete();

    // Kontakt select change handler
    document.getElementById('prilikaKontaktId')?.addEventListener('change', showKontaktDetails);
});

async function loadInitialData() {
    try {
        // Faze
        const fazaRes = await fetch(API_URL + 'faze-pipeline');
        const fazaData = await fazaRes.json();
        if (fazaData.success) faze = fazaData.data;
        
        // Servisi
        const servisRes = await fetch(API_URL + 'servisi');
        const servisData = await servisRes.json();
        if (servisData.success) {
            servisi = servisData.data;
            populateSelect('filterServis', servisi, 'id', 'naziv', true);
            populateSelect('prilikaServis', servisi, 'id', 'naziv', true);
        }
        
        // Korisnici (za prikaz vlasnika na karticama)
        const korisnikRes = await fetch(API_URL + 'korisnici');
        const korisnikData = await korisnikRes.json();
        if (korisnikData.success) {
            korisnici = korisnikData.data;
        }
        
        // Firme se učitavaju preko autocomplete pretrage, ne unaprijed
        
        // Razlozi gubitka
        const razloziRes = await fetch(API_URL + 'razlozi-gubitka');
        const razloziData = await razloziRes.json();
        if (razloziData.success) {
            razloziGubitka = razloziData.data;
            populateSelect('prilikaRazlogGubitka', razloziGubitka, 'naziv', 'naziv', true);
        }
        
        // Faze za select
        populateSelect('prilikaFaza', faze, 'id', 'naziv', false);
        
    } catch (err) {
        console.error('Greška pri učitavanju:', err);
    }
}

function populateSelect(selectId, items, valueKey, labelKey, addEmpty = false) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentValue = select.value;
    
    if (addEmpty) {
        select.innerHTML = '<option value="">-- Svi --</option>';
    } else {
        select.innerHTML = '';
    }
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = typeof labelKey === 'function' ? labelKey(item) : item[labelKey];
        select.appendChild(option);
    });
    
    if (currentValue) select.value = currentValue;
}

// =====================================================
// FIRMA AUTOCOMPLETE
// =====================================================
function initFirmaAutocomplete() {
    const input = document.getElementById('prilikaFirmaInput');
    const dropdown = document.getElementById('firmaDropdown');

    if (!input || !dropdown) return;

    // Typing handler with debounce
    input.addEventListener('input', function() {
        const query = this.value.trim();

        clearTimeout(firmaAutocompleteTimeout);
        firmaAutocompleteIndex = -1;

        if (query.length < 1) {
            dropdown.classList.remove('show');
            document.getElementById('prilikaFirmaId').value = '';
            document.getElementById('firmaKontaktInfo').style.display = 'none';
            return;
        }

        firmaAutocompleteTimeout = setTimeout(() => {
            searchFirme(query);
        }, 200);
    });

    // Keyboard navigation
    input.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.autocomplete-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            firmaAutocompleteIndex = Math.min(firmaAutocompleteIndex + 1, items.length - 1);
            updateAutocompleteHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            firmaAutocompleteIndex = Math.max(firmaAutocompleteIndex - 1, 0);
            updateAutocompleteHighlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (firmaAutocompleteIndex >= 0 && items[firmaAutocompleteIndex]) {
                items[firmaAutocompleteIndex].click();
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('show');
        }
    });

    // Close on click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-wrapper')) {
            dropdown.classList.remove('show');
        }
    });
}

async function searchFirme(query) {
    const dropdown = document.getElementById('firmaDropdown');

    try {
        const res = await fetch(API_URL + 'firme&search=' + encodeURIComponent(query) + '&limit=10');
        const data = await res.json();

        if (data.success) {
            // API vraća {firme: [...], total: ...} za paginaciju
            const firme = data.data.firme || data.data;
            renderFirmaAutocomplete(firme);
        } else {
            dropdown.innerHTML = '<div class="autocomplete-no-results">Greška pri pretrazi</div>';
            dropdown.classList.add('show');
        }
    } catch (err) {
        console.error('Greška:', err);
        dropdown.innerHTML = '<div class="autocomplete-no-results">Greška pri pretrazi</div>';
        dropdown.classList.add('show');
    }
}

function renderFirmaAutocomplete(results) {
    const dropdown = document.getElementById('firmaDropdown');

    if (results.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-no-results">Nema rezultata</div>';
        dropdown.classList.add('show');
        return;
    }

    dropdown.innerHTML = results.map(firma => `
        <div class="autocomplete-item" data-id="${firma.id}" data-naziv="${escapeHtml(firma.naziv)}">
            <div class="firma-naziv">${escapeHtml(firma.naziv)}</div>
            ${firma.grad_naziv ? `<div class="firma-info">${escapeHtml(firma.grad_naziv)}</div>` : ''}
        </div>
    `).join('');

    // Add click handlers
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', function() {
            selectFirma(this.dataset.id, this.dataset.naziv);
        });
    });

    dropdown.classList.add('show');
}

function updateAutocompleteHighlight(items) {
    items.forEach((item, i) => {
        item.classList.toggle('active', i === firmaAutocompleteIndex);
    });
}

function selectFirma(id, naziv) {
    document.getElementById('prilikaFirmaId').value = id;
    document.getElementById('prilikaFirmaInput').value = naziv;
    document.getElementById('firmaDropdown').classList.remove('show');
    firmaAutocompleteIndex = -1;

    // Učitaj i prikaži kontakt
    loadFirmaKontakt(id);
}

let firmaKontakti = [];

async function loadFirmaKontakt(firmaId, selectedKontaktId = null) {
    const kontaktDiv = document.getElementById('firmaKontaktInfo');
    const kontaktSelect = document.getElementById('prilikaKontaktId');
    const kontaktDetails = document.getElementById('kontaktDetails');

    try {
        const res = await fetch(API_URL + 'kontakti&firma_id=' + firmaId);
        const data = await res.json();

        if (data.success && data.data.length > 0) {
            firmaKontakti = data.data;

            // Popuni select
            kontaktSelect.innerHTML = '<option value="">-- Odaberi kontakt --</option>';
            firmaKontakti.forEach(k => {
                const option = document.createElement('option');
                option.value = k.id;
                option.textContent = `${k.ime || ''} ${k.prezime || ''}`.trim() + (k.is_primary == 1 ? ' (primarni)' : '');
                kontaktSelect.appendChild(option);
            });

            // Odaberi kontakt: proslijeđeni, primarni ili prvi
            if (selectedKontaktId) {
                kontaktSelect.value = selectedKontaktId;
            } else {
                const primarni = firmaKontakti.find(k => k.is_primary == 1);
                kontaktSelect.value = primarni ? primarni.id : firmaKontakti[0].id;
            }

            // Prikaži detalje odabranog
            showKontaktDetails();

            kontaktDiv.style.display = 'block';
        } else {
            firmaKontakti = [];
            kontaktSelect.innerHTML = '<option value="">Nema kontakata</option>';
            kontaktDetails.innerHTML = '';
            kontaktDiv.style.display = 'block';
        }
    } catch (err) {
        console.error('Greška pri učitavanju kontakta:', err);
        kontaktDiv.style.display = 'none';
    }
}

function showKontaktDetails() {
    const kontaktId = document.getElementById('prilikaKontaktId').value;
    const kontaktDetails = document.getElementById('kontaktDetails');

    if (!kontaktId) {
        kontaktDetails.innerHTML = '';
        return;
    }

    const kontakt = firmaKontakti.find(k => k.id == kontaktId);
    if (!kontakt) {
        kontaktDetails.innerHTML = '';
        return;
    }

    let detailsHtml = '';
    if (kontakt.email) {
        detailsHtml += `<a href="mailto:${escapeHtml(kontakt.email)}">${escapeHtml(kontakt.email)}</a>`;
    }
    if (kontakt.telefon) {
        if (detailsHtml) detailsHtml += ' &bull; ';
        detailsHtml += `<a href="tel:${escapeHtml(kontakt.telefon)}">${escapeHtml(kontakt.telefon)}</a>`;
    }
    if (kontakt.funkcija) {
        if (detailsHtml) detailsHtml += ' &bull; ';
        detailsHtml += escapeHtml(kontakt.funkcija);
    }

    kontaktDetails.innerHTML = detailsHtml;
}

// =====================================================
// LOAD DATA
// =====================================================
function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('btnMoje').classList.toggle('active', mode === 'moje');
    document.getElementById('btnSve').classList.toggle('active', mode === 'sve');
    loadPrilike();
}

async function loadPrilike() {
    try {
        let url = API_URL + 'prilike';
        const params = new URLSearchParams();

        const servisId = document.getElementById('filterServis').value;
        const aktivne = document.getElementById('filterAktivne').checked;

        if (servisId) params.append('servis_id', servisId);
        params.append('aktivne', aktivne ? '1' : '0');

        // Ako je "moje", šalji samo_moje=1, API će filtrirati po trenutnom korisniku
        if (viewMode === 'moje') {
            params.append('samo_moje', '1');
        }

        if (params.toString()) url += '&' + params.toString();

        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
            prilike = data.data;
            renderKanban();
        }
    } catch (err) {
        console.error('Greška:', err);
    }
}

async function loadStats() {
    try {
        const res = await fetch(API_URL + 'pipeline-stats');
        const data = await res.json();
        
        if (data.success) {
            const stats = data.data;
            document.getElementById('statAktivne').textContent = stats.aktivne.broj;
            document.getElementById('statVrijednost').textContent = formatMoney(stats.aktivne.vrijednost);
            document.getElementById('statOcekivano').textContent = formatMoney(stats.aktivne.ocekivano);
        }
    } catch (err) {
        console.error('Greška:', err);
    }
}

// =====================================================
// RENDER KANBAN
// =====================================================
function renderKanban() {
    const board = document.getElementById('kanbanBoard');
    board.innerHTML = '';
    
    // Samo aktivne faze (bez Dobiveno/Izgubljeno ako su filtrirane)
    const aktivneFaze = document.getElementById('filterAktivne').checked
        ? faze.filter(f => f.is_won == 0 && f.is_lost == 0)
        : faze;
    
    aktivneFaze.forEach(faza => {
        const fazaPrilike = prilike.filter(p => p.faza_id == faza.id);
        const ukupnaVrijednost = fazaPrilike.reduce((sum, p) => sum + parseFloat(p.vrijednost || 0), 0);
        
        const column = document.createElement('div');
        column.className = 'kanban-column';
        column.dataset.fazaId = faza.id;
        
        column.innerHTML = `
            <div class="column-header" style="background: ${faza.boja}; color: white;">
                <div class="column-title">
                    ${faza.naziv}
                    <span class="column-count">${fazaPrilike.length}</span>
                </div>
                <div class="column-value">${formatMoney(ukupnaVrijednost)}</div>
            </div>
            <div class="column-cards" 
                 ondragover="handleDragOver(event)" 
                 ondrop="handleDrop(event, ${faza.id})"
                 ondragleave="handleDragLeave(event)">
                ${fazaPrilike.length === 0 ? 
                    '<div class="empty-column">Nema prilika</div>' : 
                    fazaPrilike.map(p => renderPrilikaCard(p)).join('')
                }
            </div>
        `;
        
        board.appendChild(column);
    });
}

function renderPrilikaCard(prilika) {
    const datumClass = getDateClass(prilika.datum_ocekivanog_zatvaranja);

    return `
        <div class="prilika-card"
             draggable="true"
             data-id="${prilika.id}"
             ondragstart="handleDragStart(event)"
             ondragend="handleDragEnd(event)"
             onclick="openEditPrilikaModal(${prilika.id})">
            <div class="card-header">
                <div class="card-title">${escapeHtml(prilika.naziv)}</div>
                <div class="card-value">${formatMoney(prilika.vrijednost)}</div>
            </div>
            <div class="card-firma">
                <a href="firma.html?id=${prilika.firma_id}" onclick="event.stopPropagation()">
                    🏢 ${escapeHtml(prilika.firma_naziv || 'Nepoznato')}
                </a>
            </div>
            ${prilika.vlasnik_ime ? `<div class="card-owner">👤 ${escapeHtml(prilika.vlasnik_ime)}</div>` : ''}
            <div class="card-meta">
                ${prilika.servis_naziv ?
                    `<span class="card-servis">${escapeHtml(prilika.servis_naziv)}</span>` :
                    '<span></span>'
                }
                ${prilika.datum_ocekivanog_zatvaranja ?
                    `<span class="card-date ${datumClass}">📅 ${formatDate(prilika.datum_ocekivanog_zatvaranja)}</span>` :
                    ''
                }
            </div>
        </div>
    `;
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

// =====================================================
// DRAG & DROP
// =====================================================
function handleDragStart(e) {
    draggedCard = e.target.closest('.prilika-card');
    if (!draggedCard) return;
    
    draggedCard.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedCard.dataset.id);
    
    // Dodaj vizualni feedback svim kolonama
    setTimeout(() => {
        document.querySelectorAll('.column-cards').forEach(col => {
            col.style.minHeight = '300px';
        });
    }, 0);
}

function handleDragEnd(e) {
    if (draggedCard) {
        draggedCard.classList.remove('dragging');
    }
    draggedCard = null;
    
    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
    
    // Reset min-height
    document.querySelectorAll('.column-cards').forEach(col => {
        col.style.minHeight = '200px';
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const dropZone = e.currentTarget;
    if (!dropZone.classList.contains('drag-over')) {
        // Ukloni drag-over sa svih ostalih
        document.querySelectorAll('.column-cards.drag-over').forEach(el => {
            if (el !== dropZone) el.classList.remove('drag-over');
        });
        dropZone.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    // Provjeri da li napuštamo cijelu kolonu (ne samo child element)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        e.currentTarget.classList.remove('drag-over');
    }
}

async function handleDrop(e, novaFazaId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const prilikaId = e.dataTransfer.getData('text/plain');
    const prilika = prilike.find(p => p.id == prilikaId);
    
    if (!prilika || prilika.faza_id == novaFazaId) return;
    
    const faza = faze.find(f => f.id == novaFazaId);
    
    // Ako je faza "Izgubljeno", pitaj za razlog
    if (faza && faza.is_lost == 1) {
        const razlog = prompt('Razlog gubitka:');
        if (razlog === null) return; // Canceled
        
        await updatePrilikaFaza(prilikaId, novaFazaId, razlog);
    } else {
        await updatePrilikaFaza(prilikaId, novaFazaId);
    }
}

async function updatePrilikaFaza(prilikaId, fazaId, razlogGubitka = null) {
    try {
        const body = {
            id: parseInt(prilikaId),
            faza_id: parseInt(fazaId)
        };
        
        if (razlogGubitka) {
            body.razlog_gubitka = razlogGubitka;
        }
        
        const res = await fetch(API_URL + 'prilike-faza', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await res.json();
        
        if (data.success) {
            showToast('Faza ažurirana', 'success');
            await loadPrilike();
            await loadStats();
        } else {
            showToast(data.error || 'Greška', 'error');
        }
    } catch (err) {
        console.error('Greška:', err);
        showToast('Greška pri spremanju', 'error');
    }
}

// =====================================================
// MODAL
// =====================================================
function openNewPrilikaModal() {
    document.getElementById('prilikaModalTitle').textContent = 'Nova prilika';
    document.getElementById('prilikaId').value = '';
    document.getElementById('prilikaFirmaId').value = '';
    document.getElementById('prilikaFirmaInput').value = '';
    document.getElementById('prilikaNaziv').value = '';
    document.getElementById('prilikaServis').value = '';
    document.getElementById('prilikaFaza').value = faze.length > 0 ? faze[0].id : '';
    document.getElementById('prilikaVrijednost').value = '0';
    document.getElementById('prilikaZatvaranje').value = '';
    document.getElementById('prilikaOpis').value = '';
    document.getElementById('lossReasonGroup').style.display = 'none';
    document.getElementById('firmaDropdown').classList.remove('show');
    document.getElementById('firmaKontaktInfo').style.display = 'none';
    document.getElementById('prilikaKontaktId').innerHTML = '<option value="">-- Odaberi kontakt --</option>';
    document.getElementById('kontaktDetails').innerHTML = '';
    document.getElementById('btnDeletePrilika').style.display = 'none';
    firmaKontakti = [];

    document.getElementById('prilikaModal').classList.add('active');
}

function openEditPrilikaModal(id) {
    const prilika = prilike.find(p => p.id == id);
    if (!prilika) return;

    document.getElementById('prilikaModalTitle').textContent = 'Uredi priliku';
    document.getElementById('prilikaId').value = prilika.id;
    document.getElementById('prilikaFirmaId').value = prilika.firma_id;
    document.getElementById('prilikaFirmaInput').value = prilika.firma_naziv || '';
    document.getElementById('firmaDropdown').classList.remove('show');

    // Učitaj kontakt za firmu (s odabranim kontaktom ako postoji)
    if (prilika.firma_id) {
        loadFirmaKontakt(prilika.firma_id, prilika.kontakt_id);
    } else {
        document.getElementById('firmaKontaktInfo').style.display = 'none';
    }
    document.getElementById('prilikaNaziv').value = prilika.naziv;
    document.getElementById('prilikaServis').value = prilika.servis_id || '';
    document.getElementById('prilikaFaza').value = prilika.faza_id;
    document.getElementById('prilikaVrijednost').value = prilika.vrijednost;
    document.getElementById('prilikaZatvaranje').value = prilika.datum_ocekivanog_zatvaranja || '';
    document.getElementById('prilikaOpis').value = prilika.opis || '';
    
    // Provjeri je li faza Izgubljeno
    const faza = faze.find(f => f.id == prilika.faza_id);
    if (faza && faza.is_lost == 1) {
        document.getElementById('lossReasonGroup').style.display = 'block';
        document.getElementById('prilikaRazlogGubitka').value = prilika.razlog_gubitka || '';
        document.getElementById('prilikaKonkurent').value = prilika.konkurent || '';
    } else {
        document.getElementById('lossReasonGroup').style.display = 'none';
    }

    document.getElementById('btnDeletePrilika').style.display = 'block';
    document.getElementById('prilikaModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Show/hide loss reason based on faza
document.getElementById('prilikaFaza')?.addEventListener('change', function() {
    const faza = faze.find(f => f.id == this.value);
    document.getElementById('lossReasonGroup').style.display =
        (faza && faza.is_lost == 1) ? 'block' : 'none';
});

async function savePrilika() {
    const id = document.getElementById('prilikaId').value;
    const firmaId = document.getElementById('prilikaFirmaId').value;
    const naziv = document.getElementById('prilikaNaziv').value.trim();

    console.log('savePrilika:', { id, firmaId, naziv });

    if (!firmaId) {
        showToast('Odaberi firmu', 'error');
        return;
    }

    if (!naziv) {
        showToast('Unesi naziv prilike', 'error');
        return;
    }
    
    const kontaktId = document.getElementById('prilikaKontaktId').value;

    const body = {
        firma_id: parseInt(firmaId),
        kontakt_id: kontaktId ? parseInt(kontaktId) : null,
        naziv: naziv,
        servis_id: document.getElementById('prilikaServis').value || null,
        faza_id: parseInt(document.getElementById('prilikaFaza').value),
        vrijednost: parseFloat(document.getElementById('prilikaVrijednost').value) || 0,
        datum_ocekivanog_zatvaranja: document.getElementById('prilikaZatvaranje').value || null,
        opis: document.getElementById('prilikaOpis').value,
        razlog_gubitka: document.getElementById('prilikaRazlogGubitka').value || null,
        konkurent: document.getElementById('prilikaKonkurent').value || null
    };
    
    if (id) body.id = parseInt(id);
    
    try {
        const res = await fetch(API_URL + 'prilike', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await res.json();
        
        if (data.success) {
            showToast(id ? 'Prilika ažurirana' : 'Prilika kreirana', 'success');
            closeModal('prilikaModal');
            await loadPrilike();
            await loadStats();
        } else {
            console.error('API error:', data);
            showToast(data.error || 'Greška pri spremanju', 'error');
        }
    } catch (err) {
        console.error('Network/JS error:', err);
        showToast('Greška: ' + err.message, 'error');
    }
}

// =====================================================
// HELPERS
// =====================================================
function formatMoney(value) {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('hr-HR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

async function deletePrilika() {
    const id = document.getElementById('prilikaId').value;
    if (!id) return;

    if (!confirm('Jeste li sigurni da želite obrisati ovu priliku?')) return;

    try {
        const res = await fetch(API_URL + 'prilike', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: parseInt(id) })
        });

        const data = await res.json();

        if (data.success) {
            showToast('Prilika obrisana', 'success');
            closeModal('prilikaModal');
            await loadPrilike();
            await loadStats();
        } else {
            showToast(data.error || 'Greška pri brisanju', 'error');
        }
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Greška pri brisanju', 'error');
    }
}

// Expose functions to window for onclick handlers
window.setViewMode = setViewMode;
window.openNewPrilikaModal = openNewPrilikaModal;
window.openEditPrilikaModal = openEditPrilikaModal;
window.closeModal = closeModal;
window.savePrilika = savePrilika;
window.loadPrilike = loadPrilike;
window.deletePrilika = deletePrilika;
