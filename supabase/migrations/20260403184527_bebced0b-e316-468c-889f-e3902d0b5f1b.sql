CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('popup', 'link')),
  url text,
  popup_message text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to active tickets"
ON tickets FOR SELECT
TO anon, authenticated
USING (active = true);

INSERT INTO tickets (name, type, url, popup_message, display_order) VALUES
  ('Bear Bash', 'popup', null, 'This is a free event', 1),
  ('Horsemen & Knights', 'popup', null, 'Tickets only at the door for 8 Euro', 2),
  ('NcAdam', 'popup', null, 'Tickets only at the door for 8 Euro', 3),
  ('Cum Hunks', 'popup', null, 'Tickets only at the door for 8 Euro', 4),
  ('Horse Fair', 'popup', null, 'Tickets only at the door for 12,50 Euro', 5),
  ('XXXFetish', 'popup', null, 'Tickets only at the door for 8 Euro', 6),
  ('Ready2Play', 'link', 'https://www.ready-2-play.nl/#tickets', null, 7),
  ('Sneaky', 'link', 'https://www.sneaky-the-party.com/#tickets', null, 8),
  ('The Meantime', 'link', 'https://www.themeantime.nl/#tickets', null, 9),
  ('Pup Unleashed', 'link', 'https://www.puppyunleashed.nl/#tickets', null, 10),
  ('Corner Time', 'link', 'https://www.cornertime.nl/#tickets', null, 11);