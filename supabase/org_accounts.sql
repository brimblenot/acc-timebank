-- ═══════════════════════════════════════════════════════════════════
-- ORGANIZATIONAL ACCOUNTS & EVENTS SYSTEM
-- Run this in your Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- Part 1: Add org columns to profiles
-- ─────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'member'
  CHECK (account_type IN ('member', 'organization'));

-- org_status defaults to 'approved' so all existing member profiles are unaffected.
-- New org signups explicitly set this to 'pending'.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_status text NOT NULL DEFAULT 'approved'
  CHECK (org_status IN ('pending', 'approved', 'rejected'));

-- ─────────────────────────────────────────────
-- Part 2: Events table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           text         NOT NULL,
  description     text         NOT NULL,
  category        text         NOT NULL,
  hours_awarded   integer      NOT NULL CHECK (hours_awarded BETWEEN 1 AND 20),
  location        text,
  event_date      timestamptz,
  status          text         NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'completed', 'cancelled')),
  hours_finalized boolean      NOT NULL DEFAULT false,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orgs can insert own events"   ON events;
DROP POLICY IF EXISTS "Orgs can update own events"   ON events;
DROP POLICY IF EXISTS "Authenticated users can read events" ON events;

CREATE POLICY "Orgs can insert own events" ON events FOR INSERT
  WITH CHECK (auth.uid() = org_id);

CREATE POLICY "Orgs can update own events" ON events FOR UPDATE
  USING (auth.uid() = org_id);

-- Open events are visible to all authenticated users; orgs see their own regardless of status
CREATE POLICY "Authenticated users can read events" ON events FOR SELECT
  USING (auth.uid() IS NOT NULL AND (status = 'open' OR auth.uid() = org_id));

-- ─────────────────────────────────────────────
-- Part 3: Event signups table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_signups (
  id        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  uuid         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attended  boolean      DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);

ALTER TABLE event_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can insert own signups"  ON event_signups;
DROP POLICY IF EXISTS "Members can delete own signups"  ON event_signups;
DROP POLICY IF EXISTS "Orgs can update attendance"      ON event_signups;
DROP POLICY IF EXISTS "Authenticated users read signups" ON event_signups;

CREATE POLICY "Members can insert own signups" ON event_signups FOR INSERT
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Members can delete own signups" ON event_signups FOR DELETE
  USING (auth.uid() = member_id);

CREATE POLICY "Orgs can update attendance" ON event_signups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM events WHERE id = event_id AND org_id = auth.uid()));

CREATE POLICY "Authenticated users read signups" ON event_signups FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- Part 4: Transactions table (hour award log)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid         REFERENCES profiles(id) ON DELETE SET NULL,
  to_user_id   uuid         REFERENCES profiles(id) ON DELETE SET NULL,
  amount       integer      NOT NULL,
  reason       text,
  event_id     uuid         REFERENCES events(id) ON DELETE SET NULL,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
CREATE POLICY "Users can read own transactions" ON transactions FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- ─────────────────────────────────────────────
-- Part 5: award_event_hours RPC
-- Credits hours directly to a member without debiting the organization.
-- Called by the org when finalizing event attendance.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION award_event_hours(
  p_to_user  uuid,
  p_amount   integer,
  p_event_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_title  text;
  v_org_id uuid;
BEGIN
  SELECT title, org_id INTO v_title, v_org_id
  FROM events WHERE id = p_event_id;

  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_org_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the hosting organization can award hours';
  END IF;

  -- Credit member
  UPDATE profiles SET hour_balance = hour_balance + p_amount WHERE id = p_to_user;

  -- Log transaction
  INSERT INTO transactions (from_user_id, to_user_id, amount, reason, event_id)
  VALUES (v_org_id, p_to_user, p_amount, 'Event attendance: ' || v_title, p_event_id);

  -- Notify member
  INSERT INTO notifications (user_id, type, message)
  VALUES (
    p_to_user,
    'hours_received',
    p_amount || ' hour' || CASE WHEN p_amount != 1 THEN 's' ELSE '' END
      || ' awarded for attending "' || v_title || '"'
  );
END;
$$;

-- ─────────────────────────────────────────────
-- Part 6: RLS — orgs must be able to update their own profile row
-- (needed for the pending → approved status change via admin, but also
--  for org_status reads during login)
-- ─────────────────────────────────────────────

-- Allow all authenticated users to read profiles (needed for events/org display)
-- Only add if a public-read policy doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Profiles are publicly readable'
  ) THEN
    CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END
$$;

-- Enable realtime on events so org dashboard updates live
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_signups;
