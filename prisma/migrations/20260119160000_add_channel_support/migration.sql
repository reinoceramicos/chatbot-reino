-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WHATSAPP', 'INSTAGRAM');

-- AlterTable: Add channel column to conversations with default WHATSAPP
ALTER TABLE "conversations" ADD COLUMN "channel" "Channel" NOT NULL DEFAULT 'WHATSAPP';

-- AlterTable: Add channel column to messages with default WHATSAPP
ALTER TABLE "messages" ADD COLUMN "channel" "Channel" NOT NULL DEFAULT 'WHATSAPP';
