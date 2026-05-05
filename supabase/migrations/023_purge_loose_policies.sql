-- Purge all loose or redundant policies to ensure only hardened policies are active
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (
            policyname LIKE 'anyone authenticated%' OR
            policyname IN (
                'teams_insert_admin', 
                'Users can view their own project narratives', 
                'System can manage narratives', 
                'admins_manage_invites', 
                'invite_token_select',
                'users can add themselves to teams'
            )
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;
