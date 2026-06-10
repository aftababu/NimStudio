"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useChatStore } from "../lib/store";
import { useShallow } from "zustand/react/shallow";
import dynamic from "next/dynamic";
import { ConversationNavigator } from "./chat/conversation-navigator";
import { UserMessage } from "./chat/user-message";

const MarkdownRenderer = dynamic(
  () =>
    import("./markdown/MarkdownRenderer").then((mod) => mod.MarkdownRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-10 bg-surface-container-low rounded-md w-full opacity-50" />
    ),
  },
);

import { StreamingMessage } from "./chat/streaming-message";

export function ChatFeed() {
  const {
    messages,
    isStreaming,
    activeConversationId,
    setMessages,
    setActiveMessageIndex,
  } = useChatStore(
    useShallow((state) => ({
      messages: state.messages,
      isStreaming: state.isStreaming,
      activeConversationId: state.activeConversationId,
      setMessages: state.setMessages,
      setActiveMessageIndex: state.setActiveMessageIndex,
    })),
  );
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [chatNotFound, setChatNotFound] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChatNotFound(false);
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
        if (res.status === 404) {
          setChatNotFound(true);
          return;
        }
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
    if (!scrollContainerRef.current) return;

    const observer = new MutationObserver(() => {
      if (isAutoScrollEnabled && bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "auto" });
      }
    });

    observer.observe(scrollContainerRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Also scroll immediately on mount or dependency change
    if (isAutoScrollEnabled && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }

    return () => observer.disconnect();
  }, [isAutoScrollEnabled]);

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

  // IntersectionObserver for tracking active messages
  useEffect(() => {
    if (isLoadingMessages || messages.length === 0) return;

    const options = {
      root: scrollContainerRef.current,
      rootMargin: "-20% 0px -40% 0px",
      threshold: 0,
    };

    // To handle multiple intersecting items, we keep track of their intersection ratios or just pick the top one.
    let intersectingEntries: Map<Element, IntersectionObserverEntry> =
      new Map();

    const callback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          intersectingEntries.set(entry.target, entry);
        } else {
          intersectingEntries.delete(entry.target);
        }
      });

      if (intersectingEntries.size > 0) {
        // Prevent observer from overriding the state during a programmatic scroll
        const isProgrammatic = useChatStore.getState().isProgrammaticScroll;
        if (isProgrammatic) {
          console.log(
            "[IntersectionObserver] Ignored update. State: programmatic scrolling active.",
          );
          return;
        }

        let bestEntry: IntersectionObserverEntry | null = null;
        let minDistance = Infinity;

        // Focal point is the top third of the viewport
        const focalPointY = window.innerHeight * 0.3;

        intersectingEntries.forEach((entry) => {
          const rect = entry.boundingClientRect;

          // If the focal point is strictly inside this element, it wins unconditionally
          if (rect.top <= focalPointY && rect.bottom >= focalPointY) {
            bestEntry = entry;
            minDistance = -1; // Flag to ignore others
          } else if (minDistance !== -1) {
            // Otherwise, pick the one closest to the focal point
            const dist = Math.min(
              Math.abs(rect.top - focalPointY),
              Math.abs(rect.bottom - focalPointY),
            );
            if (dist < minDistance) {
              minDistance = dist;
              bestEntry = entry;
            }
          }
        });

        if (bestEntry) {
          const target = (bestEntry as IntersectionObserverEntry)
            .target as HTMLElement;
          const indexStr = target.dataset.messageIndex;
          if (indexStr) {
            const parsedIndex = parseInt(indexStr, 10);
            const currentActive = useChatStore.getState().activeMessageIndex;
            if (currentActive !== parsedIndex) {
              console.log(
                `[IntersectionObserver] Setting activeMessageId: ${parsedIndex} (ObserverSelected: ${parsedIndex})`,
              );
              setActiveMessageIndex(parsedIndex);
            }
          }
        }
      }
    };

    const observer = new IntersectionObserver(callback, options);

    // Select all assistant message nodes
    const nodes = document.querySelectorAll("[data-message-index]");
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [messages, isLoadingMessages, setActiveMessageIndex]);

  if (chatNotFound) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-lg relative z-10">
        <div className="w-20 h-20 bg-surface rounded-2xl border border-outline-variant flex items-center justify-center mb-md shadow-xl">
          <span className="material-symbols-outlined text-[32px] text-on-surface-variant">
            forum
          </span>
        </div>
        <h2 className="text-2xl font-semibold text-on-surface mb-xs">
          Chat Not Found
        </h2>
        <p className="text-on-surface-variant text-sm mb-lg text-center max-w-[300px]">
          The conversation you're looking for doesn't exist or has been deleted.
        </p>
        <button
          onClick={() => {
            useChatStore.getState().setActiveConversationId(null);
            window.history.pushState({}, "", "/");
          }}
          className="flex items-center gap-sm px-lg py-sm bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Start New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 relative flex flex-col min-h-0 bg-background">
      <ConversationNavigator />
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-lg py-md pb-[120px] custom-scrollbar "
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-md">
          {/* System/Context Notification */}
          <div className="text-center py-md">
            <span className="inline-flex items-center gap-xs px-sm py-xs border border-outline-variant bg-surface rounded-DEFAULT font-code-sm text-code-sm text-on-surface-variant">
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
                  <div key={index} id={`message-${index}`}>
                    <UserMessage content={msg.content} />
                  </div>
                );
              } else if (msg.role === "assistant") {
                return (
                  <div
                    key={index}
                    id={`message-${index}`}
                    data-message-index={index}
                    className="flex flex-col gap-1 bg-surface px-md py-sm border-l-2 border-primary-container rounded-r-[4px] shadow-[0_1px_6px_rgba(0,0,0,0.2)]"
                  >
                    <div className="flex items-center gap-sm text-primary-container mb-1">
                      <span className="material-symbols-outlined text-[16px]">
                        smart_toy
                      </span>
                      <span className="font-label-caps text-label-caps uppercase">
                        NimStudio AI
                      </span>
                    </div>
                    <div className="w-full overflow-hidden">
                      <MarkdownRenderer content={msg.content} />
                    </div>
                  </div>
                );
              }
              return null;
            })}

          {isStreaming && <StreamingMessage messageIndex={messages.length} />}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {!isAutoScrollEnabled && (
        <div className="absolute bottom-[140px] left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={scrollToBottom}
            className="flex items-center justify-center w-10 h-10 bg-surface-container-high border border-surface-container-highest hover:bg-surface-container-highest text-on-surface rounded-full shadow-[0_1px_6px_rgba(0,0,0,0.2)] transition-all"
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
