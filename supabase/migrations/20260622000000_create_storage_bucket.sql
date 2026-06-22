-- Create private storage bucket for user evidence media uploads

-- 1. Create storage bucket 'media-uploads'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media-uploads',
    'media-uploads',
    false, -- Private bucket
    10485760, -- 10MB limit (10 * 1024 * 1024 bytes)
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS Policies for user isolation inside the 'media-uploads' bucket

-- Policy: Allow authenticated users to upload files in their own folder (auth.uid()/filename)
CREATE POLICY "Allow authenticated uploads to own folder" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'media-uploads' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Allow authenticated users to select/read files from their own folder
CREATE POLICY "Allow authenticated select from own folder" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'media-uploads' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Allow authenticated users to delete files from their own folder
CREATE POLICY "Allow authenticated delete from own folder" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'media-uploads' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
