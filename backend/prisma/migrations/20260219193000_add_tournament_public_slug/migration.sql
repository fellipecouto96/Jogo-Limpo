-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN "public_slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_public_slug_key" ON "tournaments"("public_slug");
