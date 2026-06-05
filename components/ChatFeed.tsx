"use client";

import { useEffect, useState, useRef } from "react";
import { useChatStore } from "../lib/store";

export function ChatFeed() {
  const {
    messages,
    isStreaming,
    streamingContent,
    activeConversationId,
    setMessages,
  } = useChatStore();
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeConversationId) {
      // It's a new chat, so just reset messages
      setMessages([
        {
          role: "assistant",
          content:
            "Hello! I am ready to help you. What would you like to build today?",
        },
      ]);
      return;
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await fetch(
          `http://localhost:3001/api/chat/conversations/${activeConversationId}/messages`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            setMessages([
              {
                role: "assistant",
                content:
                  "Hello! I am ready to help you. What would you like to build today?",
              },
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeConversationId, setMessages]);

  useEffect(() => {
    if (isAutoScrollEnabled && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [streamingContent, messages, isAutoScrollEnabled]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } =
      scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceToBottom > 50) {
      setIsAutoScrollEnabled(false);
    } else {
      setIsAutoScrollEnabled(true);
    }
  };

  const scrollToBottom = () => {
    setIsAutoScrollEnabled(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <div className="flex-1 relative flex flex-col min-h-0">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-lg pb-[120px] custom-scrollbar"
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-lg">
          {/* System/Context Notification */}
          <div className="text-center py-md">
            <span className="inline-flex items-center gap-xs px-sm py-xs border border-outline-variant bg-[#171717] rounded-DEFAULT font-code-sm text-code-sm text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              Context loaded: Local workspace active
            </span>
          </div>

          {isLoadingMessages && (
            <div className="text-center py-md text-on-surface-variant animate-pulse">
              Loading messages...
            </div>
          )}

          {!isLoadingMessages &&
            messages.map((msg, index) => {
              if (msg.role === "user") {
                return (
                  <div key={index} className="flex flex-col gap-xs">
                    <div className="flex items-center gap-sm text-on-surface-variant mb-xs">
                      <span className="material-symbols-outlined text-[16px]">
                        person
                      </span>
                      <span className="font-label-caps text-label-caps uppercase">
                        User
                      </span>
                    </div>
                    <div className="font-body-lg text-body-lg text-on-surface leading-relaxed pr-lg whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                );
              } else if (msg.role === "assistant") {
                return (
                  <div
                    key={index}
                    className="flex flex-col gap-xs bg-[#171717] p-md border-l-2 border-primary-container rounded-r-DEFAULT shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                  >
                    <div className="flex items-center gap-sm text-primary-container mb-xs">
                      <span className="material-symbols-outlined text-[16px]">
                        smart_toy
                      </span>
                      <span className="font-label-caps text-label-caps uppercase">
                        NimStudio AI
                      </span>
                    </div>
                    <div className="font-body-lg text-body-lg text-on-surface leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                );
              }
              return null;
            })}

          {isStreaming && (
            <div className="flex flex-col gap-xs bg-[#171717] p-md border-l-2 border-primary-container rounded-r-DEFAULT shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-sm text-primary-container mb-xs">
                <span className="material-symbols-outlined text-[16px]">
                  smart_toy
                </span>
                <span className="font-label-caps text-label-caps uppercase">
                  NimStudio AI
                </span>
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse ml-2"></span>
              </div>
              <div className="font-body-lg text-body-lg text-on-surface leading-relaxed whitespace-pre-wrap">
                {streamingContent}
              </div>
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {!isAutoScrollEnabled && (
        <div className="absolute bottom-[140px] left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={scrollToBottom}
            className="flex items-center justify-center w-10 h-10 bg-[#262626] border border-[#333333] hover:bg-[#333333] text-on-surface rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.6)] transition-all"
            aria-label="Scroll to bottom"
          >
            <span className="material-symbols-outlined text-[20px]">
              arrow_downward
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
