-- Enable Row-Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popular_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_rights_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_analyses ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Table Policies
CREATE POLICY "Allow public read-only access to profiles" 
    ON public.profiles FOR SELECT 
    TO authenticated, anon 
    USING (true);

CREATE POLICY "Allow users to update their own profiles" 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- 2. Legal Documents Policies
CREATE POLICY "Legal documents are publicly readable" 
    ON public.legal_documents FOR SELECT 
    TO authenticated, anon 
    USING (true);

-- 3. Popular Queries Policies
CREATE POLICY "Popular queries are publicly readable" 
    ON public.popular_queries FOR SELECT 
    TO authenticated, anon 
    USING (true);

-- 4. Saved Rights Policies
CREATE POLICY "Users can view their own saved rights" 
    ON public.saved_rights FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved rights" 
    ON public.saved_rights FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved rights" 
    ON public.saved_rights FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved rights" 
    ON public.saved_rights FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- 5. Saved Rights Citations Policies
CREATE POLICY "Users can view citations of their saved rights" 
    ON public.saved_rights_citations FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.saved_rights 
            WHERE saved_rights.id = saved_rights_citations.saved_right_id 
            AND saved_rights.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert citations for their saved rights" 
    ON public.saved_rights_citations FOR INSERT 
    TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.saved_rights 
            WHERE saved_rights.id = saved_rights_citations.saved_right_id 
            AND saved_rights.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete citations of their saved rights" 
    ON public.saved_rights_citations FOR DELETE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.saved_rights 
            WHERE saved_rights.id = saved_rights_citations.saved_right_id 
            AND saved_rights.user_id = auth.uid()
        )
    );

-- 6. Media Analyses Policies
CREATE POLICY "Users can view their own media analyses" 
    ON public.media_analyses FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own media analyses" 
    ON public.media_analyses FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media analyses" 
    ON public.media_analyses FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media analyses" 
    ON public.media_analyses FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);
