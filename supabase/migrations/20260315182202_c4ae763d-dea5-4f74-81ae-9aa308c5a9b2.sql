
-- Add member_number and profile_image_url to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS member_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS profile_image_url text;

-- Function to generate unique 8-digit member number
CREATE OR REPLACE FUNCTION public.generate_member_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_number text;
  done boolean := false;
BEGIN
  WHILE NOT done LOOP
    new_number := lpad(floor(random() * 100000000)::text, 8, '0');
    BEGIN
      PERFORM 1 FROM public.profiles WHERE member_number = new_number;
      IF NOT FOUND THEN
        done := true;
      END IF;
    END;
  END LOOP;
  RETURN new_number;
END;
$$;

-- Assign member numbers to existing profiles that don't have one
UPDATE public.profiles
SET member_number = public.generate_member_number()
WHERE member_number IS NULL;

-- Create trigger to auto-assign member_number on new profile creation
CREATE OR REPLACE FUNCTION public.assign_member_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.member_number IS NULL THEN
    NEW.member_number := public.generate_member_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_member_number ON public.profiles;
CREATE TRIGGER trigger_assign_member_number
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_member_number();

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile-images bucket
CREATE POLICY "Users can upload own profile image"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own profile image"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can delete own profile image"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);
