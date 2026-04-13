---
name: dark-mode
description: >
  Implémentation complète du mode sombre pour sites et applications web. Utilise ce skill
  dès que l'utilisateur veut ajouter un mode sombre, un toggle light/dark, des thèmes
  adaptatifs, ou que l'interface doit s'adapter automatiquement aux préférences système.
  Déclenche aussi pour les mots-clés "dark mode", "mode nuit", "thème sombre", "nuit",
  "thème clair/sombre", "toggle de thème". Couvre CSS variables, localStorage pour la
  persistance, animation de bascule, et adaptation complète de tous les composants.
  Spécialement calibré pour Allo Canada (couleurs, chat, dashboard admin).
---

# Dark Mode — Thème sombre complet

## Philosophie

Un bon dark mode n'est pas l'inverse du light mode. C'est une palette repensée :
- Pas de noir pur `#000` → utiliser `#0F172A` ou `#111827` (moins fatigant)
- Pas de blanc pur sur fond sombre → `#F1F5F9` ou `#E2E8F0`
- Élever les surfaces avec la luminosité, pas les ombres (Material Design 3)
- Conserver les couleurs de marque (bleu Canada) mais les adoucir légèrement

---

## 1. Variables CSS — système de thème complet

```css
/* ── Thème clair (défaut) ── */
:root {
  --bg-primary:    #FFFFFF;
  --bg-secondary:  #F9FAFB;
  --bg-tertiary:   #F3F4F6;
  --bg-elevated:   #FFFFFF;

  --text-primary:   #111827;
  --text-secondary: #4B5563;
  --text-muted:     #9CA3AF;

  --border-color:   #E5E7EB;
  --border-strong:  #D1D5DB;

  --brand:          #1A56DB;
  --brand-light:    #EBF5FF;
  --brand-dark:     #1648C0;

  --bubble-user-bg:   #1A56DB;
  --bubble-user-text: #FFFFFF;
  --bubble-ai-bg:     #FFFFFF;
  --bubble-ai-text:   #111827;
  --bubble-ai-border: #E5E7EB;

  --input-bg:     #F9FAFB;
  --input-border: #E5E7EB;
  --input-focus:  #1A56DB;

  --card-bg:      #FFFFFF;
  --card-border:  #E5E7EB;
  --card-hover-shadow: 0 8px 24px rgba(0,0,0,0.08);

  --navbar-bg:    rgba(255,255,255,0.92);

  --skeleton-base:    #F3F4F6;
  --skeleton-shimmer: #E5E7EB;

  color-scheme: light;
}

/* ── Thème sombre ── */
[data-theme="dark"] {
  --bg-primary:    #0F172A;
  --bg-secondary:  #1E293B;
  --bg-tertiary:   #334155;
  --bg-elevated:   #1E293B;

  --text-primary:   #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted:     #64748B;

  --border-color:   #1E293B;
  --border-strong:  #334155;

  --brand:          #3B82F6;
  --brand-light:    #1E3A5F;
  --brand-dark:     #2563EB;

  --bubble-user-bg:   #2563EB;
  --bubble-user-text: #FFFFFF;
  --bubble-ai-bg:     #1E293B;
  --bubble-ai-text:   #F1F5F9;
  --bubble-ai-border: #334155;

  --input-bg:     #1E293B;
  --input-border: #334155;
  --input-focus:  #3B82F6;

  --card-bg:      #1E293B;
  --card-border:  #334155;
  --card-hover-shadow: 0 8px 24px rgba(0,0,0,0.4);

  --navbar-bg:    rgba(15,23,42,0.92);

  --skeleton-base:    #1E293B;
  --skeleton-shimmer: #334155;

  color-scheme: dark;
}
```

---

## 2. Application des variables dans les composants

```css
/* Tous les composants utilisent les variables — exemples */
body {
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: background 0.3s ease, color 0.3s ease;
}

.navbar {
  background: var(--navbar-bg);
  border-bottom-color: var(--border-color);
}

.card {
  background: var(--card-bg);
  border-color: var(--card-border);
}
.card:hover {
  box-shadow: var(--card-hover-shadow);
}

/* Bulles de chat */
.message.user .message-bubble {
  background: var(--bubble-user-bg);
  color: var(--bubble-user-text);
}
.message.assistant .message-bubble {
  background: var(--bubble-ai-bg);
  color: var(--bubble-ai-text);
  border-color: var(--bubble-ai-border);
}

/* Inputs */
textarea, input[type="text"] {
  background: var(--input-bg);
  border-color: var(--input-border);
  color: var(--text-primary);
}
textarea:focus, input[type="text"]:focus {
  border-color: var(--input-focus);
}

/* Hero */
.hero {
  background: var(--bg-secondary);
}
.hero-form {
  background: var(--bg-elevated);
  border-color: var(--border-color);
}
```

---

## 3. Toggle — bouton de bascule

```html
<!-- Dans la navbar -->
<button class="theme-toggle" id="themeToggle" aria-label="Changer de thème">
  <span class="toggle-icon toggle-sun">☀️</span>
  <span class="toggle-icon toggle-moon">🌙</span>
</button>
```

```css
.theme-toggle {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 100px;
  width: 56px; height: 30px;
  position: relative;
  cursor: pointer;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 6px;
  transition: background 0.3s;
}
.toggle-icon { font-size: 14px; line-height: 1; }

/* Indicateur glissant */
.theme-toggle::after {
  content: '';
  position: absolute;
  width: 22px; height: 22px;
  background: var(--brand);
  border-radius: 50%;
  left: 4px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
[data-theme="dark"] .theme-toggle::after {
  transform: translateX(26px);
}
```

---

## 4. JavaScript — logique complète

```javascript
// theme.js — à inclure en <head> pour éviter le flash
(function() {
  const STORAGE_KEY = 'allo-canada-theme'

  // Lire la préférence sauvegardée ou la préférence système
  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
    updateToggleIcon(theme)
  }

  function updateToggleIcon(theme) {
    const btn = document.getElementById('themeToggle')
    if (!btn) return
    btn.setAttribute('aria-label', theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre')
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light'
    applyTheme(current === 'dark' ? 'light' : 'dark')
  }

  // Appliquer immédiatement (avant le rendu)
  applyTheme(getPreferredTheme())

  // Écouter les changements système
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light')
    }
  })

  // Exposer pour le bouton
  window.toggleTheme = toggleTheme
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme)
  })
})()
```

```html
<!-- Dans <head>, AVANT le CSS, pour éviter le flash blanc -->
<script src="/theme.js"></script>
```

---

## 5. Ajustements spécifiques dark mode

```css
/* Hero gradient en dark mode */
[data-theme="dark"] .hero {
  background: linear-gradient(160deg, #0F172A 0%, #1E293B 100%);
}

/* Badge hero en dark mode */
[data-theme="dark"] .hero-badge {
  background: #1E3A5F;
  border-color: #1E40AF;
  color: #93C5FD;
}

/* Section "Comment ça marche" */
[data-theme="dark"] .how-it-works { background: #0F172A; }
[data-theme="dark"] .step-card { background: #1E293B; border-color: #334155; }

/* Section programmes */
[data-theme="dark"] .programmes { background: #1E293B; }
[data-theme="dark"] .prog-card  { background: #0F172A; border-color: #334155; }

/* CTA section */
[data-theme="dark"] .cta-section { background: #1E40AF; }

/* Footer */
[data-theme="dark"] .footer { background: #020617; }

/* Skeleton en dark mode */
[data-theme="dark"] .skeleton {
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shimmer) 50%, var(--skeleton-base) 75%);
  background-size: 200% 100%;
}

/* Scrollbar en dark mode */
[data-theme="dark"] ::-webkit-scrollbar { width: 8px; }
[data-theme="dark"] ::-webkit-scrollbar-track { background: #0F172A; }
[data-theme="dark"] ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
[data-theme="dark"] ::-webkit-scrollbar-thumb:hover { background: #475569; }
```

---

## 6. Checklist d'intégration

- [ ] `theme.js` placé dans `<head>` avant tout CSS (évite le flash)
- [ ] Toutes les couleurs hardcodées remplacées par des variables CSS
- [ ] Bouton toggle dans la navbar avec `id="themeToggle"`
- [ ] Tester chaque page en dark mode (ouvrir DevTools > "Emulate CSS prefers-color-scheme")
- [ ] Vérifier les contrastes WCAG AA en dark mode (ratio min 4.5:1 pour le texte)
- [ ] Tester sur iOS Safari (support `color-scheme` parfois partiel)
- [ ] Vérifier que les images/SVG restent lisibles en dark mode

---

## Palette dark mode Allo Canada (résumé rapide)

| Élément | Light | Dark |
|---|---|---|
| Fond principal | `#FFFFFF` | `#0F172A` |
| Fond secondaire | `#F9FAFB` | `#1E293B` |
| Texte principal | `#111827` | `#F1F5F9` |
| Texte secondaire | `#4B5563` | `#94A3B8` |
| Couleur de marque | `#1A56DB` | `#3B82F6` |
| Bordures | `#E5E7EB` | `#334155` |
| Bulle IA | Blanc + gris | `#1E293B` |
