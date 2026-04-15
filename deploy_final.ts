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
            content: "Cet outil officiel de Canada.ca permet de trouver son code CNP 2021 Ã  l'aide de l'intitulÃ© du poste ou d'une recherche par catÃ©gorie FEER. C'est la source de rÃ©fÃ©rence pour confirmer l'admissibilitÃ© des mÃ©tiers aux programmes d'immigration."
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/demande/qualifier/tests-langue.html',
            title: 'EntrÃ©e express : RÃ©sultats d\'examen linguistique',
            content: 'Pour le traitement de votre profil et la demande d\'EntrÃ©e express, vous devez prouver vos compÃ©tences linguistiques en franÃ§ais ou en anglais en passant un test linguistique approuvÃ© (TEF, TCF, IELTS, CELPIP). Vos rÃ©sultats doivent dater de moins de deux ans le jour oÃ¹ vous prÃ©sentez votre demande de rÃ©sidence permanente.'
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/programme-immigration-atlantique/evaluation-competences-linquistiques.html',
            title: 'Ã‰valuation des compÃ©tences linguistiques (Programme d\'immigration au Canada atlantique)',
            content: `PROGRAMME D'IMMIGRATION AU CANADA ATLANTIQUE - COMPÃ‰TENCES LINGUISTIQUES :
            Pour dÃ©montrer vos compÃ©tences linguistiques en franÃ§ais ou en anglais, vous devez passer un test de langue approuvÃ©.
            Les rÃ©sultats doivent avoir Ã©tÃ© obtenus moins de 2 ans avant le jour oÃ¹ vous prÃ©sentez votre demande.

            SCORE MINIMUM REQUIS (selon la catÃ©gorie FEER de la CNP de votre offre d'emploi) :
            - Offre d'emploi FEER 0, 1, 2 ou 3 â†’ NCLC 5 minimum (dans les 4 volets)
            - Offre d'emploi FEER 4 â†’ NCLC 4 minimum (dans les 4 volets)

            TESTS APPROUVÃ‰S :
            FranÃ§ais : TEF Canada (Test d'Ã©valuation de franÃ§ais) | TCF Canada (Test de connaissance du franÃ§ais)
            Anglais : CELPIP-General | IELTS General Training | PTE Core (Pearson Test of English)

            IMPORTANT : Joindre une copie des rÃ©sultats Ã  votre demande si vous atteignez le score minimum dans les 4 volets (comprÃ©hension orale, comprÃ©hension Ã©crite, expression orale, expression Ã©crite).`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/demande/fonds.html',
            title: 'Preuve de fonds - EntrÃ©e express',
            content: 'Vous devez prouver que vous avez assez d\'argent pour vous Ã©tablir au Canada avec votre famille, Ã  moins que vous ne soyez autorisÃ© Ã  travailler au Canada ET que vous ayez une offre d\'emploi valide d\'un employeur au Canada. Pour un demandeur seul en 2024, le montant minimum requis est de 13 757 $ CAD.'
          },
          {
              url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/travailler-canada/permis/mobilite-francophone.html',
              title: 'Programme de MobilitÃ© francophone',
              content: 'MobilitÃ© francophone permet aux employeurs canadiens de recruter des travailleurs francophones qualifiÃ©s hors du QuÃ©bec. Il s\'agit d\'une dispense de l\'Ã©tude d\'impact sur le marchÃ© du travail (EIMT), code de dispense C16. Les candidats doivent prouver un niveau de franÃ§ais d\'au moins NCLC 5.'
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/admissibilite/criteres-systeme-classement-global.html',
            title: 'Calculatrice du SCG - Facteurs de base',
            content: `CRITÃˆRES CRS (SYSTÃˆME DE CLASSEMENT GLOBAL) - MARS 2025
            FACTEURS DE BASE :
            - Ã‚ge (max 110/100) : 20-29 ans = 110 (sans conjoint) / 100 (avec). Le score baisse aprÃ¨s 30 ans.
            - ScolaritÃ© (max 150/140) : Doctorat = 150/140, MaÃ®trise = 135/126, BaccalaurÃ©at (3 ans+) = 120/112.
            - Langue Officielle 1 (max 136/128) : NCLC 7 = 17/16 par compÃ©tence, NCLC 9 = 31/29, NCLC 10+ = 34/32.
            - ExpÃ©rience Canadienne (max 80/70) : 1 an = 40/35, 2 ans = 53/46, 5 ans+ = 80/70.
            NOTE : Les points pour offre d'emploi (EIMT) ont Ã©tÃ© supprimÃ©s en Mars 2025.`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/verifier-note/criteries-scg.html',
            title: 'Points supplÃ©mentaires CRS',
            content: `POINTS SUPPLÃ‰MENTAIRES ET TRANSFÃ‰RABILITÃ‰ :
            - Nomination provinciale : +600 points
            - FrÃ¨re/Soeur au Canada (RP/Citoyen) : +15 points
            - Ã‰tudes au Canada : +15 (1-2 ans) ou +30 (3 ans+)
            - FranÃ§ais (NCLC 7+) + Anglais (NCLC 5+) : +50 points
            - FranÃ§ais (NCLC 7+) seul : +25 points
            TRANSFÃ‰RABILITÃ‰ (Max 100) : Combinaison Ã©tudes+langue ou expÃ©rience+langue.`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/admissibilite/cnp.html',
            title: 'Identification du code CNP 2021 et FEER',
            content: `SYSTÃˆME CNP 2021 (CLASSIFICATION NATIONALE DES PROFESSIONS)
            Le code comporte 5 chiffres. Le 2Ã¨me chiffre indique la catÃ©gorie FEER (0 Ã  5).
            - FEER 0 (Gestion) : Directeurs, gestionnaires.
            - FEER 1 (Uni) : NÃ©cessite un diplÃ´me universitaire.
            - FEER 2 (CollÃ©gial 2 ans+) : NÃ©cessite diplÃ´me collÃ©gial ou apprentissage de 2 ans+.
            - FEER 3 (CollÃ©gial -2 ans) : NÃ©cessite diplÃ´me collÃ©gial de moins de 2 ans.
            - FEER 4 (Secondaire) : NÃ©cessite un diplÃ´me d'Ã©tudes secondaires.
            - FEER 5 (Emploi) : Formation en cours d'emploi.
            ADMISSIBILITÃ‰ : Seuls les FEER 0, 1, 2 et 3 sont admissibles Ã  EntrÃ©e Express.
            IMPORTANT : Les fonctions principales (tÃ¢ches) priment sur l'intitulÃ© du poste.`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/demande/qualifier/tests-langue/equivalence-nclc.html',
            title: 'BarÃ¨me Officiel de Cotation Linguistique (NCLC/CLB) - TCF, TEF, IELTS, CELPIP, PTE',
            content: `TABLEAUX DE CORRESPONDANCE NCLC/CLB OFFICIELS (MAJ 2024) :
            
            1. TCF CANADA :
            | NCLC | C.Ã‰crit | E.Ã‰crite | C.Oral | E.Orale |
            |------|---------|----------|--------|---------|
            | 10   | 549-699 | 16-20    | 549-699| 16-20   |
            | 9    | 524-548 | 14-15    | 523-548| 14-15   |
            | 8    | 499-523 | 12-13    | 503-522| 12-13   |
            | 7    | 453-498 | 10-11    | 458-502| 10-11   |
            | 6    | 406-452 | 7-9      | 398-457| 7-9     |
            | 5    | 375-405 | 6        | 369-397| 6       |
            | 4    | 342-374 | 4-5      | 331-368| 4-5     |

            2. TEF CANADA (AprÃ¨s le 11 DÃ©cembre 2023) :
            | NCLC | C.Ã‰crit | E.Ã‰crite | C.Oral | E.Orale |
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

            CONSIGNE STRICTE : Ne jamais inventer de plages de scores. PrioritÃ© absolue aux tableaux ci-dessus.`
          },
          // ====== NOUVEAUX DOCUMENTS DE CONNAISSANCE ======
          {
            url: 'https://applications.wes.org/createaccount/home/select-eval-type?ln=1',
            title: 'CrÃ©ation du Compte WES pour EDE (Ã‰valuation des DiplÃ´mes d\'Ã‰tudes)',
            content: `CRÃ‰ATION DU COMPTE WES POUR L'Ã‰VALUATION DES DIPLÃ”MES (EDE) :
            WES (World Education Services) est l'un des organismes dÃ©signÃ©s par IRCC pour effectuer l'Ã‰valuation des DiplÃ´mes d'Ã‰tudes (EDE) nÃ©cessaire Ã  l'immigration au Canada.
            
            Ã‰TAPES DE CRÃ‰ATION DU COMPTE WES :
            1. Aller sur https://applications.wes.org/createaccount/home/select-eval-type?ln=1
            2. SÃ©lectionner le type d'Ã©valuation : "WES Standard Application" (ECA pour IRCC)
            3. CrÃ©er un compte avec adresse courriel et mot de passe
            4. Remplir le formulaire de demande en ligne avec vos informations personnelles et acadÃ©miques
            5. Payer les frais d'Ã©valuation
            6. Envoyer vos documents acadÃ©miques (relevÃ©s de notes, diplÃ´mes) directement depuis votre Ã©tablissement d'enseignement Ã  WES
            7. WES Ã©value vos diplÃ´mes et Ã©met un rapport d'Ã©quivalence canadienne
            
            IMPORTANT : L'EDE est obligatoire pour les diplÃ´mes obtenus hors du Canada dans le cadre d'EntrÃ©e Express.
            Le rapport WES est valide 5 ans Ã  partir de la date d'Ã©mission.
            Lien officiel : https://applications.wes.org/createaccount/home/select-eval-type?ln=1`
          },
          {
            url: 'https://www.nvimmigration.ca/67-calculator/',
            title: 'Calculateur d\'admissibilitÃ© 67 points - Programme des travailleurs qualifiÃ©s (fÃ©dÃ©ral)',
            content: `CALCUL D'ADMISSIBILITÃ‰ ENTRÃ‰E EXPRESS - 67 POINTS SUR 100 :
            Pour immigrer au Canada via le Programme des travailleurs qualifiÃ©s (fÃ©dÃ©ral - PTQF), vous devez obtenir au minimum 67 points sur 100 basÃ©s sur 6 facteurs de sÃ©lection :

            1. LANGUE OFFICIELLE (max 28 points) :
               - PremiÃ¨re langue : max 24 pts (6 pts par compÃ©tence si NCLC 9+, 5 si NCLC 8, 4 si NCLC 7, 0 si < NCLC 7)
               - DeuxiÃ¨me langue : max 4 pts (4 pts si NCLC 5+ dans les 4 compÃ©tences)
               - NCLC 7 minimum requis dans la premiÃ¨re langue officielle pour Ãªtre admissible

            2. Ã‰DUCATION (max 25 points) :
               - Doctorat : 25 pts
               - MaÃ®trise ou diplÃ´me professionnel : 23 pts
               - Deux diplÃ´mes ou plus (dont un de 3 ans+) : 22 pts
               - DiplÃ´me de 3 ans+ : 21 pts
               - DiplÃ´me de 2 ans : 19 pts
               - DiplÃ´me de 1 an : 15 pts
               - DiplÃ´me d'Ã©tudes secondaires : 5 pts

            3. EXPÃ‰RIENCE DE TRAVAIL (max 15 points) :
               - 1 an : 9 pts | 2-3 ans : 11 pts | 4-5 ans : 13 pts | 6 ans+ : 15 pts
               - L'expÃ©rience doit Ãªtre en emploi qualifiÃ© CNP FEER 0, 1, 2 ou 3

            4. Ã‚GE (max 12 points) :
               - 18-35 ans : 12 pts | 36 ans : 11 | 37 : 10 | 38 : 9 | 39 : 8 | 40 : 7 | 41 : 6 | 42 : 5 | 43 : 4 | 44 : 3 | 45 : 2 | 46 : 1 | 47+ : 0

            5. EMPLOI RÃ‰SERVÃ‰ AU CANADA (max 10 points) :
               - Oui avec EIMT : 10 pts | Non : 0 pts

            6. ADAPTABILITÃ‰ (max 10 points) :
               - Langue du conjoint : 5 pts | Ã‰tudes antÃ©rieures au Canada : 5 pts | Ã‰tudes du conjoint au Canada : 5 pts
               - ExpÃ©rience antÃ©rieure au Canada : 10 pts | Exp. conjoint au Canada : 5 pts | Emploi rÃ©servÃ© : 5 pts | Parents au Canada : 5 pts

            RÃ‰SULTAT : â‰¥ 67 points = Admissible | < 67 points = Non admissible au PTQF
            Lien calculateur : https://www.nvimmigration.ca/67-calculator/`
          },
          {
            url: 'https://www.cic.gc.ca/francais/immigrer/qualifie/scg-outil.asp',
            title: 'Simulation Score EntrÃ©e Express (SCG/CRS) - Outil officiel Canada.ca',
            content: `SIMULATION DU SCORE ENTRÃ‰E EXPRESS (SCG - SYSTÃˆME DE CLASSEMENT GLOBAL) :
            L'outil officiel du gouvernement du Canada permet de calculer votre score CRS/SCG sur 1200 points.
            
            COMPOSITION DU SCORE (max 1200 points) :
            A. COMPÃ‰TENCES DE BASE + CONJOINT (max 500 si seul / 460 si avec conjoint) :
               - Ã‚ge : max 110 (seul) / 100 (avec conjoint)
               - ScolaritÃ© : max 150 / 140
               - PremiÃ¨re langue officielle : max 136 / 128
               - DeuxiÃ¨me langue officielle : max 24 / 22
               - ExpÃ©rience canadienne : max 80 / 70

            B. FACTEURS Ã‰POUX/CONJOINT (max 40 points si applicable) :
               - ScolaritÃ© du conjoint : max 10 pts
               - Langue du conjoint : max 20 pts
               - ExpÃ©rience canadienne du conjoint : max 10 pts

            C. TRANSFÃ‰RABILITÃ‰ DES COMPÃ‰TENCES (max 100 points) :
               - Ã‰ducation + Langue
               - Ã‰ducation + ExpÃ©rience canadienne
               - ExpÃ©rience Ã©trangÃ¨re + Langue
               - ExpÃ©rience Ã©trangÃ¨re + ExpÃ©rience canadienne
               - Certificat de qualification (mÃ©tiers spÃ©cialisÃ©s) + Langue

            D. POINTS SUPPLÃ‰MENTAIRES (max 600 points) :
               - Nomination provinciale (PNP) : +600 pts
               - FrÃ¨re/sÅ“ur citoyen ou RP au Canada : +15 pts
               - Ã‰tudes au Canada (1-2 ans) : +15 pts | (3 ans+) : +30 pts
               - FranÃ§ais NCLC 7+ et anglais CLB 5+ : +50 pts
               - FranÃ§ais NCLC 7+ sans anglais : +25 pts
               - NOTE : Points pour offre d'emploi supprimÃ©s depuis mars 2025.

            UTILISATION : RÃ©pondre aux questions sur l'Ã¢ge, la scolaritÃ©, les langues, l'expÃ©rience et les facteurs supplÃ©mentaires.
            La note minimale d'invitation varie Ã  chaque ronde d'invitations.
            Lien officiel : https://www.cic.gc.ca/francais/immigrer/qualifie/scg-outil.asp`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/outil-venir-canada-immigration-entree-express.html',
            title: 'Obtention du Code de rÃ©fÃ©rence - Outil Venir au Canada',
            content: `OUTIL "VENIR AU CANADA" - DÃ‰TERMINER SON ADMISSIBILITÃ‰ ENTRÃ‰E EXPRESS :
            Cet outil officiel de Canada.ca permet de vÃ©rifier votre admissibilitÃ© aux programmes d'immigration gÃ©rÃ©s par EntrÃ©e Express.
            
            PROCESSUS :
            1. Aller sur https://www.canada.ca/fr/immigration-refugies-citoyennete/services/outil-venir-canada-immigration-entree-express.html
            2. Cliquer sur "DÃ©terminez votre admissibilitÃ©"
            3. RÃ©pondre aux questions (10-15 minutes) portant sur :
               - NationalitÃ© et pays de rÃ©sidence
               - Ã‚ge
               - MaÃ®trise des langues officielles (franÃ§ais/anglais)
               - Membres de votre famille
               - Niveau d'Ã©tudes
               - ExpÃ©rience de travail
               - Fonds disponibles
               - DÃ©tails de toute offre d'emploi au Canada
            4. Ã€ la fin, l'outil indique les programmes auxquels vous Ãªtes admissible :
               - Programme des travailleurs qualifiÃ©s (fÃ©dÃ©ral)
               - Programme des mÃ©tiers spÃ©cialisÃ©s (fÃ©dÃ©ral)
               - CatÃ©gorie de l'expÃ©rience canadienne
            5. Vous recevez un CODE DE RÃ‰FÃ‰RENCE PERSONNEL (valide 60 jours)
            6. Utilisez ce code lors de la crÃ©ation de votre profil EntrÃ©e Express dans votre compte IRCC
            
            IMPORTANT : Le code de rÃ©fÃ©rence ne fonctionnera pas si vous avez dÃ©jÃ  crÃ©Ã© un profil dans votre compte avant d'utiliser l'outil.
            Lien officiel : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/outil-venir-canada-immigration-entree-express.html`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/demande/compte.html',
            title: 'CrÃ©ation du Profil EntrÃ©e Express - Compte sÃ©curisÃ© IRCC et ClÃ©GC',
            content: `CRÃ‰ATION DU PROFIL ENTRÃ‰E EXPRESS - COMPTE IRCC :
            Pour crÃ©er un profil EntrÃ©e Express, vous devez d'abord avoir un compte sÃ©curisÃ© auprÃ¨s d'IRCC.
            
            Ã‰TAPES DE CRÃ‰ATION DU COMPTE :
            1. Aller sur https://www.canada.ca/fr/immigration-refugies-citoyennete/services/demande/compte.html
            2. Cliquer sur "S'inscrire Ã  un compte"
            3. Choisir votre mÃ©thode de connexion :
               a) ClÃ©GC (Nom d'utilisateur et mot de passe) - RecommandÃ©
               b) Partenaire de connexion canadien InteracÂ® (connexion bancaire)
            4. CrÃ©er vos identifiants ClÃ©GC :
               - CrÃ©er un nom d'utilisateur unique
               - CrÃ©er un mot de passe sÃ©curisÃ©
               - Configurer les questions de rÃ©cupÃ©ration
               - Activer l'authentification Ã  deux facteurs (obligatoire)
            5. Une fois le compte crÃ©Ã©, vous pouvez :
               - CrÃ©er un profil EntrÃ©e Express
               - Suivre vos demandes existantes
               - Soumettre des documents

            TYPES DE DEMANDES SUPPORTÃ‰ES PAR CE COMPTE :
            - EntrÃ©e express, Permis de travail, Permis d'Ã©tudes, ExpÃ©rience internationale Canada (EIC)
            - Visa de visiteur, Parrainage familial, Programme d'immigration atlantique, PNP
            
            AIDE CONNEXION :
            - ClÃ©GC support : 1-855-438-1102 (Canada/US), 1-800-2318-6290 (International)
            - Disponible 24h/24, 7j/7
            
            Lien officiel : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/demande/compte.html`
          },
          {
            url: 'https://arrima.immigration-quebec.gouv.qc.ca/monespacepublic/calculette/sommaire',
            title: 'Simulation Score Arrima - Immigration QuÃ©bec',
            content: `SIMULATION DE SCORE ARRIMA - PROGRAMME RÃ‰GULIER DES TRAVAILLEURS QUALIFIÃ‰S (PRTQ) DU QUÃ‰BEC :
            Arrima est le portail d'immigration du QuÃ©bec. La calculette permet d'estimer votre score dans le cadre du PRTQ.
            
            FACTEURS DE SÃ‰LECTION ARRIMA :
            1. FORMATION (max points variables) :
               - Niveau de scolaritÃ© (diplÃ´me le plus Ã©levÃ©)
               - Domaine de formation (domaines privilÃ©giÃ©s au QuÃ©bec)
            2. EXPÃ‰RIENCE PROFESSIONNELLE :
               - DurÃ©e et type d'expÃ©rience
               - ExpÃ©rience au QuÃ©bec/Canada (bonifiÃ©e)
            3. Ã‚GE :
               - Les 18-35 ans obtiennent le maximum de points
            4. COMPÃ‰TENCES LINGUISTIQUES :
               - FranÃ§ais (TEF/TCF) : trÃ¨s valorisÃ© au QuÃ©bec
               - Anglais : points supplÃ©mentaires
            5. SÃ‰JOUR ET FAMILLE AU QUÃ‰BEC :
               - SÃ©jour antÃ©rieur au QuÃ©bec
               - Famille au QuÃ©bec
            6. CARACTÃ‰RISTIQUES DU CONJOINT :
               - ScolaritÃ©, langue, expÃ©rience du conjoint
            7. OFFRE D'EMPLOI VALIDÃ‰E :
               - Offre d'emploi permanent au QuÃ©bec
            8. ENFANTS :
               - Nombre d'enfants Ã  charge

            PROCESSUS :
            1. Aller sur https://arrima.immigration-quebec.gouv.qc.ca/monespacepublic/calculette/sommaire
            2. Remplir chaque section du formulaire
            3. Obtenir votre score estimÃ©
            
            IMPORTANT : Le score de sÃ©lection pour recevoir une invitation varie selon les rondes. La maÃ®trise du franÃ§ais est ESSENTIELLE pour maximiser ses chances au QuÃ©bec.
            Lien officiel : https://arrima.immigration-quebec.gouv.qc.ca/monespacepublic/calculette/sommaire`
          },
          {
            url: 'https://www.quebec.ca/immigration/services-en-ligne',
            title: 'DÃ©claration d\'intÃ©rÃªt Arrima - Services en ligne Immigration QuÃ©bec',
            content: `DÃ‰CLARATION D'INTÃ‰RÃŠT ARRIMA - IMMIGRATION QUÃ‰BEC :
            La dÃ©claration d'intÃ©rÃªt est la premiÃ¨re Ã©tape pour immigrer au QuÃ©bec via le Programme rÃ©gulier des travailleurs qualifiÃ©s (PRTQ).
            
            PROCESSUS DE DÃ‰CLARATION D'INTÃ‰RÃŠT :
            1. Aller sur https://www.quebec.ca/immigration/services-en-ligne
            2. CrÃ©er un compte Arrima ou se connecter Ã  un compte existant
            3. Remplir la dÃ©claration d'intÃ©rÃªt avec les informations requises :
               - IdentitÃ© et coordonnÃ©es
               - Situation familiale
               - Formation et diplÃ´mes
               - ExpÃ©rience professionnelle
               - CompÃ©tences linguistiques (franÃ§ais obligatoire)
               - Liens avec le QuÃ©bec (famille, sÃ©jours, offre d'emploi)
            4. Soumettre la dÃ©claration - elle restera active dans la banque de dÃ©clarations d'intÃ©rÃªt
            5. Le MIFI (MinistÃ¨re de l'Immigration, de la Francisation et de l'IntÃ©gration) effectue des rondes de sÃ©lection
            6. Si sÃ©lectionnÃ©, vous recevez une invitation Ã  prÃ©senter une demande de sÃ©lection permanente (DSQ)
            
            CONDITIONS :
            - La dÃ©claration est valide 12 mois et peut Ãªtre mise Ã  jour
            - La maÃ®trise du franÃ§ais est un critÃ¨re majeur de sÃ©lection
            - Les domaines de formation en demande au QuÃ©bec sont privilÃ©giÃ©s
            
            Lien officiel : https://www.quebec.ca/immigration/services-en-ligne`
          },
          {
            url: 'https://arrima.immigration-quebec.gouv.qc.ca',
            title: 'Portail Arrima - Immigration QuÃ©bec',
            content: `PORTAIL ARRIMA - IMMIGRATION QUÃ‰BEC :
            Arrima est le systÃ¨me de gestion des demandes d'immigration du QuÃ©bec, gÃ©rÃ© par le MIFI.
            
            PROGRAMMES ACCESSIBLES VIA ARRIMA :
            - Programme rÃ©gulier des travailleurs qualifiÃ©s (PRTQ)
            - Programme de l'expÃ©rience quÃ©bÃ©coise (PEQ)
            - Programme des travailleurs qualifiÃ©s (anciennement)
            
            FONCTIONNALITÃ‰S DU PORTAIL :
            - CrÃ©er et gÃ©rer sa dÃ©claration d'intÃ©rÃªt
            - Consulter l'Ã©tat de sa demande
            - Soumettre des documents
            - AccÃ©der Ã  la calculette de score
            - Consulter les informations sur les programmes d'immigration du QuÃ©bec
            
            SPÃ‰CIFICITÃ‰S IMMIGRATION QUÃ‰BEC :
            - Le QuÃ©bec a son propre systÃ¨me de sÃ©lection, distinct d'EntrÃ©e Express fÃ©dÃ©ral
            - Le CSQ (Certificat de sÃ©lection du QuÃ©bec) est requis avant la demande de rÃ©sidence permanente fÃ©dÃ©rale
            - Le franÃ§ais est fortement valorisÃ© (critÃ¨re de sÃ©lection majeur)
            - Les domaines de formation en demande au QuÃ©bec donnent des points supplÃ©mentaires
            
            Lien officiel : https://arrima.immigration-quebec.gouv.qc.ca`
          },
          {
            url: 'https://www.icascanada.ca',
            title: 'ICAS Canada - Ã‰valuation des diplÃ´mes pour l\'immigration',
            content: `ORGANISMES DÃ‰SIGNÃ‰S POUR L'Ã‰VALUATION DES DIPLÃ”MES D'Ã‰TUDES (EDE) AU CANADA :
            L'EDE est obligatoire pour les diplÃ´mes obtenus hors du Canada dans le cadre des programmes d'immigration.
            
            ORGANISMES AGRÃ‰Ã‰S PAR IRCC :
            1. WES (World Education Services) - Le plus populaire
               â†’ https://applications.wes.org/createaccount/home/select-eval-type?ln=1
               - DÃ©lai moyen : 20-35 jours ouvrables
               - Accepte les diplÃ´mes de la plupart des pays
               
            2. ICAS (International Credential Assessment Service)
               â†’ https://www.icascanada.ca
               - BasÃ© en Ontario
               - Offre des Ã©valuations pour l'immigration et les Ã©tudes
               
            3. CES (Comparative Education Service) - UniversitÃ© de Toronto
               â†’ https://learn.utoronto.ca/comparative-education-service
               - Un des organismes les plus anciens au Canada
               - Reconnu pour son expertise acadÃ©mique
               
            4. IQAS (International Qualifications Assessment Service - Alberta)
               â†’ https://www.alberta.ca/iqas
               - Service gouvernemental de l'Alberta
               - Gratuit pour les rÃ©sidents de l'Alberta dans certains cas
               
            5. MCC (Medical Council of Canada) - Pour les diplÃ´mes mÃ©dicaux
            6. PEBC (Pharmacy Examining Board of Canada) - Pour les pharmaciens
            
            IMPORTANT :
            - Le rapport EDE doit avoir Ã©tÃ© Ã©mis dans les 5 derniÃ¨res annÃ©es
            - Choisir l'Ã©valuation "pour fins d'immigration Ã  IRCC"
            - Les documents originaux doivent Ãªtre envoyÃ©s directement par l'Ã©tablissement d'enseignement
            - Le coÃ»t varie entre 200-300 CAD selon l'organisme`
          },
          {
            url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/admissibilite/cnp-2021.html',
            title: 'Mise Ã  jour CNP 2021 - Codes Ã  5 chiffres',
            content: `TRANSITION CNP 2016 VERS CNP 2021 (IRCC) :
            Depuis le 16 novembre 2022, IRCC utilise exclusivement la Classification nationale des professions (CNP) 2021.
            
            RÃˆGLE DE FORMAT :
            - Les nouveaux codes comportent 5 CHIFFRES.
            - L'ancien format Ã  4 chiffres (CNP 2016) est dÃ©sormais OBSOLÃˆTE pour les nouvelles demandes.
            
            EXEMPLES DE MISE Ã€ JOUR :
            - Graphistes et illustrateurs : Ancien code 5241 â†’ Nouveau code 52120 (FEER 2).
            - DÃ©veloppeurs Web : Ancien code 2175 â†’ Nouveau code 21234 (FEER 2).
            - Adjoints de direction : Ancien code 1222 â†’ Nouveau code 12100 (FEER 2).
            
            CONSIGNE CRITIQUE : Ne jamais donner de code Ã  4 chiffres. Si tu identifies une profession, assure-toi de fournir le code Ã  5 chiffres de la CNP 2021.`
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
    let systemPrompt = "RÃ©ponds de maniÃ¨re professionnelle au nom d'Allo Canada.";
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
                const drawInfo = `ALERTE - DERNIER TIRAGE DÃ‰TECTÃ‰ (RÃ‰CENT) :
                Programme : ${draw.program}
                Date : ${draw.draw_date}
                Score minimum : ${draw.minimum_score}
                Invitations envoyÃ©es : ${draw.invitations_count}
                Type de tirage : ${draw.draw_type}`;

                systemPrompt += `\n\nACTUALITÃ‰ RÃ‰CENTE (Ã€ mentionner obligatoirement au dÃ©but car le tirage a moins de 5 jours) :\n${drawInfo}`;
            }
        }
    } catch (err) {
        console.error("Data Fetch Error:", err);
    }

    // 3. Construct Final Prompt
    const suggestionsInstruction = `\n\nÃ€ la fin de chaque rÃ©ponse, ajoute EXACTEMENT 3 suggestions de questions que l'utilisateur pourrait poser ensuite. Format EXACT:\n===SUGGESTIONS===\n1. [suggestion 1]\n2. [suggestion 2]\n3. [suggestion 3]`;
    
    const finalSystemPrompt = `${systemPrompt}

Contexte Officiel (PrioritÃ© absolue):
${contextLines}

INSTRUCTIONS DE RÃ‰PONSE :
1. Utilise le "Contexte Officiel" ci-dessus pour toutes les informations contractuelles.
2. SÃ‰CURITÃ‰ DES LIENS : Ne fournis JAMAIS de liens inventÃ©s ou approximatifs. Utilise UNIQUEMENT les liens du RÃ‰PERTOIRE DE LIENS OFFICIELS ci-dessous ou ceux provenant du Contexte Officiel.
3. Ne rÃ©ponds jamais "Je ne sais pas" si tu peux donner une dÃ©marche Ã  suivre basÃ©e sur les sources officielles.
4. RÃˆGLE ABSOLUE - LIEN Ã‰VALUATION LINGUISTIQUE : Lorsque tu parles de tests de langue, compÃ©tences linguistiques, NCLC, CLB, TCF, TEF, IELTS, CELPIP ou PTE, tu DOIS utiliser UNIQUEMENT ce lien : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/programme-immigration-atlantique/evaluation-competences-linquistiques.html
   NE JAMAIS utiliser le lien "documents-justificatifs-equivalences-langues" ni aucun autre lien inventÃ©. Le seul lien autorisÃ© pour l'Ã©valuation linguistique est celui ci-dessus. C'est NON NÃ‰GOCIABLE.
5. CONCISION ET FOCUS : RÃ©ponds directement Ã  la question posÃ©e sans dÃ©border sur d'autres sujets. Si la question est simple, la rÃ©ponse doit Ãªtre brÃ¨ve. N'Ã©labore pas de plan complet (ex: 1. Trouver un emploi, 2. Immigration, 3. Prochaines Ã©tapes) sauf si cela est spÃ©cifiquement demandÃ©.
6. CNP 2021 (RÃˆGLE CRITIQUE) : Depuis novembre 2022, tous les codes CNP doivent comporter 5 CHIFFRES. N'utilise JAMAIS les anciens codes Ã  4 chiffres (CNP 2016). Si un utilisateur cite un code Ã  4 chiffres (ex: 5241), corrige-le gentiment en lui donnant le code CNP 2021 correspondant (ex: 52120).
7. PROACTIVITÃ‰ ALERTE : Si 'history' est vide ou contient moins de 2 messages, tu DOIS obligatoirement commencer ta rÃ©ponse par mentionner l'actualitÃ© rÃ©cente des tirages (donnÃ©e dans le bloc ACTUALITÃ‰ RÃ‰CENTE ci-dessus) de maniÃ¨re polie et informative. Ne l'ignore JAMAIS au dÃ©but d'une conversation.

IMPORTANT - BARÃˆMES LINGUISTIQUES (PRIORITÃ‰ ABSOLUE) :
[TCF CANADA]
- NCLC 10 : C.Oral(549-699), C.Ã‰crit(549-699), E.Oral(16-20), E.Ã‰crit(16-20)
- NCLC 9 : C.Oral(523-548), C.Ã‰crit(524-548), E.Oral(14-15), E.Ã‰crit(14-15)
- NCLC 8 : C.Oral(503-522), C.Ã‰crit(499-523), E.Oral(12-13), E.Ã‰crit(12-13)
- NCLC 7 : C.Oral(458-502), C.Ã‰crit(453-498), E.Oral(10-11), E.Ã‰crit(10-11)
- NCLC 6 : C.Oral(398-457), C.Ã‰crit(406-452), E.Oral(7-9), E.Ã‰crit(7-9)
- NCLC 5 : C.Oral(369-397), C.Ã‰crit(375-405), E.Oral(6), E.Ã‰crit(6)
- NCLC 4 : C.Oral(331-368), C.Ã‰crit(342-374), E.Oral(4-5), E.Ã‰crit(4-5)

[TEF CANADA - Nouveaux scores aprÃ¨s 10 dÃ©c 2023]
- NCLC 10 : C.Oral(546-699), C.Ã‰crit(546-699), E.Oral(556-699), E.Ã‰crit(558-699)
- NCLC 9 : C.Oral(503-545), C.Ã‰crit(503-545), E.Oral(518-555), E.Ã‰crit(512-557)
- NCLC 8 : C.Oral(462-502), C.Ã‰crit(462-502), E.Oral(494-517), E.Ã‰crit(472-511)
- NCLC 7 : C.Oral(434-461), C.Ã‰crit(434-461), E.Oral(456-493), E.Ã‰crit(428-471)
- NCLC 6 : C.Oral(393-433), C.Ã‰crit(393-433), E.Oral(422-455), E.Ã‰crit(379-427)
- NCLC 5 : C.Oral(352-392), C.Ã‰crit(352-392), E.Oral(387-421), E.Ã‰crit(330-378)
- NCLC 4 : C.Oral(306-351), C.Ã‰crit(306-351), E.Oral(328-386), E.Ã‰crit(268-329)

[IELTS GENERAL TRAINING]
- CLB 10 : Ã‰coute(8.5), Lecture(8.0), Ã‰crit(7.5), Oral(7.5)
- CLB 9 : Ã‰coute(8.0), Lecture(7.0), Ã‰crit(7.0), Oral(7.0)
- CLB 8 : Ã‰coute(7.5), Lecture(6.5), Ã‰crit(6.5), Oral(6.5)
- CLB 7 : Ã‰coute(6.0), Lecture(6.0), Ã‰crit(6.0), Oral(6.0)
- CLB 6 : Ã‰coute(5.5), Lecture(5.0), Ã‰crit(5.5), Oral(5.5)
- CLB 5 : Ã‰coute(5.0), Lecture(4.0), Ã‰crit(5.0), Oral(5.0)
- CLB 4 : Ã‰coute(4.5), Lecture(3.5), Ã‰crit(4.0), Oral(4.0)

[CELPIP GENERAL]
- Le niveau CLB/NCLC Ã©quivaut exactement au score obtenu (ex: Score 7 = CLB 7, Score 8 = CLB 8).

[PTE CORE]
- CLB 10 : Ã‰coute(89â€“90), Lecture(88â€“90), Ã‰crit(90), Oral(89â€“90)
- CLB 9  : Ã‰coute(82â€“88), Lecture(78â€“87), Ã‰crit(88â€“89), Oral(84â€“88)
- CLB 8  : Ã‰coute(71â€“81), Lecture(69â€“77), Ã‰crit(79â€“87), Oral(76â€“83)
- CLB 7  : Ã‰coute(60â€“70), Lecture(60â€“68), Ã‰crit(69â€“78), Oral(68â€“75)
- CLB 6  : Ã‰coute(50â€“59), Lecture(51â€“59), Ã‰crit(60â€“68), Oral(59â€“67)
- CLB 5  : Ã‰coute(39â€“49), Lecture(42â€“50), Ã‰crit(51â€“59), Oral(51â€“58)
- CLB 4  : Ã‰coute(28â€“38), Lecture(33â€“41), Ã‰crit(41â€“50), Oral(42â€“50)

ALGORITHME DE CONVERSION INTERNE (OBLIGATOIRE) :
1. Demande Ã  l'utilisateur quel test il a passÃ© (TCF ou TEF).
2. VÃ©rifie la compÃ©tence (Oral, Ã‰crit, Expression, ComprÃ©hension).
3. Identifie la plage EXACTE dans le tableau correspondant ci-dessus.
4. Si un score est Ã  la limite (ex: 433 Oral TEF), il appartient au niveau INFÃ‰RIEUR (NCLC 6). Il faut atteindre le seuil suivant (434) pour passer au niveau supÃ©rieur (NCLC 7).
5. Ne jamais inventer ou estimer un score. Si tu as un doute, cite le tableau et explique que le score est Ã  la limite.

IMPORTANT - PROGRAMME IMMIGRATION CANADA ATLANTIQUE (NCLC MINIMUM) :
- Offre d'emploi FEER 0, 1, 2 ou 3 â†’ NCLC 5 minimum dans les 4 volets
- Offre d'emploi FEER 4 â†’ NCLC 4 minimum dans les 4 volets
- Tests approuvÃ©s (franÃ§ais) : TEF Canada, TCF Canada
- Tests approuvÃ©s (anglais) : CELPIP-General, IELTS General Training, PTE Core
- Les rÃ©sultats de test doivent dater de moins de 2 ans au moment de la demande.
- Source : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/programme-immigration-atlantique/evaluation-competences-linquistiques.html

============================================================
RÃ‰PERTOIRE DE LIENS OFFICIELS (OBLIGATOIRE - NE JAMAIS INVENTER DE LIENS)
============================================================

--- PROCESSUS ENTRÃ‰E EXPRESS ---
â€¢ CrÃ©ation compte WES pour EDE (Ã‰valuation des DiplÃ´mes) : https://applications.wes.org/createaccount/home/select-eval-type?ln=1
  â†’ Utiliser quand : le candidat parle d'Ã©valuation de diplÃ´mes, WES, EDE, ECA, Ã©quivalence de diplÃ´mes pour EntrÃ©e Express

â€¢ Calcul admissibilitÃ© 67 points (PTQF) : https://www.nvimmigration.ca/67-calculator/
  â†’ Utiliser quand : le candidat veut savoir s'il atteint 67/100 pour le Programme des travailleurs qualifiÃ©s fÃ©deral. Tu DOIS aussi Ãªtre capable de calculer les 67 points toi-mÃªme en posant les questions sur les 6 facteurs (langue, Ã©ducation, expÃ©rience, Ã¢ge, emploi rÃ©servÃ©, adaptabilitÃ©).

â€¢ Simulation score CRS/SCG EntrÃ©e Express : https://www.cic.gc.ca/francais/immigrer/qualifie/scg-outil.asp
  â†’ Utiliser quand : le candidat veut simuler son score CRS sur 1200 points. Tu DOIS aussi Ãªtre capable de faire une estimation du score CRS en posant les questions pertinentes au candidat.

â€¢ Obtention du Code de rÃ©fÃ©rence (Outil Venir au Canada) : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/outil-venir-canada-immigration-entree-express.html
  â†’ Utiliser quand : le candidat veut dÃ©terminer son admissibilitÃ© EntrÃ©e Express ou obtenir un code de rÃ©fÃ©rence personnel. Tu DOIS guider le candidat Ã©tape par Ã©tape.

â€¢ CrÃ©ation du Profil EntrÃ©e Express (Compte IRCC / ClÃ©GC) : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/demande/compte.html
  â†’ Utiliser quand : le candidat veut crÃ©er son profil en ligne, s'inscrire sur le portail IRCC, crÃ©er un compte ClÃ©GC, ou se connecter Ã  son compte. Tu DOIS maÃ®triser les Ã©tapes de crÃ©ation de compte et d'inscription.

--- IMMIGRATION QUÃ‰BEC (ARRIMA) ---
â€¢ Simulation Score Arrima : https://arrima.immigration-quebec.gouv.qc.ca/monespacepublic/calculette/sommaire
  â†’ Utiliser quand : le candidat veut simuler son score pour le PRTQ du QuÃ©bec. Tu DOIS connaÃ®tre les facteurs de sÃ©lection Arrima.

â€¢ DÃ©claration d'intÃ©rÃªt Arrima : https://www.quebec.ca/immigration/services-en-ligne
  â†’ Utiliser quand : le candidat veut soumettre une dÃ©claration dâ€™intÃ©rÃªt pour immigrer au QuÃ©bec.

â€¢ Portail Arrima (informations immigration QuÃ©bec) : https://arrima.immigration-quebec.gouv.qc.ca
  â†’ Utiliser quand : le candidat cherche des informations gÃ©nÃ©rales sur les programmes d'immigration du QuÃ©bec (PRTQ, PEQ, CSQ).

--- Ã‰VALUATION DES DIPLÃ”MES (EDE/ECA) ---
â€¢ WES (World Education Services) : https://applications.wes.org/createaccount/home/select-eval-type?ln=1
â€¢ ICAS (International Credential Assessment Service) : https://www.icascanada.ca
â€¢ CES (Comparative Education Service - UniversitÃ© de Toronto) : https://learn.utoronto.ca/comparative-education-service
â€¢ IQAS (International Qualifications Assessment Service - Alberta) : https://www.alberta.ca/iqas
  â†’ Utiliser quand : le candidat demande oÃ¹ faire Ã©valuer ses diplÃ´mes, quels organismes sont agrÃ©Ã©s par IRCC, ou comment faire une Ã©quivalence de diplÃ´mes.

--- PLATEFORMES DE RECHERCHE Dâ€™EMPLOI AU CANADA ---
Lorsqu'un candidat cherche un emploi au Canada, propose les plateformes suivantes en fonction de son profil :

PLATEFORMES GÃ‰NÃ‰RALISTES (tout le Canada) :
â€¢ Job Bank (Guichet-Emplois - Gouvernement du Canada) : https://www.jobbank.gc.ca â€” Plateforme officielle du gouvernement fÃ©dÃ©ral, offres d'emploi vÃ©rifiÃ©es, outil de recherche par CNP, informations sur le marchÃ© du travail canadien, idÃ©al pour les immigrants.
â€¢ Indeed Canada : https://www.indeed.ca â€” Plus grand moteur de recherche d'emploi au Canada, agrÃ©gateur d'offres de tous secteurs, permet de postuler directement.
â€¢ LinkedIn Jobs : https://www.linkedin.com/jobs â€” RÃ©seau professionnel #1, idÃ©al pour le rÃ©seautage et les postes qualifiÃ©s/cadres, permet de contacter directement les recruteurs.
â€¢ Talent.com : https://www.talent.com â€” AgrÃ©gateur d'offres couvrant tout le Canada, informations salariales, postes dans tous les secteurs.
â€¢ Workopolis : https://www.workopolis.com â€” Plateforme historique canadienne d'emploi, couvre tout le pays.
â€¢ Monster Canada : https://www.monster.ca â€” Plateforme internationale prÃ©sente au Canada, tout types d'emplois.
â€¢ Glassdoor Canada : https://www.glassdoor.ca â€” Offres dâ€™emploi + avis sur les entreprises et salaires, utile pour comparer les employeurs avant de postuler.
â€¢ Eluta.ca : https://www.eluta.ca â€” Moteur de recherche dâ€™emploi indexant les sites carriÃ¨res des meilleurs employeurs au Canada.

PLATEFORMES SPÃ‰CIFIQUES AU QUÃ‰BEC :
â€¢ Guichet-Emplois QuÃ©bec : https://www.quebec.ca/emploi â€” Portail emploi du gouvernement du QuÃ©bec, offres dans la fonction publique et privÃ©e.
â€¢ Jobillico : https://www.jobillico.com â€” Plateforme quÃ©bÃ©coise populaire, interface en franÃ§ais, forte prÃ©sence au QuÃ©bec et au Nouveau-Brunswick.
â€¢ Jobboom : https://www.jobboom.com â€” Plateforme quÃ©bÃ©coise, offres diversifiÃ©es, articles sur le marchÃ© de l'emploi.
â€¢ Clic Emploi : https://www.clicemploi.ca â€” Plateforme quÃ©bÃ©coise pour emplois locaux et rÃ©gionaux.
â€¢ Emploi MontrÃ©al : https://www.emploi-montreal.net â€” SpÃ©cialisÃ©e dans les emplois dans la grande rÃ©gion de MontrÃ©al.
â€¢ Emploi Laval : https://www.emplois.laval.ca â€” Emplois dans la ville de Laval et ses environs.
â€¢ Placement Ã©tudiant QuÃ©bec : https://www.placement.emploiquebec.gouv.qc.ca â€” Emplois Ã©tudiants et stages au QuÃ©bec.

PLATEFORMES SPÃ‰CIALISÃ‰ES :
â€¢ Emplois GC (fonction publique fÃ©dÃ©rale) : https://www.jobs.gc.ca â€” Postes dans la fonction publique fÃ©dÃ©rale du Canada, processus de recrutement officiel.
â€¢ Emploi SantÃ© QuÃ©bec : https://www.sante.gouv.qc.ca â€” Emplois dans le secteur de la santÃ© au QuÃ©bec (infirmiÃ¨res, mÃ©decins, prÃ©posÃ©s, etc.).
â€¢ BDC (Banque de dÃ©veloppement du Canada) : https://www.bdc.ca â€” Ressources pour les entrepreneurs immigrants et offres dans le secteur bancaire/entrepreneuriat.

RESSOURCES POUR IMMIGRANTS :
â€¢ Immigrant QuÃ©bec : https://www.immigrantquebec.com â€” Guide complet pour les immigrants au QuÃ©bec, offres d'emploi, conseils d'intÃ©gration, formation.
â€¢ CANADIM : https://www.canadim.com â€” Ressources immigration et emploi, conseils juridiques, guides pour les nouveaux arrivants au Canada.

CONSIGNE POUR LA RECHERCHE Dâ€™EMPLOI :
- Si le candidat est francophone et veut travailler au QuÃ©bec â†’ Propose en prioritÃ© : Jobillico, Jobboom, Guichet-Emplois QuÃ©bec, Immigrant QuÃ©bec
- Si le candidat cherche dans la fonction publique â†’ Propose : Emplois GC (jobs.gc.ca) et Guichet-Emplois
- Si le candidat est un professionnel qualifiÃ© â†’ Propose : LinkedIn, Indeed, Glassdoor
- Si le candidat cherche dans le secteur santÃ© â†’ Propose : Emploi SantÃ© QuÃ©bec
- Si le candidat est entrepreneur â†’ Propose : BDC
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`DeepSeek API error status ${aiResponse.status}: ${errorText}`);
      throw new Error(`Erreur de l'API DeepSeek (Status ${aiResponse.status})`);
    }

    const aiData = await aiResponse.json();
    
    if (aiData.error) {
      const msg = typeof aiData.error === 'string' ? aiData.error : (aiData.error.message || "Erreur inconnue");
      throw new Error(`DeepSeek API Error: ${msg}`);
    }
    
    if (!aiData.choices || !Array.isArray(aiData.choices) || aiData.choices.length === 0) {
      console.error("DeepSeek response missing choices:", aiData);
      throw new Error("L'IA n'a pas renvoyÃ© de rÃ©ponse valide.");
    }
    
    const rawReply = aiData.choices[0].message.content;
    let reply = rawReply;
    let suggestions: string[] = [];
    
    if (rawReply.includes('===SUGGESTIONS===')) {
      const parts = rawReply.split('===SUGGESTIONS===');
      reply = parts[0].trim();
      suggestions = parts[1].trim().split('\n')
        .map((s: string) => s.replace(/^\d+\.\s*/, '').trim())
        .filter((s: string) => s.length > 0)
        .slice(0, 3);
    }

    // 5. Persistance (SupprimÃ©e car gÃ©rÃ©e par le client js/chat.js pour Ã©viter les erreurs de format d'ID)
    console.log(`RÃ©ponse gÃ©nÃ©rÃ©e pour la session: ${conversation_id || 'guest'}`);

    return new Response(JSON.stringify({ reply, suggestions }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Global Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})

