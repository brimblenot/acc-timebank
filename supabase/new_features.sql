-- Run this in your Supabase SQL editor to add all new features.

-- ─────────────────────────────────────────────
-- Part 1: Update reviews table for quality-based compliment system
-- ─────────────────────────────────────────────

-- Add selected_qualities column
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS selected_qualities text[] DEFAULT '{}';

-- Remove old columns (no longer used)
ALTER TABLE reviews DROP COLUMN IF EXISTS rating;
ALTER TABLE reviews DROP COLUMN IF EXISTS comment;

-- ─────────────────────────────────────────────
-- Part 2: Add show_compliments to profiles
-- ─────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_compliments boolean NOT NULL DEFAULT true;

-- ─────────────────────────────────────────────
-- Part 3: Update application status change trigger
-- Adds 'someone_else_accepted' and 'exchange_cancelled' notification types
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_application_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_post_title      text;
  v_poster_id       uuid;
  v_approved_exists boolean;
  v_canceller_name  text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT sp.title, sp.poster_id
    INTO v_post_title, v_poster_id
    FROM service_posts sp
   WHERE sp.id = NEW.post_id;

  -- Handle cancelled: notify both the applicant and the poster
  IF NEW.status = 'cancelled' THEN
    SELECT COALESCE(p.full_name, p.username, 'Someone')
      INTO v_canceller_name
      FROM profiles p
     WHERE p.id = NEW.applicant_id;

    INSERT INTO notifications (user_id, type, message, post_id, application_id)
    VALUES (
      NEW.applicant_id,
      'exchange_cancelled',
      v_canceller_name || ' cancelled the exchange for "' || v_post_title || '"',
      NEW.post_id, NEW.id
    );

    IF v_poster_id IS NOT NULL AND v_poster_id != NEW.applicant_id THEN
      INSERT INTO notifications (user_id, type, message, post_id, application_id)
      VALUES (
        v_poster_id,
        'exchange_cancelled',
        v_canceller_name || ' cancelled the exchange for "' || v_post_title || '"',
        NEW.post_id, NEW.id
      );
    END IF;

    RETURN NEW;
  END IF;

  -- Handle approved
  IF NEW.status = 'approved' THEN
    INSERT INTO notifications (user_id, type, message, post_id, application_id)
    VALUES (
      NEW.applicant_id,
      'application_approved',
      'Your application for "' || v_post_title || '" was approved',
      NEW.post_id, NEW.id
    );
    RETURN NEW;
  END IF;

  -- Handle declined: distinguish between manual decline and someone-else-accepted
  IF NEW.status = 'declined' THEN
    SELECT EXISTS(
      SELECT 1 FROM applications
       WHERE post_id = NEW.post_id AND status = 'approved' AND id != NEW.id
    ) INTO v_approved_exists;

    IF v_approved_exists THEN
      INSERT INTO notifications (user_id, type, message, post_id, application_id)
      VALUES (
        NEW.applicant_id,
        'someone_else_accepted',
        'Someone else was selected for "' || v_post_title || '"',
        NEW.post_id, NEW.id
      );
    ELSE
      INSERT INTO notifications (user_id, type, message, post_id, application_id)
      VALUES (
        NEW.applicant_id,
        'application_declined',
        'Your application for "' || v_post_title || '" was declined',
        NEW.post_id, NEW.id
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────
-- Part 4: New trigger for review/compliment notifications
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_new_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_reviewer_name text;
BEGIN
  SELECT COALESCE(p.full_name, p.username, 'Someone')
    INTO v_reviewer_name
    FROM profiles p
   WHERE p.id = NEW.reviewer_id;

  INSERT INTO notifications (user_id, type, message, post_id)
  VALUES (
    NEW.reviewee_id,
    'new_review',
    v_reviewer_name || ' left you a compliment',
    NEW.post_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_review ON reviews;
CREATE TRIGGER on_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_review();
