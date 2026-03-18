
-- Create a security definer function to check if a user is admin by email
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND email = 'michael.roks@icloud.com'
  )
$$;

-- Create active_loyalty_code table to store the current QR code
CREATE TABLE IF NOT EXISTS public.active_loyalty_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS on active_loyalty_code
ALTER TABLE public.active_loyalty_code ENABLE ROW LEVEL SECURITY;

-- Only admin can read
CREATE POLICY "Admin can read loyalty codes"
ON public.active_loyalty_code
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only admin can insert
CREATE POLICY "Admin can insert loyalty codes"
ON public.active_loyalty_code
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Only admin can delete
CREATE POLICY "Admin can delete loyalty codes"
ON public.active_loyalty_code
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
