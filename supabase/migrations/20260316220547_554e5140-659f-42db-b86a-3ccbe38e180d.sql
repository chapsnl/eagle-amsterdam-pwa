-- Fix 1: member_vouchers SELECT policy - scope to own user only
DROP POLICY IF EXISTS "Users can view their own vouchers" ON member_vouchers;
CREATE POLICY "Users can view their own vouchers"
  ON member_vouchers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Fix 2: Add attempts column to otp_codes for brute-force protection
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;