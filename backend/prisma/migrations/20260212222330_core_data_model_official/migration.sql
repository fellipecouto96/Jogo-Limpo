/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `organizers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `organizers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `organizers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "is_bye" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "player2_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "organizers" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "password_hash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "champion_id" TEXT,
ADD COLUMN     "entry_fee" DECIMAL(65,30),
ADD COLUMN     "first_place_percentage" DECIMAL(65,30),
ADD COLUMN     "organizer_percentage" DECIMAL(65,30),
ADD COLUMN     "prize_pool" DECIMAL(65,30),
ADD COLUMN     "runner_up_id" TEXT,
ADD COLUMN     "second_place_percentage" DECIMAL(65,30),
ADD COLUMN     "total_collected" DECIMAL(65,30);

-- CreateIndex
CREATE UNIQUE INDEX "organizers_email_key" ON "organizers"("email");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_champion_id_fkey" FOREIGN KEY ("champion_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_runner_up_id_fkey" FOREIGN KEY ("runner_up_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
