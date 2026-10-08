CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO events (id, name)
VALUES (1, 'Demo Event')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('events','id'), GREATEST((SELECT max(id) FROM events), 1), true);

DO $$ BEGIN
  CREATE TYPE guest_status AS ENUM ('NOT_ARRIVED','INSIDE','ON_BREAK','CHECKED_OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_action AS ENUM ('CHECK_IN','BREAK_OUT','BREAK_IN','CHECK_OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Guests are global people/badges. They do not belong to a single event.
CREATE TABLE IF NOT EXISTS guests (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
<<<<<<< HEAD
  delegation_wg TEXT,
  qr_token TEXT NOT NULL UNIQUE,
=======
  region TEXT,
  qr_token TEXT NOT NULL UNIQUE,
  badge_code TEXT UNIQUE,
>>>>>>> 50ba541 (Updated project)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guests_name_idx ON guests(name);

<<<<<<< HEAD
-- Upgrade older guest directory schemas without losing the former Company value.
ALTER TABLE guests ADD COLUMN IF NOT EXISTS delegation_wg TEXT;
=======
-- Human-enterable badge code for guest self-identification. The QR token stays
-- long/random; badge_code is shorter and can be typed manually.
ALTER TABLE guests ADD COLUMN IF NOT EXISTS badge_code TEXT;
UPDATE guests
SET badge_code = 'G-' || upper(substr(md5(qr_token), 1, 10))
WHERE badge_code IS NULL;
ALTER TABLE guests ALTER COLUMN badge_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS guests_badge_code_idx ON guests(badge_code);

-- Region is the canonical guest grouping field. Preserve values from older
-- Delegation/WG and Company schemas before dropping the legacy columns.
ALTER TABLE guests ADD COLUMN IF NOT EXISTS region TEXT;
>>>>>>> 50ba541 (Updated project)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
<<<<<<< HEAD
    WHERE table_schema='public' AND table_name='guests' AND column_name='company'
  ) THEN
    EXECUTE 'UPDATE guests SET delegation_wg=company WHERE delegation_wg IS NULL AND company IS NOT NULL';
=======
    WHERE table_schema='public' AND table_name='guests' AND column_name='delegation_wg'
  ) THEN
    EXECUTE 'UPDATE guests SET region=delegation_wg WHERE region IS NULL AND delegation_wg IS NOT NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='guests' AND column_name='company'
  ) THEN
    EXECUTE 'UPDATE guests SET region=company WHERE region IS NULL AND company IS NOT NULL';
>>>>>>> 50ba541 (Updated project)
  END IF;
END $$;
ALTER TABLE guests DROP COLUMN IF EXISTS email;
ALTER TABLE guests DROP COLUMN IF EXISTS company;
<<<<<<< HEAD
=======
ALTER TABLE guests DROP COLUMN IF EXISTS delegation_wg;

-- Guest roles are independent from events. A guest has one or two ordered roles.
-- The order matters only when two non-Delegate roles are used: role 1 controls
-- the visual badge. Delegate always yields to the other role for badge colour.
CREATE TABLE IF NOT EXISTS roles (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE
);
INSERT INTO roles(code,label) VALUES
  ('DELEGATE','Delegate'),
  ('GLOBAL_SUPPORT','Global Support'),
  ('LOCAL_SUPPORT','Local Support'),
  ('FACILITATOR','Facilitator')
ON CONFLICT(code) DO UPDATE SET label=EXCLUDED.label;

CREATE TABLE IF NOT EXISTS guest_roles (
  guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL REFERENCES roles(code),
  position SMALLINT NOT NULL CHECK (position IN (1,2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, role_code),
  UNIQUE (guest_id, position)
);
CREATE INDEX IF NOT EXISTS guest_roles_role_idx ON guest_roles(role_code,guest_id);

-- Existing installations predate roles. Keep every current guest usable by
-- assigning Delegate unless they already have at least one role.
INSERT INTO guest_roles(guest_id,role_code,position)
SELECT g.id,'DELEGATE',1
FROM guests g
WHERE NOT EXISTS (SELECT 1 FROM guest_roles gr WHERE gr.guest_id=g.id)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION check_guest_role_rules(target_guest BIGINT) RETURNS void AS $$
DECLARE
  role_count INTEGER;
  has_global BOOLEAN;
  has_local BOOLEAN;
BEGIN
  IF target_guest IS NULL OR NOT EXISTS (SELECT 1 FROM guests WHERE id=target_guest) THEN
    RETURN;
  END IF;
  SELECT COUNT(*), BOOL_OR(role_code='GLOBAL_SUPPORT'), BOOL_OR(role_code='LOCAL_SUPPORT')
  INTO role_count,has_global,has_local
  FROM guest_roles WHERE guest_id=target_guest;
  IF role_count < 1 OR role_count > 2 THEN
    RAISE EXCEPTION 'guest % must have 1 or 2 roles', target_guest USING ERRCODE='23514';
  END IF;
  IF COALESCE(has_global,false) AND COALESCE(has_local,false) THEN
    RAISE EXCEPTION 'guest % cannot be both Global Support and Local Support', target_guest USING ERRCODE='23514';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_guest_role_rows() RETURNS trigger AS $$
DECLARE target_guest BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN target_guest := OLD.guest_id;
  ELSE target_guest := NEW.guest_id;
  END IF;
  PERFORM check_guest_role_rules(target_guest);
  IF TG_OP = 'DELETE' THEN RETURN OLD;
  ELSE RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_new_guest_has_role() RETURNS trigger AS $$
BEGIN
  PERFORM check_guest_role_rules(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS guest_roles_rules_trigger ON guest_roles;
CREATE CONSTRAINT TRIGGER guest_roles_rules_trigger
AFTER INSERT OR UPDATE OR DELETE ON guest_roles
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_guest_role_rows();

DROP TRIGGER IF EXISTS guests_require_role_trigger ON guests;
CREATE CONSTRAINT TRIGGER guests_require_role_trigger
AFTER INSERT ON guests
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_new_guest_has_role();
>>>>>>> 50ba541 (Updated project)

-- Registration is the many-to-many relationship between a guest and an event.
-- Attendance status belongs here because the same guest can have a different
-- state for every event.
CREATE TABLE IF NOT EXISTS event_guests (
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  status guest_status NOT NULL DEFAULT 'NOT_ARRIVED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, guest_id)
);
CREATE INDEX IF NOT EXISTS event_guests_event_status_idx ON event_guests(event_id,status);
CREATE INDEX IF NOT EXISTS event_guests_guest_idx ON event_guests(guest_id);

-- Migrate data from the earlier schema where guests had event_id + status.
-- This is safe to run repeatedly and preserves existing registrations/statuses.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='guests' AND column_name='event_id'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='guests' AND column_name='status'
    ) THEN
      EXECUTE '
        INSERT INTO event_guests(event_id,guest_id,status,created_at,updated_at)
        SELECT event_id,id,status,created_at,updated_at
        FROM guests
        WHERE event_id IS NOT NULL
        ON CONFLICT(event_id,guest_id) DO UPDATE
          SET status=EXCLUDED.status, updated_at=EXCLUDED.updated_at';
    ELSE
      EXECUTE '
        INSERT INTO event_guests(event_id,guest_id)
        SELECT event_id,id FROM guests WHERE event_id IS NOT NULL
        ON CONFLICT(event_id,guest_id) DO NOTHING';
    END IF;
  END IF;
END $$;

ALTER TABLE guests DROP COLUMN IF EXISTS status;
ALTER TABLE guests DROP COLUMN IF EXISTS event_id;

CREATE TABLE IF NOT EXISTS attendance_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  action attendance_action NOT NULL,
  scanner_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS logs_guest_time_idx ON attendance_logs(guest_id,created_at);
CREATE INDEX IF NOT EXISTS logs_event_time_idx ON attendance_logs(event_id,created_at);
CREATE INDEX IF NOT EXISTS logs_event_guest_time_idx ON attendance_logs(event_id,guest_id,created_at);

CREATE TABLE IF NOT EXISTS auth_attempts (
  ip_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started TIMESTAMPTZ NOT NULL DEFAULT now()
);
<<<<<<< HEAD
=======

-- Public daily programme / schedule.
CREATE TABLE IF NOT EXISTS schedule_items (
  id BIGSERIAL PRIMARY KEY,
  day DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schedule_items_day_time_idx ON schedule_items(day,start_time,id);

-- Polls/votes are independent participation groups, similar to events.
CREATE TABLE IF NOT EXISTS polls (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  choice_mode TEXT NOT NULL DEFAULT 'SINGLE',
  min_selections INTEGER NOT NULL DEFAULT 1,
  max_selections INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT polls_choice_mode_check CHECK (choice_mode IN ('SINGLE','MULTIPLE')),
  CONSTRAINT polls_selection_range_check CHECK (min_selections >= 1 AND max_selections >= min_selections)
);
ALTER TABLE polls ADD COLUMN IF NOT EXISTS choice_mode TEXT NOT NULL DEFAULT 'SINGLE';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS min_selections INTEGER NOT NULL DEFAULT 1;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS max_selections INTEGER NOT NULL DEFAULT 1;
DO $$ BEGIN
  ALTER TABLE polls ADD CONSTRAINT polls_choice_mode_check CHECK (choice_mode IN ('SINGLE','MULTIPLE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE polls ADD CONSTRAINT polls_selection_range_check CHECK (min_selections >= 1 AND max_selections >= min_selections);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS poll_options (
  id BIGSERIAL PRIMARY KEY,
  poll_id BIGINT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS poll_options_poll_idx ON poll_options(poll_id,position,id);
CREATE TABLE IF NOT EXISTS poll_guests (
  poll_id BIGINT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id,guest_id)
);
CREATE INDEX IF NOT EXISTS poll_guests_guest_idx ON poll_guests(guest_id,poll_id);
CREATE TABLE IF NOT EXISTS poll_votes (
  id BIGSERIAL PRIMARY KEY,
  poll_id BIGINT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  option_id BIGINT NOT NULL REFERENCES poll_options(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Older versions allowed only one poll_votes row per guest/poll. Multi-select
-- polls require one row per selected option and a separate submission marker.
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_poll_id_guest_id_key;
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_option_id_fkey;
ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_unique_choice_idx ON poll_votes(poll_id,guest_id,option_id);
CREATE INDEX IF NOT EXISTS poll_votes_poll_idx ON poll_votes(poll_id,option_id);

CREATE TABLE IF NOT EXISTS poll_submissions (
  poll_id BIGINT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id,guest_id)
);
INSERT INTO poll_submissions(poll_id,guest_id,created_at)
SELECT poll_id,guest_id,MIN(created_at)
FROM poll_votes
GROUP BY poll_id,guest_id
ON CONFLICT (poll_id,guest_id) DO NOTHING;
CREATE INDEX IF NOT EXISTS poll_submissions_guest_idx ON poll_submissions(guest_id,poll_id);

-- v1.3 attendance simplification: preserve historical break logs, but collapse
-- any still-current ON_BREAK registration into INSIDE. The app now creates only
-- CHECK_IN and CHECK_OUT actions.
UPDATE event_guests SET status='INSIDE',updated_at=now() WHERE status='ON_BREAK';
>>>>>>> 50ba541 (Updated project)
