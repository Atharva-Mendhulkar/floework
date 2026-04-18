-- ==========================================
-- AVATAR STORAGE SYSTEM (016)
-- ==========================================

-- 1. Create the avatars storage bucket (public, so URLs work without tokens)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 3. Allow users to update/overwrite their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 5. Allow anyone to read avatars (public bucket)
CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');
