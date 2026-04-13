-- SCHEMA SQL POUR ALLO CANADA

-- 1. Table des conversations
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  session_id text not null,
  created_at timestamptz default now()
);

-- 2. Table des messages
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- 3. Table des réglages (Prompt Système)
create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Insérer le prompt système par défaut
insert into public.settings (key, value) 
values ('system_prompt', 'Tu es un Agent IA spécialisé en immigration au Canada (Allo Canada). Ton rôle est de simplifier les démarches d''immigration pour les francophones en te basant sur Canada.ca. Réponds de façon pédagogique, structurée et rassurante. Cite toujours tes sources officiels.')
on conflict (key) do update set value = excluded.value;

-- 4. Sécurité (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Politiques pour les Conversations
DROP POLICY IF EXISTS "Les utilisateurs voient leurs propres conversations" ON public.conversations;
CREATE POLICY "Les utilisateurs gèrent leurs propres conversations" 
ON public.conversations FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politiques pour les Messages
DROP POLICY IF EXISTS "Les utilisateurs gèrent leurs propres messages" ON public.messages;
CREATE POLICY "Les utilisateurs gèrent leurs propres messages" 
ON public.messages FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- Politiques pour les Paramètres
DROP POLICY IF EXISTS "Lecture publique des paramètres" ON public.settings;
CREATE POLICY "Lecture publique des paramètres" 
ON public.settings FOR SELECT 
USING (true);

