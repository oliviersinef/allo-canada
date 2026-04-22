import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function generateEmbedding(text: string) {
    // @ts-ignore
    const session = new Supabase.ai.Session('gte-small');
    const result = await session.run(text, { mean_pool: true, normalize: true });
    return Array.from(result);
}

serve(async (req: Request) => {
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
            - Offre d'emploi FEER 0, 1, 2 ou 3 -> NCLC 5 minimum (dans les 4 volets)
            - Offre d'emploi FEER 4 -> NCLC 4 minimum (dans les 4 volets)

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
          {
            url: 'https://applications.wes.org/createaccount/home/select-eval-type?ln=1',
            title: 'Création du Compte WES for EDE (Évaluation des Diplômes d\'Études)',
            content: `CRÉATION DU COMPTE WES POUR L'ÉVALUATION DES DIPLÔMES (EDE) :
            WES is one of the organizations designated by IRCC to perform the ECA required for immigration to Canada.
            ...`
          },
          {
            url: 'https://www.guichetemplois.gc.ca/trouverunemploi/concepteur-cv',
            title: 'Concepteur de CV - Guichet-Emplois',
            content: "Le Concepteur de CV officiel du Guichet-Emplois (Gouvernement du Canada) permet de concevoir gratuitement un CV aux normes canadiennes. Il propose des modèles adaptés aux professionnels expérimentés (modèle traditionnel) ou aux nouveaux arrivants et jeunes diplômés. L'outil aide à utiliser la terminologie appropriée et à aligner ses compétences avec les exigences des employeurs canadiens."
          }
        ];

        for (const doc of documents) {
            try {
                const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/canada_documents?url=eq.${encodeURIComponent(doc.url)}&select=embedding`, {
                    headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
                });
                const existing = await checkRes.json();
                
                // Si le document existe déjà ET possède un embedding, on passe au suivant
                if (Array.isArray(existing) && existing.length > 0 && existing[0].embedding) {
                    continue;
                }

                const embedding = await generateEmbedding(doc.content);
                
                // Si le document existe mais n'a pas d'embedding, on le met à jour. Sinon on l'insère.
                if (Array.isArray(existing) && existing.length > 0) {
                    await fetch(`${SUPABASE_URL}/rest/v1/canada_documents?url=eq.${encodeURIComponent(doc.url)}`, {
                        method: 'PATCH',
                        headers: { 
                            'apikey': SUPABASE_SERVICE_ROLE_KEY, 
                            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ embedding: embedding })
                    });
                } else {
                    await fetch(`${SUPABASE_URL}/rest/v1/canada_documents`, {
                        method: 'POST',
                        headers: { 
                            'apikey': SUPABASE_SERVICE_ROLE_KEY, 
                            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            url: doc.url,
                            title: doc.title,
                            content: doc.content,
                            embedding: embedding
                        })
                    });
                }
            } catch (err) {
                console.error(`Error seeding ${doc.url}:`, err);
            }
        }
        return new Response(JSON.stringify({ status: "seeded", count: documents.length }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    if (action === 'list_documents') {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/canada_documents?select=id,url,title,created_at&order=created_at.desc`, {
            headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    if (action === 'delete_document') {
        const { id } = body;
        await fetch(`${SUPABASE_URL}/rest/v1/canada_documents?id=eq.${id}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
        });
        return new Response(JSON.stringify({ status: "deleted" }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    if (action === 'add_document') {
        const { url, title, content } = body;
        if (!title || !content) {
            return new Response(JSON.stringify({ error: "Titre et Contenu requis" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const embedding = await generateEmbedding(content);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/canada_documents`, {
            method: 'POST',
            headers: { 
                'apikey': SUPABASE_SERVICE_ROLE_KEY, 
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ url, title, content, embedding })
        });
        const data = await res.json();
        return new Response(JSON.stringify({ status: "added", data }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    if (action === 'sync') {
        return new Response(JSON.stringify({ status: "sync_not_implemented_yet" }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    const embedding = await generateEmbedding(message);
    let systemPrompt = "Tu es l'Expert IA Allo Canada.";
    let contextLines = "";

    try {
        const [settingsRes, ragRes] = await Promise.all([
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
                match_threshold: 0.3,
                match_count: 5
            })
          })
        ]);

        const sData = await settingsRes.json();
        const mData = await ragRes.json();

        if (Array.isArray(sData) && sData.length > 0) systemPrompt = sData[0].value;
        
        if (Array.isArray(mData) && mData.length > 0) {
            contextLines = mData.map((doc: any) => `Source [${doc.url}]:\n${doc.content}`).join('\n\n');
        } else {
            contextLines = "Note: Aucun document spécifique trouvé dans la base de connaissances pour cette requête précise.";
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }

    const finalPrompt = systemPrompt + "\n\nContext:\n" + contextLines + 
      "\n\nInstructions Critiques de Sécurité et Style:\n" +
      "1. Ne JAMAIS inventer, deviner ou halluciner une URL. Toute URL non présente dans le Context ou l'instruction ci-dessous est strictement interdite.\n" +
      "2. Utilisez PRIORITAIREMENT les liens (URLs) fournis dans la section Context ci-dessus.\n" +
      "3. Pour toute information générale ou si aucun lien spécifique n'est trouvé dans le Context, utilisez EXCLUSIVEMENT ce lien officiel : [Site officiel d'Immigration et Citoyenneté Canada](https://www.canada.ca/fr/immigration-refugies-citoyennete.html).\n" +
      "4. ESTHÉTIQUE : Ne JAMAIS afficher d'URL en clair (texte brut). Utilisez TOUJOURS le format Markdown pour créer des hyperliens élégants, par exemple : [Source officielle](URL) ou [Consulter les détails sur Canada.ca](URL).\n" +
      "5. Soyez direct et concis. Utilisez les codes CNP 2021 à 5 chiffres.\n" +
      "6. AUTORISATION SPÉCIALE (Création de CV) : Si l'utilisateur soumet un CV pour reformatage canadien, RÈGLES STRICTES :\n" +
      "   a) NE JAMAIS ajouter de texte d'introduction (pas de 'Voici votre CV reformaté...', pas de 'CV Canadien Reformulé', pas d'explication).\n" +
      "   b) NE JAMAIS inclure d'en-tête Allo Canada ou de branding.\n" +
      "   c) Commencer DIRECTEMENT par le nom complet du candidat en titre (# Prénom NOM), suivi de ses coordonnées.\n" +
      "   d) COORDONNÉES : INTERDICTION ABSOLUE d'utiliser des icônes ou emojis (PAS de 📧, 📞, 📍, 🔗, 📱, etc.). Utiliser UNIQUEMENT du texte clair (Email : ..., Tél : ..., LinkedIn : ..., Portfolio : ..., Localisation : ...).\n" +
      "   e) Structure canadienne obligatoire dans cet ordre : Coordonnées → Profil professionnel (3 lignes max) → Compétences clés → Expérience professionnelle (du plus récent au plus ancien, avec réalisations en puces) → Formation → Langues → Certifications/Autres.\n" +
   "   f) VARIÉTÉ DE MODÈLES ET STYLES : L'agent DOIT alterner entre ces 4 styles à chaque génération pour éviter la monotonie :\n" +
      "      - STYLE A (Moderne Minimaliste) : Titres en MAJUSCULES, lignes de séparation fines (---), puces carrées (■), en-tête avec séparateurs verticaux (|).\n" +
      "      - STYLE B (Professionnel Traditionnel) : Titres en Gras avec soulignement, puces rondes (●), dates alignées à droite si possible (Markdown standard).\n" +
      "      - STYLE C (Épuré et Aéré) : Utilisation d'espaces blancs généreux, titres sans soulignement mais en gras, puces simples (-), séparateurs par blocs.\n" +
      "      - STYLE D (Compact/Impact) : Titres encadrés par des symboles discrets (ex: == TITRE ==), puces fléchées (►), focus sur les chiffres et résultats.\n" +
      "      STRICT : PAS de tableaux HTML, PAS de couleurs, PAS d'images. Uniquement du Markdown standard.\n" +
      "   g) NE JAMAIS ajouter de texte de conclusion ou commentaire après le CV.\n" +
      "7. Les suggestions à la fin DOIVENT être 3 COURTES questions de relance (max 10 mots) que l'utilisateur pourrait vous poser, SANS aucune explication. Format exact:\n===SUGGESTIONS===\n1. Question courte 1 ?\n2. Question courte 2 ?\n3. Question courte 3 ?\n" +
      "8. CONSOLIDATION DES SOURCES : Si plusieurs points d'information (ex: une liste à puces) proviennent de la même source, NE PAS répéter le lien après chaque ligne. Citez la source une seule fois à la fin du paragraphe ou de la liste pour un rendu plus propre.\n" +
      "9. SOURCES SPÉCIFIQUES (FEER/CNP) : Pour toute information concernant les catégories FEER ou la recherche de code CNP, utilisez TOUJOURS ce lien comme source : [Trouver sa Classification nationale des professions (CNP)](https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/trouver-classification-nationale-professions.html).";

    const aiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
            { role: 'system', content: finalPrompt },
            ...(history || []),
            { role: 'user', content: message }
        ],
        temperature: 0.7,
      })
    });

    if (!aiRes.ok) throw new Error(`DeepSeek API error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    if (!aiData.choices || aiData.choices.length === 0) throw new Error("No AI choices");

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

    return new Response(JSON.stringify({ reply, suggestions }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
});
