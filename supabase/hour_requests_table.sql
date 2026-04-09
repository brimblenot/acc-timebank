-- Hour Requests feature — run this in your Supabase SQL editor.

-- ─────────────────────────────────────────────
-- Step 1: Create the hour_requests table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hour_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount        integer NOT NULL CHECK (amount BETWEEN 1 AND 20),
  message       text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Step 2: RLS
-- ─────────────────────────────────────────────
ALTER TABLE hour_requests ENABLE ROW LEVEL SECURITY;

-- Requester can insert (must set themselves as from_user)
CREATE POLICY "Users can send hour requests"
  ON hour_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Both parties can read their own requests
CREATE POLICY "Users can read own hour requests"
  ON hour_requests FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Only the recipient can approve or decline
CREATE POLICY "Recipients can update hour requests"
  ON hour_requests FOR UPDATE
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- ─────────────────────────────────────────────
-- Step 3: Enable realtime
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE hour_requests;

-- ─────────────────────────────────────────────
-- Step 4: RPC — transfer hours with debt allowance down to -5
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION transfer_hours_for_request(
  from_user uuid,
  to_user   uuid,
  amount    integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  IF from_user = to_user THEN
    RAISE EXCEPTION 'Cannot transfer hours to yourself';
  END IF;
  IF (SELECT hour_balance FROM profiles WHERE id = from_user) - amount < -5 THEN
    RAISE EXCEPTION 'Insufficient balance — you cannot go below −5 hours';
  END IF;
  UPDATE profiles SET hour_balance = hour_balance - amount WHERE id = from_user;
  UPDATE profiles SET hour_balance = hour_balance + amount WHERE id = to_user;
END;
$$;

-- ─────────────────────────────────────────────
-- Step 5: Notification triggers
-- ─────────────────────────────────────────────

-- 5a. New hour request → notify the recipient (to_user)
CREATE OR REPLACE FUNCTION notify_on_hour_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_requester_name text;
  v_plural         text;
BEGIN
  SELECT COALESCE(p.full_name, p.username, 'Someone')
    INTO v_requester_name
    FROM profiles p WHERE p.id = NEW.from_user_id;

  v_plural := CASE WHEN NEW.amount = 1 THEN '' ELSE 's' END;

  INSERT INTO notifications (user_id, type, message)
  VALUES (
    NEW.to_user_id,
    'hour_request',
    v_requester_name || ' is requesting ' || NEW.amount || ' hour' || v_plural || ' from you'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_hour_request ON hour_requests;
CREATE TRIGGER on_hour_request
  AFTER INSERT ON hour_requests
  FOR EACH ROW EXECUTE FUNCTION notify_on_hour_request();

-- 5b. Request approved/declined → notify the requester (from_user)
CREATE OR REPLACE FUNCTION notify_on_hour_request_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_responder_name text;
  v_plural         text;
BEGIN
  IF NEW.status NOT IN ('approved', 'declined') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.full_name, p.username, 'Someone')
    INTO v_responder_name
    FROM profiles p WHERE p.id = NEW.to_user_id;

  v_plural := CASE WHEN NEW.amount = 1 THEN '' ELSE 's' END;

  INSERT INTO notifications (user_id, type, message)
  VALUES (
    NEW.from_user_id,
    CASE NEW.status
      WHEN 'approved' THEN 'hours_received'
      ELSE 'hours_declined'
    END,
    CASE NEW.status
      WHEN 'approved'
        THEN v_responder_name || ' approved your request and sent you ' || NEW.amount || ' hour' || v_plural
      ELSE
        v_responder_name || ' declined your hour request'
    END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_hour_request_status_change ON hour_requests;
CREATE TRIGGER on_hour_request_status_change
  AFTER UPDATE ON hour_requests
  FOR EACH ROW EXECUTE FUNCTION notify_on_hour_request_status_change();
