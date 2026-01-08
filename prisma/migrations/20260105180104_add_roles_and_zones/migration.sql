/*
  Warnings:

  - You are about to drop the column `zone` on the `stores` table. All the data in the column will be lost.
  - Added the required column `zone_name` to the `stores` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AgentRole" AS ENUM ('SELLER', 'MANAGER', 'ZONE_SUPERVISOR', 'REGIONAL_MANAGER');

-- DropIndex
DROP INDEX "stores_zone_idx";

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "role" "AgentRole" NOT NULL DEFAULT 'SELLER',
ADD COLUMN     "zone_id" TEXT;

-- AlterTable
ALTER TABLE "stores" DROP COLUMN "zone",
ADD COLUMN     "zone_id" TEXT,
ADD COLUMN     "zone_name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zones_code_key" ON "zones"("code");

-- CreateIndex
CREATE INDEX "agents_zone_id_idx" ON "agents"("zone_id");

-- CreateIndex
CREATE INDEX "agents_role_idx" ON "agents"("role");

-- CreateIndex
CREATE INDEX "stores_zone_id_idx" ON "stores"("zone_id");

-- CreateIndex
CREATE INDEX "stores_zone_name_idx" ON "stores"("zone_name");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
