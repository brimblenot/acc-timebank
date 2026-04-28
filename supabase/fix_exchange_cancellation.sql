-- Run this in the Supabase SQL editor.

-- 1. Add is_read column to messages for per-message read tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- 2. RPC: Applicant leaves / cancels an approved exchange.
--    Reopens the post, declines pending apps, sends system message + notification.
CREATE OR REPLACE FUNCTION cancel_exchange_as_applicant(p_application_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_post_id      uuid;
  v_post_title   text;
  v_poster_id    uuid;
  v_applicant_id uuid;
  v_actor_name   text;
BEGIN
  SELECT a.post_id, a.applicant_id, sp.poster_id, sp.title
    INTO v_post_id, v_applicant_id, v_poster_id, v_post_title
    FROM applications a
    JOIN service_posts sp ON sp.id = a.post_id
   WHERE a.id = p_application_id
     AND a.applicant_id = auth.uid()
     AND a.status = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized or application is not in approved state';
  END IF;

  SELECT COALESCE(full_name, username, 'Someone')
    INTO v_actor_name FROM profiles WHERE id = v_applicant_id;

  UPDATE applications SET status = 'cancelled' WHERE id = p_application_id;
  UPDATE service_posts SET status = 'open' WHERE id = v_post_id;
  UPDATE applications
     SET status = 'declined'
   WHERE post_id = v_post_id
     AND status = 'pending'
     AND id != p_application_id;

  INSERT INTO messages (application_id, sender_id, content, is_system)
    VALUES (p_application_id, v_applicant_id,
            v_actor_name || ' has left this exchange. The post has been reopened for new applicants.',
            true);

  INSERT INTO notifications (user_id, type, message, post_id, application_id)
    VALUES (v_poster_id, 'exchange_cancelled',
            v_actor_name || ' has left the exchange. Your post has been reopened.',
            v_post_id, p_application_id);
END;
$$;

-- 3. RPC: Poster cancels an approved exchange.
--    Permanently closes the post, sends system message + notification.
CREATE OR REPLACE FUNCTION cancel_exchange_as_poster(p_application_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_post_id      uuid;
  v_post_title   text;
  v_poster_id    uuid;
  v_applicant_id uuid;
  v_actor_name   text;
BEGIN
  SELECT a.post_id, a.applicant_id, sp.poster_id, sp.title
    INTO v_post_id, v_applicant_id, v_poster_id, v_post_title
    FROM applications a
    JOIN service_posts sp ON sp.id = a.post_id
   WHERE a.id = p_application_id
     AND sp.poster_id = auth.uid()
     AND a.status = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized or application is not in approved state';
  END IF;

  SELECT COALESCE(full_name, username, 'Someone')
    INTO v_actor_name FROM profiles WHERE id = v_poster_id;

  UPDATE applications SET status = 'cancelled' WHERE id = p_application_id;
  UPDATE service_posts SET status = 'cancelled' WHERE id = v_post_id;

  INSERT INTO messages (application_id, sender_id, content, is_system)
    VALUES (p_application_id, v_poster_id,
            v_actor_name || ' has cancelled this exchange. The post has been closed.',
            true);

  INSERT INTO notifications (user_id, type, message, post_id, application_id)
    VALUES (v_applicant_id, 'exchange_cancelled',
            v_actor_name || ' has cancelled the exchange for "' || v_post_title || '".',
            v_post_id, p_application_id);
END;
$$;

-- 4. RPC: Mark all unread messages in a conversation as read.
--    Also keeps the conversation_reads watermark in sync.
CREATE OR REPLACE FUNCTION mark_messages_read(p_application_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM applications a
    JOIN service_posts sp ON sp.id = a.post_id
    WHERE a.id = p_application_id
      AND (a.applicant_id = v_uid OR sp.poster_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE messages
     SET is_read = true
   WHERE application_id = p_application_id
     AND is_read = false
     AND (sender_id IS DISTINCT FROM v_uid);

  INSERT INTO conversation_reads (user_id, application_id, last_read_at)
    VALUES (v_uid, p_application_id, now())
  ON CONFLICT (user_id, application_id)
  DO UPDATE SET last_read_at = now();
END;
$$;
