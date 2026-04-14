-- ═══════════════════════════════════════════════════════════════════
-- FIX: award_event_hours — transactions table has no event_id column
-- Also adds: admin_adjust_hours RPC for admin hour management
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- Part 1: Fix award_event_hours
-- The transactions table uses post_id (not event_id). Use NULL for post_id
-- since event attendance is not tied to a service_post row.
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

  -- Log transaction — transactions table has no event_id column; post_id used as null
  INSERT INTO transactions (from_user_id, to_user_id, amount, reason, post_id)
  VALUES (NULL, p_to_user, p_amount, 'Event attendance: ' || v_title, NULL);

  -- Notify member
  INSERT INTO notifications (user_id, type, message)
  VALUES (
    p_to_user,
    'hours_received',
    p_amount || ' hour' || CASE WHEN p_amount != 1 THEN 's' ELSE '' END
      || ' awarded for attending "' || v_title || '"'
  );
END;
$$;

-- ─────────────────────────────────────────────
-- Part 2: admin_adjust_hours
-- Directly modifies a member's hour_balance without drawing from another user.
-- Returns the new balance as an integer.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_adjust_hours(
  target_user uuid,
  amount      integer,
  action      text,     -- 'add' or 'subtract'
  admin_id    uuid
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance integer;
  v_admin_name  text;
BEGIN
  -- Authorization: caller must be an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not an admin';
  END IF;

  IF amount < 1 OR amount > 100 THEN
    RAISE EXCEPTION 'Amount must be between 1 and 100';
  END IF;

  IF action NOT IN ('add', 'subtract') THEN
    RAISE EXCEPTION 'action must be ''add'' or ''subtract''';
  END IF;

  SELECT full_name INTO v_admin_name FROM profiles WHERE id = admin_id;

  IF action = 'add' THEN
    UPDATE profiles
    SET hour_balance = hour_balance + amount
    WHERE id = target_user
    RETURNING hour_balance INTO v_new_balance;
  ELSE
    -- Floor at -999 to prevent extreme negative balances
    UPDATE profiles
    SET hour_balance = GREATEST(hour_balance - amount, -999)
    WHERE id = target_user
    RETURNING hour_balance INTO v_new_balance;
  END IF;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Log transaction
  INSERT INTO transactions (from_user_id, to_user_id, amount, reason, post_id)
  VALUES (
    NULL,
    target_user,
    CASE WHEN action = 'add' THEN amount ELSE -amount END,
    'Admin adjustment: ' || action || ' by ' || COALESCE(v_admin_name, 'admin'),
    NULL
  );

  -- Notify the user
  INSERT INTO notifications (user_id, type, message)
  VALUES (
    target_user,
    'admin_hour_adjustment',
    'An admin has ' || CASE WHEN action = 'add' THEN 'added' ELSE 'subtracted' END
      || ' ' || amount || ' hour' || CASE WHEN amount != 1 THEN 's' ELSE '' END
      || ' ' || CASE WHEN action = 'add' THEN 'to' ELSE 'from' END
      || ' your balance. Your new balance is '
      || v_new_balance || ' hour' || CASE WHEN v_new_balance != 1 THEN 's' ELSE '' END || '.'
  );

  RETURN v_new_balance;
END;
$$;
