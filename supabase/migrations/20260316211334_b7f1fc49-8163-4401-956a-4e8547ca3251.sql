DROP POLICY IF EXISTS "Only service role can update vouchers" ON member_vouchers;
CREATE POLICY "Users can redeem own vouchers"
  ON member_vouchers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());