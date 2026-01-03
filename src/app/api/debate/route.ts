import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { debateSession, debateMessage } from "@/db/schema/planner";
import { apiConfig } from "@/lib/api-config";
import {
  getDebateRound1Prompt,
  getDebateRound2Prompt,
  getDebateRound3Prompt,
  getDebateSystemPrompt,
  DEBATE_MODELS,
} from "@/lib/prompts";
import { eq } from "drizzle-orm";

/**
 * Three-Model Debate API
 *
 * This endpoint orchestrates a 3-round debate between three AI models
 * to answer any question from multiple perspectives and reach a consensus.
 */

interface DebateRequest {
  question: string;
}

interface DebateResult {
  round1: Record<string, string>;
  round2: Record<string, string>;
  round3: {
    consensus: string;
    disagreements: string[];
    finalRecommendation: string;
  };
}

// Mock debate data for development
const MOCK_DEBATE: DebateResult = {
  round1: {
    "glm-4-plus": `基于深度分析，我认为这个问题需要从多个角度考虑。首先，我们需要理解问题的本质和背景...`,

    "glm-4-flash": `快速回答：我的建议是采取直接的方法，重点关注核心问题。关键在于...`,

    "deepseek-chat": `从成本效益角度分析，我建议考虑以下因素：1) 实施难度 2) 预期收益 3) 潜在风险...`,
  },

  round2: {
    "glm-4-plus": `针对GLM-4-flash的观点，我认为直接方法虽然快速，但可能忽略了重要的细节。DeepSeek提到的风险因素很值得考虑，我建议...`,

    "glm-4-flash": `我理解你的担忧，但在实际情况中，过度分析可能导致决策瘫痪。我认为应该在速度和质量之间找到平衡...`,

    "deepseek-chat": `两位的观点都有价值。我建议采用分阶段的方法：先快速实施核心方案，然后根据反馈迭代优化...`,
  },

  round3: {
    consensus: `经过三轮讨论，三个模型达成了以下共识：1) 问题需要系统性思考 2) 实施方案应该分阶段 3) 需要平衡速度和质量`,

    disagreements: [
      "实施节奏：GLM-4-plus倾向于深思熟虑，GLM-4-flash主张快速行动",
      "分析方法：DeepSeek更注重量化评估，其他模型更侧重定性分析",
    ],

    finalRecommendation: `## 最终建议\n\n### 共识要点\n- 采取系统性方法，但避免过度分析\n- 分阶段实施：先MVP验证，再全面推广\n- 建立量化指标跟踪效果\n\n### 实施步骤\n1. 第1-2周：快速原型验证\n2. 第3-4周：收集反馈并优化\n3. 第5周起：全面推广并持续改进\n\n### 注意事项\n- 在速度和质量间保持平衡\n- 定期评估并调整策略`,
  },
};

/**
 * Call LLM API (supports both Zhipu AI and DeepSeek)
 */
async function callLLM(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  provider: "zhipu" | "deepseek",
  maxTokens: number = 800
): Promise<string> {
  console.log(`callLLM: provider=${provider}, model=${model}, maxTokens=${maxTokens}`);

  if (apiConfig.useMockApi) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("callLLM: Using mock response");
    return "Mock response for development";
  }

  try {
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

    console.log(`callLLM: Calling ${config.baseUrl}/chat/completions`);

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
    console.log(`callLLM: Success, response length: ${data.choices[0].message.content.length}`);
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`Error calling ${provider.toUpperCase()}:`, error);
    throw error;
  }
}

/**
 * Run the 3-round debate with progress updates
 */
async function runDebate(
  question: string,
  sessionId: string
): Promise<DebateResult> {
  console.log(`[runDebate] Starting debate for question: ${question}`);

  if (apiConfig.useMockApi) {
    console.log("[runDebate] Using Mock API mode");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const round1MessageIds: Record<string, string> = {};

    // Round 1: Independent proposals
    for (const [modelName, content] of Object.entries(MOCK_DEBATE.round1)) {
      const messageId = crypto.randomUUID();
      round1MessageIds[modelName] = messageId;
      await db.insert(debateMessage).values({
        id: messageId,
        sessionId,
        modelName,
        round: 1,
        content,
        isConsensus: false,
      });
    }

    // Round 2: Critiques and counter-arguments
    for (const [modelName, content] of Object.entries(MOCK_DEBATE.round2)) {
      const messageId = crypto.randomUUID();
      await db.insert(debateMessage).values({
        id: messageId,
        sessionId,
        modelName,
        round: 2,
        content,
        replyToId: round1MessageIds[modelName],
        isConsensus: false,
      });
    }

    // Round 3: Final consensus
    const consensusMessageId = crypto.randomUUID();
    await db.insert(debateMessage).values({
      id: consensusMessageId,
      sessionId,
      modelName: "glm-4-plus",
      round: 3,
      content: MOCK_DEBATE.round3.finalRecommendation,
      isConsensus: true,
    });

    // Update session status
    await db
      .update(debateSession)
      .set({
        round1Proposals: MOCK_DEBATE.round1,
        round2Critiques: MOCK_DEBATE.round2,
        round3Consensus: MOCK_DEBATE.round3,
        finalConsensus: MOCK_DEBATE.round3.consensus,
        remainingDisagreements: JSON.stringify(MOCK_DEBATE.round3.disagreements),
        modelUsed: ["glm-4-plus", "glm-4-flash", "deepseek-chat"],
        status: "completed",
      })
      .where(eq(debateSession.id, sessionId));

    console.log("[runDebate] Mock debate completed");
    return MOCK_DEBATE;
  }

  // Real API mode
  const result: DebateResult = {
    round1: {},
    round2: {},
    round3: {
      consensus: "",
      disagreements: [],
      finalRecommendation: "",
    },
  };

  const round1MessageIds: Record<string, string> = {};

  // Round 1: Independent proposals
  console.log("Starting Round 1: Independent proposals...");
  for (const [modelKey, config] of Object.entries(DEBATE_MODELS)) {
    console.log(`Round 1: ${modelKey} proposing...`);
    const systemPrompt = getDebateSystemPrompt(modelKey as any);
    const userPrompt = getDebateRound1Prompt(question);

    result.round1[modelKey] = await callLLM(
      config.model,
      systemPrompt,
      userPrompt,
      config.provider,
      800
    );

    // Save to database
    const messageId = crypto.randomUUID();
    round1MessageIds[modelKey] = messageId;
    await db.insert(debateMessage).values({
      id: messageId,
      sessionId,
      modelName: config.model,
      round: 1,
      content: result.round1[modelKey],
      isConsensus: false,
    });
  }

  // Round 2: Critiques and counter-arguments
  console.log("Starting Round 2: Critiques...");
  for (const [modelKey, config] of Object.entries(DEBATE_MODELS)) {
    console.log(`Round 2: ${modelKey} critiquing...`);
    const systemPrompt = getDebateSystemPrompt(modelKey as any);
    const userPrompt = getDebateRound2Prompt(result.round1);

    result.round2[modelKey] = await callLLM(
      config.model,
      systemPrompt,
      userPrompt,
      config.provider,
      800
    );

    // Save to database
    await db.insert(debateMessage).values({
      id: crypto.randomUUID(),
      sessionId,
      modelName: config.model,
      round: 2,
      content: result.round2[modelKey],
      replyToId: round1MessageIds[modelKey],
      isConsensus: false,
    });
  }

  // Round 3: Consensus formation
  console.log("Starting Round 3: Consensus formation...");
  const consensusModel = DEBATE_MODELS.synthesizer;
  const systemPrompt = getDebateSystemPrompt("synthesizer");
  const userPrompt = getDebateRound3Prompt(result.round1, result.round2);

  const finalRecommendation = await callLLM(
    consensusModel.model,
    systemPrompt,
    userPrompt,
    consensusModel.provider,
    1500
  );

  // Save consensus message
  await db.insert(debateMessage).values({
    id: crypto.randomUUID(),
    sessionId,
    modelName: consensusModel.model,
    round: 3,
    content: finalRecommendation,
    isConsensus: true,
  });

  // Extract consensus and disagreements from final recommendation
  result.round3.finalRecommendation = finalRecommendation;
  result.round3.consensus = "基于三个模型的深入讨论达成的共识";
  result.round3.disagreements = [];

  // Update session status
  await db
    .update(debateSession)
    .set({
      round1Proposals: result.round1,
      round2Critiques: result.round2,
      round3Consensus: result.round3,
      finalConsensus: result.round3.consensus,
      remainingDisagreements: JSON.stringify(result.round3.disagreements),
      modelUsed: Object.values(DEBATE_MODELS).map(m => m.model),
      status: "completed",
    })
    .where(eq(debateSession.id, sessionId));

  console.log("[runDebate] Debate completed successfully");
  return result;
}

/**
 * POST /api/debate - Create a new debate session
 */
export async function POST(req: NextRequest) {
  try {
    const body: DebateRequest = await req.json();
    const { question } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    // Generate session ID and create session
    const sessionId = crypto.randomUUID();

    // Use question as title (max 100 chars)
    const title = question.trim().slice(0, 100);

    await db.insert(debateSession).values({
      id: sessionId,
      userQuestion: question,
      title,
      status: "debating",
    });

    console.log(`[POST /api/debate] Created session ${sessionId} for question: ${question}`);

    // Start debate asynchronously
    runDebate(question, sessionId).catch((error) => {
      console.error(`[POST /api/debate] Debate failed for session ${sessionId}:`, error);
      db.update(debateSession)
        .set({ status: "failed" })
        .where(eq(debateSession.id, sessionId))
        .catch((e) => console.error("Failed to update session status:", e));
    });

    return NextResponse.json({
      sessionId,
      status: "debating",
      message: "Debate started",
    });
  } catch (error) {
    console.error("[POST /api/debate] Error:", error);
    return NextResponse.json(
      { error: "Failed to start debate", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
