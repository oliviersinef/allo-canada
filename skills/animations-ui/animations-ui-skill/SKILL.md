---
name: animations-ui
description: >
  Micro-animations et transitions soignées pour interfaces web épurées. Utilise ce skill
  dès que l'utilisateur veut rendre son site plus vivant, attractif ou professionnel avec
  des animations : transitions de pages, animations au scroll, effets de hover, loaders,
  skeleton screens, boutons animés, apparition progressive d'éléments, parallax léger,
  compteurs animés, confetti, ou tout effet visuel CSS/JS. Déclenche aussi pour les mots-clés
  "animation", "transition", "effet", "vivant", "dynamique", "smooth", "fluide", "attractif"
  appliqués à une interface web. Couvre CSS pur, Intersection Observer, et GSAP si nécessaire.
---

# Animations UI — Interfaces vivantes et épurées

## Philosophie

Les bonnes animations sont **fonctionnelles** : elles guident l'attention, confirment une action,
réduisent la perception du temps d'attente. Les mauvaises animations distraient.

Règles d'or :
- Durée courte : 150–400ms pour les micro-interactions, 500–800ms pour les transitions de page
- `ease-out` par défaut (rapide au début, ralentit à la fin = naturel)
- Toujours respecter `prefers-reduced-motion`
- Jamais d'animation sans but fonctionnel

---

## 1. Variables CSS d'animation (à mettre dans `:root`)

```css
:root {
  --duration-fast:   150ms;
  --duration-base:   250ms;
  --duration-slow:   400ms;
  --duration-enter:  600ms;

  --ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:    cubic-bezier(0.4, 0, 1, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* légèrement élastique */

  --color-primary: #1A56DB;
}

/* Respect du mode réduit */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 2. Animations d'entrée (apparition d'éléments)

### Fade + slide vers le haut (usage général)
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.anim-fade-up {
  animation: fadeUp var(--duration-enter) var(--ease-out) both;
}

/* Délais en cascade pour les listes */
.anim-fade-up:nth-child(1) { animation-delay: 0ms; }
.anim-fade-up:nth-child(2) { animation-delay: 80ms; }
.anim-fade-up:nth-child(3) { animation-delay: 160ms; }
.anim-fade-up:nth-child(4) { animation-delay: 240ms; }
```

### Fade simple
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.anim-fade { animation: fadeIn var(--duration-slow) var(--ease-out) both; }
```

### Scale + fade (pour modales, popovers)
```css
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}
.anim-scale { animation: scaleIn var(--duration-base) var(--ease-spring) both; }
```

---

## 3. Animations au scroll (Intersection Observer)

```javascript
// scroll-animations.js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target) // une seule fois
    }
  })
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px'
})

document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el))
```

```css
/* État initial (invisible) */
[data-animate] {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out);
}

/* État final (visible) */
[data-animate].is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Variantes de direction */
[data-animate="left"]  { transform: translateX(-28px); }
[data-animate="right"] { transform: translateX(28px); }
[data-animate="scale"] { transform: scale(0.92); }

[data-animate="left"].is-visible,
[data-animate="right"].is-visible,
[data-animate="scale"].is-visible {
  transform: translate(0) scale(1);
}

/* Délais en cascade via attribut */
[data-delay="100"] { transition-delay: 100ms; }
[data-delay="200"] { transition-delay: 200ms; }
[data-delay="300"] { transition-delay: 300ms; }
[data-delay="400"] { transition-delay: 400ms; }
```

```html
<!-- Utilisation dans le HTML -->
<section data-animate>Titre de section</section>
<div data-animate data-delay="200">Carte 1</div>
<div data-animate data-delay="300">Carte 2</div>
<div data-animate="scale" data-delay="400">Carte 3</div>
```

---

## 4. Hover effects sur les cartes et boutons

```css
/* Carte avec lift au survol */
.card {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  padding: 24px;
  transition: transform var(--duration-base) var(--ease-out),
              box-shadow var(--duration-base) var(--ease-out),
              border-color var(--duration-base);
  cursor: pointer;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  border-color: #1A56DB;
}

/* Bouton principal avec shimmer */
.btn-primary {
  position: relative;
  overflow: hidden;
  background: #1A56DB;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 28px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--duration-base), transform var(--duration-fast);
}
.btn-primary::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transform: skewX(-20deg);
  transition: left 0.5s ease;
}
.btn-primary:hover::after { left: 140%; }
.btn-primary:hover   { background: #1648C0; }
.btn-primary:active  { transform: scale(0.97); }

/* Lien avec underline animé */
.link-animated {
  position: relative;
  text-decoration: none;
  color: #1A56DB;
}
.link-animated::after {
  content: '';
  position: absolute;
  bottom: -2px; left: 0;
  width: 0; height: 2px;
  background: #1A56DB;
  transition: width var(--duration-base) var(--ease-out);
}
.link-animated:hover::after { width: 100%; }
```

---

## 5. Loaders et états de chargement

### Skeleton screen (placeholders pendant le chargement)
```css
.skeleton {
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

/* Exemples de blocs skeleton */
.skeleton-text  { height: 16px; margin-bottom: 8px; }
.skeleton-title { height: 24px; width: 60%; margin-bottom: 16px; }
.skeleton-card  { height: 120px; border-radius: 16px; }
```

### Spinner minimal
```css
.spinner {
  width: 24px; height: 24px;
  border: 2.5px solid #E5E7EB;
  border-top-color: #1A56DB;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Bouton avec état loading
```javascript
function setLoading(btn, isLoading) {
  btn.disabled = isLoading
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent
  btn.innerHTML = isLoading
    ? `<span class="spinner" style="display:inline-block;width:18px;height:18px;vertical-align:middle;margin-right:8px;border-width:2px"></span> Chargement…`
    : btn.dataset.originalText
}
```

---

## 6. Transitions de page (multi-pages HTML)

```css
/* Fade out au départ */
body { animation: fadeIn 0.4s var(--ease-out) both; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

```javascript
// Fade out avant navigation
document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href')
  if (!href.startsWith('http') && !href.startsWith('#')) {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      document.body.style.transition = 'opacity 0.25s ease, transform 0.25s ease'
      document.body.style.opacity = '0'
      document.body.style.transform = 'translateY(-8px)'
      setTimeout(() => window.location.href = href, 260)
    })
  }
})
```

---

## 7. Compteur animé (pour les stats)

```javascript
// Animer un nombre de 0 à sa valeur cible
function animateCounter(el, target, duration = 1500) {
  const start = performance.now()
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
    el.textContent = Math.floor(eased * target).toLocaleString('fr-FR')
    if (progress < 1) requestAnimationFrame(update)
  }
  requestAnimationFrame(update)
}

// Déclencher au scroll
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target
      animateCounter(el, parseInt(el.dataset.target))
      statObserver.unobserve(el)
    }
  })
})
document.querySelectorAll('[data-counter]').forEach(el => statObserver.observe(el))
```

```html
<!-- Usage -->
<span data-counter data-target="12000">0</span> candidats aidés
```

---

## 8. Toast / notification animée

```css
.toast-container {
  position: fixed;
  bottom: 24px; right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
}
.toast {
  background: #1F2937;
  color: white;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  animation: toastIn 0.3s var(--ease-spring) both;
  max-width: 320px;
}
.toast.success { background: #065F46; }
.toast.error   { background: #991B1B; }
.toast.exit    { animation: toastOut 0.25s ease-in both; }

@keyframes toastIn  {
  from { opacity: 0; transform: translateX(40px) scale(0.9); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes toastOut {
  to { opacity: 0; transform: translateX(40px) scale(0.9); }
}
```

```javascript
function showToast(message, type = 'default', duration = 3000) {
  const container = document.getElementById('toastContainer')
    || (() => {
      const el = document.createElement('div')
      el.id = 'toastContainer'
      el.className = 'toast-container'
      document.body.appendChild(el)
      return el
    })()

  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = message
  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('exit')
    toast.addEventListener('animationend', () => toast.remove())
  }, duration)
}

// Usage
showToast('Prompt sauvegardé avec succès', 'success')
showToast('Erreur de connexion', 'error')
```

---

## Checklist d'implémentation

- [ ] Ajouter les variables CSS dans `:root`
- [ ] Ajouter le bloc `prefers-reduced-motion` pour l'accessibilité
- [ ] Initialiser `scroll-animations.js` en bas de page (après le DOM)
- [ ] Tester les animations sur mobile (performances, 60fps)
- [ ] Vérifier que les animations ne bloquent pas l'interaction (utiliser `pointer-events: none` si besoin)
- [ ] Éviter d'animer `width`, `height`, `top`, `left` → préférer `transform` et `opacity` (GPU)

---

## Combinaisons recommandées pour Allo Canada

| Page | Animations conseillées |
|---|---|
| Accueil (hero) | `fadeUp` en cascade sur le titre, sous-titre, CTA |
| Section "Comment ça marche" | `data-animate` au scroll sur chaque étape |
| Cartes de programmes | hover lift + `data-animate="scale"` |
| Interface chat | `msgIn` sur chaque bulle, typing indicator bounce |
| Dashboard admin | Skeleton screens au chargement, toast sur sauvegarde |
| Stats / chiffres | Compteur animé déclenché au scroll |
