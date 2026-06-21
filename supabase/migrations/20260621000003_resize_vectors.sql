-- Resize legal_documents embedding vectors from 1536 (OpenAI) to 768 (Gemini)

-- 1. Drop existing HNSW index which depends on VECTOR(1536)
DROP INDEX IF EXISTS public.legal_documents_hnsw_idx;

-- 2. Alter column data type to 768 dimensions for Gemini
ALTER TABLE public.legal_documents ALTER COLUMN embedding TYPE VECTOR(768);

-- 3. Re-create HNSW index for VECTOR(768)
CREATE INDEX legal_documents_hnsw_idx ON public.legal_documents 
USING hnsw (embedding vector_cosine_ops);

-- 4. Drop old match function (Postgres requires dropping to change input parameter types)
DROP FUNCTION IF EXISTS public.match_legal_documents(VECTOR(1536), FLOAT, INT, TEXT[]);

-- 5. Re-create match function with VECTOR(768)
CREATE OR REPLACE FUNCTION public.match_legal_documents (
  query_embedding VECTOR(768),
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
