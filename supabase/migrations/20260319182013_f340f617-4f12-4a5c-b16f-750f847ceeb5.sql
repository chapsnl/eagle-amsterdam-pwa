
-- FIX: Restrict profiles INSERT to use the email from auth.users, preventing admin email spoofing
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND email = (SELECT au.email FROM auth.users au WHERE au.id = auth.uid())
  );
