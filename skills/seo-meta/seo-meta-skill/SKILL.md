---
name: seo-meta
description: >
  SEO complet pour sites web : balises meta, Open Graph, Twitter Card, structured data JSON-LD,
  sitemap.xml, robots.txt, et optimisations de performance. Utilise ce skill dès que l'utilisateur
  veut améliorer le référencement de son site, ajouter des balises meta, optimiser pour les
  réseaux sociaux, générer un sitemap, ou préparer son site pour Google. Déclenche aussi pour
  les mots-clés "SEO", "référencement", "Google", "meta", "Open Graph", "sitemap", "indexation",
  "visibilité". Spécialement calibré pour Allo Canada avec les mots-clés immigration Canada
  francophones, et le schéma FAQ pour les questions d'immigration.
---

# SEO & Meta — Référencement Allo Canada

## Pourquoi le SEO est critique pour Allo Canada

Des milliers de Camerounais, Ivoiriens, Sénégalais cherchent chaque jour :
- "immigration Canada depuis Afrique"
- "comment immigrer au Canada en français"
- "Entrée express Canada conditions"

Sans SEO, Allo Canada reste invisible. Avec un bon SEO, il peut apparaître en première page.

---

## 1. Balises `<head>` complètes — page d'accueil

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- ── SEO de base ── -->
  <title>Allo Canada — Assistant IA immigration Canada en français</title>
  <meta name="description" content="Posez vos questions sur l'immigration au Canada en français. Réponses claires basées sur Canada.ca / IRCC. Entrée express, permis de travail, études, regroupement familial.">
  <meta name="keywords" content="immigration Canada, Entrée express, permis de travail Canada, études Canada, IRCC, visa Canada, immigrer au Canada, immigration Canada Afrique, assistant immigration">
  <meta name="author" content="Allo Canada">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://allo-canada.com/">
  <html lang="fr">

  <!-- ── Open Graph (Facebook, WhatsApp, LinkedIn) ── -->
  <meta property="og:type"        content="website">
  <meta property="og:url"         content="https://allo-canada.com/">
  <meta property="og:title"       content="Allo Canada — Assistant IA immigration Canada">
  <meta property="og:description" content="Comprenez simplement les démarches d'immigration canadienne. Questions/réponses en français, basées sur Canada.ca.">
  <meta property="og:image"       content="https://allo-canada.com/og-image.png">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale"      content="fr_FR">
  <meta property="og:site_name"   content="Allo Canada">

  <!-- ── Twitter Card ── -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="Allo Canada — Assistant IA immigration Canada">
  <meta name="twitter:description" content="Posez vos questions sur l'immigration Canada en français. Réponses claires basées sur Canada.ca.">
  <meta name="twitter:image"       content="https://allo-canada.com/og-image.png">

  <!-- ── Favicon & PWA ── -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#1A56DB">

  <!-- ── Performance ── -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://xxxx.supabase.co">
</head>
```

---

## 2. Balises meta par page

### Page Chat (`/chat.html`)
```html
<title>Assistant IA Immigration Canada — Allo Canada</title>
<meta name="description" content="Posez votre question sur l'immigration Canada et obtenez une réponse claire en quelques secondes. Basé sur les informations officielles d'IRCC et Canada.ca.">
<meta name="robots" content="noindex, follow">
<!-- noindex car le contenu est dynamique, pas utile à indexer -->
```

### Page Infos Utiles (`/infos.html`)
```html
<title>Informations sur l'immigration au Canada — Allo Canada</title>
<meta name="description" content="Tout ce que vous devez savoir sur l'Entrée express, les permis de travail, les études au Canada et le regroupement familial. Guides simplifiés basés sur Canada.ca.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://allo-canada.com/infos.html">
```

---

## 3. Structured Data — JSON-LD

### Organisation (page d'accueil)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Allo Canada",
  "description": "Assistant IA spécialisé en immigration canadienne pour les francophones",
  "url": "https://allo-canada.com",
  "applicationCategory": "GovernmentApplication",
  "inLanguage": "fr",
  "audience": {
    "@type": "Audience",
    "audienceType": "Candidats à l'immigration canadienne"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "CAD"
  }
}
</script>
```

### FAQ Schema (crucial pour Allo Canada — génère des "rich snippets" dans Google)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Qu'est-ce que le programme Entrée express au Canada ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "L'Entrée express est un système de gestion des demandes de résidence permanente pour les travailleurs qualifiés. Il regroupe trois programmes : le Programme des travailleurs qualifiés fédéraux, le Programme des travailleurs de métiers spécialisés et la Catégorie de l'expérience canadienne. Les candidats sont classés par score et invités à présenter une demande selon leur profil."
      }
    },
    {
      "@type": "Question",
      "name": "Comment immigrer au Canada depuis l'Afrique ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Plusieurs voies s'offrent aux candidats africains : l'Entrée express pour les travailleurs qualifiés, le permis de travail avec ou sans offre d'emploi (LMIA), le permis d'études suivi d'un PGWP, le regroupement familial ou les programmes provinciaux (PNP). Le choix dépend de votre niveau d'études, expérience et situation familiale."
      }
    },
    {
      "@type": "Question",
      "name": "Combien coûte une demande de résidence permanente au Canada ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Les frais varient selon le programme. Pour l'Entrée express, les frais de traitement sont d'environ 1 365 CAD par adulte (incluant les frais de demande et les droits de résidence permanente). Des frais supplémentaires s'appliquent pour le bilan de santé, la vérification des antécédents judiciaires et les traductions de documents."
      }
    },
    {
      "@type": "Question",
      "name": "Quel est le délai de traitement pour un visa étudiant au Canada ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Le délai de traitement d'un permis d'études varie généralement entre 4 et 16 semaines selon le pays de résidence et la période de l'année. Il est recommandé de déposer sa demande au moins 3 à 6 mois avant la date de début de la session académique."
      }
    }
  ]
}
</script>
```

### BreadcrumbList (pour les pages internes)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Accueil",
      "item": "https://allo-canada.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Infos utiles",
      "item": "https://allo-canada.com/infos.html"
    }
  ]
}
</script>
```

---

## 4. `sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://allo-canada.com/</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://allo-canada.com/infos.html</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

## 5. `robots.txt`

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://allo-canada.com/sitemap.xml
```

---

## 6. Image Open Graph (`og-image.png`)

Format requis : **1200×630px**, poids < 200KB.

Contenu recommandé pour Allo Canada :
- Fond bleu Canada (`#1A56DB`)
- Logo "🍁 Allo Canada" en grand (blanc)
- Sous-titre : "Assistant IA immigration Canada"
- Mention : "Basé sur Canada.ca"

Générer avec Canva, Figma ou une Edge Function Supabase + `satori` (rendu HTML→PNG).

---

## 7. Favicon SVG (universel)

```html
<!-- /favicon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#1A56DB"/>
  <text x="16" y="22" font-size="18" text-anchor="middle" fill="white">🍁</text>
</svg>
```

---

## 8. Performance SEO (Core Web Vitals)

```html
<!-- Précharger les ressources critiques -->
<link rel="preload" href="/styles.css" as="style">
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" as="style">

<!-- Charger les scripts en différé -->
<script src="/app.js" defer></script>
<script src="/theme.js"></script><!-- celui-ci en synchrone pour éviter le flash -->

<!-- Images avec dimensions explicites (éviter le CLS) -->
<img src="/hero-illustration.svg" width="320" height="240" alt="Illustration assistant immigration Canada" loading="lazy">
```

---

## Checklist SEO Allo Canada

- [ ] Balises `<title>` uniques sur chaque page (< 60 caractères)
- [ ] Meta `description` unique sur chaque page (< 155 caractères)
- [ ] `<html lang="fr">` sur toutes les pages
- [ ] Balises Open Graph sur toutes les pages publiques
- [ ] JSON-LD FAQ sur la page d'accueil et la page infos
- [ ] `sitemap.xml` à la racine, référencé dans `robots.txt`
- [ ] `/admin` bloqué dans `robots.txt`
- [ ] Image og-image.png 1200×630px
- [ ] Favicon SVG + PNG 32×32 + Apple touch icon 180×180
- [ ] Core Web Vitals : LCP < 2.5s, CLS < 0.1, INP < 200ms
- [ ] Soumettre sitemap.xml dans Google Search Console
- [ ] Tester avec [PageSpeed Insights](https://pagespeed.web.dev/) et [Rich Results Test](https://search.google.com/test/rich-results)

---

## Mots-clés prioritaires pour Allo Canada

| Intention | Mot-clé | Volume estimé |
|---|---|---|
| Informatif | "immigration Canada depuis Cameroun" | Élevé |
| Informatif | "Entrée express Canada conditions" | Très élevé |
| Informatif | "visa étudiant Canada Afrique" | Élevé |
| Navigationnel | "Canada.ca immigration" | Très élevé |
| Transactionnel | "assistant immigration Canada gratuit" | Moyen |
| Local | "immigrer au Canada depuis Côte d'Ivoire" | Moyen |
