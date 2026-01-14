-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "first_response_at" TIMESTAMP(3),
ADD COLUMN     "resulted_in_sale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sale_amount" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "conversations_started_at_idx" ON "conversations"("started_at");

-- CreateIndex
CREATE INDEX "conversations_resolved_at_idx" ON "conversations"("resolved_at");
