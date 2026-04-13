---
name: canada-immigration-ai-agent
description: >
  Agent IA full-stack pour la plateforme "Allo Canada" — assistant IA d'immigration Canada
  francophone. Utilise ce skill dès que l'utilisateur parle de ce projet, même partiellement :
  création de pages, design de l'interface, code HTML/CSS/JS du chatbot, intégration de DeepSeek
  comme LLM, Supabase comme backend (base de données, auth, Edge Functions), dashboard admin avec
  gestion du prompt système, structure de fichiers, UX/UI pour l'immigration Canada, ou toute tâche
  liée à ce site d'assistant francophone pour immigrants africains. Ce skill s'applique aussi bien
  pour planifier, coder, déboguer, ou itérer sur le projet.
---

# Agent IA – Allo Canada 🍁

## Contexte du projet

**Nom de la plateforme** : **Allo Canada** 🍁
Plateforme web francophone destinée aux candidats à l'immigration canadienne (notamment depuis l'Afrique).
L'assistant IA répond aux questions en s'appuyant sur les informations officielles de Canada.ca / IRCC.
**Objectif** : simplifier et démystifier les démarches, sans remplacer un avocat ou consultant.

---

## Rôle de l'agent

À chaque tâche, l'agent doit :

1. **Proposer un plan d'implémentation** avant d'écrire du code (structure fichiers, flux utilisateur, décisions UI).
2. **Générer le code progressivement** : HTML → CSS → JS → backend si nécessaire.
3. **Documenter les décisions** en artifacts clairs pour que le développeur humain puisse valider.
4. **Rester pédagogique** : expliquer les choix techniques, signaler les alternatives.

---

## Contraintes techniques

| Élément | Choix privilégié |
|---|---|
| Frontend | HTML5 + CSS moderne (Flexbox/Grid) ou Tailwind CSS |
| Interactivité | JavaScript vanilla côté client |
| Backend | **Supabase** (BDD PostgreSQL, Auth, Edge Functions, Storage) |
| LLM | **DeepSeek** (deepseek-chat via API compatible OpenAI) |
| Structure | Projet simple : `index.html`, `styles.css`, `app.js` + config Supabase |
| Sécurité API | Clés côté serveur uniquement (Supabase Edge Functions), jamais exposées dans le frontend |

---

## Architecture des pages

### 1. Page d'accueil (`index.html`)
- Headline accueillante + sous-titre rassurant
- Grand champ de saisie / bouton "Poser une question"
- Bloc "Comment ça marche ?" (3–4 étapes illustrées)
- Footer avec mention "Informations basées sur Canada.ca"

### 2. Interface Chat (`chat.html` ou section intégrée)
- Bulles de conversation : utilisateur (droite, couleur douce) / assistant (gauche, blanc/gris clair)
- Indicateur de chargement (typing indicator)
- Icône ou badge "Source : Canada.ca" sous chaque réponse IA
- Bouton optionnel "Voir la page officielle" → lien Canada.ca

### 3. Page Infos Utiles (`infos.html`) *(optionnelle)*
- Fiches synthétiques : Entrée express, études, PVT, regroupement familial, etc.
- Liens directs vers les pages officielles Canada.ca
- Pas de copie de textes officiels — reformulation uniquement

### 4. Dashboard Admin (`/admin`)
- Accessible uniquement aux administrateurs (Supabase Auth + role `admin`)
- **Champ textarea "Prompt système"** : l'admin colle/modifie le prompt d'instruction du LLM
- Bouton "Sauvegarder" → stocké en base Supabase (table `settings`)
- L'Edge Function lit ce prompt dynamiquement à chaque requête (pas hardcodé)
- Statistiques basiques : nombre de conversations, messages du jour
- Historique des conversations (lecture seule)

---

## Style UI/UX

### Palette de couleurs recommandée
```css
:root {
  --primary: #1A56DB;       /* Bleu Canada, confiance */
  --primary-light: #EBF5FF; /* Fond léger, douceur */
  --accent: #E74C3C;        /* Rouge feuille d'érable, accents */
  --neutral-100: #F9FAFB;
  --neutral-700: #374151;
  --text: #1F2937;
  --border: #E5E7EB;
  --success: #10B981;
}
```

### Typographie
- Police système ou Google Font : **Inter** ou **Plus Jakarta Sans**
- `font-size` de base : 16px, `line-height` : 1.6
- Titres : 700, corps : 400, labels : 500

### Principes UX
- **Mobile-first** : tester breakpoints 375px, 768px, 1280px
- **Micro-copy accueillante** : "Posez votre question, on s'en occupe 🍁"
- **Espacement généreux** : `padding` 24–48px, sections bien séparées
- **États visuels** clairs : hover, focus (accessibilité), loading, erreur

---

## Backend : Supabase

### Rôle de Supabase dans le projet
- **Base de données** (PostgreSQL) : stocker l'historique des conversations, les utilisateurs
- **Auth** : authentification optionnelle (email, magic link, OAuth Google)
- **Edge Functions** (Deno) : appeler DeepSeek de façon sécurisée sans exposer la clé API
- **Realtime** : optionnel — streaming des réponses IA en temps réel

### Structure de la base de données
```sql
-- Table conversations
create table conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  session_id text not null,
  created_at timestamptz default now()
);

-- Table messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Table settings (prompt système admin)
create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Insérer le prompt par défaut
insert into settings (key, value) values ('system_prompt', '');

-- Row Level Security
alter table conversations enable row level security;
alter table messages enable row level security;
alter table settings enable row level security;

-- Seuls les admins peuvent modifier les settings
create policy "Admin only" on settings
  using (auth.jwt() ->> 'role' = 'admin');
```

### Edge Function : appel DeepSeek
```typescript
// supabase/functions/chat/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!

serve(async (req) => {
  const { message, history } = await req.json()

  // Lire le prompt système depuis Supabase (table settings)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/settings?key=eq.system_prompt&select=value`,
    { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
  )
  const settingsData = await settingsRes.json()
  const systemPrompt = settingsData[0]?.value || FALLBACK_PROMPT

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(history || []),
        { role: 'user', content: message }
      ],
      max_tokens: 1024,
      temperature: 0.7,
      stream: false
    })
  })

  const data = await response.json()
  const reply = data.choices[0].message.content

  return new Response(JSON.stringify({ reply }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Appel depuis le frontend
```javascript
// app.js — utilise le client Supabase JS
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,    // ex: https://xxxx.supabase.co
  import.meta.env.VITE_SUPABASE_ANON_KEY // clé publique anon, sans danger
)

async function sendMessage(userMessage, history) {
  const { data, error } = await supabase.functions.invoke('chat', {
    body: { message: userMessage, history }
  })
  if (error) throw error
  return data.reply
}
```

### Variables d'environnement
```bash
# .env (jamais commité dans Git)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...   # clé publique, OK dans le frontend

# Dans Supabase Dashboard > Edge Functions > Secrets
DEEPSEEK_API_KEY=sk-...            # clé secrète, côté serveur uniquement
```

### Initialisation Supabase (CLI)
```bash
npm install -g supabase
supabase login
supabase init
supabase link --project-ref <project-ref>
supabase functions deploy chat
supabase db push   # appliquer les migrations
```

---

## LLM : DeepSeek

### Pourquoi DeepSeek
- API compatible format OpenAI → migration facile
- Très performant sur les tâches en français
- Coût réduit vs GPT-4 pour un projet à budget limité
- Modèle recommandé : **`deepseek-chat`** (équivalent GPT-3.5/4, bon ratio qualité/prix)

### Prompt système Allo Canada (version initiale — à coller dans le dashboard admin)

Ce prompt est stocké en base Supabase et éditable par l'admin via le dashboard. L'Edge Function le lit dynamiquement.

```
Tu es un Agent IA spécialisé en immigration au Canada, conçu pour aider les candidats
francophones (notamment venant d'Afrique) à comprendre simplement les démarches, les
programmes et les conditions d'immigration, en t'appuyant exclusivement ou principalement
sur les informations officielles du site Canada.ca (Immigration, Réfugiés et Citoyenneté
Canada – IRCC).

## Rôle et objectif
- Simplifier et clarifier les informations techniques, juridiques et administratives d'IRCC.
- Aider le candidat à :
  - Comprendre les programmes possibles pour son profil (travail, études, regroupement familial, refuge, etc.).
  - Identifier les étapes principales de la demande.
  - Éviter les erreurs fréquentes (erreurs de formulaire, mauvais choix de catégorie, documents manquants).
- Ne pas donner de conseils juridiques personnalisés, mais des explications basées sur les guides officiels.

## Règles de base
1. Source officielle : base tes réponses sur Canada.ca / IRCC. Si une info n'est pas clairement
   disponible, dis-le et invite à vérifier sur le site officiel ou à consulter un consultant autorisé.
2. Langage simple et pédagogique : français clair, sans jargon. Explique les termes techniques
   avec des exemples concrets. Structure avec listes à puces et sous-titres si le message est long.
3. Pas de garanties : ne dis jamais "vous êtes sûr d'être accepté". Chaque dossier est évalué
   individuellement. Les informations sont uniquement à titre informatif.

## Comportement lors des échanges
- Pose 1–3 questions fermées si nécessaire pour mieux cerner la situation (pays, études,
  expérience, langue, province, type de visa). Ne demande pas de données sensibles (passeport, etc.).
- Structure chaque réponse ainsi :
  1. Résume la question avec tes propres mots.
  2. Explique en 2–5 points clés ce que dit Canada.ca.
  3. Indique les pages Canada.ca à consulter pour vérifier.
  4. Termine par 1–2 conseils pratiques simples.
- Si le cas est complexe (refus, litige, réfugié), oriente vers un consultant ou avocat autorisé.

## Style
Sois rassurant, éducatif et honnête. Si tu n'as pas d'info claire, dis :
"Selon les informations disponibles sur Canada.ca, ce point n'est pas précisé clairement.
Je vous recommande de consulter la page officielle ou de contacter directement IRCC."
```

> **Note** : ce prompt est le `FALLBACK_PROMPT` hardcodé dans l'Edge Function si la table `settings` est vide. L'admin peut le remplacer à tout moment via le dashboard.

### Paramètres DeepSeek recommandés
| Paramètre | Valeur | Raison |
|---|---|---|
| `model` | `deepseek-chat` | Bon équilibre qualité/coût |
| `temperature` | `0.7` | Réponses naturelles sans hallucination excessive |
| `max_tokens` | `1024` | Réponses complètes sans trop longues |
| `stream` | `false` (MVP) | Plus simple à implémenter au départ |

---


---

## Dashboard Admin — Gestion du Prompt

### UI du dashboard (`/admin/index.html`)
```html
<!-- Section gestion du prompt système -->
<section class="admin-prompt">
  <h2>🧠 Prompt système de l'assistant</h2>
  <p class="hint">Ce texte guide les réponses de l'IA. Modifiez-le avec soin.</p>
  <textarea id="systemPrompt" rows="20" placeholder="Collez ici le prompt d'instruction..."></textarea>
  <button id="savePrompt">💾 Sauvegarder</button>
  <span id="saveStatus"></span>
</section>
```

### JS admin — Lecture et sauvegarde du prompt
```javascript
// admin.js
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Charger le prompt actuel
async function loadPrompt() {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'system_prompt')
    .single()
  if (data) document.getElementById('systemPrompt').value = data.value
}

// Sauvegarder le prompt modifié
async function savePrompt() {
  const value = document.getElementById('systemPrompt').value.trim()
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'system_prompt', value, updated_at: new Date().toISOString() })
  document.getElementById('saveStatus').textContent = error ? '❌ Erreur' : '✅ Sauvegardé'
}

document.getElementById('savePrompt').addEventListener('click', savePrompt)
loadPrompt()
```

### Sécurité du dashboard admin
- Route `/admin` protégée : vérifier `session.user.user_metadata.role === 'admin'`
- Assigner le rôle admin via Supabase Dashboard > Authentication > Users > Edit metadata
- RLS sur la table `settings` : seul le rôle `admin` peut lire/écrire

## Flux d'intégration

Le frontend ne communique **jamais directement** avec DeepSeek.
Le flux est toujours : `Frontend → Supabase Edge Function → DeepSeek API`.

```
[Navigateur] → supabase.functions.invoke('chat') → [Edge Function Deno]
                                                          ↓
                                                   DeepSeek API
                                                          ↓
                                              [Réponse renvoyée au client]
```

Optionnel : sauvegarder chaque message dans la table `messages` depuis l'Edge Function pour un historique persistant par session.

---

## Workflow de développement recommandé

### Étape 1 — Fondations (Jour 1)
- [ ] `index.html` : structure de base, navbar, hero avec champ de saisie
- [ ] `styles.css` : variables CSS, reset, typographie, layout mobile-first
- [ ] Init Supabase : créer le projet, appliquer les migrations SQL
- [ ] Validation du design avec le développeur

### Étape 2 — Backend & Chat (Jour 2)
- [ ] Edge Function `chat` : appel DeepSeek, retour de la réponse
- [ ] Ajouter `DEEPSEEK_API_KEY` dans les secrets Supabase Dashboard
- [ ] Composant chat en JS vanilla (bulles, scroll auto, loading indicator)
- [ ] Connexion frontend → Edge Function via `supabase.functions.invoke`
- [ ] Gestion des erreurs et des messages vides

### Étape 3 — Dashboard Admin & Contenu (Jour 3)
- [ ] Page `/admin` protégée par Supabase Auth (role `admin`)
- [ ] Textarea "Prompt système" pré-rempli avec le prompt Allo Canada
- [ ] Bouton "Sauvegarder" → `upsert` dans la table `settings`
- [ ] Vérifier que l'Edge Function lit bien le prompt depuis la BDD
- [ ] Page "Infos utiles" avec fiches synthétiques
- [ ] Responsive testing (mobile, tablette, desktop)
- [ ] Accessibilité de base (aria-labels, contraste, focus visible)
- [ ] Déploiement frontend (Vercel) + `supabase functions deploy chat`

---

## Bonnes pratiques à respecter

- **Sécurité** : `DEEPSEEK_API_KEY` uniquement dans les secrets Supabase, jamais dans le frontend
- **Supabase RLS** : activer le Row Level Security sur toutes les tables dès le départ
- **Accessibilité** : `lang="fr"` sur `<html>`, alt sur les images, labels sur les inputs
- **Performance** : Pas de framework lourd inutile, images optimisées
- **Honnêteté** : Afficher clairement "Source : Canada.ca" et la limite de l'outil
- **Légalité** : Ne pas reproduire les textes officiels, seulement les reformuler et les lier

---

## Décisions pragmatiques par défaut

| Ambiguïté | Décision par défaut |
|---|---|
| Framework CSS ? | CSS vanilla d'abord, Tailwind si le projet grandit |
| SPA ou multi-pages ? | Multi-pages simple (HTML séparés) |
| Base de données ? | **Supabase PostgreSQL** (historique conversations + messages) |
| Authentification ? | Pas d'auth au MVP, Supabase Auth si besoin |
| Déploiement frontend ? | Vercel (gratuit, rapide, HTTPS automatique) |
| Déploiement backend ? | Supabase Edge Functions (inclus dans le projet Supabase) |

---

## Ressources officielles à référencer

- Immigration Canada : https://www.canada.ca/fr/immigration-refugies-citoyennete.html
- Entrée express : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express.html
- Vérifier un consultant accrédité : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/protegez-vous-fraude/consultants-immigration-autorises.html
- Supabase Docs : https://supabase.com/docs
- DeepSeek API Docs : https://platform.deepseek.com/api-docs
