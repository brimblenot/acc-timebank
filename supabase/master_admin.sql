-- Master admin system for ACC Timebank
-- ═══════════════════════════════════════════════════════════════
-- HOW TO CREATE THE FIRST MASTER ADMIN
-- After running this migration in the Supabase SQL editor,
-- run this once to promote your account, replacing the UUID:
--
--   UPDATE profiles
--   SET is_admin = true, is_master_admin = true
--   WHERE id = 'your-user-id-here';
--
-- You can find your user ID in: Supabase Dashboard → Authentication → Users
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- Part 1: Add is_master_admin column to profiles
-- ─────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_master_admin boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────
-- Part 2: Trigger to protect is_admin / is_master_admin columns
-- Only a master admin (is_master_admin = true) may change these fields.
-- Regular admins and regular users cannot promote or demote anyone.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_admin_column_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- If either admin flag is being changed, verify the caller is a master admin
  IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin OR NEW.is_master_admin IS DISTINCT FROM OLD.is_master_admin) THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master_admin = true
    ) THEN
      RAISE EXCEPTION 'Only master admins can modify admin status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_column_update ON profiles;
CREATE TRIGGER enforce_admin_column_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_admin_column_update();

-- ─────────────────────────────────────────────
-- Part 3: RLS – allow master admins to update any profile row
-- (required for the Make Admin / Revoke Admin buttons)
-- Regular profile updates (own row) are handled by the existing
-- "Users can update own profile" policy.
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Master admins can update any profile" ON profiles;
CREATE POLICY "Master admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master_admin = true)
  );

-- ─────────────────────────────────────────────
-- Part 4: Fix reviews table RLS
-- Ensures inserts and public reads work correctly.
-- ─────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
CREATE POLICY "Users can insert their own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Reviews are publicly readable" ON reviews;
CREATE POLICY "Reviews are publicly readable"
  ON reviews FOR SELECT
  USING (true);
