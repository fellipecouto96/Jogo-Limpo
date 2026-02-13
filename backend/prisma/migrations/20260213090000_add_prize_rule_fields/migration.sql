-- AlterTable
ALTER TABLE "tournaments"
ADD COLUMN "champion_percentage" DECIMAL(65,30),
ADD COLUMN "runner_up_percentage" DECIMAL(65,30),
ADD COLUMN "third_place_percentage" DECIMAL(65,30),
ADD COLUMN "calculated_prize_pool" DECIMAL(65,30),
ADD COLUMN "calculated_organizer_amount" DECIMAL(65,30);

-- Backfill existing values for compatibility
UPDATE "tournaments"
SET
  "champion_percentage" = COALESCE("champion_percentage", "first_place_percentage"),
  "runner_up_percentage" = COALESCE("runner_up_percentage", "second_place_percentage"),
  "third_place_percentage" = COALESCE("third_place_percentage", 0),
  "calculated_prize_pool" = COALESCE("calculated_prize_pool", "prize_pool"),
  "calculated_organizer_amount" = COALESCE(
    "calculated_organizer_amount",
    CASE
      WHEN "total_collected" IS NOT NULL AND "prize_pool" IS NOT NULL
      THEN "total_collected" - "prize_pool"
      ELSE NULL
    END
  );
