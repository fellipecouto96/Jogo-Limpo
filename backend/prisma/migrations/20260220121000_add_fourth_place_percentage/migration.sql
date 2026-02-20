-- Add missing fourth place percentage column for prize distribution
ALTER TABLE "tournaments"
ADD COLUMN IF NOT EXISTS "fourth_place_percentage" DECIMAL(65,30);

-- Backfill existing rows to keep calculations consistent
UPDATE "tournaments"
SET "fourth_place_percentage" = COALESCE("fourth_place_percentage", 0);
