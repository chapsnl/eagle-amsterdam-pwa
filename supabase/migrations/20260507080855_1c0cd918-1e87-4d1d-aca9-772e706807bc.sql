CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  sender_nickname text NOT NULL DEFAULT '',
  recipient_nickname text NOT NULL DEFAULT '',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  sender_deleted boolean NOT NULL DEFAULT false,
  recipient_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_dm_recipient ON public.direct_messages(recipient_id, created_at DESC);
CREATE INDEX idx_dm_sender ON public.direct_messages(sender_id, created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
ON public.direct_messages FOR SELECT TO authenticated
USING (
  (sender_id = auth.uid() AND sender_deleted = false)
  OR (recipient_id = auth.uid() AND recipient_deleted = false)
);

CREATE POLICY "No direct inserts"
ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Users can soft-delete own copy"
ON public.direct_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid() OR recipient_id = auth.uid())
WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());