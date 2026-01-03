"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, MessageSquare } from "lucide-react";

interface NewDiscussionFormProps {
  onDiscussionStarted: (sessionId: string) => void;
}

const exampleQuestions = [
  "如何平衡工作和生活?",
  "学习编程的最佳路径是什么?",
  "如何提高团队协作效率?",
  "远程工作的优缺点有哪些?",
];

export function NewDiscussionForm({ onDiscussionStarted }: NewDiscussionFormProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to start debate");
      }

      onDiscussionStarted(data.sessionId);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to start debate. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-8">
          {/* Hero Text */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">
                三模型辩论共识系统
              </h1>
            </div>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              提出任何问题，让三个AI模型从不同角度辩论，为您提供最佳建议
            </p>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Main Input */}
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="请输入您的问题..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                className="text-lg h-14 pr-16 border-2 border-slate-200 focus:border-blue-500 dark:border-slate-700 dark:focus:border-blue-500"
                disabled={isLoading}
              />
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e as any);
                }}
                disabled={!question.trim() || isLoading}
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Example Questions */}
            <div className="space-y-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">试试这些问题：</p>
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.map((example, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setQuestion(example)}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Info Text */}
          <div className="text-center space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              三个AI模型将进行三轮辩论，达成共识后提供综合建议
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-500">
              <span>🎯 深度分析专家</span>
              <span>⚡ 快速响应专家</span>
              <span>💰 成本效益分析师</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 h-20">
        {/* Reserved for future features */}
      </div>
    </div>
  );
}
