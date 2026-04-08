-- Run this in your Supabase SQL editor to enable message read badges.

CREATE TABLE IF NOT EXISTS conversation_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, application_id)
);

ALTER TABLE conversation_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversation reads"
  ON conversation_reads
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
