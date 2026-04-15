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
        await fetchRecentActivity();
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

async function fetchCountryDistribution() {
    const { data } = await supabase.rpc('get_country_stats'); // We might need to create this RPC
    
    // Fallback if RPC doesn't exist yet
    let stats = data;
    if (!data) {
        const { data: raw } = await supabase.from('profiles').select('country');
        const counts = {};
        raw?.forEach(r => {
            const c = r.country || 'Inconnu';
            counts[c] = (counts[c] || 0) + 1;
        });
        stats = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
    }

    const container = document.getElementById('country-list');
    container.innerHTML = stats.map(s => `
        <div class="country-item">
            <span class="country-name">${s.name}</span>
            <span class="country-count">${s.count}</span>
        </div>
    `).join('');
}

async function fetchRecentActivity() {
    const { data } = await supabase
        .from('messages')
        .select(`
            content, 
            created_at, 
            conversations (
                profiles (full_name)
            )
        `)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(10);

    container.innerHTML = data?.map(m => `
        <div class="activity-card">
            <div class="activity-header">
                <span class="activity-user-badge">${m.conversations?.profiles?.full_name || 'Utilisateur'}</span>
                <span class="activity-time-badge">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="activity-content">
                <p>${m.content}</p>
            </div>
            <div class="activity-footer">
                <a href="chat.html?session=${m.conversations?.id}" target="_blank" class="activity-link">Voir la conversation</a>
            </div>
        </div>
    `).join('') || '<p class="empty-state">Aucune activité récente</p>';
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
