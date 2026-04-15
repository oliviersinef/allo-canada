/**
 * ALLO CANADA - Admin Dashboard Premium Logic
 */
import { getSupabase } from './auth.js';

const supabase = getSupabase();

// State
let currentTab = 'overview';
let onlineUsers = new Map();
let usersList = [];
let stats = {
    totalUsers: 0,
    totalConvs: 0,
    totalMsgs: 0
};

/**
 * Initialize Admin Dashboard
 */
async function initAdmin() {
    const authCheck = document.getElementById('admin-auth-check');
    
    try {
        // 1. Check Auth & Admin Status
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_admin, full_name')
            .eq('id', user.id)
            .single();

        if (error || !profile?.is_admin) {
            alert("Accès refusé. Vous n'avez pas les droits administrateur.");
            window.location.href = 'index.html';
            return;
        }

        // Display Admin Name
        document.getElementById('admin-name').textContent = profile.full_name || user.email;
        
        // Hide overlay
        authCheck.style.display = 'none';

        // 2. Initialize Realtime Presence
        initPresence();

        // 3. Load Initial Data
        loadTab(currentTab);

        // 4. Setup Event Listeners
        setupEventListeners();

    } catch (err) {
        console.error("Admin Init Error:", err);
        window.location.href = 'login.html';
    }
}

/**
 * Presence Logic for Live Counting
 */
function initPresence() {
    const channel = supabase.channel('online-users');
    
    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const count = Object.keys(state).length;
            document.getElementById('live-users-count').textContent = count;
        })
        .subscribe();
}

/**
 * Tab Management
 */
function setupEventListeners() {
    // Nav Buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            const tab = btn.dataset.tab;
            if (tab === currentTab) return;
            
            // UI Toggle
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');
            
            currentTab = tab;
            loadTab(tab);
        };
    });

    // User Search
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            renderUsersTable(e.target.value);
        };
    }

    // Knowledge Base Form
    document.getElementById('kb-add-form')?.addEventListener('submit', addKnowledgeDocument);

    // Sync Buttons
    document.getElementById('btn-sync')?.addEventListener('click', () => { fetchKnowledge(); handleStatus('Rafraîchissement terminé', 'sync-status', 'success'); });
    document.getElementById('btn-seed')?.addEventListener('click', () => handleAction('seed'));

    // Settings Save
    document.getElementById('btn-save-prompt')?.addEventListener('click', saveSystemPrompt);
}

// Attach delete globally to window so inline onclick works
window.deleteKnowledgeDocument = deleteKnowledgeDocument;

/**
 * Load Tab Content
 */
async function loadTab(tab) {
    updateHeader(tab);

    if (tab === 'overview') {
        await fetchStats();
        await fetchCountryDistribution();
        initRegistrationChart(); // Trigger Chart.js async
    } else if (tab === 'users') {
        await fetchUsers();
    } else if (tab === 'knowledge') {
        await fetchKnowledge();
    } else if (tab === 'settings') {
        await fetchSettings();
    }
}

function updateHeader(tab) {
    const titles = {
        overview: { t: "Tableau de bord", d: "Statistiques globales et activité en temps réel." },
        users: { t: "Utilisateurs", d: "Gestion et historique des membres Allo Canada." },
        knowledge: { t: "Base de savoir", d: "Synchronisation des sources Canada.ca." },
        settings: { t: "IA & Réglages", d: "Consignes de l'IA et message système." }
    };
    
    const h = titles[tab] || titles.overview;
    document.getElementById('current-tab-title').textContent = h.t;
    document.getElementById('current-tab-desc').textContent = h.d;
}

/**
 * Data Fetching - Overview
 */
async function fetchStats() {
    // We use rough counts for performance
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: convCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true });
    const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });

    document.getElementById('stat-total-users').textContent = userCount || 0;
    document.getElementById('stat-total-convs').textContent = convCount || 0;
    document.getElementById('stat-total-msgs').textContent = msgCount || 0;
}

const countryToIso = {
    "france": "FR", "cameroun": "CM", "côte d'ivoire": "CI", "cote d'ivoire": "CI", 
    "sénégal": "SN", "senegal": "SN", "maroc": "MA", "algérie": "DZ", "algerie": "DZ", 
    "tunisie": "TN", "canada": "CA", "états-unis": "US", "etats-unis": "US", 
    "rdc": "CD", "république démocratique du congo": "CD", "congo": "CG", 
    "mali": "ML", "burkina faso": "BF", "togo": "TG", "bénin": "BJ", "benin": "BJ", 
    "gabon": "GA", "guinée": "GN", "guinee": "GN", "madagascar": "MG", 
    "suisse": "CH", "belgique": "BE", "haïti": "HT", "haiti": "HT"
};

async function fetchCountryDistribution() {
    const { data: raw } = await supabase.from('profiles').select('country');
    const counts = {};
    raw?.forEach(r => {
        const c = r.country || 'Inconnu';
        counts[c] = (counts[c] || 0) + 1;
    });
    const stats = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);

    // 1. Populate Hidden Overlay List
    const container = document.getElementById('country-list');
    if (container) {
        container.innerHTML = stats.map(s => `
            <div class="country-item" style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--neutral-100);">
                <span class="country-name" style="font-weight: 500;">${s.name}</span>
                <span class="country-count" style="color: var(--neutral-500); font-size: 13px;">${s.count} users</span>
            </div>
        `).join('');
    }

    // 2. Build map data
    let mapData = {};
    stats.forEach(s => {
       const iso = countryToIso[s.name.toLowerCase()] || s.name.toUpperCase();
       mapData[iso] = s.count;
    });

    // 3. Render jsVectorMap
    if (window.worldMap) window.worldMap.destroy();
    window.worldMap = new jsVectorMap({
        selector: '#world-map',
        map: 'world',
        zoomOnScroll: false,
        visualizeData: {
            scale: ['#FCA5A5', '#991b1b'],
            values: mapData
        },
        onRegionTooltipShow(event, tooltip, code) {
            if (mapData[code]) {
                tooltip.text(tooltip.text() + ` : ${mapData[code]}`);
            } else {
                 tooltip.text(tooltip.text() + ` : 0`);
            }
        }
    });
    
    // Bind Overlay Toggle if not already bound
    const btnToggle = document.getElementById('btn-toggle-country-list');
    const btnClose = document.getElementById('btn-close-overlay');
    const overlay = document.getElementById('country-list-overlay');
    
    if (btnToggle && !btnToggle.dataset.bound) {
        btnToggle.onclick = () => overlay.style.transform = 'translateX(0)';
        btnClose.onclick = () => overlay.style.transform = 'translateX(100%)';
        btnToggle.dataset.bound = 'true';
    }
}

async function initRegistrationChart() {
    const { data } = await supabase.from('profiles').select('created_at');
    if (!data) return;

    const countsByDate = {};
    const labels = [];
    
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        countsByDate[dateStr] = 0;
        labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
    }

    data.forEach(u => {
        if (!u.created_at) return;
        const dStr = u.created_at.split('T')[0];
        if (countsByDate[dStr] !== undefined) {
            countsByDate[dStr]++;
        }
    });

    const values = Object.values(countsByDate);

    if (window.regChart) window.regChart.destroy();
    
    const canvas = document.getElementById('registrationsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    let gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(224, 36, 36, 0.2)');
    gradient.addColorStop(1, 'rgba(224, 36, 36, 0)');

    window.regChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nouveaux Inscrits',
                data: values,
                borderColor: '#E02424',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#E02424',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111827',
                    padding: 10,
                    titleFont: { family: 'Inter', size: 13 },
                    bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                    displayColors: false
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0, color: '#6B7280' }, border: { dash: [4, 4] }, grid: { color: '#f3f4f6', drawBorder: false } },
                x: { ticks: { color: '#6B7280' }, grid: { display: false, drawBorder: false } }
            }
        }
    });
}

/**
 * Data Fetching - Users
 */
async function fetchUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return;
    usersList = data;
    renderUsersTable();
}

function renderUsersTable(filter = '') {
    const tbody = document.getElementById('users-table-body');
    const searchTerm = filter.toLowerCase();

    const filtered = usersList.filter(u => 
        (u.full_name || '').toLowerCase().includes(searchTerm) || 
        (u.country || '').toLowerCase().includes(searchTerm)
    );

    tbody.innerHTML = filtered.map(u => `
        <tr>
            <td style="font-weight:600">${u.full_name || 'Inconnu'}</td>
            <td>${u.phone || '-'}</td>
            <td>${u.country || '-'}</td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

/**
 * Data Fetching - Settings
 */
async function fetchSettings() {
    const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'system_prompt')
        .single();
    
    if (data) {
        document.getElementById('system-prompt-area').value = data.value;
    }
}

async function saveSystemPrompt() {
    const btn = document.getElementById('btn-save-prompt');
    const val = document.getElementById('system-prompt-area').value;
    
    btn.disabled = true;
    btn.textContent = 'Enregistrement...';

    const { error } = await supabase
        .from('settings')
        .upsert({ key: 'system_prompt', value: val, updated_at: new Date() });

    if (error) {
        alert("Erreur de sauvegarde");
    } else {
        alert("Prompt système mis à jour avec succès !");
    }
    
    btn.disabled = false;
    btn.textContent = 'Enregistrer les consignes';
}

/**
 * Knowledge Base Functions
 */
async function fetchKnowledge() {
    const tbody = document.getElementById('kb-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Chargement...</td></tr>';
    
    try {
        const { data, error } = await supabase.functions.invoke('chat', {
            body: { action: 'list_documents' }
        });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Aucun document trouvé.</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(doc => `
            <tr>
                <td style="font-size:12px; color:var(--neutral-500)">...${doc.id.toString().slice(-4)}</td>
                <td style="font-weight:600">${doc.title}</td>
                <td><a href="${doc.url || '#'}" target="_blank" style="color:var(--primary);text-decoration:none">${doc.url ? 'Lien' : '-'}</a></td>
                <td>${new Date(doc.created_at).toLocaleDateString()}</td>
                <td><button onclick="deleteKnowledgeDocument(${doc.id})" class="btn-delete">Supprimer</button></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Fetch Knowledge Error:", err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red">Erreur de chargement</td></tr>';
    }
}

async function addKnowledgeDocument(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-add-kb');
    const title = document.getElementById('kb-title').value.trim();
    const url = document.getElementById('kb-url').value.trim();
    const content = document.getElementById('kb-content').value.trim();
    
    if (!title || !content) return;
    
    btn.disabled = true;
    btn.textContent = 'Vectorisation en cours...';
    handleStatus('Ajout et vectorisation (peut prendre quelques secondes)...', 'kb-add-status', 'loading');
    
    try {
        const { data, error } = await supabase.functions.invoke('chat', {
            body: { action: 'add_document', title, url, content }
        });
        
        if (error || data?.error) throw error || new Error(data?.error);
        
        handleStatus('Document ajouté et vectorisé avec succès !', 'kb-add-status', 'success');
        document.getElementById('kb-add-form').reset();
        await fetchKnowledge();
        
    } catch (err) {
        console.error(err);
        handleStatus("Erreur lors de l'ajout", 'kb-add-status', 'error');
    }
    
    btn.disabled = false;
    btn.textContent = 'Ajouter à la base et Vectoriser';
}

async function deleteKnowledgeDocument(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette connaissance ?')) return;
    
    try {
        const { error } = await supabase.functions.invoke('chat', {
            body: { action: 'delete_document', id }
        });
        if (error) throw error;
        handleStatus('Document supprimé', 'sync-status', 'success');
        await fetchKnowledge();
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression');
    }
}

function handleStatus(msg, elementId, type) {
    const box = document.getElementById(elementId);
    box.textContent = msg;
    box.className = `status-box ${type}`;
    box.style.display = 'block';
    setTimeout(() => box.style.display = 'none', 4000);
}

/**
 * Maintenance Actions
 */
async function handleAction(type) {
    if (type === 'seed') {
        if (!confirm('Attention : Cela va réinitialiser les documents de base inscrits dans le code. Continuer ?')) return;
        
        handleStatus('Réinitialisation (Seed) en cours (peut prendre 1-2 min)...', 'sync-status', 'loading');
        try {
            const { data, error } = await supabase.functions.invoke('chat', {
                body: { action: 'seed' }
            });
            if (error) throw error;
            handleStatus(`Succès : documents de base réinitialisés.`, 'sync-status', 'success');
            await fetchKnowledge();
        } catch (err) {
            console.error(err);
            handleStatus('Erreur lors du seed', 'sync-status', 'error');
        }
    }
}

// Start
initAdmin();
