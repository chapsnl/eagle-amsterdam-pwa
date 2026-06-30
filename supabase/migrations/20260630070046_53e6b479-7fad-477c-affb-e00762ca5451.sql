
-- Create app_role enum and user_roles table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Seed existing admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('5b898229-48ff-4a2d-ae03-2c48c1be1d4b', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Replace is_admin to use role table (no hardcoded email)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Tighten profiles UPDATE policy: pin email to auth.users.email
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND email = ((SELECT au.email FROM auth.users au WHERE au.id = auth.uid()))::text
    AND vip_status IS NOT DISTINCT FROM (SELECT p.vip_status FROM public.profiles p WHERE p.id = auth.uid())
    AND total_stamps_earned IS NOT DISTINCT FROM (SELECT p.total_stamps_earned FROM public.profiles p WHERE p.id = auth.uid())
    AND member_number IS NOT DISTINCT FROM (SELECT p.member_number FROM public.profiles p WHERE p.id = auth.uid())
  );
