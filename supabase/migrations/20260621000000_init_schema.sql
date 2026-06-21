-- Enable PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    preferred_state TEXT DEFAULT 'CDMX',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Legal Documents Table (stores legal codes & articles)
CREATE TABLE public.legal_documents (
    id BIGSERIAL PRIMARY KEY,
    jurisdiction TEXT NOT NULL,          -- e.g., 'Federal', 'CDMX', 'Jalisco'
    code_name TEXT NOT NULL,             -- e.g., 'Código Civil', 'Reglamento de Tránsito'
    article_number TEXT NOT NULL,        -- e.g., 'Artículo 140' or 'Artículo 15 Bis'
    section_title TEXT,                  -- Chapter or title name (optional)
    content TEXT NOT NULL,               -- The official law text of the article/chunk
    embedding VECTOR(1536),              -- OpenAI text-embedding-3-small
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Popular Queries Table (trending search prompts)
CREATE TABLE public.popular_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,              -- e.g., 'Tránsito', 'Civil', 'Laboral'
    search_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,   -- Manually featured
    last_triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Saved Rights Table (bookmarked queries & answers)
CREATE TABLE public.saved_rights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,                 -- User-facing search title
    query_text TEXT NOT NULL,
    ai_answer TEXT NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Saved Rights Citations Table (many-to-many link)
CREATE TABLE public.saved_rights_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_right_id UUID NOT NULL REFERENCES public.saved_rights(id) ON DELETE CASCADE,
    legal_document_id BIGINT NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE
);

-- 6. Media Analyses Table (tracks multimedia legal checks)
CREATE TABLE public.media_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,          -- Path to raw media upload
    moderated_path TEXT,                 -- Path to metadata-stripped/blurred media
    context_text TEXT,                   -- Optional user description
    analysis_report JSONB,               -- Results of multimodal LLM check
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX profiles_email_idx ON public.profiles(email);
CREATE INDEX legal_documents_filtering_idx ON public.legal_documents(jurisdiction, code_name);
CREATE INDEX media_analyses_user_id_idx ON public.media_analyses(user_id);

-- HNSW Cosine Distance index for Vector Embeddings (1536 dimensions)
CREATE INDEX legal_documents_hnsw_idx ON public.legal_documents 
USING hnsw (embedding vector_cosine_ops);

-- Trigger Function: Auto-create user profile from auth.users signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Database Vector Similarity Match Function for RAG Edge Function
CREATE OR REPLACE FUNCTION public.match_legal_documents (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  filter_jurisdictions TEXT[]
)
RETURNS TABLE (
  id BIGINT,
  jurisdiction TEXT,
  code_name TEXT,
  article_number TEXT,
  section_title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ld.id,
    ld.jurisdiction,
    ld.code_name,
    ld.article_number,
    ld.section_title,
    ld.content,
    1 - (ld.embedding <=> query_embedding) AS similarity
  FROM public.legal_documents ld
  WHERE 
    ld.jurisdiction = ANY(filter_jurisdictions)
    AND 1 - (ld.embedding <=> query_embedding) > match_threshold
  ORDER BY ld.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
