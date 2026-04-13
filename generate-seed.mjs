import { pipeline, env } from '@xenova/transformers';
import fs from 'fs';

env.allowLocalModels = false;

const generateEmbedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const documents = [
  {
    url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/demande/qualifier/tests-langue.html',
    title: 'Entrée express : Résultats d’examen linguistique',
    content: 'Pour le traitement de votre profil et la demande d\'Entrée express, vous devez prouver vos compétences linguistiques en français ou en anglais en passant un test linguistique approuvé (TEF, TCF, IELTS, CELPIP). Vos résultats doivent dater de moins de deux ans le jour où vous présentez votre demande de résidence permanente.'
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
  }
];

let sql = "INSERT INTO canada_documents (url, title, content, embedding) VALUES\n";
const values = [];

for (const doc of documents) {
  const output = await generateEmbedding(doc.content, { pooling: 'mean', normalize: true });
  const embedding = Array.from(output.data);
  const vectorStr = '[' + embedding.join(',') + ']';
  
  const escapedUrl = doc.url.replace(/'/g, "''");
  const escapedTitle = doc.title.replace(/'/g, "''");
  const escapedContent = doc.content.replace(/'/g, "''");
  
  values.push(`('${escapedUrl}', '${escapedTitle}', '${escapedContent}', '${vectorStr}')`);
}

sql += values.join(",\n") + ";";

fs.writeFileSync('seed.sql', sql);
console.log("SQL generated! Use execute_sql tool.");
