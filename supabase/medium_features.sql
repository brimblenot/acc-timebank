-- Medium features: leave chat, skills, donate hours
-- Run this in the Supabase SQL editor

-- 1. is_system flag on messages (used for "left the conversation" notices)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- 2. Skills array on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}';

-- 3. Donate hours between users (no debt allowed)
CREATE OR REPLACE FUNCTION donate_hours(from_user uuid, to_user uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be a positive number';
  END IF;
  IF from_user = to_user THEN
    RAISE EXCEPTION 'Cannot donate hours to yourself';
  END IF;
  IF (SELECT hour_balance FROM profiles WHERE id = from_user) < amount THEN
    RAISE EXCEPTION 'Insufficient hour balance';
  END IF;
  UPDATE profiles SET hour_balance = hour_balance - amount WHERE id = from_user;
  UPDATE profiles SET hour_balance = hour_balance + amount WHERE id = to_user;
END;
$$;
