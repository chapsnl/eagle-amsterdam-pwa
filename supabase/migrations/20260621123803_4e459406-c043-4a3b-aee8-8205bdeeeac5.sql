
CREATE TABLE public.voucher_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.voucher_redemptions TO authenticated;
GRANT ALL ON public.voucher_redemptions TO service_role;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view all redemptions"
  ON public.voucher_redemptions FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE INDEX idx_voucher_redemptions_title_time ON public.voucher_redemptions(title, redeemed_at DESC);

CREATE OR REPLACE FUNCTION public.delete_redeemed_voucher()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.redeemed = true AND (OLD.redeemed IS DISTINCT FROM NEW.redeemed) THEN
    INSERT INTO public.voucher_redemptions (user_id, title, description)
    VALUES (NEW.user_id, NEW.title, NEW.description);
    DELETE FROM public.member_vouchers WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END;
$function$;
