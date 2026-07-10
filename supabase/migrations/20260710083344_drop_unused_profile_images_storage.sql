-- Remove unused profile-images storage bucket + policies.
-- No UI ever called upload-profile-image (no <input type="file"> anywhere
-- in the app), and the bucket has 0 objects. profiles.profile_image_url
-- stays (still read defensively in VipMemberPass.tsx) but nothing writes it.

DROP POLICY IF EXISTS "Users can upload own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile image" ON storage.objects;

DELETE FROM storage.buckets WHERE id = 'profile-images';
