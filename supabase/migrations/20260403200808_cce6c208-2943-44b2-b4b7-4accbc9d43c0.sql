
-- Community posts table for The Backroom
CREATE TABLE public.community_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  topic text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all posts
CREATE POLICY "Authenticated users can read posts"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can insert own posts"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON public.community_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
