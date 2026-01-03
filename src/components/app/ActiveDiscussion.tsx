"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ControlButton } from "./ControlButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Pause, Play, Check } from "lucide-react";

const models = ["glm-4-plus", "glm-4-flash", "deepseek-chat"];

const modelNames: Record<string, string> = {
  "glm-4-plus": "深度分析专家",
  "glm-4-flash": "快速响应专家",
  "deepseek-chat": "成本效益分析师",
};

const modelColors: Record<string, string> = {
  "glm-4-plus": "bg-blue-500",
  "glm-4-flash": "bg-purple-500",
  "deepseek-chat": "bg-green-500",
};

type ModelStatus = "waiting" | "thinking" | "writing" | "done";

interface ActiveDiscussionProps {
  sessionId: string;
  onCompleted: () => void;
}

export function ActiveDiscussion({ sessionId, onCompleted }: ActiveDiscussionProps) {
  const [session, setSession] = useState<any>(null);
  const [modelStates, setModelStates] = useState<Record<string, ModelStatus>>({
    "glm-4-plus": "waiting",
    "glm-4-flash": "waiting",
    "deepseek-chat": "waiting",
  });
  const [selectedModels, setSelectedModels] = useState<string[]>(["glm-4-plus", "glm-4-flash", "deepseek-chat"]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleChatComplete = useCallback(() => {
    // No-op - completion is handled by the parent's onCompleted
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll for updates
  useEffect(() => {
    if (isPaused) return;

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/debate/${sessionId}`);
        const data = await response.json();

        setSession((prevSession: any) => {
          if (JSON.stringify(prevSession) === JSON.stringify(data)) {
            return prevSession;
          }
          return data;
        });

        if (data.isPaused && !isPaused) {
          setIsPaused(true);
          return;
        }

        // Update model states
        if (data.messages && data.messages.length > 0) {
          const latestModelStates: Record<string, ModelStatus> = {
            "glm-4-plus": "waiting",
            "glm-4-flash": "waiting",
            "deepseek-chat": "waiting",
          };

          models.forEach((model) => {
            const modelMessages = data.messages.filter((m: any) => m.modelName === model);
            if (modelMessages.length > 0) {
              latestModelStates[model] = "done";
            }
          });

          if (data.status !== "completed" && !data.isPaused) {
            const latestMessage = data.messages[data.messages.length - 1];
            if (latestMessage) {
              models.forEach((model) => {
                const modelHasSpoken = data.messages.some((m: any) => m.modelName === model);
                if (modelHasSpoken) {
                  latestModelStates[model] = model === latestMessage.modelName ? "thinking" : "done";
                }
              });
            }
          }

          setModelStates((prevStates: Record<string, ModelStatus>) => {
            if (JSON.stringify(prevStates) === JSON.stringify(latestModelStates)) {
              return prevStates;
            }
            return latestModelStates;
          });
        }

        if (data.status === "completed" && !isCompleted) {
          setIsCompleted(true);
        }

        return data.status === "completed";
      } catch (err) {
        setError("Failed to fetch progress");
        return false;
      }
    };

    let shouldStopPolling = false;
    fetchSession().then(stop => {
      shouldStopPolling = stop;
    });

    const interval = setInterval(async () => {
      const stop = await fetchSession();
      if (stop && interval) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, isPaused, isCompleted]);

  const handlePause = async () => {
    try {
      const response = await fetch(`/api/debate/${sessionId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });

      if (response.ok) {
        setIsPaused(true);
      }
    } catch (error) {
      console.error("Error pausing:", error);
    }
  };

  const handleResume = async () => {
    try {
      const response = await fetch(`/api/debate/${sessionId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });

      if (response.ok) {
        setIsPaused(false);
      }
    } catch (error) {
      console.error("Error resuming:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/debate/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.trim(),
          selectedModels,
        }),
      });

      if (response.ok) {
        setUserMessage("");
      } else {
        alert("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (error && !session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Top Bar - Model Status */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {isPaused ? "已暂停" : isCompleted ? "辩论完成" : "辩论中..."}
            </h2>
            <div className="flex items-center gap-2">
              {!isCompleted && (
                <>
                  {isPaused ? (
                    <Button
                      size="sm"
                      onClick={handleResume}
                      className="gap-1"
                    >
                      <Play className="h-4 w-4" />
                      继续
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handlePause}
                      variant="outline"
                      className="gap-1"
                    >
                      <Pause className="h-4 w-4" />
                      暂停
                    </Button>
                  )}
                </>
              )}
              {isCompleted && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">完成</span>
                </div>
              )}
              <div className="text-sm text-slate-500">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Model Status Indicators */}
          <div className="flex gap-4">
            {models.map((model) => (
              <div key={model} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${modelColors[model]}`} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {modelNames[model]}
                </span>
                <ControlButton status={modelStates[model]} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <ChatContainer
          sessionId={sessionId}
          status={session.status}
          onComplete={handleChatComplete}
        />
      </div>

      {/* Bottom Bar - User Input */}
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="flex gap-2">
          <Input
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={isCompleted ? "辩论已完成，您可以继续提问..." : "参与辩论..."}
            disabled={isSending || isPaused}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!userMessage.trim() || isSending || isPaused}
            size="icon"
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
