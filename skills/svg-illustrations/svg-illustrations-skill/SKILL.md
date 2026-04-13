---
name: svg-illustrations
description: >
  Illustrations SVG sur-mesure, icônes vectorielles et éléments graphiques pour interfaces web.
  Utilise ce skill dès que l'utilisateur veut des illustrations personnalisées, des icônes custom,
  des éléments décoratifs SVG, des empty states illustrés, des avatars, des badges, des formes
  de fond, ou tout graphique vectoriel pour son site. Déclenche aussi pour les mots-clés
  "illustration", "icône", "SVG", "image", "graphique", "visuel", "dessin", "pictogramme",
  "mascotte", "décoration". Spécialement calibré pour Allo Canada avec une bibliothèque
  d'icônes immigration (passeport, avion, Canada, formulaire, famille, diplôme).
---

# SVG Illustrations — Identité visuelle Allo Canada

## Philosophie

Les illustrations SVG sont légères, scalables, et s'adaptent au dark mode via `currentColor`
et les variables CSS. Elles donnent une identité unique sans dépendre d'images externes.

Style recommandé pour Allo Canada :
- **Flat design** : formes simples, pas de relief
- **Palette limitée** : bleu Canada + rouge érable + neutres
- **Traits arrondis** : `stroke-linecap="round"`, `stroke-linejoin="round"`
- **Cohérence** : même style pour toutes les icônes (stroke width = 2px, 24×24 viewport)

---

## 1. Bibliothèque d'icônes immigration (24×24)

Toutes les icônes utilisent `currentColor` pour s'adapter au thème.

### Passeport
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="2" width="16" height="20" rx="2"/>
  <circle cx="12" cy="10" r="3"/>
  <path d="M8 17h8M8 14h2m4 0h2"/>
</svg>
```

### Avion (voyage)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-2 0-4-1-5.5.5L10 8 1.8 6.2c-.5-.1-.9.4-.6.8L6 12l-2 3h5l2 5 3-3z"/>
</svg>
```

### Maison / Résidence
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</svg>
```

### Diplôme / Études
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
</svg>
```

### Famille (regroupement)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
  <circle cx="9" cy="7" r="4"/>
  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
</svg>
```

### Formulaire / Document
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14 2 14 8 20 8"/>
  <line x1="16" y1="13" x2="8" y2="13"/>
  <line x1="16" y1="17" x2="8" y2="17"/>
  <polyline points="10 9 9 9 8 9"/>
</svg>
```

### Valise (émigration)
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="7" width="20" height="15" rx="2"/>
  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  <line x1="12" y1="12" x2="12" y2="16"/>
  <line x1="10" y1="14" x2="14" y2="14"/>
</svg>
```

### Globe / International
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="2" y1="12" x2="22" y2="12"/>
  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
</svg>
```

---

## 2. Icônes colorées (style carte)

Icônes avec fond coloré pour les cartes de programmes :

```html
<!-- Icône Entrée express -->
<div class="icon-badge icon-badge--blue">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
</div>
```

```css
.icon-badge {
  width: 52px; height: 52px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
}
.icon-badge--blue   { background: #EBF5FF; color: #1A56DB; }
.icon-badge--green  { background: #F0FDF4; color: #16A34A; }
.icon-badge--amber  { background: #FFFBEB; color: #D97706; }
.icon-badge--purple { background: #F5F3FF; color: #7C3AED; }
.icon-badge--red    { background: #FEF2F2; color: #DC2626; }

[data-theme="dark"] .icon-badge--blue   { background: #1E3A5F; color: #60A5FA; }
[data-theme="dark"] .icon-badge--green  { background: #14532D; color: #4ADE80; }
[data-theme="dark"] .icon-badge--amber  { background: #451A03; color: #FCD34D; }
[data-theme="dark"] .icon-badge--purple { background: #2E1065; color: #A78BFA; }
[data-theme="dark"] .icon-badge--red    { background: #450A0A; color: #F87171; }
```

---

## 3. Illustration Hero — "Allo Canada"

Illustration SVG pour la section hero : carte du Canada stylisée avec feuille d'érable.

```html
<svg class="hero-illustration" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Fond cercle doux -->
  <circle cx="160" cy="120" r="100" fill="var(--brand-light)"/>

  <!-- Feuille d'érable stylisée -->
  <g transform="translate(100, 60)" fill="#E74C3C" opacity="0.9">
    <path d="M60 0 L70 30 L100 20 L85 45 L110 50 L90 65 L100 90 L60 75 L20 90 L30 65 L10 50 L35 45 L20 20 L50 30 Z"/>
    <rect x="54" y="90" width="12" height="30" rx="3"/>
  </g>

  <!-- Bulles de chat décoratives -->
  <rect x="20" y="80" width="90" height="36" rx="18" fill="white" stroke="var(--border-color)" stroke-width="1.5"/>
  <text x="65" y="103" font-size="12" fill="var(--text-secondary)" text-anchor="middle" font-family="Inter, sans-serif">Bonjour ! 👋</text>

  <rect x="210" y="130" width="90" height="36" rx="18" fill="var(--brand)" />
  <text x="255" y="153" font-size="11" fill="white" text-anchor="middle" font-family="Inter, sans-serif">Comment faire ?</text>

  <!-- Points décoratifs -->
  <circle cx="30" cy="170" r="4" fill="var(--brand-light)"/>
  <circle cx="50" cy="185" r="6" fill="var(--brand-light)"/>
  <circle cx="270" cy="70" r="5" fill="#FEE2E2"/>
  <circle cx="290" cy="90" r="3" fill="#FEE2E2"/>
</svg>
```

```css
.hero-illustration {
  width: 100%;
  max-width: 320px;
  height: auto;
  filter: drop-shadow(0 8px 24px rgba(0,0,0,0.06));
}
```

---

## 4. Empty State — Conversation vide

```html
<div class="empty-state">
  <svg class="empty-state-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Bulle principale -->
    <rect x="30" y="20" width="140" height="80" rx="20" fill="var(--brand-light)" stroke="var(--brand)" stroke-width="1.5"/>
    <!-- Feuille d'érable dans la bulle -->
    <g transform="translate(85, 35)" fill="#E74C3C" opacity="0.8">
      <path d="M15 0 L18 8 L26 5 L22 12 L28 14 L23 18 L26 24 L15 20 L4 24 L7 18 L2 14 L8 12 L4 5 L12 8 Z" transform="scale(0.8)"/>
    </g>
    <!-- Pointe de la bulle -->
    <path d="M60 100 L50 120 L80 100" fill="var(--brand-light)" stroke="var(--brand)" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Lignes de texte dans la bulle -->
    <rect x="50" y="72" width="60" height="4" rx="2" fill="var(--brand)" opacity="0.3"/>
    <rect x="50" y="80" width="40" height="4" rx="2" fill="var(--brand)" opacity="0.2"/>
    <!-- Points décoratifs -->
    <circle cx="170" cy="30" r="6" fill="#FEE2E2"/>
    <circle cx="185" cy="48" r="4" fill="#FEE2E2"/>
    <circle cx="20" cy="110" r="5" fill="var(--brand-light)"/>
  </svg>

  <h3>Posez votre première question</h3>
  <p>Je suis là pour vous aider à comprendre l'immigration canadienne, simplement et clairement.</p>
</div>
```

```css
.empty-state {
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  padding: 48px 24px; gap: 12px;
}
.empty-state-svg { width: 160px; height: auto; margin-bottom: 8px; }
.empty-state h3  { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0; }
.empty-state p   { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0; max-width: 280px; }
```

---

## 5. Loader animé (feuille d'érable)

```html
<div class="maple-loader" aria-label="Chargement...">
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="18" stroke="var(--border-color)" stroke-width="3"/>
    <circle cx="20" cy="20" r="18" stroke="var(--brand)" stroke-width="3"
            stroke-linecap="round" stroke-dasharray="30 83"
            transform="rotate(-90 20 20)">
      <animateTransform attributeName="transform" type="rotate"
        from="-90 20 20" to="270 20 20" dur="1s" repeatCount="indefinite"/>
    </circle>
    <text x="20" y="25" text-anchor="middle" font-size="14" fill="#E74C3C">🍁</text>
  </svg>
</div>
```

```css
.maple-loader svg { width: 40px; height: 40px; }
```

---

## 6. Badge "Source officielle"

```html
<div class="source-badge">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
  Source : <a href="https://www.canada.ca" target="_blank">Canada.ca</a>
</div>
```

```css
.source-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; color: var(--text-muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 3px 10px; border-radius: 100px;
}
.source-badge a { color: var(--brand); text-decoration: none; }
.source-badge a:hover { text-decoration: underline; }
```

---

## Checklist d'intégration

- [ ] Toutes les icônes utilisent `currentColor` pour le dark mode
- [ ] Les fonds colorés des icônes ont une variante dark mode
- [ ] L'illustration hero est responsive (`max-width` + `width: 100%`)
- [ ] Le loader SVG fonctionne sans JavaScript (animation CSS/SMIL)
- [ ] Les SVG inline ont des attributs `aria-hidden="true"` si décoratifs, ou `role="img"` + `<title>` si informatifs
- [ ] Tester le rendu des emojis (🍁) sur Windows (rendu différent de macOS)
