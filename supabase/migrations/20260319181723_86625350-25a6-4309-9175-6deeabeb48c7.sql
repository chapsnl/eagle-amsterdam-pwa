
-- FIX 1: Prevent privilege escalation by making email immutable in profiles UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    (id = auth.uid())
    AND (NOT (email IS DISTINCT FROM (SELECT p.email FROM profiles p WHERE p.id = auth.uid())))
    AND (NOT (vip_status IS DISTINCT FROM (SELECT p.vip_status FROM profiles p WHERE p.id = auth.uid())))
    AND (NOT (total_stamps_earned IS DISTINCT FROM (SELECT p.total_stamps_earned FROM profiles p WHERE p.id = auth.uid())))
    AND (NOT (member_number IS DISTINCT FROM (SELECT p.member_number FROM profiles p WHERE p.id = auth.uid())))
  );

-- FIX 2: Remove client-side stamp manipulation - only service role should update stamps
DROP POLICY IF EXISTS "Users can update own stamps" ON public.loyalty_stamps;

-- FIX 3: Restrict voucher UPDATE to only allow setting redeemed=true and redeemed_at
DROP POLICY IF EXISTS "Users can redeem own vouchers" ON public.member_vouchers;
CREATE POLICY "Users can redeem own vouchers"
  ON public.member_vouchers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    (user_id = auth.uid())
    AND (redeemed = true)
    AND (redeemed_at IS NOT NULL)
    AND (NOT (title IS DISTINCT FROM (SELECT v.title FROM member_vouchers v WHERE v.id = member_vouchers.id)))
    AND (NOT (description IS DISTINCT FROM (SELECT v.description FROM member_vouchers v WHERE v.id = member_vouchers.id)))
    AND (NOT (expires_at IS DISTINCT FROM (SELECT v.expires_at FROM member_vouchers v WHERE v.id = member_vouchers.id)))
    AND (NOT (created_at IS DISTINCT FROM (SELECT v.created_at FROM member_vouchers v WHERE v.id = member_vouchers.id)))
  );

-- FIX 4: Remove client-side stamp INSERT - only service role should insert stamps
DROP POLICY IF EXISTS "Users can insert own stamps" ON public.loyalty_stamps;

-- FIX 5: Add RLS policies for otp_codes (deny all client access - service role only)
-- Already has RLS enabled with no policies = effectively denied. This is correct.

-- FIX 6: Add RLS policies for admin_credentials (deny all client access - service role only)
-- Already has RLS enabled with no policies = effectively denied. This is correct.
