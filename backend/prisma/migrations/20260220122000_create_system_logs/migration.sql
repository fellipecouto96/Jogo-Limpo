-- Create system_logs table used by logEvent()
CREATE TABLE IF NOT EXISTS "system_logs" (
  "id" BIGSERIAL PRIMARY KEY,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "level" TEXT NOT NULL,
  "journey" TEXT NOT NULL,
  "user_id" TEXT,
  "tournament_id" TEXT,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "environment" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "system_logs_timestamp_idx"
  ON "system_logs" ("timestamp");
