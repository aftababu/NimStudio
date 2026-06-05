"use client";

import { useRef, ChangeEvent, KeyboardEvent } from "react";
import { useChatStore } from "../lib/store";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function MessageInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    messages,
    addMessage,
    setIsStreaming,
    setStreamingContent,
    appendStreamingContent,
    isStreaming,
    streamingContent,
    activeModelId,
    activeConversationId,
    setActiveConversationId,
    activeProjectId,
  } = useChatStore();

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
    if (target.value === "") {
      target.style.height = "44px";
    }
  };

  const handleSubmit = async () => {
    if (!textareaRef.current) return;
    const content = textareaRef.current.value.trim();
    if (!content || isStreaming) return;

    textareaRef.current.value = "";
    textareaRef.current.style.height = "44px";

    const newUserMessage = { role: "user" as const, content };
    addMessage(newUserMessage);

    setIsStreaming(true);
    setStreamingContent("");

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("http://localhost:3001/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: content,
          model: activeModelId,
          conversationId: activeConversationId,
          projectId: activeProjectId,
        }),
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let buffer = "";

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;

          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");

            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith("data:")) {
                const data = trimmedLine.slice(5).trim();

                if (!data || data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === "conversation_id") {
                    if (activeConversationId !== parsed.id) {
                      setActiveConversationId(parsed.id);
                      router.push(`/?id=${parsed.id}`);
                    }
                  } else {
                    appendStreamingContent(parsed);
                  }
                } catch (e) {
                  // Ensure raw string rendering falls back properly
                  appendStreamingContent(data.replace(/^"|"$/g, ""));
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Generation stopped by user");
      } else {
        console.error("Stream error:", error);
      }
    } finally {
      const finalContent = useChatStore.getState().streamingContent;
      if (finalContent.trim()) {
        addMessage({ role: "assistant", content: finalContent });
      }
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full p-lg bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent pt-xl z-10">
      <div className="max-w-3xl mx-auto relative">
        <div className="flex items-end gap-sm bg-[#171717] border border-[#262626] rounded-xl p-xs focus-within:border-primary-container transition-colors shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          <button
            aria-label="Add attachment"
            className="p-sm text-on-surface-variant hover:text-on-surface hover:bg-[#262626] rounded-lg transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-body-md resize-none max-h-[150px] min-h-[44px] py-sm px-xs custom-scrollbar outline-none"
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message NimStudio..."
            rows={1}
            disabled={isStreaming}
          />
          {!isStreaming ? (
            <button
              onClick={() => abortControllerRef.current?.abort()}
              aria-label="Stop generation"
              className="pt-sm px-sm text-error hover:text-error-container bg-[#262626] hover:bg-[#333333] rounded-lg transition-colors flex-shrink-0 self-center"
            >
              <span className="material-symbols-outlined text-[20px]">
                stop
              </span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isStreaming}
              aria-label="Send message"
              className="p-sm text-on-surface-variant hover:text-primary-container bg-[#262626] hover:bg-[#333333] rounded-lg transition-colors flex-shrink-0 mb-[2px] mr-[2px]"
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_upward
              </span>
            </button>
          )}
        </div>
        <div className="text-center mt-xs">
          <p className="font-label-caps text-[9px] text-[#474746] tracking-wider uppercase">
            AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}
