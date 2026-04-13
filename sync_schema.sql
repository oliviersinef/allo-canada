-- SCHEMA POUR LA SYNCHRONISATION AUTOMATIQUE CANADA.CA

-- 1. Table des sources à surveiller
CREATE TABLE IF NOT EXISTS public.canada_sources (
  url TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  last_content_hash TEXT
);

-- 2. Table des logs de synchronisation (Notifications)
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT REFERENCES public.canada_sources(url) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('updated', 'no_change', 'error')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Insertion des sources initiales
INSERT INTO public.canada_sources (url, title) VALUES
('https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express.html', 'Vue d''ensemble - Entrée Express'),
('https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/admissibilite/criteres-systeme-classement-global.html', 'Calculatrice SCG'),
('https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/verifier-note/criteries-scg.html', 'Barèmes SCG'),
('https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/demande/qualifier/tests-langue.html', 'Tests linguistiques'),
('https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/demande/fonds.html', 'Preuve de fonds'),
('https://www.canada.ca/fr/immigration-refugies-citoyennete/services/travailler-canada/permis/mobilite-francophone.html', 'Mobilité Francophone')
ON CONFLICT (url) DO NOTHING;

-- 5. Extension Vectorielle (Nécessaire pour la mémoire de l'IA)
CREATE EXTENSION IF NOT EXISTS vector;

-- 6. Table de la base de connaissance (RAG)
CREATE TABLE IF NOT EXISTS public.canada_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT,
  title TEXT,
  content TEXT,
  embedding VECTOR(384) -- gte-small utilise 384 dimensions
);

-- 7. Fonction de recherche de similarité (Suppression préalable pour éviter les conflits de signature)
DROP FUNCTION IF EXISTS match_canada_documents(VECTOR, FLOAT, INT);

CREATE OR REPLACE FUNCTION match_canada_documents (
  query_embedding VECTOR(384),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  url TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.url,
    d.title,
    d.content,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM canada_documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 8. Activer RLS pour les documents
ALTER TABLE public.canada_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique des documents" ON public.canada_documents FOR SELECT USING (true);

