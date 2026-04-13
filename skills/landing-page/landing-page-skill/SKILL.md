---
name: landing-page
description: >
  Patterns et code complet pour landing pages web convertissantes, attractives et épurées.
  Utilise ce skill dès que l'utilisateur veut construire ou améliorer une page d'accueil,
  une hero section, un bloc "Comment ça marche", une section de témoignages, une FAQ,
  un footer soigné, ou toute section marketing d'un site web. Déclenche aussi pour les
  mots-clés "page d'accueil", "accueil", "hero", "landing", "homepage", "première page",
  "présentation du site". Couvre HTML/CSS vanilla et Tailwind, mobile-first, avec
  micro-animations intégrées. Spécialement calibré pour Allo Canada.
---

# Landing Page — Page d'accueil convertissante

## Structure des sections (ordre recommandé)

```
1. Navbar          — Logo + navigation + CTA
2. Hero            — Accroche + champ de saisie + social proof
3. Comment ça marche — 3–4 étapes illustrées
4. Programmes      — Cartes des voies d'immigration
5. Témoignages     — Preuves sociales (optionnel)
6. FAQ             — 5–6 questions fréquentes
7. CTA final       — Invitation à poser une question
8. Footer          — Liens, mentions légales, crédits
```

---

## 1. Navbar

```html
<nav class="navbar">
  <div class="navbar-inner">
    <a href="/" class="navbar-logo">
      🍁 <span>Allo Canada</span>
    </a>
    <div class="navbar-links">
      <a href="/infos.html">Infos utiles</a>
      <a href="/chat.html" class="btn-nav">Poser une question</a>
    </div>
    <!-- Burger mobile -->
    <button class="navbar-burger" id="navBurger" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>
```

```css
.navbar {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #E5E7EB;
}
.navbar-inner {
  max-width: 1100px; margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex; align-items: center; justify-content: space-between;
}
.navbar-logo {
  font-size: 20px; font-weight: 700; color: #1F2937;
  text-decoration: none; display: flex; align-items: center; gap: 8px;
}
.navbar-links { display: flex; align-items: center; gap: 24px; }
.navbar-links a { font-size: 15px; color: #4B5563; text-decoration: none; transition: color 0.2s; }
.navbar-links a:hover { color: #1A56DB; }
.btn-nav {
  background: #1A56DB; color: white !important;
  padding: 8px 20px; border-radius: 10px; font-weight: 500;
  transition: background 0.2s !important;
}
.btn-nav:hover { background: #1648C0 !important; }

/* Burger mobile */
.navbar-burger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 4px; }
.navbar-burger span { display: block; width: 24px; height: 2px; background: #374151; border-radius: 2px; transition: 0.3s; }

@media (max-width: 640px) {
  .navbar-links { display: none; }
  .navbar-burger { display: flex; }
  .navbar-links.open {
    display: flex; flex-direction: column; gap: 0;
    position: absolute; top: 64px; left: 0; right: 0;
    background: white; border-bottom: 1px solid #E5E7EB;
    padding: 16px 24px;
  }
}
```

---

## 2. Hero Section

```html
<section class="hero">
  <div class="hero-inner">
    <div class="hero-badge">🇨🇦 Assistant officieux basé sur Canada.ca</div>
    <h1 class="hero-title">
      Vos questions sur l'immigration Canada,<br>
      <span class="hero-highlight">enfin des réponses claires</span>
    </h1>
    <p class="hero-subtitle">
      Posez vos questions en français, obtenez des explications simples
      basées sur les informations officielles d'IRCC.
    </p>

    <!-- Champ de saisie hero -->
    <form class="hero-form" onsubmit="startChat(event)">
      <input
        type="text"
        id="heroInput"
        placeholder="Ex : Comment fonctionne l'Entrée express ?"
        autocomplete="off"
        aria-label="Votre question sur l'immigration"
      />
      <button type="submit">
        Poser ma question
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </form>

    <!-- Questions rapides -->
    <div class="hero-chips">
      <span class="chip-label">Questions fréquentes :</span>
      <button class="chip" onclick="fillHero('Entrée express Canada')">Entrée express</button>
      <button class="chip" onclick="fillHero('Permis de travail Canada')">Permis de travail</button>
      <button class="chip" onclick="fillHero('Étudier au Canada depuis Afrique')">Études</button>
      <button class="chip" onclick="fillHero('Regroupement familial Canada')">Famille</button>
    </div>

    <!-- Social proof -->
    <div class="hero-proof">
      <div class="proof-avatars">
        <div class="proof-avatar" style="background:#DBEAFE;color:#1E40AF">D</div>
        <div class="proof-avatar" style="background:#D1FAE5;color:#065F46">A</div>
        <div class="proof-avatar" style="background:#FEF3C7;color:#92400E">F</div>
      </div>
      <span>Déjà <strong>+5 000 candidats</strong> aidés depuis l'Afrique</span>
    </div>
  </div>
</section>
```

```css
.hero {
  background: linear-gradient(160deg, #EBF5FF 0%, #F9FAFB 60%);
  padding: 80px 24px 96px;
  text-align: center;
}
.hero-inner { max-width: 700px; margin: 0 auto; }

.hero-badge {
  display: inline-block;
  background: white; border: 1px solid #BFDBFE;
  color: #1E40AF; font-size: 13px; font-weight: 500;
  padding: 6px 16px; border-radius: 100px; margin-bottom: 24px;
}
.hero-title {
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 800; line-height: 1.15;
  color: #111827; margin: 0 0 16px;
}
.hero-highlight {
  color: #1A56DB;
  background: linear-gradient(135deg, #1A56DB, #3B82F6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.hero-subtitle {
  font-size: 18px; color: #6B7280; line-height: 1.7;
  margin: 0 0 36px;
}

.hero-form {
  display: flex; gap: 8px;
  background: white; border: 1.5px solid #E5E7EB;
  border-radius: 16px; padding: 6px 6px 6px 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  margin-bottom: 20px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.hero-form:focus-within {
  border-color: #1A56DB;
  box-shadow: 0 4px 24px rgba(26,86,219,0.12);
}
.hero-form input {
  flex: 1; border: none; outline: none;
  font-size: 16px; color: #111827; background: transparent;
}
.hero-form input::placeholder { color: #9CA3AF; }
.hero-form button {
  background: #1A56DB; color: white; border: none;
  padding: 12px 20px; border-radius: 12px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 8px; white-space: nowrap;
  transition: background 0.2s, transform 0.1s;
}
.hero-form button:hover { background: #1648C0; }
.hero-form button:active { transform: scale(0.97); }

.hero-chips {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: 8px; justify-content: center; margin-bottom: 32px;
}
.chip-label { font-size: 13px; color: #9CA3AF; }
.chip {
  background: white; border: 1px solid #E5E7EB;
  color: #374151; font-size: 13px; padding: 6px 14px;
  border-radius: 100px; cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.chip:hover { border-color: #1A56DB; color: #1A56DB; background: #EBF5FF; }

.hero-proof {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  font-size: 14px; color: #6B7280;
}
.proof-avatars { display: flex; }
.proof-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid white; font-size: 12px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  margin-left: -8px;
}
.proof-avatar:first-child { margin-left: 0; }

@media (max-width: 600px) {
  .hero-form { flex-direction: column; padding: 12px; gap: 10px; }
  .hero-form button { justify-content: center; }
}
```

```javascript
function fillHero(text) {
  document.getElementById('heroInput').value = text
  document.getElementById('heroInput').focus()
}
function startChat(e) {
  e.preventDefault()
  const q = document.getElementById('heroInput').value.trim()
  if (q) window.location.href = `/chat.html?q=${encodeURIComponent(q)}`
}
```

---

## 3. Section "Comment ça marche"

```html
<section class="how-it-works" id="comment">
  <div class="section-inner">
    <div class="section-header" data-animate>
      <h2>Comment ça marche ?</h2>
      <p>Simple, rapide et gratuit.</p>
    </div>
    <div class="steps-grid">
      <div class="step-card" data-animate data-delay="100">
        <div class="step-icon">💬</div>
        <div class="step-num">01</div>
        <h3>Posez votre question</h3>
        <p>En français, comme vous parleriez à un ami. Pas besoin de jargon juridique.</p>
      </div>
      <div class="step-card" data-animate data-delay="200">
        <div class="step-icon">🤖</div>
        <div class="step-num">02</div>
        <h3>L'IA analyse</h3>
        <p>Notre assistant consulte les informations officielles d'IRCC et Canada.ca pour vous.</p>
      </div>
      <div class="step-card" data-animate data-delay="300">
        <div class="step-icon">✅</div>
        <div class="step-num">03</div>
        <h3>Réponse claire</h3>
        <p>Vous recevez une explication simple, avec les liens officiels pour aller plus loin.</p>
      </div>
    </div>
  </div>
</section>
```

```css
.how-it-works { padding: 80px 24px; background: white; }
.section-inner { max-width: 1000px; margin: 0 auto; }
.section-header { text-align: center; margin-bottom: 48px; }
.section-header h2 { font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 8px; }
.section-header p  { font-size: 17px; color: #6B7280; margin: 0; }

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}
.step-card {
  background: #F9FAFB; border: 1px solid #F3F4F6;
  border-radius: 20px; padding: 28px 24px;
  position: relative; transition: transform 0.25s, box-shadow 0.25s;
}
.step-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.07); }
.step-icon { font-size: 32px; margin-bottom: 12px; }
.step-num  { font-size: 12px; font-weight: 700; color: #1A56DB; letter-spacing: 0.08em; margin-bottom: 8px; }
.step-card h3 { font-size: 17px; font-weight: 600; color: #111827; margin: 0 0 8px; }
.step-card p  { font-size: 14px; color: #6B7280; line-height: 1.6; margin: 0; }
```

---

## 4. Section Programmes (cartes)

```html
<section class="programmes" id="programmes">
  <div class="section-inner">
    <div class="section-header" data-animate>
      <h2>Les voies d'immigration principales</h2>
      <p>Trouvez le programme adapté à votre situation.</p>
    </div>
    <div class="programmes-grid">
      <a class="prog-card" href="/chat.html?q=Entrée express Canada" data-animate data-delay="100">
        <div class="prog-icon" style="background:#EBF5FF">🚀</div>
        <h3>Entrée express</h3>
        <p>Résidence permanente pour les travailleurs qualifiés. Délai moyen : 6 mois.</p>
        <span class="prog-link">En savoir plus →</span>
      </a>
      <a class="prog-card" href="/chat.html?q=Permis d'études Canada" data-animate data-delay="200">
        <div class="prog-icon" style="background:#F0FDF4">🎓</div>
        <h3>Études au Canada</h3>
        <p>Permis d'études pour poursuivre votre formation dans une université canadienne.</p>
        <span class="prog-link">En savoir plus →</span>
      </a>
      <a class="prog-card" href="/chat.html?q=Permis de travail Canada" data-animate data-delay="300">
        <div class="prog-icon" style="background:#FFFBEB">💼</div>
        <h3>Travailler au Canada</h3>
        <p>Permis de travail ouvert ou fermé, PVT, programmes provinciaux (PNP).</p>
        <span class="prog-link">En savoir plus →</span>
      </a>
      <a class="prog-card" href="/chat.html?q=Regroupement familial Canada" data-animate data-delay="400">
        <div class="prog-icon" style="background:#FDF2F8">👨‍👩‍👧</div>
        <h3>Regroupement familial</h3>
        <p>Parrainer un proche (conjoint, enfant, parent) pour venir vivre au Canada.</p>
        <span class="prog-link">En savoir plus →</span>
      </a>
    </div>
  </div>
</section>
```

```css
.programmes { padding: 80px 24px; background: #F9FAFB; }
.programmes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}
.prog-card {
  background: white; border: 1px solid #E5E7EB;
  border-radius: 20px; padding: 24px;
  text-decoration: none; color: inherit;
  transition: transform 0.25s, box-shadow 0.25s, border-color 0.2s;
  display: flex; flex-direction: column; gap: 8px;
}
.prog-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.08); border-color: #1A56DB; }
.prog-icon { width: 48px; height: 48px; border-radius: 12px; font-size: 24px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.prog-card h3 { font-size: 16px; font-weight: 600; color: #111827; margin: 0; }
.prog-card p  { font-size: 14px; color: #6B7280; line-height: 1.6; margin: 0; flex: 1; }
.prog-link    { font-size: 13px; font-weight: 600; color: #1A56DB; margin-top: 4px; }
```

---

## 5. CTA Final

```html
<section class="cta-section">
  <div class="cta-inner" data-animate>
    <h2>Prêt à poser votre première question ?</h2>
    <p>Gratuit, en français, disponible 24h/24.</p>
    <a href="/chat.html" class="btn-cta">
      💬 Démarrer la conversation
    </a>
    <p class="cta-disclaimer">
      Les informations fournies sont à titre indicatif et basées sur Canada.ca.
      Pour un cas complexe, consultez un consultant en immigration accrédité (RCIC).
    </p>
  </div>
</section>
```

```css
.cta-section { padding: 80px 24px; background: #1A56DB; text-align: center; }
.cta-inner { max-width: 560px; margin: 0 auto; }
.cta-section h2 { font-size: 30px; font-weight: 700; color: white; margin: 0 0 12px; }
.cta-section p  { font-size: 17px; color: rgba(255,255,255,0.8); margin: 0 0 28px; }
.btn-cta {
  display: inline-block; background: white; color: #1A56DB;
  font-size: 16px; font-weight: 700; padding: 14px 32px;
  border-radius: 14px; text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.cta-disclaimer { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 20px; }
```

---

## 6. Footer

```html
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="footer-logo">🍁 Allo Canada</span>
      <p>Assistant IA d'information sur l'immigration canadienne.<br>
      Basé sur les données officielles de Canada.ca / IRCC.</p>
    </div>
    <div class="footer-links">
      <h4>Navigation</h4>
      <a href="/">Accueil</a>
      <a href="/chat.html">Assistant IA</a>
      <a href="/infos.html">Infos utiles</a>
    </div>
    <div class="footer-links">
      <h4>Ressources officielles</h4>
      <a href="https://www.canada.ca/fr/immigration-refugies-citoyennete.html" target="_blank">Canada.ca / IRCC</a>
      <a href="https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express.html" target="_blank">Entrée express</a>
    </div>
  </div>
  <div class="footer-bottom">
    <p>© 2025 Allo Canada · Informations à titre indicatif uniquement · Pas de conseils juridiques</p>
  </div>
</footer>
```

```css
.footer { background: #111827; color: white; padding: 56px 24px 0; }
.footer-inner {
  max-width: 1000px; margin: 0 auto;
  display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px;
  padding-bottom: 40px; border-bottom: 1px solid #1F2937;
}
.footer-logo { font-size: 18px; font-weight: 700; display: block; margin-bottom: 10px; }
.footer-brand p { font-size: 14px; color: #9CA3AF; line-height: 1.6; margin: 0; }
.footer-links h4 { font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 14px; }
.footer-links a  { display: block; font-size: 14px; color: #D1D5DB; text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
.footer-links a:hover { color: white; }
.footer-bottom { text-align: center; padding: 20px 0; font-size: 12px; color: #4B5563; }

@media (max-width: 640px) {
  .footer-inner { grid-template-columns: 1fr; gap: 28px; }
}
```
