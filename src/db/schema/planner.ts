import { pgTable, text, timestamp, json, integer, boolean, pgEnum } from "drizzle-orm/pg-core";

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

// Debate session table - stores three-model debate sessions
export const debateSession = pgTable("debate_session", {
  id: text("id").primaryKey(),
  userQuestion: text("user_question").notNull(), // User's original question
  title: text("title").notNull(), // Custom title for the session

  // Debate results (stored as JSON)
  round1Proposals: json("round1_proposals"), // Round 1: Independent proposals from 3 models
  round2Critiques: json("round2_critiques"), // Round 2: Critiques and counter-arguments
  round3Consensus: json("round3_consensus"), // Round 3: Final consensus and synthesis

  // Final results
  finalConsensus: text("final_consensus"), // Final consensus recommendation
  remainingDisagreements: text("remaining_disagreements"), // JSON array of remaining disagreements
  modelUsed: json("model_used"), // JSON array of models used in the debate

  status: text("status").notNull().default("pending"), // pending | debating | completed | failed
  isPaused: boolean("is_paused").notNull().default(false), // For pause/resume functionality
  isPinned: boolean("is_pinned").notNull().default(false), // For pinning sessions to top
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Debate messages table - stores all messages during the debate process
export const debateMessage = pgTable("debate_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => debateSession.id),
  role: messageRoleEnum("role").notNull().default("assistant"), // 'user' or 'assistant'
  modelName: text("model_name"), // Model name: 'glm-4-plus', 'glm-4-flash', 'deepseek-chat' (null for user)
  round: integer("round"), // Debate round: 1, 2, 3 (null for user messages or follow-up discussions)
  isConsensus: boolean("is_consensus").notNull().default(false), // Whether this message represents a consensus view
  content: text("content").notNull(),
  replyToId: text("reply_to_id"), // For quote/reply - references debate_messages.id
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports
export type DebateSessionType = typeof debateSession.$inferSelect;
export type DebateMessageType = typeof debateMessage.$inferSelect;

// Legacy type aliases for backward compatibility during migration
export type PlannerSessionType = DebateSessionType;
export type DiscussionMessageType = DebateMessageType;
