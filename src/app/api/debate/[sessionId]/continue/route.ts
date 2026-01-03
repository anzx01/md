import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { debateSession, debateMessage } from "@/db/schema/planner";
import { eq, asc } from "drizzle-orm";
import { apiConfig } from "@/lib/api-config";
import {
  getDebateSystemPrompt,
  DEBATE_MODELS,
} from "@/lib/prompts";

// Import callLLM from the main route
async function callLLM(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  provider: "zhipu" | "deepseek",
  maxTokens: number
): Promise<string> {
  console.log(`callLLM: provider=${provider}, model=${model}, maxTokens=${maxTokens}`);

  if (apiConfig.useMockApi) {
    console.log("callLLM: Using mock response");
    await new Promise(resolve => setTimeout(resolve, 500));
    return "This is a follow-up response to continue the debate discussion.";
  }

  const config =
    provider === "zhipu"
      ? {
          baseUrl: apiConfig.zhipu.baseUrl,
          apiKey: apiConfig.zhipu.apiKey,
        }
      : {
          baseUrl: apiConfig.deepseek.baseUrl,
          apiKey: apiConfig.deepseek.apiKey,
        };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`callLLM: Error response:`, errorText);
    throw new Error(`${provider.toUpperCase()} API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Export function to trigger AI response (called by message API)
export async function triggerAIResponse(sessionId: string, userMessageId: string, selectedModels: string[] = ["glm-4-plus", "glm-4-flash", "deepseek-chat"]) {
  try {
    console.log("=== triggerAIResponse called ===", { sessionId, userMessageId, selectedModels });

    // Fetch the session
    const [session] = await db
      .select()
      .from(debateSession)
      .where(eq(debateSession.id, sessionId))
      .limit(1);

    if (!session) {
      console.error("Session not found:", sessionId);
      await db.insert(debateMessage).values({
        id: crypto.randomUUID(),
        sessionId,
        role: "assistant",
        modelName: "system",
        round: null,
        isConsensus: false,
        content: "⚠️ Error: Session not found. Please refresh the page.",
        replyToId: userMessageId,
      });
      return;
    }

    // Fetch all messages for this session
    const allMessages = await db
      .select()
      .from(debateMessage)
      .where(eq(debateMessage.sessionId, sessionId))
      .orderBy(asc(debateMessage.createdAt));

    console.log(`Total messages in session: ${allMessages.length}`);

    // Check if AI has already responded to this specific user message
    const alreadyResponded = allMessages.some(msg =>
      msg.role === "assistant" &&
      msg.replyToId === userMessageId
    );

    if (alreadyResponded) {
      console.log("AI already responded to this message, skipping to avoid duplicates");
      return;
    }

    // Generate AI responses only for selected models
    await generateAIResponses(session, allMessages, userMessageId, selectedModels);
  } catch (error) {
    console.error("Error in triggerAIResponse:", error);
    try {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await db.insert(debateMessage).values({
        id: crypto.randomUUID(),
        sessionId,
        role: "assistant",
        modelName: "system",
        round: null,
        isConsensus: false,
        content: `⚠️ Error: ${errorMessage}. Please check your API configuration or try again.`,
        replyToId: userMessageId,
      });
    } catch (dbError) {
      console.error("Failed to save error message:", dbError);
    }
  }
}

async function generateAIResponses(
  session: any,
  allMessages: any[],
  userMessageId: string,
  selectedModels: string[]
) {
  // Build conversation context
  const conversationHistory = allMessages
    .map(msg => {
      if (msg.role === "user") {
        return `User: ${msg.content}`;
      } else {
        return `${msg.modelName || "AI"}: ${msg.content}`;
      }
    })
    .join("\n\n");

  console.log("Conversation history length:", conversationHistory.length);
  console.log("Selected models:", selectedModels);

  if (apiConfig.useMockApi) {
    console.log("Using mock API for AI responses");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockResponsesMap: Record<string, string> = {
      "glm-4-plus": "Thank you for your follow-up question. Based on our previous discussion, I'd like to add that...",
      "glm-4-flash": "Quick response: Yes, I agree with the previous points. Additionally...",
      "deepseek-chat": "From a cost-benefit perspective, considering what we've discussed so far...",
    };

    for (const modelName of selectedModels) {
      const content = mockResponsesMap[modelName];
      if (content) {
        await db.insert(debateMessage).values({
          id: crypto.randomUUID(),
          sessionId: session.id,
          role: "assistant",
          modelName,
          round: null,
          isConsensus: false,
          content,
          replyToId: userMessageId,
        });
      }
    }

    console.log("Mock AI responses saved for:", selectedModels);
    return;
  }

  // Real AI responses - only for selected models
  const systemPromptBase = `You are participating in a debate/discussion about: ${session.userQuestion}

You have access to the entire conversation history. Provide thoughtful, context-aware responses to continue the discussion.

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n\n` : ""}

The user just sent a follow-up message. Respond naturally and helpfully, considering all previous context and the debate results so far.`;

  // Generate responses for each selected model
  for (const modelName of selectedModels) {
    // Find the model config
    let modelConfig: { model: string; provider: "zhipu" | "deepseek" } | null = null;

    for (const [key, config] of Object.entries(DEBATE_MODELS)) {
      if (config.model === modelName) {
        modelConfig = config;
        break;
      }
    }

    if (!modelConfig) {
      console.error(`Unknown model: ${modelName}`);
      continue;
    }

    console.log(`${modelName} responding...`);

    try {
      const response = await callLLM(
        modelConfig.model,
        systemPromptBase,
        `The user said: "${allMessages.find(m => m.id === userMessageId)?.content}"\n\nProvide your response to continue the discussion.`,
        modelConfig.provider,
        600
      );

      await db.insert(debateMessage).values({
        id: crypto.randomUUID(),
        sessionId: session.id,
        role: "assistant",
        modelName: modelConfig.model,
        round: null,
        isConsensus: false,
        content: response,
        replyToId: userMessageId,
      });

      console.log(`${modelName} response saved successfully`);
    } catch (error) {
      console.error(`Error generating response for ${modelName}:`, error);
      try {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await db.insert(debateMessage).values({
          id: crypto.randomUUID(),
          sessionId: session.id,
          role: "assistant",
          modelName: modelConfig.model,
          round: null,
          isConsensus: false,
          content: `⚠️ ${modelName} failed to respond: ${errorMessage}`,
          replyToId: userMessageId,
        });
      } catch (dbError) {
        console.error(`Failed to save error message for ${modelName}:`, dbError);
      }
    }
  }

  console.log("All AI responses completed for:", selectedModels);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    console.log("=== /api/debate/[sessionId]/continue called ===");
    const { sessionId } = await params;
    const body = await req.json();
    const { userMessageId } = body;

    // Call the trigger function
    await triggerAIResponse(sessionId, userMessageId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in continue discussion:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
