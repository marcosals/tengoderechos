-- 1. Alter public.profiles to add is_admin flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create Master Legal Documents (Staging table replica)
CREATE TABLE IF NOT EXISTS public.master_legal_documents (
    id BIGSERIAL PRIMARY KEY,
    jurisdiction TEXT NOT NULL,
    code_name TEXT NOT NULL,
    article_number TEXT NOT NULL,
    section_title TEXT,
    content TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Alter popular_queries to add votes_count
ALTER TABLE public.popular_queries ADD COLUMN IF NOT EXISTS votes_count INTEGER DEFAULT 0;

-- 4. Create Query Votes table
CREATE TABLE IF NOT EXISTS public.query_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    query_id UUID REFERENCES public.popular_queries(id) ON DELETE CASCADE,
    vote_type INT NOT NULL CHECK (vote_type IN (-1, 1)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, query_id)
);

-- Enable RLS on new tables
ALTER TABLE public.master_legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_votes ENABLE ROW LEVEL SECURITY;

-- 5. Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Admins can manage master documents" ON public.master_legal_documents;
CREATE POLICY "Admins can manage master documents" ON public.master_legal_documents
    FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Query votes are publicly readable" ON public.query_votes;
CREATE POLICY "Query votes are publicly readable" ON public.query_votes
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage own votes" ON public.query_votes;
CREATE POLICY "Users can manage own votes" ON public.query_votes
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 7. RPC to atomically publish staging master documents to public legal_documents table
CREATE OR REPLACE FUNCTION public.publish_master_documents()
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin role required.';
  END IF;

  -- Atomic refresh of public search table
  TRUNCATE TABLE public.legal_documents;
  
  INSERT INTO public.legal_documents (id, jurisdiction, code_name, article_number, section_title, content, embedding, created_at)
  SELECT id, jurisdiction, code_name, article_number, section_title, content, embedding, created_at
  FROM public.master_legal_documents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC to vote on a popular query and update total vote counts
CREATE OR REPLACE FUNCTION public.vote_query(p_query_id UUID, p_vote_type INT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to vote.';
  END IF;

  IF p_vote_type NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Invalid vote type. Must be -1 or 1.';
  END IF;

  -- Upsert vote
  INSERT INTO public.query_votes (user_id, query_id, vote_type)
  VALUES (v_user_id, p_query_id, p_vote_type)
  ON CONFLICT (user_id, query_id)
  DO UPDATE SET vote_type = p_vote_type;

  -- Recalculate net vote count
  UPDATE public.popular_queries
  SET votes_count = COALESCE((
    SELECT SUM(vote_type) FROM public.query_votes WHERE query_id = p_query_id
  ), 0)
  WHERE id = p_query_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
