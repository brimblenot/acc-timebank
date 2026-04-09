-- Add vacation_mode to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vacation_mode boolean DEFAULT false;
