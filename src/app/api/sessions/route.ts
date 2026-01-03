import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { debateSession, debateMessage } from "@/db/schema/planner";
import { desc, count, eq } from "drizzle-orm";

/**
 * GET /api/sessions
 *
 * Fetch all debate sessions with titles and metadata
 */
export async function GET(req: NextRequest) {
  try {
    console.log("=== GET /api/sessions called ===");

    // Fetch all sessions with message counts
    const sessions = await db
      .select({
        id: debateSession.id,
        userQuestion: debateSession.userQuestion,
        title: debateSession.title,
        status: debateSession.status,
        isPinned: debateSession.isPinned,
        createdAt: debateSession.createdAt,
        updatedAt: debateSession.updatedAt,
        messageCount: count(debateMessage.id),
      })
      .from(debateSession)
      .leftJoin(debateMessage, eq(debateSession.id, debateMessage.sessionId))
      .groupBy(debateSession.id)
      .orderBy(desc(debateSession.isPinned), desc(debateSession.createdAt));

    console.log(`Found ${sessions.length} sessions`);

    // Transform sessions to add formatted times
    const transformedSessions = sessions.map((session) => {
      // Format relative time
      const now = new Date();
      const created = new Date(session.createdAt);
      const diffMs = now.getTime() - created.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let relativeTime: string;
      if (diffMins < 1) {
        relativeTime = "刚刚";
      } else if (diffMins < 60) {
        relativeTime = `${diffMins}分钟前`;
      } else if (diffHours < 24) {
        relativeTime = `${diffHours}小时前`;
      } else if (diffDays === 1) {
        relativeTime = "昨天";
      } else if (diffDays < 7) {
        relativeTime = `${diffDays}天前`;
      } else {
        relativeTime = created.toLocaleDateString("zh-CN");
      }

      return {
        id: session.id,
        question: session.userQuestion,
        title: session.title || session.userQuestion.slice(0, 50),
        status: session.status,
        isPinned: session.isPinned,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        relativeTime,
        messageCount: session.messageCount || 0,
      };
    });

    return NextResponse.json({
      sessions: transformedSessions,
      total: transformedSessions.length,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
