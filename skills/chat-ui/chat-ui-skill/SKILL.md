---
name: chat-ui
description: >
  Interface de chat complète et soignée pour applications web. Utilise ce skill dès que
  l'utilisateur veut construire, améliorer ou styler une interface de chat : bulles
  utilisateur/assistant, typing indicator, scroll automatique, états vides, gestion des
  erreurs, historique de conversation, avatars, timestamps, UX mobile optimisée.
  Déclenche aussi pour tout composant de messagerie, chatbot frontend, assistant IA embarqué,
  ou toute interface conversationnelle — même si l'utilisateur dit juste "faire le chat"
  ou "ajouter le chatbot". Couvre HTML/CSS/JS vanilla et les variantes React/Tailwind.
---

# Chat UI — Interface de conversation

## Philosophie de design

Une bonne interface de chat est **invisible** : l'utilisateur pense à sa question, pas à l'UI.
- Épurée : aucun élément superflu, seuls les messages comptent
- Réactive : feedback immédiat à chaque action (envoi, chargement, erreur)
- Mobile-first : optimisée pour le pouce, grand champ de saisie accessible
- Accessible : navigation clavier, contrastes corrects, focus visible

---

## Structure HTML de base

```html
<!-- index.html -->
<div class="chat-wrapper">

  <!-- Zone des messages -->
  <div class="chat-messages" id="chatMessages" role="log" aria-live="polite">
    <!-- État vide (affiché au démarrage) -->
    <div class="chat-empty" id="chatEmpty">
      <div class="chat-empty-icon">🍁</div>
      <h2>Bonjour ! Je suis votre assistant immigration Canada.</h2>
      <p>Posez-moi une question sur les visas, l'Entrée express, les études au Canada…</p>
    </div>
  </div>

  <!-- Barre de saisie -->
  <div class="chat-input-bar">
    <textarea
      id="userInput"
      placeholder="Posez votre question sur l'immigration Canada…"
      rows="1"
      aria-label="Votre message"
    ></textarea>
    <button id="sendBtn" aria-label="Envoyer">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    </button>
  </div>

</div>
```

---

## CSS complet

```css
/* ── Layout global ── */
.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 760px;
  margin: 0 auto;
  background: #F9FAFB;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Zone messages ── */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
}

/* ── État vide ── */
.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  padding: 40px 24px;
  color: #6B7280;
}
.chat-empty-icon { font-size: 48px; margin-bottom: 16px; }
.chat-empty h2  { font-size: 18px; font-weight: 600; color: #1F2937; margin: 0 0 8px; }
.chat-empty p   { font-size: 15px; margin: 0; line-height: 1.6; }

/* ── Bulles de message ── */
.message {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  max-width: 80%;
  animation: msgIn 0.25s ease-out both;
}
.message.user    { align-self: flex-end; flex-direction: row-reverse; }
.message.assistant { align-self: flex-start; }

@keyframes msgIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Avatar assistant */
.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1A56DB;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

/* Bulle */
.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.6;
  max-width: 100%;
  word-break: break-word;
}
.message.user .message-bubble {
  background: #1A56DB;
  color: white;
  border-bottom-right-radius: 4px;
}
.message.assistant .message-bubble {
  background: white;
  color: #1F2937;
  border: 1px solid #E5E7EB;
  border-bottom-left-radius: 4px;
}

/* Source badge sous la réponse assistant */
.message-source {
  font-size: 11px;
  color: #9CA3AF;
  margin-top: 4px;
  padding-left: 42px; /* aligner avec la bulle */
}
.message-source a { color: #1A56DB; text-decoration: none; }
.message-source a:hover { text-decoration: underline; }

/* ── Typing indicator ── */
.typing-indicator {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  align-self: flex-start;
  animation: msgIn 0.2s ease-out both;
}
.typing-dots {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  padding: 14px 18px;
  display: flex;
  gap: 5px;
  align-items: center;
}
.typing-dots span {
  width: 7px;
  height: 7px;
  background: #9CA3AF;
  border-radius: 50%;
  animation: bounce 1.2s infinite ease-in-out;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30%           { transform: translateY(-6px); }
}

/* ── Message d'erreur ── */
.message-error .message-bubble {
  background: #FEF2F2;
  border-color: #FECACA;
  color: #DC2626;
}

/* ── Barre de saisie ── */
.chat-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #E5E7EB;
}

.chat-input-bar textarea {
  flex: 1;
  resize: none;
  border: 1.5px solid #E5E7EB;
  border-radius: 22px;
  padding: 10px 16px;
  font-size: 15px;
  font-family: inherit;
  line-height: 1.5;
  max-height: 140px;
  overflow-y: auto;
  outline: none;
  transition: border-color 0.2s;
  background: #F9FAFB;
}
.chat-input-bar textarea:focus { border-color: #1A56DB; background: white; }
.chat-input-bar textarea::placeholder { color: #9CA3AF; }

.chat-input-bar button {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #1A56DB;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s, transform 0.1s;
}
.chat-input-bar button:hover   { background: #1648C0; }
.chat-input-bar button:active  { transform: scale(0.94); }
.chat-input-bar button:disabled { background: #D1D5DB; cursor: not-allowed; }

/* ── Responsive mobile ── */
@media (max-width: 480px) {
  .message { max-width: 92%; }
  .chat-messages { padding: 16px 12px; }
}
```

---

## JavaScript complet

```javascript
// chat.js
const messagesEl = document.getElementById('chatMessages')
const inputEl    = document.getElementById('userInput')
const sendBtn    = document.getElementById('sendBtn')
const emptyEl    = document.getElementById('chatEmpty')

let conversationHistory = []

/* ── Auto-resize du textarea ── */
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto'
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px'
})

/* ── Envoi avec Entrée (Shift+Entrée = saut de ligne) ── */
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
})
sendBtn.addEventListener('click', sendMessage)

/* ── Créer une bulle de message ── */
function createMessageEl(role, content) {
  const wrapper = document.createElement('div')
  wrapper.className = `message ${role}`

  if (role === 'assistant') {
    const avatar = document.createElement('div')
    avatar.className = 'message-avatar'
    avatar.textContent = 'AC'  // Allo Canada
    wrapper.appendChild(avatar)
  }

  const bubble = document.createElement('div')
  bubble.className = 'message-bubble'
  bubble.innerHTML = formatMessage(content)
  wrapper.appendChild(bubble)

  return wrapper
}

/* ── Formater le texte (markdown léger) ── */
function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n/g, '<br>')
}

/* ── Badge source Canada.ca ── */
function createSourceBadge() {
  const el = document.createElement('div')
  el.className = 'message-source'
  el.innerHTML = 'Source : <a href="https://www.canada.ca/fr/immigration-refugies-citoyennete.html" target="_blank">Canada.ca / IRCC</a>'
  return el
}

/* ── Typing indicator ── */
function showTyping() {
  const el = document.createElement('div')
  el.className = 'typing-indicator'
  el.id = 'typingIndicator'

  const avatar = document.createElement('div')
  avatar.className = 'message-avatar'
  avatar.textContent = 'AC'

  const dots = document.createElement('div')
  dots.className = 'typing-dots'
  dots.innerHTML = '<span></span><span></span><span></span>'

  el.appendChild(avatar)
  el.appendChild(dots)
  messagesEl.appendChild(el)
  scrollToBottom()
  return el
}
function hideTyping() {
  document.getElementById('typingIndicator')?.remove()
}

/* ── Scroll en bas ── */
function scrollToBottom() {
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' })
}

/* ── Envoi principal ── */
async function sendMessage() {
  const text = inputEl.value.trim()
  if (!text || sendBtn.disabled) return

  // Masquer l'état vide
  if (emptyEl) emptyEl.style.display = 'none'

  // Afficher le message utilisateur
  messagesEl.appendChild(createMessageEl('user', text))
  scrollToBottom()

  // Réinitialiser l'input
  inputEl.value = ''
  inputEl.style.height = 'auto'
  sendBtn.disabled = true

  // Ajouter à l'historique
  conversationHistory.push({ role: 'user', content: text })

  // Typing indicator
  showTyping()

  try {
    const { data, error } = await window.supabase.functions.invoke('chat', {
      body: { message: text, history: conversationHistory.slice(-10) }
    })
    hideTyping()

    if (error) throw error

    const reply = data.reply
    conversationHistory.push({ role: 'assistant', content: reply })

    const msgEl = createMessageEl('assistant', reply)
    messagesEl.appendChild(msgEl)
    messagesEl.appendChild(createSourceBadge())
    scrollToBottom()

  } catch (err) {
    hideTyping()
    const errEl = createMessageEl('assistant', "Une erreur s'est produite. Veuillez réessayer.")
    errEl.querySelector('.message-bubble').classList.add('message-error')
    messagesEl.appendChild(errEl)
    scrollToBottom()
  } finally {
    sendBtn.disabled = false
    inputEl.focus()
  }
}
```

---

## Checklist d'intégration

- [ ] Inclure `chat.js` après l'initialisation du client Supabase
- [ ] Importer la police Inter : `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`
- [ ] Tester le scroll sur iOS Safari (quirk connu : `overflow-y: auto` sur flex)
- [ ] Vérifier le contraste des bulles en dark mode si activé
- [ ] Tester Entrée vs Shift+Entrée sur mobile (clavier virtuel)
- [ ] Ajouter `lang="fr"` sur `<html>`

---

## Variantes

### Suggestions de questions rapides (chips)
Afficher des boutons de suggestions au démarrage pour guider l'utilisateur :
```html
<div class="chat-suggestions">
  <button onclick="fillInput('Qu\'est-ce que l\'Entrée express ?')">Entrée express</button>
  <button onclick="fillInput('Comment venir travailler au Canada ?')">Travailler au Canada</button>
  <button onclick="fillInput('Permis d\'études Canada')">Études au Canada</button>
</div>
```
```javascript
function fillInput(text) {
  inputEl.value = text
  inputEl.focus()
}
```

### Horodatage des messages
```javascript
function getTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
// Ajouter après la bulle : `<span class="msg-time">${getTime()}</span>`
```

### Bouton "Effacer la conversation"
```javascript
function clearChat() {
  conversationHistory = []
  messagesEl.innerHTML = ''
  messagesEl.appendChild(emptyEl)
  emptyEl.style.display = 'flex'
}
```
