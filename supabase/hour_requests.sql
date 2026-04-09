-- Add hour request columns to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_hour_request boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS hour_request_amount integer;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS hour_request_status text;
