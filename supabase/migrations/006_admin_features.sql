-- ADMIN-06: Add is_banned to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

-- ADMIN-07: Community settings table
CREATE TABLE IF NOT EXISTS public.community_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default settings
INSERT INTO public.community_settings (key, value) VALUES
  ('community_name', 'Community'),
  ('community_logo_url', ''),
  ('primary_color', '#6366f1')
ON CONFLICT (key) DO NOTHING;

-- RLS for community_settings
ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community settings"
  ON public.community_settings FOR SELECT USING (true);

CREATE POLICY "Only admins can modify community settings"
  ON public.community_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
