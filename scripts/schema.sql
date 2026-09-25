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
  delegation_wg TEXT,
  qr_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guests_name_idx ON guests(name);

-- Upgrade older guest directory schemas without losing the former Company value.
ALTER TABLE guests ADD COLUMN IF NOT EXISTS delegation_wg TEXT;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='guests' AND column_name='company'
  ) THEN
    EXECUTE 'UPDATE guests SET delegation_wg=company WHERE delegation_wg IS NULL AND company IS NOT NULL';
  END IF;
END $$;
ALTER TABLE guests DROP COLUMN IF EXISTS email;
ALTER TABLE guests DROP COLUMN IF EXISTS company;

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
