
-- Fix search_path on functions
ALTER FUNCTION public.generate_member_number() SET search_path = public;
ALTER FUNCTION public.assign_member_number() SET search_path = public;
