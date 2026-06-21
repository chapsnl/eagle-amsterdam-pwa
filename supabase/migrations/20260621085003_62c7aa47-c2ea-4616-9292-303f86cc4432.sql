CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'cleanup-free-entry-vouchers',
  '0 22 21 6 *',
  $$
  DELETE FROM public.member_vouchers WHERE title = 'FREE ENTRY';
  SELECT cron.unschedule('cleanup-free-entry-vouchers');
  $$
);