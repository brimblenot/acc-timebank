-- Run this in your Supabase SQL editor to enable the notifications system.

-- Step 1: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  post_id uuid REFERENCES service_posts(id) ON DELETE SET NULL,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: RLS policies (users can only read/update their own notifications)
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 4: Enable realtime so the bell count updates without page refresh
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─────────────────────────────────────────────
-- Step 5: Trigger functions
-- ─────────────────────────────────────────────

-- 5a. Someone applies to your post → notify the poster
CREATE OR REPLACE FUNCTION notify_on_new_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_poster_id    uuid;
  v_post_title   text;
  v_applicant_name text;
BEGIN
  SELECT sp.poster_id, sp.title
    INTO v_poster_id, v_post_title
    FROM service_posts sp
   WHERE sp.id = NEW.post_id;

  SELECT COALESCE(p.full_name, p.username, 'Someone')
    INTO v_applicant_name
    FROM profiles p
   WHERE p.id = NEW.applicant_id;

  INSERT INTO notifications (user_id, type, message, post_id, application_id)
  VALUES (
    v_poster_id,
    'application',
    v_applicant_name || ' applied to your post "' || v_post_title || '"',
    NEW.post_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_application ON applications;
CREATE TRIGGER on_new_application
  AFTER INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_application();

-- 5b. Application approved or declined → notify the applicant
CREATE OR REPLACE FUNCTION notify_on_application_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_post_title text;
BEGIN
  -- Only fire when status actually changes to approved or declined
  IF NEW.status NOT IN ('approved', 'declined') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT sp.title
    INTO v_post_title
    FROM service_posts sp
   WHERE sp.id = NEW.post_id;

  INSERT INTO notifications (user_id, type, message, post_id, application_id)
  VALUES (
    NEW.applicant_id,
    'application_' || NEW.status,
    CASE NEW.status
      WHEN 'approved' THEN 'Your application for "' || v_post_title || '" was approved'
      ELSE                  'Your application for "' || v_post_title || '" was declined'
    END,
    NEW.post_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_status_change ON applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION notify_on_application_status_change();

-- 5c. Service post marked complete → notify both the poster and the applicant
CREATE OR REPLACE FUNCTION notify_on_service_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_applicant_id uuid;
BEGIN
  IF NEW.status != 'completed' OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Find the approved applicant for this post
  SELECT a.applicant_id
    INTO v_applicant_id
    FROM applications a
   WHERE a.post_id = NEW.id AND a.status = 'approved'
   LIMIT 1;

  -- Notify poster
  INSERT INTO notifications (user_id, type, message, post_id)
  VALUES (
    NEW.poster_id,
    'service_completed',
    '"' || NEW.title || '" has been marked as complete',
    NEW.id
  );

  -- Notify applicant (if different from poster)
  IF v_applicant_id IS NOT NULL AND v_applicant_id != NEW.poster_id THEN
    INSERT INTO notifications (user_id, type, message, post_id)
    VALUES (
      v_applicant_id,
      'service_completed',
      '"' || NEW.title || '" has been marked as complete',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_service_completed ON service_posts;
CREATE TRIGGER on_service_completed
  AFTER UPDATE ON service_posts
  FOR EACH ROW EXECUTE FUNCTION notify_on_service_completed();

-- 5d. New message sent → notify the recipient
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_recipient_id   uuid;
  v_sender_name    text;
  v_post_title     text;
  v_post_id        uuid;
  v_applicant_id   uuid;
  v_poster_id      uuid;
BEGIN
  -- Skip system messages (service-end notices, etc.)
  IF NEW.is_system = true THEN
    RETURN NEW;
  END IF;

  SELECT a.applicant_id, sp.poster_id, sp.title, sp.id
    INTO v_applicant_id, v_poster_id, v_post_title, v_post_id
    FROM applications a
    JOIN service_posts sp ON sp.id = a.post_id
   WHERE a.id = NEW.application_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- The recipient is whoever did NOT send the message
  IF NEW.sender_id = v_applicant_id THEN
    v_recipient_id := v_poster_id;
  ELSE
    v_recipient_id := v_applicant_id;
  END IF;

  SELECT COALESCE(p.full_name, p.username, 'Someone')
    INTO v_sender_name
    FROM profiles p
   WHERE p.id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, message, post_id, application_id)
  VALUES (
    v_recipient_id,
    'message',
    v_sender_name || ' sent you a message about "' || v_post_title || '"',
    v_post_id,
    NEW.application_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();
