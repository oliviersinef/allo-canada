import { getSupabase, getCurrentUser, handleLogout } from './auth.js';

// 0. DOM Elements
const chatMessages = document.getElementById('chat-messages');
const messagesInner = document.getElementById('messages-inner');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const sessionsList = document.getElementById('sessions-list');

// 1. Supabase Connection (Shared with auth.js)
const dbClient = getSupabase();

// Data state
let sessions = JSON.parse(localStorage.getItem('allo_canada_sessions')) || [];
let currentSessionId = null;
let currentHistory = [];
let currentUser = null;

// Guest question limit
const GUEST_QUESTION_LIMIT = 5;
let guestQuestionCount = parseInt(localStorage.getItem('allo_canada_guest_questions') || '0');

// Document attachment state
let pendingDocumentText = null;
let pendingDocumentName = null;

/**
 * Initialize the app
 */
async function init() {
    // Small wait to ensure auth state is settled
    await new Promise(r => setTimeout(r, 100));
    try {
        currentUser = await getCurrentUser();
    } catch (err) {
        console.error("Erreur lors de la récupération de l'utilisateur:", err);
    }
    updateAuthUI();
    updateGuestLimitUI();

    // Force close any stuck overlays (especially after login redirect)
    document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.classList.remove('open'));
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('active');

    // Check if we should start a chat from URL
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');

    if (query) {
        // Clean URL so it doesn't resubmit on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        startNewChat(query);
    } else {
        // If logged in, sync sessions
        if (currentUser) {
            await mergeGuestSessions(); // Move guest data to DB
            await fetchUserSessions(); // Refresh from DB
            initExpressEntryAlert(); // Check for immigration draws
            initPresence(); // Track online status for admin dashboard
        } else {
            renderSessions(); // For guests, show empty/local
        }
        startNewChat();
    }
}

/**
 * Update UI based on auth state
 */
async function updateAuthUI() {
    const footer = document.getElementById('sidebar-auth-footer');
    if (!footer || !currentUser) return;

    // Check if user is admin to show dashboard link
    let isAdmin = false;
    try {
        const { data: profile } = await dbClient
            .from('profiles')
            .select('is_admin')
            .eq('id', currentUser.id)
            .single();
        isAdmin = profile?.is_admin || false;
    } catch (e) {
        console.error("Erreur profile check:", e);
    }

    const userName = currentUser.user_metadata?.full_name || currentUser.email;
    const initial = userName.charAt(0).toUpperCase();

    footer.innerHTML = `
        <div class="user-profile-btn" onclick="toggleUserMenu()">
            <div class="user-avatar">${initial}</div>
            <div class="user-info">
                <div class="user-name">${userName}</div>
                ${isAdmin ? '<div class="user-role" style="color:var(--primary); font-size:11px;">Admin</div>' : ''}
            </div>
            <div class="user-settings-icon" style="margin-left: auto; color: var(--neutral-500);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </div>
        </div>
        
        <div class="user-dropdown-menu" id="user-dropdown">
            ${isAdmin ? `
            <a href="admin.html" class="dropdown-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                Dashboard
            </a>
            ` : ''}
            <a href="index.html" class="dropdown-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                Accueil
            </a>
            <button onclick="handleLogout()" class="dropdown-item" style="width: 100%; border: none; background: transparent; cursor: pointer; text-align: left; font-family: inherit;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Déconnexion
            </button>
        </div>
    `;
}

window.toggleUserMenu = function() {
    const d = document.getElementById('user-dropdown');
    if(d) d.classList.toggle('active');
};

/**
 * Start a new chat session
 */
function startNewChat(initialQuery = null) {

    currentSessionId = Date.now().toString();
    currentHistory = [];
    const isReturningUser = sessions.length > 0 && currentUser;

    // Determine greeting based on time of day
    const hour = new Date().getHours();
    const greeting = (hour >= 18 || hour < 5) ? "Bonsoir" : "Bonjour";

    messagesInner.innerHTML = `
        <div class="empty-chat-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary); margin-bottom: 20px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <h2>${isReturningUser
            ? `${greeting}! heureux de vous revoir, comment pouvons-nous vous aider aujourd'hui ?`
            : "Démarrer votre première conversation avec notre assistant virtuel d'immigration Canada."}</h2>
            <p style="color: var(--neutral-500); margin-top: 12px;">
                ${isReturningUser
            ? "Posez votre question ci-dessous pour continuer nos échanges."
            : "Posez vos questions sur Entrée express, Mobilité francophone, Preuve de fonds..."}
            </p>
        </div>
    `;

    if (initialQuery) {
        chatInput.value = initialQuery;
        handleChatSubmit(new Event('submit'));
    }

    // Ensure sidebar closes on mobile correctly (including backdrop)
    if (typeof window.closeSidebarMobile === 'function') {
        window.closeSidebarMobile();
    } else {
        const toggle = document.getElementById('sidebar');
        if (toggle) toggle.classList.remove('open');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) backdrop.classList.remove('active');
    }
}

/**
 * Handle message submission
 */
async function handleChatSubmit(e) {
    if (e) e.preventDefault();

    const message = chatInput.value.trim();
    if (!message || sendButton.disabled) return;

    // Guest question limit check
    if (!currentUser && guestQuestionCount >= GUEST_QUESTION_LIMIT) {
        document.getElementById('limit-modal-overlay').classList.add('open');
        return;
    }

    // If no current session, start one
    if (!currentSessionId) {
        currentSessionId = Date.now().toString();
    }

    // Prepare Document context
    let messageToSend = message;
    let uiMessage = message;

    if (pendingDocumentText) {
        // Enclose document in prompt
        messageToSend = `[DOCUMENT JOINT PAR L'UTILISATEUR: ${pendingDocumentName}]\n${pendingDocumentText}\n\n[QUESTION DE L'UTILISATEUR]\n${message}`;
        uiMessage = `📎 **${pendingDocumentName}**\n\n${message}`;
    }

    // Update UI
    chatInput.value = '';
    chatInput.style.height = 'auto';
    const inputContainer = document.querySelector('.chat-input-box');
    if (inputContainer) inputContainer.classList.remove('is-multiline');

    // Remove the startup "empty state" banner when the first message is sent
    if (currentHistory.length === 0) {
        messagesInner.innerHTML = '';
    }

    addMessageToUI('user', uiMessage);

    // Update data (store the simple UI message to save history space, we don't store full document long-term)
    currentHistory.push({ role: 'user', content: uiMessage });

    // Save session locally FIRST so DB script finds it
    if (currentHistory.length === 1) {
        saveSession(uiMessage);
    } else {
        saveSession();
    }
    
    saveMessageToDB('user', uiMessage); // SYNC DB

    // Clear document state
    const docTextBeingSent = pendingDocumentText;
    removeAttachedFile();

    toggleLoading(true);

    // Capture the current session ID to track if the user switches/deletes it during the wait
    const activeSessionIdAtSubmit = currentSessionId;

    try {
        // We pass messageToSend which contains the full doc, but keep currentHistory as is
        const aiData = await getAIResponse(messageToSend, currentHistory);

        // If the user navigated away from or deleted this session while AI was thinking, abort saving
        if (currentSessionId !== activeSessionIdAtSubmit) {
            return;
        }

        // Update UI
        addMessageToUI('assistant', aiData.reply);

        // Render suggestion chips if available
        if (aiData.suggestions && aiData.suggestions.length > 0) {
            renderSuggestions(aiData.suggestions);
        }

        // Update data
        currentHistory.push({ role: 'assistant', content: aiData.reply });
        saveMessageToDB('assistant', aiData.reply); // SYNC DB

        // Update local session history
        saveSession();

        // Increment guest question counter
        if (!currentUser) {
            guestQuestionCount++;
            localStorage.setItem('allo_canada_guest_questions', guestQuestionCount.toString());
            updateGuestLimitUI();

            // Trigger modal proactively after 5th response
            if (guestQuestionCount >= GUEST_QUESTION_LIMIT) {
                setTimeout(() => {
                    document.getElementById('limit-modal-overlay').classList.add('open');
                }, 1500); // Small delay so they can read the last message first
            }
        }

    } catch (error) {
        if (currentSessionId === activeSessionIdAtSubmit) {
            console.error("Erreur chat:", error);
            const displayError = error.message || "Une erreur est survenue.";
            addMessageToUI('assistant', `${displayError}. Veuillez réessayer ou vérifier votre connexion.`);
        }
    } finally {
        if (currentSessionId === activeSessionIdAtSubmit) {
            toggleLoading(false);
        }
    }
}

/**
 * Handle document attachments
 */
const fileInput = document.getElementById('file-upload-input');
const fileIndicator = document.getElementById('file-indicator');
const fileNameDisplay = document.getElementById('file-name-display');

if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        pendingDocumentName = file.name;
        fileNameDisplay.textContent = 'Extraction en cours...';
        fileIndicator.classList.add('active');

        try {
            if (file.type === 'application/pdf') {
                pendingDocumentText = await extractTextFromPDF(file);
            } else if (file.name.endsWith('.txt')) {
                pendingDocumentText = await file.text();
            } else {
                throw new Error("Format non supporté. Veuillez utiliser PDF ou TXT.");
            }
            fileNameDisplay.textContent = pendingDocumentName;
        } catch (error) {
            console.error(error);
            alert("Erreur: " + error.message);
            removeAttachedFile();
        }
    });
}

function removeAttachedFile() {
    pendingDocumentText = null;
    pendingDocumentName = null;
    if (fileIndicator) fileIndicator.classList.remove('active');
    if (fileInput) fileInput.value = '';
}

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    // Limit to 10 pages to avoid overwhelming the prompt
    const maxPages = Math.min(pdf.numPages, 10);
    for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\\n';
    }
    return fullText;
}

/**
 * Save current session to LocalStorage
 */
function saveSession(firstMessage = null) {
    const sessionIndex = sessions.findIndex(s => s.id === currentSessionId);
    let existingSession = sessionIndex > -1 ? sessions[sessionIndex] : null;

    let title = existingSession ? existingSession.title : "Discussion";
    
    if (!existingSession && firstMessage) {
        const sanitizedTitle = firstMessage.replace(/[\n\r]/g, ' ').trim();
        title = sanitizedTitle.substring(0, 30) + (sanitizedTitle.length > 30 ? '...' : '');
    }

    const sessionData = {
        id: currentSessionId,
        title: title,
        history: currentHistory,
        updatedAt: new Date().toISOString(),
        dbId: existingSession ? existingSession.dbId : undefined
    };

    if (existingSession) {
        sessions[sessionIndex] = sessionData;
    } else {
        sessions.unshift(sessionData);
    }

    localStorage.setItem('allo_canada_sessions', JSON.stringify(sessions));
    renderSessions();
}

/**
 * Load a specific session
 */
function loadSession(id) {
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    currentSessionId = id;
    currentHistory = session.history;

    // Clear and render history
    messagesInner.innerHTML = '';
    currentHistory.forEach(msg => {
        addMessageToUI(msg.role, msg.content, false); // false = don't animate old messages
    });

    renderSessions();
    
    // Ensure sidebar closes on mobile correctly (including backdrop)
    if (typeof window.closeSidebarMobile === 'function') {
        window.closeSidebarMobile();
    } else {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) backdrop.classList.remove('active');
    }
}

/**
 * Render sidebar sessions list
 */
function renderSessions() {
    sessionsList.innerHTML = '';

    // Privacy: If not logged in, sessions list must be empty as per user requirement
    if (!currentUser) {
        sessionsList.innerHTML = `
            <div class="session-item active">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>Nouvelle discussion</span>
            </div>`;
        return;
    }

    // New Chat placeholder if empty
    if (sessions.length === 0) {
        sessionsList.innerHTML = `
            <div class="session-item active">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>Nouvelle discussion</span>
            </div>`;
        return;
    }

    sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = `session-item ${session.id === currentSessionId ? 'active' : ''}`;
        item.dataset.id = session.id;
        
        item.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis">${session.title}</span>
            <button class="session-options-btn" title="Options">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
            <div class="session-dropdown" id="dropdown-${session.id}">
                <button class="dropdown-item" data-action="rename">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Renommer
                </button>
                <button class="dropdown-item" data-action="copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copier le texte
                </button>
                <button class="dropdown-item" data-action="export-word">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    Exporter en Word
                </button>
                <button class="dropdown-item" data-action="export-pdf">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>
                    Exporter en PDF
                </button>
                <button class="dropdown-item danger" data-action="delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Supprimer
                </button>
            </div>
        `;

        sessionsList.appendChild(item);
    });
}

// Event Delegation for Sessions List
if (sessionsList) {
    sessionsList.onclick = (e) => {
        const item = e.target.closest('.session-item');
        if (!item) return;

        const id = item.dataset.id;
        const session = sessions.find(s => s.id === id);

        // Options Button
        if (e.target.closest('.session-options-btn')) {
            e.stopPropagation();
            toggleSessionMenu(id);
            return;
        }

        // Dropdown Items
        const actionBtn = e.target.closest('.dropdown-item');
        if (actionBtn) {
            e.stopPropagation();
            const action = actionBtn.dataset.action;
            if (action === 'rename') openRenameModal(id, session.title);
            if (action === 'copy') copySession(id);
            if (action === 'export-word') exportSessionToWord(id);
            if (action === 'export-pdf') exportSessionToPDF(id);
            if (action === 'delete') deleteSession(id);
            return;
        }

        // Just clicking the item loads the session
        if (id !== currentSessionId) loadSession(id);
    };
}

/**
 * Toggle session options menu
 */
function toggleSessionMenu(id) {
    // Close other menus
    document.querySelectorAll('.session-dropdown').forEach(d => {
        if (d.id !== `dropdown-${id}`) d.classList.remove('active');
    });

    const dropdown = document.getElementById(`dropdown-${id}`);
    if (dropdown) dropdown.classList.toggle('active');
}

/**
 * Rename a session
 */
function openRenameModal(id, currentTitle) {
    const overlay = document.getElementById('rename-modal-overlay');
    const input = document.getElementById('rename-input');
    const cancelBtn = document.getElementById('rename-cancel');
    const confirmBtn = document.getElementById('rename-confirm');

    input.value = currentTitle;
    overlay.classList.add('open');
    input.focus();

    const cleanup = () => {
        overlay.classList.remove('open');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', cleanup);
    };

    const onConfirm = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
            const index = sessions.findIndex(s => s.id === id);
            if (index > -1) {
                const oldTitle = sessions[index].title;
                sessions[index].title = newTitle;
                localStorage.setItem('allo_canada_sessions', JSON.stringify(sessions));
                renderSessions();
                showToast("Discussion renommée");

                // Sync to DB if available
                if (currentUser && sessions[index].dbId && dbClient) {
                    dbClient
                        .from('conversations')
                        .update({ session_id: newTitle }) // We use session_id as title in DB
                        .eq('id', sessions[index].dbId)
                        .then(({ error }) => {
                            if (error) {
                                console.error("Rename sync error:", error);
                                showToast("Erreur de synchronisation (Renommage)", true);
                                // Optional: revert UI if critical, but toast is enough for now
                            }
                        });
                }
            }
        }
        cleanup();
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', cleanup);

    // Handle Enter key
    input.onkeydown = (e) => {
        if (e.key === 'Enter') onConfirm();
        if (e.key === 'Escape') cleanup();
    };
}

/**
 * Copy session text to clipboard
 */
async function copySession(id) {
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    const text = session.history.map(m => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.content}`).join('\n\n');

    try {
        await navigator.clipboard.writeText(text);
        showToast("Discussion copiée !");
    } catch (e) {
        console.error("Erreur copie:", e);
    }
}

/**
 * Export session to Word-compatible HTML file (.doc)
 */
async function exportSessionToWord(id) {
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    const exportDate = new Date().toLocaleDateString('fr-FR', { 
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    // Word XML / HTML Header with improved CSS
    const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>${session.title}</title>
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
                body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1F2937; padding: 40pt; }
                .header-section { text-align: center; border-bottom: 3pt solid #E02424; padding-bottom: 20pt; margin-bottom: 40pt; }
                .brand-title { font-size: 32pt; font-weight: bold; color: #E02424; margin-bottom: 5pt; }
                .brand-subtitle { font-size: 12pt; color: #6B7280; font-style: italic; }
                .doc-info { font-size: 10pt; color: #9CA3AF; margin-top: 15pt; }
                
                .message-container { margin-bottom: 35pt; page-break-inside: avoid; }
                .bubble-wrap { padding: 15pt; border-radius: 10pt; }
                .user-style { border-left: 5pt solid #1A56DB; background-color: #ffffff; }
                .assistant-style { background-color: #F9FAFB; border-left: 5pt solid #10A37F; }
                
                .role-label { font-size: 9pt; font-weight: bold; margin-bottom: 8pt; display: block; text-transform: uppercase; letter-spacing: 1.5pt; }
                .label-user { color: #1A56DB; }
                .label-assistant { color: #10A37F; }
                
                .text-content { font-size: 12pt; color: #374151; }
                .text-content p { margin: 8pt 0; }
                
                table { border-collapse: collapse; width: 100%; margin: 20pt 0; border: 1pt solid #E5E7EB; }
                th { background-color: #E02424; color: #ffffff; padding: 12pt; text-align: left; font-size: 11pt; border: 1pt solid #E02424; }
                td { padding: 10pt; border: 1pt solid #E5E7EB; font-size: 10.5pt; vertical-align: top; }
                tr:nth-child(even) { background-color: #F3F4F6; }
                
                .footer-section { margin-top: 60pt; font-size: 10pt; color: #9CA3AF; text-align: center; border-top: 1pt solid #E5E7EB; padding-top: 25pt; }
                .notice { font-size: 9pt; color: #6B7280; margin-top: 10pt; }
            </style>
        </head>
        <body>
            <div class='header-section'>
                <div class='brand-title'>ALLO CANADA</div>
                <div class='brand-subtitle'>Votre Assistant Expert en Immigration</div>
                <div class='doc-info'>
                    Compte-rendu de consultation : <strong>${session.title}</strong><br>
                    Généré le ${exportDate}
                </div>
            </div>
    `;

    let body = "";
    session.history.forEach(m => {
        const isUser = m.role === 'user';
        const roleLabel = isUser ? 'VOTRE QUESTION' : 'RÉPONSE D\'ALLO CANADA';
        const boxClass = isUser ? 'user-style' : 'assistant-style';
        const labelClass = isUser ? 'label-user' : 'label-assistant';
        
        let htmlContent = formatText(m.content);
        
        body += `
            <div class='message-container'>
                <div class='bubble-wrap ${boxClass}'>
                    <div class='role-label ${labelClass}'>${roleLabel}</div>
                    <div class='text-content'>${htmlContent}</div>
                </div>
            </div>
        `;
    });

    const footer = `
            <div class='footer-section'>
                Document officiel généré par la plateforme Allo Canada (www.allocanada.ca)<br>
                <div class='notice'>
                    <strong>Avertissement :</strong> Ce document est fourni à titre informatif. Seules les informations publiées sur Canada.ca ou communiquées officiellement par l'IRCC font foi en matière d'immigration.
                </div>
            </div>
        </body>
        </html>
    `;

    const fullHtml = header + body + footer;
    
    // Create Blob and Trigger Download
    const blob = new Blob(['\ufeff', fullHtml], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Consultation-AlloCanada-${session.title.replace(/\s+/g, '-')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Document Word généré avec succès");
}

/**
 * Export session to nice PDF using an iframe standard print method
 */
function exportSessionToPDF(id) {
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    const exportDate = new Date().toLocaleDateString('fr-FR', { 
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const header = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <title>${session.title}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1F2937; padding: 20px; }
                .header-section { text-align: center; border-bottom: 2px solid #E02424; padding-bottom: 20px; margin-bottom: 30px; }
                .brand-title { font-size: 24px; font-weight: 800; color: #E02424; margin-bottom: 5px; }
                .brand-subtitle { font-size: 14px; color: #6B7280; font-style: italic; }
                .doc-info { font-size: 12px; color: #9CA3AF; margin-top: 10px; }
                
                .message-container { margin-bottom: 25px; page-break-inside: avoid; }
                .bubble-wrap { padding: 15px; border-radius: 8px; border: 1px solid #E5E7EB; }
                .user-style { border-left: 4px solid #1A56DB; background-color: #ffffff; }
                .assistant-style { background-color: #F9FAFB; border-left: 4px solid #10A37F; }
                
                .role-label { font-size: 11px; font-weight: 700; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 1px; }
                .label-user { color: #1A56DB; }
                .label-assistant { color: #10A37F; }
                
                .text-content { font-size: 14px; color: #374151; }
                .text-content p { margin: 8px 0; }
                
                table { border-collapse: collapse; width: 100%; margin: 15px 0; border: 1px solid #E5E7EB; }
                th { background-color: #E02424; color: #ffffff; padding: 10px; text-align: left; font-size: 13px; }
                td { padding: 10px; border: 1px solid #E5E7EB; font-size: 13px; vertical-align: top; }
                tr:nth-child(even) { background-color: #F3F4F6; }
                
                .footer-section { margin-top: 50px; font-size: 12px; color: #9CA3AF; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 20px; }
                .notice { font-size: 11px; color: #6B7280; margin-top: 8px; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div class='header-section'>
                <div class='brand-title'>ALLO CANADA</div>
                <div class='brand-subtitle'>Votre Assistant Expert en Immigration</div>
                <div class='doc-info'>
                    Compte-rendu de consultation : <strong>${session.title}</strong><br>
                    Généré le ${exportDate}
                </div>
            </div>
    `;

    let body = "";
    session.history.forEach(m => {
        const isUser = m.role === 'user';
        const roleLabel = isUser ? 'VOTRE QUESTION' : "RÉPONSE D'ALLO CANADA";
        const boxClass = isUser ? 'user-style' : 'assistant-style';
        const labelClass = isUser ? 'label-user' : 'label-assistant';
        
        let htmlContent = formatText(m.content);
        
        body += `
            <div class='message-container'>
                <div class='bubble-wrap ${boxClass}'>
                    <div class='role-label ${labelClass}'>${roleLabel}</div>
                    <div class='text-content'>${htmlContent}</div>
                </div>
            </div>
        `;
    });

    const footer = `
            <div class='footer-section'>
                Document officiel généré par la plateforme Allo Canada (www.allocanada.ca)<br>
                <div class='notice'>
                    <strong>Avertissement :</strong> Ce document est fourni à titre informatif. Seules les informations publiées sur Canada.ca ou communiquées officiellement par l'IRCC font foi en matière d'immigration.
                </div>
            </div>
        </body>
        </html>
    `;

    const fullHtml = header + body + footer;
    
    showToast("Préparation du PDF...");
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(fullHtml);
    doc.close();
    
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
}


/**
 * Merge local guest sessions into Supabase account after login
 */
async function mergeGuestSessions() {
    if (!currentUser) return;

    // Find sessions in localStorage that aren't on DB yet
    const localSessions = JSON.parse(localStorage.getItem('allo_canada_sessions')) || [];
    const guestSessions = localSessions.filter(s => !s.dbId);

    if (guestSessions.length === 0) return;

    console.log(`Merging ${guestSessions.length} guest sessions to account...`);

    for (const session of guestSessions) {
        try {
            // 1. Create conversation
            const { data: conv, error: convError } = await dbClient
                .from('conversations')
                .insert([{
                    user_id: currentUser.id,
                    session_id: session.title || session.id
                }])
                .select()
                .single();

            if (convError) throw convError;

            // 2. Insert all messages for this session
            if (session.history && session.history.length > 0) {
                const msgsToInsert = session.history.map(m => ({
                    conversation_id: conv.id,
                    role: m.role,
                    content: m.content
                }));

                const { error: msgsError } = await dbClient
                    .from('messages')
                    .insert(msgsToInsert);

                if (msgsError) throw msgsError;
            }

            // Mark as synced locally so we don't re-upload
            session.dbId = conv.id;
        } catch (e) {
            console.error("Migration error for session:", e);
        }
    }

    // Update localStorage with the new dbIds
    localStorage.setItem('allo_canada_sessions', JSON.stringify(localSessions));
}

/**
 * Fetch all sessions for current user from Supabase
 */
async function fetchUserSessions() {
    if (!currentUser) return;

    try {
        // Fetch everything in ONE single request using a join
        const { data: convs, error: convError } = await dbClient
            .from('conversations')
            .select('*, messages(*)')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .order('created_at', { foreignTable: 'messages', ascending: true });

        if (convError) throw convError;
        if (!convs) return;

        const newSessions = convs.map(conv => {
            const msgs = conv.messages || [];
            
            // Local fallback logic for title
            const firstMsgContent = msgs[0]?.content || 'Discussion';
            const sanitizedTitle = firstMsgContent.replace(/[\n\r]/g, ' ').trim();
            const fallbackTitle = sanitizedTitle.substring(0, 30) + (sanitizedTitle.length > 30 ? '...' : '');
            
            let displayTitle = conv.session_id;
            if (/^\d{13}$/.test(conv.session_id)) {
                displayTitle = fallbackTitle; 
            } else if (conv.session_id.length > 30) {
                displayTitle = conv.session_id.substring(0, 30) + '...';
            }
            
            return {
                id: conv.session_id,
                dbId: conv.id,
                title: displayTitle,
                history: msgs.map(m => ({ role: m.role, content: m.content }))
            };
        });

        sessions = newSessions;
        localStorage.setItem('allo_canada_sessions', JSON.stringify(sessions));
        renderSessions();
        console.log(`Sync successful: ${sessions.length} sessions loaded (Optimized).`);
    } catch (e) {
        console.error("Critical error fetching sessions:", e);
        showToast("Erreur de synchronisation historique");
    }
}

/**
 * Save current message to DB
 */
async function saveMessageToDB(role, content) {
    if (!currentUser) return;

    // Find or create conversation in DB
    let session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;

    try {
        // 1. Ensure conversation exists in DB
        if (!session.dbId && dbClient) {
            const { data: conv, error: convError } = await dbClient
                .from('conversations')
                .insert([{
                    user_id: currentUser.id,
                    session_id: currentSessionId
                }])
                .select()
                .single();

            if (convError) throw convError;
            session.dbId = conv.id;
            // Update local state with DB ID
            localStorage.setItem('allo_canada_sessions', JSON.stringify(sessions));
        }

        // 2. Insert message
        if (dbClient) {
            const { error: msgError } = await dbClient
                .from('messages')
                .insert([{
                    conversation_id: session.dbId,
                    role: role,
                    content: content
                }]);

            if (msgError) throw msgError;
        }
    } catch (e) {
        console.error("DB Sync Error:", e);
    }
}

/**
 * Show toast notification
 */
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 2000);
}

/**
 * Custom modern confirmation modal
 */
function showCustomConfirm() {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirm-modal-overlay');
        const cancelBtn = document.getElementById('msg-confirm-cancel');
        const proceedBtn = document.getElementById('msg-confirm-proceed');

        overlay.classList.add('open');

        const cleanup = (value) => {
            overlay.classList.remove('open');
            cancelBtn.removeEventListener('click', onCancel);
            proceedBtn.removeEventListener('click', onProceed);
            resolve(value);
        };

        const onCancel = () => cleanup(false);
        const onProceed = () => cleanup(true);

        cancelBtn.addEventListener('click', onCancel);
        proceedBtn.addEventListener('click', onProceed);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) onCancel();
        });
    });
}

/**
 * Delete a session
 */
async function deleteSession(id) {
    const confirmed = await showCustomConfirm();
    if (!confirmed) return;

    try {
        const sessionToDelete = sessions.find(s => s.id === id);

        // 1. Delete from Supabase if logged in
        if (currentUser && sessionToDelete && sessionToDelete.dbId && dbClient) {
            const { error } = await dbClient
                .from('conversations')
                .delete()
                .eq('id', sessionToDelete.dbId);
            
            if (error) {
                console.error("Supabase delete error:", error);
                showToast("Erreur : Impossible de supprimer sur le serveur", true);
                return; // Stop here if DB delete failed
            }
        }

        // 2. Remove from LocalStorage (Only if DB succeeded or guest)
        sessions = sessions.filter(s => s.id !== id);
        localStorage.setItem('allo_canada_sessions', JSON.stringify(sessions));

        // 3. Reset UI immediately
        if (currentSessionId === id) {
            startNewChat();
        } else {
            renderSessions();
        }
        showToast("Discussion supprimée");
    } catch (e) {
        console.error("Delete logic error:", e);
        showToast("Une erreur est survenue lors de la suppression", true);
    }
}


/**
 * Update UI for guest question limit
 */
function updateGuestLimitUI() {
    const limitInfo = document.getElementById('guest-limit-info');
    const remainingCountSpan = document.getElementById('guest-remaining-count');

    if (!limitInfo || !remainingCountSpan) return;

    if (!currentUser) {
        const remaining = Math.max(0, GUEST_QUESTION_LIMIT - guestQuestionCount);
        remainingCountSpan.textContent = remaining;
        limitInfo.style.display = 'block';

        if (remaining === 0) {
            limitInfo.innerHTML = "Limite de questions atteinte. <span style='text-decoration:underline; cursor:pointer' onclick='window.location.href=\"signup.html\"'>Créez un compte</span> pour continuer.";
        }
    } else {
        limitInfo.style.display = 'none';
        // Ensure modal is closed if user is logged in
        const limitModal = document.getElementById('limit-modal-overlay');
        if (limitModal) limitModal.classList.remove('open');
    }
}

function addMessageToUI(role, text, animate = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    if (!animate) messageDiv.style.animation = 'none';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? 'U' : 'AC';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = formatText(text);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);

    if (role === 'assistant') {
        const source = document.createElement('div');
        source.className = 'source-tag';
        source.innerHTML = `Source : <a href="https://www.canada.ca" target="_blank" style="color:inherit; text-decoration:underline">Canada.ca / IRCC</a>`;
        bubble.appendChild(source);
    }

    messagesInner.appendChild(messageDiv);

    // Smooth scroll logic
    if (role === 'user') {
        // For user messages, scroll to bottom to see the prompt
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        // For assistant messages, scroll to the START of the message bubble
        // so the user can read from the beginning without manual scrolling
        setTimeout(() => {
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);

        // Scan for tables and add export buttons
        const tables = bubble.querySelectorAll('table');
        tables.forEach((table, index) => {
            const container = document.createElement('div');
            container.className = 'export-container';
            
            const btn = document.createElement('button');
            btn.className = 'btn-export-table';
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exporter (CSV)
            `;
            btn.onclick = () => exportTableToCSV(table, `tableau-allo-canada-${index + 1}.csv`);
            
            container.appendChild(btn);
            table.parentNode.insertBefore(container, table);
        });

        // --- CV Detection: add download button if this looks like a CV ---
        const cvKeywords = ['expérience professionnelle', 'formation', 'compétences', 'profil professionnel', 'langues'];
        const lowerText = text.toLowerCase();
        const matchCount = cvKeywords.filter(kw => lowerText.includes(kw)).length;
        
        if (matchCount >= 3) {
            const cvBtnContainer = document.createElement('div');
            cvBtnContainer.className = 'cv-download-container';
            cvBtnContainer.innerHTML = `
                <button class="btn-download-cv" onclick="exportCVToWord(this)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                    Télécharger le CV (Word)
                </button>
            `;
            // Store raw markdown content on the button for export
            cvBtnContainer.querySelector('.btn-download-cv').dataset.cvContent = text;
            bubble.appendChild(cvBtnContainer);
        }
    }
}

/**
 * Export a CV message as a clean Word document (no Allo Canada branding)
 */
window.exportCVToWord = function(btnElement) {
    const rawContent = btnElement.dataset.cvContent;
    if (!rawContent) return;

    const htmlContent = formatText(rawContent);

    const fullHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>CV</title>
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
                @page {
                    margin: 2.5cm 2cm;
                }
                body {
                    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
                    font-size: 11pt;
                    line-height: 1.5;
                    color: #1F2937;
                    margin: 0;
                    padding: 0;
                }
                h1 {
                    font-size: 22pt;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 4pt;
                    border-bottom: 2pt solid #374151;
                    padding-bottom: 8pt;
                }
                h2 {
                    font-size: 13pt;
                    font-weight: 700;
                    color: #1F2937;
                    text-transform: uppercase;
                    letter-spacing: 1pt;
                    border-bottom: 1pt solid #D1D5DB;
                    padding-bottom: 4pt;
                    margin-top: 18pt;
                    margin-bottom: 8pt;
                }
                h3 {
                    font-size: 11.5pt;
                    font-weight: 700;
                    color: #374151;
                    margin-bottom: 2pt;
                    margin-top: 10pt;
                }
                p {
                    margin: 4pt 0;
                    color: #374151;
                }
                ul {
                    margin: 4pt 0 8pt 18pt;
                    padding: 0;
                }
                li {
                    margin-bottom: 3pt;
                    color: #4B5563;
                }
                strong {
                    color: #111827;
                }
                em {
                    color: #6B7280;
                    font-style: italic;
                }
                a {
                    color: #2563EB;
                    text-decoration: none;
                }
                hr {
                    border: none;
                    border-top: 1pt solid #E5E7EB;
                    margin: 12pt 0;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 10pt 0;
                }
                th, td {
                    padding: 6pt 10pt;
                    border: 1pt solid #D1D5DB;
                    font-size: 10.5pt;
                    text-align: left;
                }
                th {
                    background-color: #F3F4F6;
                    font-weight: 700;
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'CV-Canadien.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("CV téléchargé avec succès");
};

/**
 * Format markdown-like text
 */
function formatText(text) {
    if (!text) return '';

    // Typographie française : espaces insécables avant la ponctuation double
    let processedText = text.replace(/([a-zA-ZéèàùçîïâäöôûüÉÈÀÙÇÎÏÂÄÖÔÛÜ0-9]) ([!?:;])/g, '$1&nbsp;$2');

    if (typeof marked !== 'undefined') {
        let parsed = marked.parse(processedText);
        parsed = parsed.replace(/<a href=/g, '<a target="_blank" class="chat-link" href=');
        return parsed;
    }

    // Fallback if marked is not available
    let formatted = processedText
        .replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, '<a href="$2" target="_blank" class="chat-link">$1</a>')
        .replace(/(?<!href=")(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" class="chat-link">$1</a>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/- (.*?)(<br>|$)/g, '• $1$2');

    return formatted;
}

/**
 * Toggle loading state
 */
function toggleLoading(isLoading) {
    sendButton.disabled = isLoading;
    if (isLoading) {
        const typing = document.createElement('div');
        typing.className = 'message assistant';
        typing.id = 'typing-indicator';
        typing.innerHTML = `
            <div class="avatar">AC</div>
            <div class="bubble">
                <div class="thinking-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        messagesInner.appendChild(typing);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }
}

/**
 * AI Response from Supabase Edge Function
 */
async function getAIResponse(message, history) {
    try {
        const { data: { user } } = await dbClient.auth.getUser(); // Ensure fresh user state

        const response = await fetch(`https://cmgzoojrbqpnxmadwkdx.supabase.co/functions/v1/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZ3pvb2pyYnFwbnhtYWR3a2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDAyMjUsImV4cCI6MjA5MTUxNjIyNX0.aqZTo_81TM_9aFEWKtRCZWsRAD33T08ENLtLg0XqdUU`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                history: history,
                conversation_id: currentSessionId,
                user_id: user ? user.id : null
            })
        });

        if (!response.ok) {
            let errorMsg = 'Erreur réseau';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Not JSON, use default or status text
                errorMsg = response.statusText || errorMsg;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        
        if (!data || typeof data.reply === 'undefined') {
            throw new Error("La réponse de l'IA est vide ou malformée.");
        }

        return { 
            reply: data.reply, 
            suggestions: data.suggestions || [] 
        };

    } catch (error) {
        console.error("Erreur de récupération de l'IA:", error);
        throw error;
    }
}

/**
 * Render suggestion chips after AI response
 */
function renderSuggestions(suggestions) {
    // Remove any existing suggestion chips
    const existing = document.querySelector('.suggestions-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.className = 'suggestions-container';

    suggestions.forEach(text => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip';
        chip.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span>${text}</span>
        `;
        chip.onclick = () => {
            // Remove all suggestion chips before submitting
            container.remove();
            // Fill the input and submit
            chatInput.value = text;
            handleChatSubmit(new Event('submit'));
        };
        container.appendChild(chip);
    });

    messagesInner.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Utility to export an HTML table to CSV
 */
function exportTableToCSV(tableElement, filename) {
    let csv = [];
    const rows = tableElement.querySelectorAll("tr");
    
    for (let i = 0; i < rows.length; i++) {
        const rowData = [];
        const cols = rows[i].querySelectorAll("td, th");
        
        if (cols.length === 0) continue; // Skip empty rows

        for (let j = 0; j < cols.length; j++) {
            // Clean text: remove newlines, double spaces, and escape quotes
            let data = cols[j].innerText
                .replace(/(\r\n|\n|\r)/gm, " ")
                .replace(/\s+/g, " ")
                .trim();
            
            // CSV Escape quotes
            data = data.replace(/"/g, '""');
            // Wrap in quotes
            rowData.push('"' + data + '"');
        }
        csv.push(rowData.join(","));
    }

    const csv_string = csv.join("\n");
    // BOM for Excel (UTF-8 encoding)
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv_string], { type: "text/csv;charset=utf-8;" });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}



/**
 * Fetch and display the latest Express Entry draw alert from official IRCC API
 */
async function initExpressEntryAlert() {
    if (!currentUser) return;

    try {
        // Fetch directly from official Canada.ca JSON endpoint
        const response = await fetch('https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_fr.json');
        
        if (!response.ok) throw new Error("HTTP " + response.status);
        
        const data = await response.json();
        
        if (data && data.rounds && data.rounds.length > 0) {
            const latestRound = data.rounds[0];
            const drawId = latestRound.drawNumber;
            
            // Check if user has already closed this specific alert
            if (localStorage.getItem('seen_draw_' + drawId)) return;

            const drawDate = new Date(latestRound.drawDate);
            const now = new Date();
            const diffDays = Math.ceil(Math.abs(now - drawDate) / (1000 * 60 * 60 * 24));
            
            // Only show if the draw is within 5 days
            if (diffDays <= 5) {
                const container = document.getElementById('live-alert-container');
                if (!container) return;

                // Simple White HTML Structure (As per user request)
                container.innerHTML = `
                    <div class="live-alert-banner">
                        <div class="alert-toast-body">
                            <div class="alert-toast-icon">✨</div>
                            <div class="alert-content">
                                <span class="alert-toast-title">Nouveau Tirage • ${latestRound.drawDateFull || latestRound.drawDate}</span>
                                <p class="alert-toast-desc">${latestRound.drawName} • Min: <strong>${latestRound.drawCRS}</strong> CRS</p>
                                <a href="https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/rondes-invitations.html" target="_blank" rel="noopener noreferrer" class="alert-toast-link">Voir les détails officiels →</a>
                            </div>
                            <button onclick="closeEntryAlert('${drawId}')" class="btn-close-alert" title="Fermer">✕</button>
                        </div>
                    </div>
                `;
                container.style.display = 'block';
            }
        }
    } catch (err) {
        console.error("Error fetching latest official IRCC draw:", err);
    }
}

// Global function to close and hide
window.closeEntryAlert = (drawId) => {
    if (drawId) localStorage.setItem('seen_draw_' + drawId, 'true');
    const banner = document.querySelector('.live-alert-banner');
    if (banner) {
        banner.classList.add('hiding');
        setTimeout(() => {
            const container = document.getElementById('live-alert-container');
            if (container) container.style.display = 'none';
        }, 400);
    }
};

/**
 * Presence Logic for Live Monitoring (Sync with Admin Map)
 */
function initPresence() {
    if (!currentUser) return;
    
    // Extract country and name from metadata
    const country = currentUser.user_metadata?.country || "Inconnu";
    const fullName = currentUser.user_metadata?.full_name || currentUser.email;
    
    const channel = dbClient.channel('online-users');
    
    channel
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: currentUser.id,
                    full_name: fullName,
                    country: country,
                    online_at: new Date().toISOString(),
                });
            }
        });
}

// Global exports for HTML event handlers
window.handleChatSubmit = handleChatSubmit;
window.removeAttachedFile = removeAttachedFile;
window.startNewChat = startNewChat;

// Initial Run
init();
