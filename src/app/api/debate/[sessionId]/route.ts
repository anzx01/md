import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { debateSession, debateMessage } from "@/db/schema/planner";
import { eq, asc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    console.log("=== GET /api/debate/[sessionId] called ===");
    const { sessionId } = await params;
    console.log("Fetching session:", sessionId);

    const session = await db
      .select()
      .from(debateSession)
      .where(eq(debateSession.id, sessionId))
      .limit(1);

    console.log("Session query result:", session.length, "rows");

    if (session.length === 0) {
      console.log("Session not found:", sessionId);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    console.log("Fetching messages...");
    // Fetch messages in chronological order
    const messages = await db
      .select()
      .from(debateMessage)
      .where(eq(debateMessage.sessionId, sessionId))
      .orderBy(asc(debateMessage.createdAt));

    console.log("Messages query result:", messages.length, "rows");

    const responseData = {
      sessionId: session[0].id,
      status: session[0].status,
      question: session[0].userQuestion,
      title: session[0].title,
      messages: messages,
      // Debate results
      finalConsensus: session[0].finalConsensus,
      remainingDisagreements: session[0].remainingDisagreements,
      modelUsed: session[0].modelUsed,
      // Round results (for debugging)
      round1Proposals: session[0].round1Proposals,
      round2Critiques: session[0].round2Critiques,
      round3Consensus: session[0].round3Consensus,
    };

    console.log("Returning response with status:", session[0].status);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching session:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
