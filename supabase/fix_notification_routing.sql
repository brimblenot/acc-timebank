-- ═══════════════════════════════════════════════════════════════════
-- FIX: Notification routing + event history visibility
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- Fix 1: Events RLS — members cannot read completed events
--
-- The current policy only lets members see events with status='open'
-- or events where they are the org. After an org finalizes attendance
-- the event becomes 'completed', so the nested join in history/page.js
-- returns null for the events row and the signup is silently dropped.
--
-- Fix: allow all authenticated users to read any event, regardless of status.
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read events" ON events;

CREATE POLICY "Authenticated users can read events" ON events FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ─────────────────────────────────────────────
-- Fix 2: award_event_hours — use 'event_hours_awarded' notification type
--
-- Previously used 'hours_received' (same as manual hour-request approvals).
-- Using a distinct type lets the NotificationBell route event-hour
-- notifications to /history while keeping hour-request routing separate.
--
-- Also ensures the notification type is distinct from hour-request approvals.
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

  -- Credit member's hour balance
  UPDATE profiles
  SET hour_balance = hour_balance + p_amount
  WHERE id = p_to_user;

  -- Log transaction (transactions table may use event_id or omit it;
  -- insert without it to be safe across schema versions)
  INSERT INTO transactions (from_user_id, to_user_id, amount, reason)
  VALUES (NULL, p_to_user, p_amount, 'Event attendance: ' || v_title);

  -- Notify member with a distinct event-specific type
  INSERT INTO notifications (user_id, type, message)
  VALUES (
    p_to_user,
    'event_hours_awarded',
    p_amount || ' hour' || CASE WHEN p_amount != 1 THEN 's' ELSE '' END
      || ' awarded for attending "' || v_title || '"'
  );
END;
$$;
