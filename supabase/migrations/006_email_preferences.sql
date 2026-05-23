-- EMAIL-01: email_preferences table
CREATE TABLE email_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_reply    BOOLEAN NOT NULL DEFAULT TRUE,
  email_mention  BOOLEAN NOT NULL DEFAULT TRUE,
  email_digest   TEXT    NOT NULL DEFAULT 'weekly'
                         CHECK (email_digest IN ('none', 'daily', 'weekly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-insert row for every new user
CREATE OR REPLACE FUNCTION handle_new_email_preferences()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO email_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_email_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_email_preferences();

-- Backfill existing users
INSERT INTO email_preferences (user_id)
SELECT id FROM profiles
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email prefs"
  ON email_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role needs SELECT for digest cron (bypasses RLS by default)
