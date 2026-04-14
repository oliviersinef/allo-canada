-- SCHEMA SQL POUR ALLO CANADA

-- 1. Table des profiles (Détails utilisateurs)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  country TEXT,
  phone TEXT,
  is_admin BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table des messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table des réglages (Prompt Système)
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insérer le prompt système par défaut
INSERT INTO public.settings (key, value) 
VALUES ('system_prompt', 'Tu es un Agent IA spécialisé en immigration au Canada (Allo Canada). Ton rôle est de simplifier les démarches d''immigration pour les francophones en te basant sur Canada.ca. Réponds de façon pédagogique, structurée et rassurante. Cite toujours tes sources officiels.')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;

-- 5. Fonctions Utilitaires
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT is_admin FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- Trigger pour la création automatique du profil
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, country, phone)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Sécurité (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Politiques Profiles
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL USING (public.is_admin());
CREATE POLICY "Users see own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Politiques Conversations
CREATE POLICY "Admins manage all conversations" ON public.conversations FOR ALL USING (public.is_admin());
CREATE POLICY "Users manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);

-- Politiques Messages
CREATE POLICY "Admins manage all messages" ON public.messages FOR ALL USING (public.is_admin());
CREATE POLICY "Users manage own messages" ON public.messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);

-- Politiques Settings
CREATE POLICY "Admins manage settings" ON public.settings FOR ALL USING (public.is_admin());
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);

