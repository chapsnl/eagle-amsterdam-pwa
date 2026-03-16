
CREATE TABLE public.member_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.member_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vouchers"
ON public.member_vouchers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Only service role can insert vouchers"
ON public.member_vouchers FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Only service role can update vouchers"
ON public.member_vouchers FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);
