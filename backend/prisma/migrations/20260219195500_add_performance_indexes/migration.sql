-- Tournament query acceleration (dashboard + organizer lists)
CREATE INDEX IF NOT EXISTS "tournaments_organizer_id_created_at_idx"
  ON "tournaments"("organizer_id", "created_at");

CREATE INDEX IF NOT EXISTS "tournaments_organizer_id_status_idx"
  ON "tournaments"("organizer_id", "status");

-- Logs lookup acceleration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'system_logs'
      AND column_name = 'timestamp'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS system_logs_timestamp_idx ON system_logs ("timestamp")';
  END IF;
END $$;
