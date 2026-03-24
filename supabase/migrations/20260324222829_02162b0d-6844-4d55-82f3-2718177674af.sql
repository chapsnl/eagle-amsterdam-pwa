
CREATE OR REPLACE FUNCTION public.delete_redeemed_voucher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.redeemed = true AND (OLD.redeemed IS DISTINCT FROM NEW.redeemed) THEN
    DELETE FROM public.member_vouchers WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_delete_redeemed_voucher
AFTER UPDATE ON public.member_vouchers
FOR EACH ROW
EXECUTE FUNCTION public.delete_redeemed_voucher();
