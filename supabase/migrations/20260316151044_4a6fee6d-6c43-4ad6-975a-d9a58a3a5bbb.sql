ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_stamps_earned integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vip_status text NOT NULL DEFAULT 'Regular';