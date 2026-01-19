-- CreateEnum
CREATE TYPE "FlowStepType" AS ENUM ('TEXT', 'BUTTON', 'LIST', 'LOCATION_REQUEST', 'DYNAMIC_LIST');

-- CreateEnum
CREATE TYPE "FlowExpectedInput" AS ENUM ('TEXT', 'BUTTON_REPLY', 'LIST_REPLY', 'LOCATION', 'ANY', 'NONE');

-- CreateTable
CREATE TABLE "flow_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "initial_step_id" TEXT,
    "timeout_minutes" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_steps" (
    "id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "step_type" "FlowStepType" NOT NULL DEFAULT 'TEXT',
    "expected_input" "FlowExpectedInput" NOT NULL DEFAULT 'TEXT',
    "message_body" TEXT NOT NULL,
    "message_header" TEXT,
    "message_footer" TEXT,
    "list_button_text" TEXT,
    "validation_regex" TEXT,
    "error_message" TEXT,
    "save_response_as" TEXT,
    "transfer_to_agent" BOOLEAN NOT NULL DEFAULT false,
    "switch_to_flow" TEXT,
    "dynamic_data_source" TEXT,
    "default_next_step_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_step_options" (
    "id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "section" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "flow_step_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_step_transitions" (
    "id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "next_step_id" TEXT,
    "switch_to_flow" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "flow_step_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flow_definitions_code_key" ON "flow_definitions"("code");

-- CreateIndex
CREATE INDEX "flow_definitions_is_active_idx" ON "flow_definitions"("is_active");

-- CreateIndex
CREATE INDEX "flow_definitions_is_default_idx" ON "flow_definitions"("is_default");

-- CreateIndex
CREATE INDEX "flow_steps_flow_id_idx" ON "flow_steps"("flow_id");

-- CreateIndex
CREATE UNIQUE INDEX "flow_steps_flow_id_code_key" ON "flow_steps"("flow_id", "code");

-- CreateIndex
CREATE INDEX "flow_step_options_step_id_idx" ON "flow_step_options"("step_id");

-- CreateIndex
CREATE UNIQUE INDEX "flow_step_options_step_id_option_id_key" ON "flow_step_options"("step_id", "option_id");

-- CreateIndex
CREATE INDEX "flow_step_transitions_step_id_idx" ON "flow_step_transitions"("step_id");

-- AddForeignKey
ALTER TABLE "flow_steps" ADD CONSTRAINT "flow_steps_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "flow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_step_options" ADD CONSTRAINT "flow_step_options_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "flow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_step_transitions" ADD CONSTRAINT "flow_step_transitions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "flow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
