# Database Specification: "Tengo Derechos"

This specification outlines the Supabase PostgreSQL database schemas, indexes, storage buckets, and security rules (RLS) required to power the search, personalization, and multimedia analysis features.

---

## 1. Extensions
We will enable the following PostgreSQL extensions in Supabase:
* **`uuid-ossp`**: For UUID generation.
* **`vector`**: For storing and querying high-dimensional embedding vectors (`pgvector`).

---

## 2. Table Schemas

### A. Table: `profiles`
Extends Supabase's internal `auth.users` table. Created automatically via trigger on user registration.
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    preferred_state TEXT DEFAULT 'CDMX', -- Target jurisdiction fallback
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### B. Table: `legal_documents`
Stores parsed legal articles, codes, and their semantic vectors.
```sql
CREATE TABLE public.legal_documents (
    id BIGSERIAL PRIMARY KEY,
    jurisdiction TEXT NOT NULL,          -- e.g., 'Federal', 'CDMX', 'Jalisco'
    code_name TEXT NOT NULL,             -- e.g., 'Código Civil', 'Reglamento de Tránsito'
    article_number TEXT NOT NULL,        -- e.g., 'Artículo 140' or 'Artículo 15 Bis'
    section_title TEXT,                  -- Chapter or title name (optional)
    content TEXT NOT NULL,               -- The official law text of the article/chunk
    embedding VECTOR(1536),              -- 1536-dim vector (OpenAI text-embedding-3-small)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Vector Indexing
To ensure sub-second vector search responses as database size grows, we define a Hierarchical Navigable Small World (HNSW) index using cosine distance:
```sql
CREATE INDEX legal_documents_hnsw_idx ON public.legal_documents 
USING hnsw (embedding vector_cosine_ops);
```

### C. Table: `popular_queries`
Stores predefined and dynamically tracked popular questions. Used to render the Home/Trending screen.
```sql
CREATE TABLE public.popular_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,              -- e.g., 'Tránsito', 'Civil', 'Laboral'
    search_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,   -- Manually pin specific queries
    last_triggered_at TIMESTAMPTZ DEFAULT NOW()
);
```

### D. Table: `saved_rights`
Stores searches bookmarked by authenticated users.
```sql
CREATE TABLE public.saved_rights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,                 -- User-facing title or query text
    query_text TEXT NOT NULL,
    ai_answer TEXT NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### E. Table: `saved_rights_citations`
Many-to-many relationship linking a saved right to the actual source `legal_documents` articles.
```sql
CREATE TABLE public.saved_rights_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_right_id UUID NOT NULL REFERENCES public.saved_rights(id) ON DELETE CASCADE,
    legal_document_id BIGINT NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE
);
```

### F. Table: `media_analyses`
Tracks uploaded media and legal findings.
```sql
CREATE TABLE public.media_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,          -- Path to raw media in Storage
    moderated_path TEXT,                 -- Path to metadata-stripped/blurred media
    context_text TEXT,                   -- Optional user context
    analysis_report JSONB,               -- AI analysis containing Markdown report and risk rating
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Storage Buckets

### Bucket: `media-uploads`
* **Access Level**: Private.
* **Storage Rules**:
  - `INSERT`: Allowed only for `authenticated` users, placing files under `user_id/filename`.
  - `SELECT`: Allowed only for the owning user (`auth.uid() = owner`) and the database service role (used by Edge Functions).
  - `DELETE`: Allowed only for the owning user.

---

## 4. Row-Level Security (RLS) Rules

All tables have RLS enabled.

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popular_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_rights_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_analyses ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users read/write their own profiles
CREATE POLICY "Users can manage own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- 2. Legal Documents: Read-only for everyone (including anon)
CREATE POLICY "Legal documents are publicly readable" ON public.legal_documents
    FOR SELECT TO anon, authenticated USING (true);

-- 3. Popular Queries: Read-only for everyone
CREATE POLICY "Popular queries are publicly readable" ON public.popular_queries
    FOR SELECT TO anon, authenticated USING (true);

-- 4. Saved Rights: Users manage their own saved searches
CREATE POLICY "Users can manage own saved rights" ON public.saved_rights
    FOR ALL USING (auth.uid() = user_id);

-- 5. Saved Rights Citations: Users manage citations linked to their saved rights
CREATE POLICY "Users can manage own citations" ON public.saved_rights_citations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.saved_rights 
            WHERE saved_rights.id = saved_rights_citations.saved_right_id 
            AND saved_rights.user_id = auth.uid()
        )
    );

-- 6. Media Analyses: Users manage their own media analysis reports
CREATE POLICY "Users can manage own media analyses" ON public.media_analyses
    FOR ALL USING (auth.uid() = user_id);
```
