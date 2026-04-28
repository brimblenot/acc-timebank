-- Fix RLS policies on messages table.
-- Run this in the Supabase SQL editor.

-- 1. Allow poster to update hour_request_status on messages.
--    Without this, approving or declining an hour request card silently fails,
--    causing the card to reappear on every page refresh.
DROP POLICY IF EXISTS "Poster can update hour request status" ON messages;
CREATE POLICY "Poster can update hour request status"
  ON messages FOR UPDATE
  USING (
    is_hour_request = true AND
    EXISTS (
      SELECT 1 FROM applications a
      JOIN service_posts sp ON sp.id = a.post_id
      WHERE a.id = messages.application_id
        AND sp.poster_id = auth.uid()
    )
  )
  WITH CHECK (
    is_hour_request = true AND
    EXISTS (
      SELECT 1 FROM applications a
      JOIN service_posts sp ON sp.id = a.post_id
      WHERE a.id = messages.application_id
        AND sp.poster_id = auth.uid()
    )
  );

-- 2. Allow conversation participants to insert automated system messages
--    (sender_id = null, is_system = true).
--    Without this, hour approval/decline confirmation messages silently fail
--    and never appear for either party.
DROP POLICY IF EXISTS "Participants can insert system messages" ON messages;
CREATE POLICY "Participants can insert system messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id IS NULL AND
    is_system = true AND
    EXISTS (
      SELECT 1 FROM applications a
      JOIN service_posts sp ON sp.id = a.post_id
      WHERE a.id = application_id
        AND (a.applicant_id = auth.uid() OR sp.poster_id = auth.uid())
    )
  );
