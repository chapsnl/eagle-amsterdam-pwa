-- Drop the overly permissive UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a restricted UPDATE policy that only allows updating name and profile_image_url
-- Server-managed fields (vip_status, total_stamps_earned, member_number) cannot be changed by clients
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND vip_status IS NOT DISTINCT FROM (SELECT p.vip_status FROM public.profiles p WHERE p.id = auth.uid())
  AND total_stamps_earned IS NOT DISTINCT FROM (SELECT p.total_stamps_earned FROM public.profiles p WHERE p.id = auth.uid())
  AND member_number IS NOT DISTINCT FROM (SELECT p.member_number FROM public.profiles p WHERE p.id = auth.uid())
);