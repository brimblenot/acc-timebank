-- Admin system for ACC Timebank
-- Run this in your Supabase SQL editor.

-- ─────────────────────────────────────────────
-- Step 1: Add is_admin column to profiles
-- ─────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────
-- Step 2: Create suspensions table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  suspended_until timestamptz NOT NULL,
  suspended_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suspensions ENABLE ROW LEVEL SECURITY;

-- Admins can fully manage all suspensions
DROP POLICY IF EXISTS "Admins can manage suspensions" ON suspensions;
CREATE POLICY "Admins can manage suspensions"
  ON suspensions
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Users can read their own suspension row
DROP POLICY IF EXISTS "Users can read own suspension" ON suspensions;
CREATE POLICY "Users can read own suspension"
  ON suspensions FOR SELECT
  USING (auth.uid() = user_id);

-- Enable realtime so the guard detects new suspensions live
ALTER PUBLICATION supabase_realtime ADD TABLE suspensions;

-- ─────────────────────────────────────────────
-- Step 3: Allow admins to insert notifications for any user
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON notifications;
CREATE POLICY "Admins can insert notifications for any user"
  ON notifications FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ─────────────────────────────────────────────
-- Step 4: Allow admins to delete any service post
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can delete any service post" ON service_posts;
CREATE POLICY "Admins can delete any service post"
  ON service_posts FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ─────────────────────────────────────────────
-- Step 5: RPC for admins to read user email addresses
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_emails_for_admin()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;
  RETURN QUERY SELECT id, email::text FROM auth.users;
END;
$$;
