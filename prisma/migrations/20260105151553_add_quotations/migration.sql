-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "password" TEXT,
ADD COLUMN     "store_id" TEXT;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "flow_data" JSONB,
ADD COLUMN     "flow_started_at" TIMESTAMP(3),
ADD COLUMN     "flow_step" TEXT,
ADD COLUMN     "flow_type" TEXT,
ADD COLUMN     "store_id" TEXT;

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "google_maps_url" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_code_key" ON "stores"("code");

-- CreateIndex
CREATE INDEX "stores_zone_idx" ON "stores"("zone");

-- CreateIndex
CREATE INDEX "stores_is_active_idx" ON "stores"("is_active");

-- CreateIndex
CREATE INDEX "agents_store_id_idx" ON "agents"("store_id");

-- CreateIndex
CREATE INDEX "conversations_store_id_idx" ON "conversations"("store_id");

-- CreateIndex
CREATE INDEX "conversations_flow_type_idx" ON "conversations"("flow_type");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
