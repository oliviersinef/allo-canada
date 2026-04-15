/// <reference lib="deno.ns" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Define a helper to securely compute embeddings inside Supabase Edge Runtime
async function generateEmbedding(text: string) {
    // @ts-ignore : Supabase is globally injected in Edge Functions
    const session = new Supabase.ai.Session('gte-small');
    const result = await session.run(text, { mean_pool: true, normalize: true });
    return Array.from(result);
}

serve(async (req: Request) => {
  // CORS handles
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      } 
    })
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { message, conversation_id, history, action } = body;
    
    if (!action && !message) {
      return new Response(JSON.stringify({ error: "Message ou action manquant" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ---------------------------------------------------------
    // ACTION: SEED (Initialisation de la base de connaissance)
    // ---------------------------------------------------------
    if (action === 'seed') {
        const documents = [
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/trouver-classification-nationale-professions.html',
            title: 'Trouver sa Classification nationale des professions (CNP)',
            content: "Cet outil officiel de Canada.ca permet de trouver son code CNP 2021 à l'aide de l'intitulé du poste ou d'une recherche par catégorie FEER. C'est la source de référence pour confirmer l'admissibilité des métiers aux programmes d'immigration."
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/demande/qualifier/tests-langue.html',
            title: 'Entrée express : Résultats d\'examen linguistique',
            content: 'Pour le traitement de votre profil et la demande d\'Entrée express, vous devez prouver vos compétences linguistiques en français ou en anglais en passant un test linguistique approuvé (TEF, TCF, IELTS, CELPIP). Vos résultats doivent dater de moins de deux ans le jour où vous présentez votre demande de résidence permanente.'
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/programme-immigration-atlantique/evaluation-competences-linquistiques.html',
            title: 'Évaluation des compétences linguistiques (Programme d\'immigration au Canada atlantique)',
            content: `PROGRAMME D'IMMIGRATION AU CANADA ATLANTIQUE - COMPÉTENCES LINGUISTIQUES :
            Pour démontrer vos compétences linguistiques en français ou en anglais, vous devez passer un test de langue approuvé.
            Les résultats doivent avoir été obtenus moins de 2 ans avant le jour où vous présentez votre demande.

            SCORE MINIMUM REQUIS (selon la catégorie FEER de la CNP de votre offre d'emploi) :
            - Offre d'emploi FEER 0, 1, 2 ou 3 → NCLC 5 minimum (dans les 4 volets)
            - Offre d'emploi FEER 4 → NCLC 4 minimum (dans les 4 volets)

            TESTS APPROUVÉS :
            Français : TEF Canada (Test d'évaluation de français) | TCF Canada (Test de connaissance du français)
            Anglais : CELPIP-General | IELTS General Training | PTE Core (Pearson Test of English)

            IMPORTANT : Joindre une copie des résultats à votre demande si vous atteignez le score minimum dans les 4 volets (compréhension orale, compréhension écrite, expression orale, expression écrite).`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/demande/fonds.html',
            title: 'Preuve de fonds - Entrée express',
            content: 'Vous devez prouver que vous avez assez d\'argent pour vous établir au Canada avec votre famille, à moins que vous ne soyez autorisé à travailler au Canada ET que vous ayez une offre d\'emploi valide d\'un employeur au Canada. Pour un demandeur seul en 2024, le montant minimum requis est de 13 757 $ CAD.'
          },
          {
              url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/travailler-canada/permis/mobilite-francophone.html',
              title: 'Programme de Mobilité francophone',
              content: 'Mobilité francophone permet aux employeurs canadiens de recruter des travailleurs francophones qualifiés hors du Québec. Il s\'agit d\'une dispense de l\'étude d\'impact sur le marché du travail (EIMT), code de dispense C16. Les candidats doivent prouver un niveau de français d\'au moins NCLC 5.'
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/admissibilite/criteres-systeme-classement-global.html',
            title: 'Calculatrice du SCG - Facteurs de base',
            content: `CRITÈRES CRS (SYSTÈME DE CLASSEMENT GLOBAL) - MARS 2025
            FACTEURS DE BASE :
            - Âge (max 110/100) : 20-29 ans = 110 (sans conjoint) / 100 (avec). Le score baisse après 30 ans.
            - Scolarité (max 150/140) : Doctorat = 150/140, Maîtrise = 135/126, Baccalauréat (3 ans+) = 120/112.
            - Langue Officielle 1 (max 136/128) : NCLC 7 = 17/16 par compétence, NCLC 9 = 31/29, NCLC 10+ = 34/32.
            - Expérience Canadienne (max 80/70) : 1 an = 40/35, 2 ans = 53/46, 5 ans+ = 80/70.
            NOTE : Les points pour offre d'emploi (EIMT) ont été supprimés en Mars 2025.`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/verifier-note/criteries-scg.html',
            title: 'Points supplémentaires CRS',
            content: `POINTS SUPPLÉMENTAIRES ET TRANSFÉRABILITÉ :
            - Nomination provinciale : +600 points
            - Frère/Soeur au Canada (RP/Citoyen) : +15 points
            - Études au Canada : +15 (1-2 ans) ou +30 (3 ans+)
            - Français (NCLC 7+) + Anglais (NCLC 5+) : +50 points
            - Français (NCLC 7+) seul : +25 points
            TRANSFÉRABILITÉ (Max 100) : Combinaison études+langue ou expérience+langue.`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/admissibilite/cnp.html',
            title: 'Identification du code CNP 2021 et FEER',
            content: `SYSTÈME CNP 2021 (CLASSIFICATION NATIONALE DES PROFESSIONS)
            Le code comporte 5 chiffres. Le 2ème chiffre indique la catégorie FEER (0 à 5).
            - FEER 0 (Gestion) : Directeurs, gestionnaires.
            - FEER 1 (Uni) : Nécessite un diplôme universitaire.
            - FEER 2 (Collégial 2 ans+) : Nécessite diplôme collégial ou apprentissage de 2 ans+.
            - FEER 3 (Collégial -2 ans) : Nécessite diplôme collégial de moins de 2 ans.
            - FEER 4 (Secondaire) : Nécessite un diplôme d'études secondaires.
            - FEER 5 (Emploi) : Formation en cours d'emploi.
            ADMISSIBILITÉ : Seuls les FEER 0, 1, 2 et 3 sont admissibles à Entrée Express.
            IMPORTANT : Les fonctions principales (tâches) priment sur l'intitulé du poste.`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/demande/qualifier/tests-langue/equivalence-nclc.html',
            title: 'Barème Officiel de Cotation Linguistique (NCLC/CLB) - TCF, TEF, IELTS, CELPIP, PTE',
            content: `TABLEAUX DE CORRESPONDANCE NCLC/CLB OFFICIELS (MAJ 2024) :
            
            1. TCF CANADA :
            | NCLC | C.Écrit | E.Écrite | C.Oral | E.Orale |
            |------|---------|----------|--------|---------|
            | 10   | 549-699 | 16-20    | 549-699| 16-20   |
            | 9    | 524-548 | 14-15    | 523-548| 14-15   |
            | 8    | 499-523 | 12-13    | 503-522| 12-13   |
            | 7    | 453-498 | 10-11    | 458-502| 10-11   |
            | 6    | 406-452 | 7-9      | 398-457| 7-9     |
            | 5    | 375-405 | 6        | 369-397| 6       |
            | 4    | 342-374 | 4-5      | 331-368| 4-5     |

            2. TEF CANADA (Après le 11 Décembre 2023) :
            | NCLC | C.Écrit | E.Écrite | C.Oral | E.Orale |
            |------|---------|----------|--------|---------|
            | 10   | 546-699 | 558-699  | 546-699| 556-699 |
            | 9    | 503-545 | 512-557  | 503-545| 518-555 |
            | 8    | 462-502 | 472-511  | 462-502| 494-517 |
            | 7    | 434-461 | 428-471  | 434-461| 456-493 |
            | 6    | 393-433 | 379-427  | 393-433| 422-455 |
            | 5    | 352-392 | 330-378  | 352-392| 387-421 |
            | 4    | 306-351 | 268-329  | 306-351| 328-386 |

            3. IELTS GENERAL TRAINING :
            - CLB 10 : L:8.5, R:8.0, W:7.5, S:7.5
            - CLB 9  : L:8.0, R:7.0, W:7.0, S:7.0
            - CLB 8  : L:7.5, R:6.5, W:6.5, S:6.5
            - CLB 7  : L:6.0, R:6.0, W:6.0, S:6.0
            - CLB 6  : L:5.5, R:5.0, W:5.5, S:5.5
            - CLB 5  : L:5.0, R:4.0, W:5.0, S:5.0

            4. CELPIP GENERAL :
            - Niveau NCLC = Score exact (Score 9 = NCLC 9).

            5. PTE CORE :
            - CLB 10 : L:89-90, R:88-90, W:90, S:89-90
            - CLB 9  : L:82-88, R:78-87, W:88-89, S:84-88
            - CLB 8  : L:71-81, R:69-77, W:79-87, S:76-83
            - CLB 7  : L:60-70, R:60-68, W:69-78, S:68-75
            - CLB 6  : L:50-59, R:51-59, W:60-68, S:59-67
            - CLB 5  : L:39-49, R:42-50, W:51-59, S:51-58

            CONSIGNE STRICTE : Ne jamais inventer de plages de scores. Priorité absolue aux tableaux ci-dessus.`
          },
          // ====== NOUVEAUX DOCUMENTS DE CONNAISSANCE ======
          {
            url: 'https://applications.wes.org/createaccount/home/select-eval-type?ln=1',
            title: 'Création du Compte WES pour EDE (Évaluation des Diplômes d\'Études)',
            content: `CRÉATION DU COMPTE WES POUR L'ÉVALUATION DES DIPLÔMES (EDE) :
            WES (World Education Services) est l'un des organismes désignés par IRCC pour effectuer l'Évaluation des Diplômes d'Études (EDE) nécessaire à l'immigration au Canada.
            
            ÉTAPES DE CRÉATION DU COMPTE WES :
            1. Aller sur https://applications.wes.org/createaccount/home/select-eval-type?ln=1
            2. Sélectionner le type d'évaluation : "WES Standard Application" (ECA pour IRCC)
            3. Créer un compte avec adresse courriel et mot de passe
            4. Remplir le formulaire de demande en ligne avec vos informations personnelles et académiques
            5. Payer les frais d'évaluation
            6. Envoyer vos documents académiques (relevés de notes, diplômes) directement depuis votre établissement d'enseignement à WES
            7. WES évalue vos diplômes et émet un rapport d'équivalence canadienne
            
            IMPORTANT : L'EDE est obligatoire pour les diplômes obtenus hors du Canada dans le cadre d'Entrée Express.
            Le rapport WES est valide 5 ans à partir de la date d'émission.
            Lien officiel : https://applications.wes.org/createaccount/home/select-eval-type?ln=1`
          },
          {
            url: 'https://www.nvimmigration.ca/67-calculator/',
            title: 'Calculateur d\'admissibilité 67 points - Programme des travailleurs qualifiés (fédéral)',
            content: `CALCUL D'ADMISSIBILITÉ ENTRÉE EXPRESS - 67 POINTS SUR 100 :
            Pour immigrer au Canada via le Programme des travailleurs qualifiés (fédéral - PTQF), vous devez obtenir au minimum 67 points sur 100 basés sur 6 facteurs de sélection :

            1. LANGUE OFFICIELLE (max 28 points) :
               - Première langue : max 24 pts (6 pts par compétence si NCLC 9+, 5 si NCLC 8, 4 si NCLC 7, 0 si < NCLC 7)
               - Deuxième langue : max 4 pts (4 pts si NCLC 5+ dans les 4 compétences)
               - NCLC 7 minimum requis dans la première langue officielle pour être admissible

            2. ÉDUCATION (max 25 points) :
               - Doctorat : 25 pts
               - Maîtrise ou diplôme professionnel : 23 pts
               - Deux diplômes ou plus (dont un de 3 ans+) : 22 pts
               - Diplôme de 3 ans+ : 21 pts
               - Diplôme de 2 ans : 19 pts
               - Diplôme de 1 an : 15 pts
               - Diplôme d'études secondaires : 5 pts

            3. EXPÉRIENCE DE TRAVAIL (max 15 points) :
               - 1 an : 9 pts | 2-3 ans : 11 pts | 4-5 ans : 13 pts | 6 ans+ : 15 pts
               - L'expérience doit être en emploi qualifié CNP FEER 0, 1, 2 ou 3

            4. ÂGE (max 12 points) :
               - 18-35 ans : 12 pts | 36 ans : 11 | 37 : 10 | 38 : 9 | 39 : 8 | 40 : 7 | 41 : 6 | 42 : 5 | 43 : 4 | 44 : 3 | 45 : 2 | 46 : 1 | 47+ : 0

            5. EMPLOI RÉSERVÉ AU CANADA (max 10 points) :
               - Oui avec EIMT : 10 pts | Non : 0 pts

            6. ADAPTABILITÉ (max 10 points) :
               - Langue du conjoint : 5 pts | Études antérieures au Canada : 5 pts | Études du conjoint au Canada : 5 pts
               - Expérience antérieure au Canada : 10 pts | Exp. conjoint au Canada : 5 pts | Emploi réservé : 5 pts | Parents au Canada : 5 pts

            RÉSULTAT : ≥ 67 points = Admissible | < 67 points = Non admissible au PTQF
            Lien calculateur : https://www.nvimmigration.ca/67-calculator/`
          },
          {
            url: 'https://www.cic.gc.ca/francais/immigrer/qualifie/scg-outil.asp',
            title: 'Simulation Score Entrée Express (SCG/CRS) - Outil officiel Canada.ca',
            content: `SIMULATION DU SCORE ENTRÉE EXPRESS (SCG - SYSTÈME DE CLASSEMENT GLOBAL) :
            L'outil officiel du gouvernement du Canada permet de calculer votre score CRS/SCG sur 1200 points.
            
            COMPOSITION DU SCORE (max 1200 points) :
            A. COMPÉTENCES DE BASE + CONJOINT (max 500 si seul / 460 si avec conjoint) :
               - Âge : max 110 (seul) / 100 (avec conjoint)
               - Scolarité : max 150 / 140
               - Première langue officielle : max 136 / 128
               - Deuxième langue officielle : max 24 / 22
               - Expérience canadienne : max 80 / 70

            B. FACTEURS ÉPOUX/CONJOINT (max 40 points si applicable) :
               - Scolarité du conjoint : max 10 pts
               - Langue du conjoint : max 20 pts
               - Expérience canadienne du conjoint : max 10 pts

            C. TRANSFÉRABILITÉ DES COMPÉTENCES (max 100 points) :
               - Éducation + Langue
               - Éducation + Expérience canadienne
               - Expérience étrangère + Langue
               - Expérience étrangère + Expérience canadienne
               - Certificat de qualification (métiers spécialisés) + Langue

            D. POINTS SUPPLÉMENTAIRES (max 600 points) :
               - Nomination provinciale (PNP) : +600 pts
               - Frère/sœur citoyen ou RP au Canada : +15 pts
               - Études au Canada (1-2 ans) : +15 pts | (3 ans+) : +30 pts
               - Français NCLC 7+ et anglais CLB 5+ : +50 pts
               - Français NCLC 7+ sans anglais : +25 pts
               - NOTE : Points pour offre d'emploi supprimés depuis mars 2025.

            UTILISATION : Répondre aux questions sur l'âge, la scolarité, les langues, l'expérience et les facteurs supplémentaires.
            La note minimale d'invitation varie à chaque ronde d'invitations.
            Lien officiel : https://www.cic.gc.ca/francais/immigrer/qualifie/scg-outil.asp`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/outil-venir-canada-immigration-entree-express.html',
            title: 'Obtention du Code de référence - Outil Venir au Canada',
            content: `OUTIL "VENIR AU CANADA" - DÉTERMINER SON ADMISSIBILITÉ ENTRÉE EXPRESS :
            Cet outil officiel de Canada.ca permet de vérifier votre admissibilité aux programmes d'immigration gérés par Entrée Express.
            
            PROCESSUS :
            1. Aller sur https://www.canada.ca/fr/immigration-refugies-citoyennete/services/outil-venir-canada-immigration-entree-express.html
            2. Cliquer sur "Déterminez votre admissibilité"
            3. Répondre aux questions (10-15 minutes) portant sur :
               - Nationalité et pays de résidence
               - Âge
               - Maîtrise des langues officielles (français/anglais)
               - Membres de votre famille
               - Niveau d'études
               - Expérience de travail
               - Fonds disponibles
               - Détails de toute offre d'emploi au Canada
            4. À la fin, l'outil indique les programmes auxquels vous êtes admissible :
               - Programme des travailleurs qualifiés (fédéral)
               - Programme des métiers spécialisés (fédéral)
               - Catégorie de l'expérience canadienne
            5. Vous recevez un CODE DE RÉFÉRENCE PERSONNEL (valide 60 jours)
            6. Utilisez ce code lors de la création de votre profil Entrée Express dans votre compte IRCC
            
            IMPORTANT : Le code de référence ne fonctionnera pas si vous avez déjà créé un profil dans votre compte avant d'utiliser l'outil.
            Lien officiel : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/outil-venir-canada-immigration-entree-express.html`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/demande/compte.html',
            title: 'Création du Profil Entrée Express - Compte sécurisé IRCC et CléGC',
            content: `CRÉATION DU PROFIL ENTRÉE EXPRESS - COMPTE IRCC :
            Pour créer un profil Entrée Express, vous devez d'abord avoir un compte sécurisé auprès d'IRCC.
            
            ÉTAPES DE CRÉATION DU COMPTE :
            1. Aller sur https://www.canada.ca/fr/immigration-refugies-citoyennete/services/demande/compte.html
            2. Cliquer sur "S'inscrire à un compte"
            3. Choisir votre méthode de connexion :
               a) CléGC (Nom d'utilisateur et mot de passe) - Recommandé
               b) Partenaire de connexion canadien Interac® (connexion bancaire)
            4. Créer vos identifiants CléGC :
               - Créer un nom d'utilisateur unique
               - Créer un mot de passe sécurisé
               - Configurer les questions de récupération
               - Activer l'authentification à deux facteurs (obligatoire)
            5. Une fois le compte créé, vous pouvez :
               - Créer un profil Entrée Express
               - Suivre vos demandes existantes
               - Soumettre des documents

            TYPES DE DEMANDES SUPPORTÉES PAR CE COMPTE :
            - Entrée express, Permis de travail, Permis d'études, Expérience internationale Canada (EIC)
            - Visa de visiteur, Parrainage familial, Programme d'immigration atlantique, PNP
            
            AIDE CONNEXION :
            - CléGC support : 1-855-438-1102 (Canada/US), 1-800-2318-6290 (International)
            - Disponible 24h/24, 7j/7
            
            Lien officiel : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/demande/compte.html`
          },
          {
            url: 'https://arrima.immigration-quebec.gouv.qc.ca/monespacepublic/calculette/sommaire',
            title: 'Simulation Score Arrima - Immigration Québec',
            content: `SIMULATION DE SCORE ARRIMA - PROGRAMME RÉGULIER DES TRAVAILLEURS QUALIFIÉS (PRTQ) DU QUÉBEC :
            Arrima est le portail d'immigration du Québec. La calculette permet d'estimer votre score dans le cadre du PRTQ.
            
            FACTEURS DE SÉLECTION ARRIMA :
            1. FORMATION (max points variables) :
               - Niveau de scolarité (diplôme le plus élevé)
               - Domaine de formation (domaines privilégiés au Québec)
            2. EXPÉRIENCE PROFESSIONNELLE :
               - Durée et type d'expérience
               - Expérience au Québec/Canada (bonifiée)
            3. ÂGE :
               - Les 18-35 ans obtiennent le maximum de points
            4. COMPÉTENCES LINGUISTIQUES :
               - Français (TEF/TCF) : très valorisé au Québec
               - Anglais : points supplémentaires
            5. SÉJOUR ET FAMILLE AU QUÉBEC :
               - Séjour antérieur au Québec
               - Famille au Québec
            6. CARACTÉRISTIQUES DU CONJOINT :
               - Scolarité, langue, expérience du conjoint
            7. OFFRE D'EMPLOI VALIDÉE :
               - Offre d'emploi permanent au Québec
            8. ENFANTS :
               - Nombre d'enfants à charge

            PROCESSUS :
            1. Aller sur https://arrima.immigration-quebec.gouv.qc.ca/monespacepublic/calculette/sommaire
            2. Remplir chaque section du formulaire
            3. Obtenir votre score estimé
            
            IMPORTANT : Le score de sélection pour recevoir une invitation varie selon les rondes. La maîtrise du français est ESSENTIELLE pour maximiser ses chances au Québec.
            Lien officiel : https://arrima.immigration-quebec.gouv.qc.ca/monespacepublic/calculette/sommaire`
          },
          {
            url: 'https://www.quebec.ca/immigration/services-en-ligne',
            title: 'Déclaration d\'intérêt Arrima - Services en ligne Immigration Québec',
            content: `DÉCLARATION D'INTÉRÊT ARRIMA - IMMIGRATION QUÉBEC :
            La déclaration d'intérêt est la première étape pour immigrer au Québec via le Programme régulier des travailleurs qualifiés (PRTQ).
            
            PROCESSUS DE DÉCLARATION D'INTÉRÊT :
            1. Aller sur https://www.quebec.ca/immigration/services-en-ligne
            2. Créer un compte Arrima ou se connecter à un compte existant
            3. Remplir la déclaration d'intérêt avec les informations requises :
               - Identité et coordonnées
               - Situation familiale
               - Formation et diplômes
               - Expérience professionnelle
               - Compétences linguistiques (français obligatoire)
               - Liens avec le Québec (famille, séjours, offre d'emploi)
            4. Soumettre la déclaration - elle restera active dans la banque de déclarations d'intérêt
            5. Le MIFI (Ministère de l'Immigration, de la Francisation et de l'Intégration) effectue des rondes de sélection
            6. Si sélectionné, vous recevez une invitation à présenter une demande de sélection permanente (DSQ)
            
            CONDITIONS :
            - La déclaration est valide 12 mois et peut être mise à jour
            - La maîtrise du français est un critère majeur de sélection
            - Les domaines de formation en demande au Québec sont privilégiés
            
            Lien officiel : https://www.quebec.ca/immigration/services-en-ligne`
          },
          {
            url: 'https://arrima.immigration-quebec.gouv.qc.ca',
            title: 'Portail Arrima - Immigration Québec',
            content: `PORTAIL ARRIMA - IMMIGRATION QUÉBEC :
            Arrima est le système de gestion des demandes d'immigration du Québec, géré par le MIFI.
            
            PROGRAMMES ACCESSIBLES VIA ARRIMA :
            - Programme régulier des travailleurs qualifiés (PRTQ)
            - Programme de l'expérience québécoise (PEQ)
            - Programme des travailleurs qualifiés (anciennement)
            
            FONCTIONNALITÉS DU PORTAIL :
            - Créer et gérer sa déclaration d'intérêt
            - Consulter l'état de sa demande
            - Soumettre des documents
            - Accéder à la calculette de score
            - Consulter les informations sur les programmes d'immigration du Québec
            
            SPÉCIFICITÉS IMMIGRATION QUÉBEC :
            - Le Québec a son propre système de sélection, distinct d'Entrée Express fédéral
            - Le CSQ (Certificat de sélection du Québec) est requis avant la demande de résidence permanente fédérale
            - Le français est fortement valorisé (critère de sélection majeur)
            - Les domaines de formation en demande au Québec donnent des points supplémentaires
            
            Lien officiel : https://arrima.immigration-quebec.gouv.qc.ca`
          },
          {
            url: 'https://www.icascanada.ca',
            title: 'ICAS Canada - Évaluation des diplômes pour l\'immigration',
            content: `ORGANISMES DÉSIGNÉS POUR L'ÉVALUATION DES DIPLÔMES D'ÉTUDES (EDE) AU CANADA :
            L'EDE est obligatoire pour les diplômes obtenus hors du Canada dans le cadre des programmes d'immigration.
            
            ORGANISMES AGRÉÉS PAR IRCC :
            1. WES (World Education Services) - Le plus populaire
               → https://applications.wes.org/createaccount/home/select-eval-type?ln=1
               - Délai moyen : 20-35 jours ouvrables
               - Accepte les diplômes de la plupart des pays
               
            2. ICAS (International Credential Assessment Service)
               → https://www.icascanada.ca
               - Basé en Ontario
               - Offre des évaluations pour l'immigration et les études
               
            3. CES (Comparative Education Service) - Université de Toronto
               → https://learn.utoronto.ca/comparative-education-service
               - Un des organismes les plus anciens au Canada
               - Reconnu pour son expertise académique
               
            4. IQAS (International Qualifications Assessment Service - Alberta)
               → https://www.alberta.ca/iqas
               - Service gouvernemental de l'Alberta
               - Gratuit pour les résidents de l'Alberta dans certains cas
               
            5. MCC (Medical Council of Canada) - Pour les diplômes médicaux
            6. PEBC (Pharmacy Examining Board of Canada) - Pour les pharmaciens
            
            IMPORTANT :
            - Le rapport EDE doit avoir été émis dans les 5 dernières années
            - Choisir l'évaluation "pour fins d'immigration à IRCC"
            - Les documents originaux doivent être envoyés directement par l'établissement d'enseignement
            - Le coût varie entre 200-300 CAD selon l'organisme`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/admissibilite/cnp-2021.html',
            title: 'Mise à jour CNP 2021 - Codes à 5 chiffres',
            content: `TRANSITION CNP 2016 VERS CNP 2021 (IRCC) :
            Depuis le 16 novembre 2022, IRCC utilise exclusivement la Classification nationale des professions (CNP) 2021.
            
            RÈGLE DE FORMAT :
            - Les nouveaux codes comportent 5 CHIFFRES.
            - L'ancien format à 4 chiffres (CNP 2016) est désormais OBSOLÈTE pour les nouvelles demandes.
            
            EXEMPLES DE MISE À JOUR :
            - Graphistes et illustrateurs : Ancien code 5241 → Nouveau code 52120 (FEER 2).
            - Développeurs Web : Ancien code 2175 → Nouveau code 21234 (FEER 2).
            - Adjoints de direction : Ancien code 1222 → Nouveau code 12100 (FEER 2).
            
            CONSIGNE CRITIQUE : Ne jamais donner de code à 4 chiffres. Si tu identifies une profession, assure-toi de fournir le code à 5 chiffres de la CNP 2021.`
          }
        ];


        for (const doc of documents) {
            try {
                // Check if document already exists to save compute resources
                const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/canada_documents?url=eq.${encodeURIComponent(doc.url)}`, {
                    headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
                });
                const existingDocs = await checkRes.json();
                if (existingDocs && existingDocs.length > 0) {
                    console.log(`Skipping ${doc.url}, already seeded.`);
                    continue;
                }

                const embedding = await generateEmbedding(doc.content);
                await fetch(`${SUPABASE_URL}/rest/v1/canada_documents`, {
                    method: 'POST',
                    headers: { 
                        'apikey': SUPABASE_SERVICE_ROLE_KEY, 
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        url: doc.url,
                        title: doc.title,
                        content: doc.content,
                        embedding: embedding
                    })
                });
            } catch (err) {
                console.error(`Error seeding ${doc.url}:`, err);
            }
        }
        return new Response(JSON.stringify({ status: "seeded" }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // ---------------------------------------------------------
    // ACTION: SYNC (Automatisation Canada.ca)
    // ---------------------------------------------------------
    if (action === 'sync') {
        const sourcesRes = await fetch(`${SUPABASE_URL}/rest/v1/canada_sources`, {
            headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
        });
        const sources = await sourcesRes.json();
        const results = [];

        for (const source of sources) {
            try {
                const pageRes = await fetch(source.url);
                const html = await pageRes.text();
                const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
                let content = mainMatch ? mainMatch[1] : html;
                content = content.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
                content = content.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
                content = content.replace(/<[^>]*>?/gm, " "); 
                content = content.replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); 

                const encoder = new TextEncoder();
                const data = encoder.encode(content);
                const hashBuffer = await crypto.subtle.digest("SHA-256", data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const newHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

                if (newHash === source.last_content_hash) {
                    results.push({ url: source.url, status: 'no_change' });
                    continue;
                }

                const embedding = await generateEmbedding(content.substring(0, 5000)); 
                await fetch(`${SUPABASE_URL}/rest/v1/canada_documents`, {
                    method: 'POST',
                    headers: { 
                        'apikey': SUPABASE_SERVICE_ROLE_KEY, 
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                        url: source.url,
                        title: source.title,
                        content: content.substring(0, 10000), 
                        embedding: embedding
                    })
                });

                await fetch(`${SUPABASE_URL}/rest/v1/canada_sources?url=eq.${encodeURIComponent(source.url)}`, {
                    method: 'PATCH',
                    headers: { 
                        'apikey': SUPABASE_SERVICE_ROLE_KEY, 
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        last_sync_at: new Date().toISOString(),
                        last_content_hash: newHash
                    })
                });

                results.push({ url: source.url, status: 'updated' });
            } catch (err) {
                console.error(`Erreur sync pour ${source.url}:`, err);
                results.push({ url: source.url, status: 'error', error: String(err) });
            }
        }
        return new Response(JSON.stringify({ results }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // ---------------------------------------------------------
    // ACTION: CHAT (Default)
    // ---------------------------------------------------------
    
    // 1. Generate Query Embedding
    const embedding = await generateEmbedding(message);
    
    // 2. Fetch RAG data and System Prompt
    let systemPrompt = "Réponds de manière professionnelle au nom d'Allo Canada.";
    let contextLines = "";

    try {
        const [settingsRes, ragRes, latestDrawRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.system_prompt&select=value`, {
            headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
          }),
          fetch(`${SUPABASE_URL}/rest/v1/rpc/match_canada_documents`, {
            method: 'POST',
            headers: { 
                'apikey': SUPABASE_SERVICE_ROLE_KEY, 
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query_embedding: embedding,
                match_threshold: 0.5,
                match_count: 5
            })
          }),
          fetch(`${SUPABASE_URL}/rest/v1/immigration_draws?select=*&order=draw_date.desc&limit=1`, {
            headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
          })
        ]);

        const settingsData = await settingsRes.json();
        const matchData = await ragRes.json();
        const latestDrawData = await latestDrawRes.json();

        if (Array.isArray(settingsData) && settingsData.length > 0) {
            systemPrompt = settingsData[0].value;
        }
        if (Array.isArray(matchData)) {
            contextLines = matchData.map((doc: any) => `Source [${doc.url}]:\n${doc.content}`).join('\n\n');
        }

        // Add Latest Draw to Context (Only if within 5 days)
        if (Array.isArray(latestDrawData) && latestDrawData.length > 0) {
            const draw = latestDrawData[0];
            const drawDate = new Date(draw.draw_date);
            const now = new Date();
            const diffDays = Math.ceil(Math.abs(now.getTime() - drawDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 5) {
                const drawInfo = `ALERTE - DERNIER TIRAGE DÉTECTÉ (RÉCENT) :
                Programme : ${draw.program}
                Date : ${draw.draw_date}
                Score minimum : ${draw.minimum_score}
                Invitations envoyées : ${draw.invitations_count}
                Type de tirage : ${draw.draw_type}`;

                systemPrompt += `\n\nACTUALITÉ RÉCENTE (À mentionner obligatoirement au début car le tirage a moins de 5 jours) :\n${drawInfo}`;
            }
        }
    } catch (err) {
        console.error("Data Fetch Error:", err);
    }

    // 3. Construct Final Prompt
    const suggestionsInstruction = `\n\nÀ la fin de chaque réponse, ajoute EXACTEMENT 3 suggestions de questions que l'utilisateur pourrait poser ensuite. Format EXACT:\n===SUGGESTIONS===\n1. [suggestion 1]\n2. [suggestion 2]\n3. [suggestion 3]`;
    
    const finalSystemPrompt = `${systemPrompt}

Contexte Officiel (Priorité absolue):
${contextLines}

INSTRUCTIONS DE RÉPONSE :
1. Utilise le "Contexte Officiel" ci-dessus pour toutes les informations contractuelles.
2. SÉCURITÉ DES LIENS : Ne fournis JAMAIS de liens inventés ou approximatifs. Utilise UNIQUEMENT les liens du RÉPERTOIRE DE LIENS OFFICIELS ci-dessous ou ceux provenant du Contexte Officiel.
3. Ne réponds jamais "Je ne sais pas" si tu peux donner une démarche à suivre basée sur les sources officielles.
4. RÈGLE ABSOLUE - LIEN ÉVALUATION LINGUISTIQUE : Lorsque tu parles de tests de langue, compétences linguistiques, NCLC, CLB, TCF, TEF, IELTS, CELPIP ou PTE, tu DOIS utiliser UNIQUEMENT ce lien : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/programme-immigration-atlantique/evaluation-competences-linquistiques.html
   NE JAMAIS utiliser le lien "documents-justificatifs-equivalences-langues" ni aucun autre lien inventé. Le seul lien autorisé pour l'évaluation linguistique est celui ci-dessus. C'est NON NÉGOCIABLE.
5. CONCISION ET FOCUS : Réponds directement à la question posée sans déborder sur d'autres sujets. Si la question est simple, la réponse doit être brève. N'élabore pas de plan complet (ex: 1. Trouver un emploi, 2. Immigration, 3. Prochaines étapes) sauf si cela est spécifiquement demandé.
6. CNP 2021 (RÈGLE CRITIQUE) : Depuis novembre 2022, tous les codes CNP doivent comporter 5 CHIFFRES. N'utilise JAMAIS les anciens codes à 4 chiffres (CNP 2016). Si un utilisateur cite un code à 4 chiffres (ex: 5241), corrige-le gentiment en lui donnant le code CNP 2021 correspondant (ex: 52120).
7. PROACTIVITÉ ALERTE : Si 'history' est vide ou contient moins de 2 messages, tu DOIS obligatoirement commencer ta réponse par mentionner l'actualité récente des tirages (donnée dans le bloc ACTUALITÉ RÉCENTE ci-dessus) de manière polie et informative. Ne l'ignore JAMAIS au début d'une conversation.

IMPORTANT - BARÈMES LINGUISTIQUES (PRIORITÉ ABSOLUE) :
[TCF CANADA]
- NCLC 10 : C.Oral(549-699), C.Écrit(549-699), E.Oral(16-20), E.Écrit(16-20)
- NCLC 9 : C.Oral(523-548), C.Écrit(524-548), E.Oral(14-15), E.Écrit(14-15)
- NCLC 8 : C.Oral(503-522), C.Écrit(499-523), E.Oral(12-13), E.Écrit(12-13)
- NCLC 7 : C.Oral(458-502), C.Écrit(453-498), E.Oral(10-11), E.Écrit(10-11)
- NCLC 6 : C.Oral(398-457), C.Écrit(406-452), E.Oral(7-9), E.Écrit(7-9)
- NCLC 5 : C.Oral(369-397), C.Écrit(375-405), E.Oral(6), E.Écrit(6)
- NCLC 4 : C.Oral(331-368), C.Écrit(342-374), E.Oral(4-5), E.Écrit(4-5)

[TEF CANADA - Nouveaux scores après 10 déc 2023]
- NCLC 10 : C.Oral(546-699), C.Écrit(546-699), E.Oral(556-699), E.Écrit(558-699)
- NCLC 9 : C.Oral(503-545), C.Écrit(503-545), E.Oral(518-555), E.Écrit(512-557)
- NCLC 8 : C.Oral(462-502), C.Écrit(462-502), E.Oral(494-517), E.Écrit(472-511)
- NCLC 7 : C.Oral(434-461), C.Écrit(434-461), E.Oral(456-493), E.Écrit(428-471)
- NCLC 6 : C.Oral(393-433), C.Écrit(393-433), E.Oral(422-455), E.Écrit(379-427)
- NCLC 5 : C.Oral(352-392), C.Écrit(352-392), E.Oral(387-421), E.Écrit(330-378)
- NCLC 4 : C.Oral(306-351), C.Écrit(306-351), E.Oral(328-386), E.Écrit(268-329)

[IELTS GENERAL TRAINING]
- CLB 10 : Écoute(8.5), Lecture(8.0), Écrit(7.5), Oral(7.5)
- CLB 9 : Écoute(8.0), Lecture(7.0), Écrit(7.0), Oral(7.0)
- CLB 8 : Écoute(7.5), Lecture(6.5), Écrit(6.5), Oral(6.5)
- CLB 7 : Écoute(6.0), Lecture(6.0), Écrit(6.0), Oral(6.0)
- CLB 6 : Écoute(5.5), Lecture(5.0), Écrit(5.5), Oral(5.5)
- CLB 5 : Écoute(5.0), Lecture(4.0), Écrit(5.0), Oral(5.0)
- CLB 4 : Écoute(4.5), Lecture(3.5), Écrit(4.0), Oral(4.0)

[CELPIP GENERAL]
- Le niveau CLB/NCLC équivaut exactement au score obtenu (ex: Score 7 = CLB 7, Score 8 = CLB 8).

[PTE CORE]
- CLB 10 : Écoute(89–90), Lecture(88–90), Écrit(90), Oral(89–90)
- CLB 9  : Écoute(82–88), Lecture(78–87), Écrit(88–89), Oral(84–88)
- CLB 8  : Écoute(71–81), Lecture(69–77), Écrit(79–87), Oral(76–83)
- CLB 7  : Écoute(60–70), Lecture(60–68), Écrit(69–78), Oral(68–75)
- CLB 6  : Écoute(50–59), Lecture(51–59), Écrit(60–68), Oral(59–67)
- CLB 5  : Écoute(39–49), Lecture(42–50), Écrit(51–59), Oral(51–58)
- CLB 4  : Écoute(28–38), Lecture(33–41), Écrit(41–50), Oral(42–50)

ALGORITHME DE CONVERSION INTERNE (OBLIGATOIRE) :
1. Demande à l'utilisateur quel test il a passé (TCF ou TEF).
2. Vérifie la compétence (Oral, Écrit, Expression, Compréhension).
3. Identifie la plage EXACTE dans le tableau correspondant ci-dessus.
4. Si un score est à la limite (ex: 433 Oral TEF), il appartient au niveau INFÉRIEUR (NCLC 6). Il faut atteindre le seuil suivant (434) pour passer au niveau supérieur (NCLC 7).
5. Ne jamais inventer ou estimer un score. Si tu as un doute, cite le tableau et explique que le score est à la limite.

IMPORTANT - PROGRAMME IMMIGRATION CANADA ATLANTIQUE (NCLC MINIMUM) :
- Offre d'emploi FEER 0, 1, 2 ou 3 → NCLC 5 minimum dans les 4 volets
- Offre d'emploi FEER 4 → NCLC 4 minimum dans les 4 volets
- Tests approuvés (français) : TEF Canada, TCF Canada
- Tests approuvés (anglais) : CELPIP-General, IELTS General Training, PTE Core
- Les résultats de test doivent dater de moins de 2 ans au moment de la demande.
- Source : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/programme-immigration-atlantique/evaluation-competences-linquistiques.html

============================================================
RÉPERTOIRE DE LIENS OFFICIELS (OBLIGATOIRE - NE JAMAIS INVENTER DE LIENS)
============================================================

--- PROCESSUS ENTRÉE EXPRESS ---
• Création compte WES pour EDE (Évaluation des Diplômes) : https://applications.wes.org/createaccount/home/select-eval-type?ln=1
  → Utiliser quand : le candidat parle d'évaluation de diplômes, WES, EDE, ECA, équivalence de diplômes pour Entrée Express

• Calcul admissibilité 67 points (PTQF) : https://www.nvimmigration.ca/67-calculator/
  → Utiliser quand : le candidat veut savoir s'il atteint 67/100 pour le Programme des travailleurs qualifiés féderal. Tu DOIS aussi être capable de calculer les 67 points toi-même en posant les questions sur les 6 facteurs (langue, éducation, expérience, âge, emploi réservé, adaptabilité).

• Simulation score CRS/SCG Entrée Express : https://www.cic.gc.ca/francais/immigrer/qualifie/scg-outil.asp
  → Utiliser quand : le candidat veut simuler son score CRS sur 1200 points. Tu DOIS aussi être capable de faire une estimation du score CRS en posant les questions pertinentes au candidat.

• Obtention du Code de référence (Outil Venir au Canada) : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/outil-venir-canada-immigration-entree-express.html
  → Utiliser quand : le candidat veut déterminer son admissibilité Entrée Express ou obtenir un code de référence personnel. Tu DOIS guider le candidat étape par étape.

• Création du Profil Entrée Express (Compte IRCC / CléGC) : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/demande/compte.html
  → Utiliser quand : le candidat veut créer son profil en ligne, s'inscrire sur le portail IRCC, créer un compte CléGC, ou se connecter à son compte. Tu DOIS maîtriser les étapes de création de compte et d'inscription.

--- IMMIGRATION QUÉBEC (ARRIMA) ---
• Simulation Score Arrima : https://arrima.immigration-quebec.gouv.qc.ca/monespacepublic/calculette/sommaire
  → Utiliser quand : le candidat veut simuler son score pour le PRTQ du Québec. Tu DOIS connaître les facteurs de sélection Arrima.

• Déclaration d'intérêt Arrima : https://www.quebec.ca/immigration/services-en-ligne
  → Utiliser quand : le candidat veut soumettre une déclaration d’intérêt pour immigrer au Québec.

• Portail Arrima (informations immigration Québec) : https://arrima.immigration-quebec.gouv.qc.ca
  → Utiliser quand : le candidat cherche des informations générales sur les programmes d'immigration du Québec (PRTQ, PEQ, CSQ).

--- ÉVALUATION DES DIPLÔMES (EDE/ECA) ---
• WES (World Education Services) : https://applications.wes.org/createaccount/home/select-eval-type?ln=1
• ICAS (International Credential Assessment Service) : https://www.icascanada.ca
• CES (Comparative Education Service - Université de Toronto) : https://learn.utoronto.ca/comparative-education-service
• IQAS (International Qualifications Assessment Service - Alberta) : https://www.alberta.ca/iqas
  → Utiliser quand : le candidat demande où faire évaluer ses diplômes, quels organismes sont agréés par IRCC, ou comment faire une équivalence de diplômes.

--- PLATEFORMES DE RECHERCHE D’EMPLOI AU CANADA ---
Lorsqu'un candidat cherche un emploi au Canada, propose les plateformes suivantes en fonction de son profil :

PLATEFORMES GÉNÉRALISTES (tout le Canada) :
• Job Bank (Guichet-Emplois - Gouvernement du Canada) : https://www.jobbank.gc.ca — Plateforme officielle du gouvernement fédéral, offres d'emploi vérifiées, outil de recherche par CNP, informations sur le marché du travail canadien, idéal pour les immigrants.
• Indeed Canada : https://www.indeed.ca — Plus grand moteur de recherche d'emploi au Canada, agrégateur d'offres de tous secteurs, permet de postuler directement.
• LinkedIn Jobs : https://www.linkedin.com/jobs — Réseau professionnel #1, idéal pour le réseautage et les postes qualifiés/cadres, permet de contacter directement les recruteurs.
• Talent.com : https://www.talent.com — Agrégateur d'offres couvrant tout le Canada, informations salariales, postes dans tous les secteurs.
• Workopolis : https://www.workopolis.com — Plateforme historique canadienne d'emploi, couvre tout le pays.
• Monster Canada : https://www.monster.ca — Plateforme internationale présente au Canada, tout types d'emplois.
• Glassdoor Canada : https://www.glassdoor.ca — Offres d’emploi + avis sur les entreprises et salaires, utile pour comparer les employeurs avant de postuler.
• Eluta.ca : https://www.eluta.ca — Moteur de recherche d’emploi indexant les sites carrières des meilleurs employeurs au Canada.

PLATEFORMES SPÉCIFIQUES AU QUÉBEC :
• Guichet-Emplois Québec : https://www.quebec.ca/emploi — Portail emploi du gouvernement du Québec, offres dans la fonction publique et privée.
• Jobillico : https://www.jobillico.com — Plateforme québécoise populaire, interface en français, forte présence au Québec et au Nouveau-Brunswick.
• Jobboom : https://www.jobboom.com — Plateforme québécoise, offres diversifiées, articles sur le marché de l'emploi.
• Clic Emploi : https://www.clicemploi.ca — Plateforme québécoise pour emplois locaux et régionaux.
• Emploi Montréal : https://www.emploi-montreal.net — Spécialisée dans les emplois dans la grande région de Montréal.
• Emploi Laval : https://www.emplois.laval.ca — Emplois dans la ville de Laval et ses environs.
• Placement étudiant Québec : https://www.placement.emploiquebec.gouv.qc.ca — Emplois étudiants et stages au Québec.

PLATEFORMES SPÉCIALISÉES :
• Emplois GC (fonction publique fédérale) : https://www.jobs.gc.ca — Postes dans la fonction publique fédérale du Canada, processus de recrutement officiel.
• Emploi Santé Québec : https://www.sante.gouv.qc.ca — Emplois dans le secteur de la santé au Québec (infirmières, médecins, préposés, etc.).
• BDC (Banque de développement du Canada) : https://www.bdc.ca — Ressources pour les entrepreneurs immigrants et offres dans le secteur bancaire/entrepreneuriat.

RESSOURCES POUR IMMIGRANTS :
• Immigrant Québec : https://www.immigrantquebec.com — Guide complet pour les immigrants au Québec, offres d'emploi, conseils d'intégration, formation.
• CANADIM : https://www.canadim.com — Ressources immigration et emploi, conseils juridiques, guides pour les nouveaux arrivants au Canada.

CONSIGNE POUR LA RECHERCHE D’EMPLOI :
- Si le candidat est francophone et veut travailler au Québec → Propose en priorité : Jobillico, Jobboom, Guichet-Emplois Québec, Immigrant Québec
- Si le candidat cherche dans la fonction publique → Propose : Emplois GC (jobs.gc.ca) et Guichet-Emplois
- Si le candidat est un professionnel qualifié → Propose : LinkedIn, Indeed, Glassdoor
- Si le candidat cherche dans le secteur santé → Propose : Emploi Santé Québec
- Si le candidat est entrepreneur → Propose : BDC
- Dans TOUS les cas, mentionne Job Bank (jobbank.gc.ca) comme source officielle gouvernementale
============================================================

${suggestionsInstruction}`;

    // 4. API Call
    const aiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
            { role: 'system', content: finalSystemPrompt },
            ...(history || []),
            { role: 'user', content: message }
        ],
        temperature: 0.7,
      })
    })

    const aiData = await aiResponse.json()
    if (aiData.error) throw new Error(`DeepSeek API Error: ${aiData.error.message}`)
    
    const rawReply = aiData.choices[0].message.content
    let reply = rawReply
    let suggestions: string[] = []
    
    if (rawReply.includes('===SUGGESTIONS===')) {
        const parts = rawReply.split('===SUGGESTIONS===')
        reply = parts[0].trim()
        suggestions = parts[1].trim().split('\n')
            .map((s: string) => s.replace(/^\d+\.\s*/, '').trim())
            .filter((s: string) => s.length > 0)
            .slice(0, 3)
    }

    // 5. Persistance (Supprimée car gérée par le client js/chat.js pour éviter les erreurs de format d'ID)
    console.log(`Réponse générée pour la session: ${conversation_id || 'guest'}`);

    return new Response(JSON.stringify({ reply, suggestions }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Global Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
