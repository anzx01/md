-- Migration to convert travel planner system to debate system
-- This will drop old tables and create new ones (as requested: clear and restart)

-- Drop old tables
DROP TABLE IF EXISTS "discussion_messages" CASCADE;
DROP TABLE IF EXISTS "planner_session" CASCADE;
DROP TABLE IF EXISTS "email_capture" CASCADE;

-- Create new debate_session table
CREATE TABLE "debate_session" (
    "id" text PRIMARY KEY,
    "user_question" text NOT NULL,
    "title" text NOT NULL,
    "round1_proposals" json,
    "round2_critiques" json,
    "round3_consensus" json,
    "final_consensus" text,
    "remaining_disagreements" text,
    "model_used" json,
    "status" text NOT NULL DEFAULT 'pending',
    "is_paused" boolean NOT NULL DEFAULT false,
    "is_pinned" boolean NOT NULL DEFAULT false,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create new debate_messages table
CREATE TABLE "debate_messages" (
    "id" text PRIMARY KEY,
    "session_id" text NOT NULL REFERENCES "debate_session"("id") ON DELETE CASCADE,
    "role" text NOT NULL DEFAULT 'assistant',
    "model_name" text,
    "round" integer,
    "is_consensus" boolean NOT NULL DEFAULT false,
    "content" text NOT NULL,
    "reply_to_id" text REFERENCES "debate_messages"("id") ON DELETE SET NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX "idx_debate_messages_session" ON "debate_messages"("session_id");
CREATE INDEX "idx_debate_messages_session_round" ON "debate_messages"("session_id", "round", "created_at");
CREATE INDEX "idx_debate_session_status" ON "debate_session"("status");
CREATE INDEX "idx_debate_session_created" ON "debate_session"("created_at" DESC);
