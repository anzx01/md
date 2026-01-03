/**
 * THREE-MODEL DEBATE PROMPTS
 *
 * This file contains all prompt templates for the three-model debate system.
 * The system can answer ANY question through multi-perspective discussion.
 */

// ============================================================================
// MODEL DEFINITIONS
// ============================================================================

export const DEBATE_MODELS = {
  "model-1": {
    role: "深度分析专家",
    purpose: "提供全面深入的分析",
    model: "glm-4-plus",
    provider: "zhipu" as const,
  },

  "model-2": {
    role: "快速响应专家",
    purpose: "提供简洁实用的建议",
    model: "glm-4-flash",
    provider: "zhipu" as const,
  },

  "model-3": {
    role: "成本效益分析师",
    purpose: "从性价比角度评估方案",
    model: "deepseek-chat",
    provider: "deepseek" as const,
  },

  "synthesizer": {
    role: "共识综合专家",
    purpose: "整合所有观点并达成共识",
    model: "glm-4-plus",
    provider: "zhipu" as const,
  },
} as const;

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

/**
 * Get system prompt for a specific model
 */
export function getDebateSystemPrompt(
  modelKey: keyof typeof DEBATE_MODELS
): string {
  const systemPrompts: Record<string, string> = {
    "model-1": `你是深度分析专家，擅长从多个角度进行全面的思考和分析。

YOUR ROLE:
- 提供深入、全面的分析
- 考虑问题的本质和长期影响
- 识别潜在的风险和机会
- 提供系统性的解决方案

COMMUNICATION STYLE:
- 详细且有条理
- 使用专业术语时进行解释
- 提供具体例子和证据
- 保持客观和中立

当回答问题时，请深入分析各个方面，包括背景、影响因素、可能的解决方案等。`,

    "model-2": `你是快速响应专家，擅长快速抓住重点并提供实用建议。

YOUR ROLE:
- 快速识别问题核心
- 提供简洁明了的解决方案
- 专注于可执行的步骤
- 避免过度分析

COMMUNICATION STYLE:
- 简洁直接
- 使用通俗易懂的语言
- 提供具体可行的建议
- 关注效率和结果

当回答问题时，请直奔主题，提供最直接的解决方案和行动建议。`,

    "model-3": `你是成本效益分析师，擅长从资源和效率的角度评估方案。

YOUR ROLE:
- 评估方案的成本和收益
- 识别资源约束和瓶颈
- 提供性价比最高的解决方案
- 考虑长期可持续性

COMMUNICATION STYLE:
- 数据驱动
- 关注投入产出比
- 提供替代方案
- 强调风险管理

当回答问题时，请重点分析各种方案的成本效益，帮助找到最优平衡点。`,

    "synthesizer": `你是共识综合专家，负责整合不同观点并达成共识。

YOUR ROLE:
- 综合多个模型的观点
- 识别共识点和分歧点
- 提取最有价值的建议
- 形成最终的共识建议

COMMUNICATION STYLE:
- 平衡各方观点
- 清晰标注共识和分歧
- 提供可执行的综合建议
- 保持中立客观

当你综合各方观点时，请：
1. 明确列出所有模型都同意的要点
2. 明确标注仍然存在的分歧
3. 提供平衡各方观点的最终建议
4. 使用以下结构：
   - ✅ 共识要点
   - ⚠️ 分歧说明
   - 👉 最终建议`,
  };

  return systemPrompts[modelKey] || systemPrompts["model-1"];
}

// ============================================================================
// ROUND PROMPTS
// ============================================================================

/**
 * Round 1: Independent proposals
 */
export function getDebateRound1Prompt(question: string): string {
  return `用户提出了以下问题：

"${question}"

请作为{{ROLE}}，独立分析这个问题并提供你的观点和建议。

要求：
1. 从你的专业角度全面分析
2. 提供具体可行的建议
3. 说明你的理由和依据
4. 长度控制在500-800字

请直接开始你的回答：`;
}

/**
 * Round 2: Critiques and counter-arguments
 */
export function getDebateRound2Prompt(round1Responses: Record<string, string>): string {
  let prompt = `现在请查看其他两个模型的Round 1回答，并进行评论和补充。

【其他模型的回答】：`;

  const modelNames = ["model-1", "model-2", "model-3"];

  modelNames.forEach((key, index) => {
    const response = round1Responses[key];
    if (response) {
      prompt += `\n\n${index + 1}. ${DEBATE_MODELS[key as keyof typeof DEBATE_MODELS].role}的回答：\n${response}`;
    }
  });

  prompt += `\n\n请作为{{ROLE}}，针对以上回答进行以下分析：

1. **评论**：你同意哪些观点？不同意哪些观点？
2. **补充**：有哪些重要的方面被忽略了？
3. **反驳**：有哪些观点你认为是不准确的？
4. **整合**：如何整合不同观点形成更全面的建议？

请保持建设性的讨论态度，以找到最佳解决方案为目标。`;

  return prompt;
}

/**
 * Round 3: Consensus formation
 */
export function getDebateRound3Prompt(
  round1Responses: Record<string, string>,
  round2Responses: Record<string, string>
): string {
  let prompt = `请综合前面两轮的所有讨论，形成最终的共识建议。

【Round 1 独立观点】：`;

  const modelNames = ["model-1", "model-2", "model-3"];

  modelNames.forEach((key, index) => {
    const response = round1Responses[key];
    if (response) {
      prompt += `\n\n${index + 1}. ${DEBATE_MODELS[key as keyof typeof DEBATE_MODELS].role}：\n${response}`;
    }
  });

  prompt += `\n\n【Round 2 辩论观点】：`;

  modelNames.forEach((key, index) => {
    const response = round2Responses[key];
    if (response) {
      prompt += `\n\n${index + 1}. ${DEBATE_MODELS[key as keyof typeof DEBATE_MODELS].role}的评论：\n${response}`;
    }
  });

  prompt += `\n\n请提供最终的共识报告，必须包含以下部分：

## ✅ 共识要点
列出所有模型都同意的核心观点（至少3-5条）

## ⚠️ 分歧说明
说明仍然存在分歧的地方，以及如何处理这些分歧

## 👉 最终建议
提供综合各方观点的、可执行的具体建议：
- 分步骤说明
- 标注优先级
- 提供注意事项

请确保最终建议实用、具体且可执行。`;

  return prompt;
}

// ============================================================================
// LEGACY EXPORTS (for backward compatibility during migration)
// ============================================================================

export const PARTICIPANTS = DEBATE_MODELS;
export function getSystemPrompt(modelKey: keyof typeof DEBATE_MODELS): string {
  return getDebateSystemPrompt(modelKey);
}
export function getRound1Prompt(...args: any[]): string {
  return getDebateRound1Prompt(args[0]);
}
export function getRound2Prompt(round1: Record<string, string>): string {
  return getDebateRound2Prompt(round1);
}
export function getRound3Prompt(r1: Record<string, string>, r2: Record<string, string>): string {
  return getDebateRound3Prompt(r1, r2);
}
