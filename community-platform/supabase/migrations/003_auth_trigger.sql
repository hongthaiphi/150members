-- AUTH-10: Auto-create profiles record on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Extract username from email (before @)
  base_username := SPLIT_PART(NEW.email, '@', 1);
  -- Remove non-alphanumeric characters
  base_username := REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_]', '', 'g');
  -- Ensure minimum length
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user' || base_username;
  END IF;

  final_username := base_username;

  -- Handle username collisions
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', final_username),
    'member'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
