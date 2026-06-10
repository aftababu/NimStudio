"use client";

import { useEffect, useState, useRef } from "react";
import { useChatStore } from "../../lib/store";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";

interface StreamingMessageProps {
  messageIndex: number;
}

export function StreamingMessage({ messageIndex }: StreamingMessageProps) {
  const streamingContent = useChatStore((state) => state.streamingContent);
  const [throttledContent, setThrottledContent] = useState("");
  const contentRef = useRef(streamingContent);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Throttle updates to MarkdownRenderer to max once every 100ms
  // This drastically reduces ReactMarkdown parsing overhead on long streams
  useEffect(() => {
    contentRef.current = streamingContent;
    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        setThrottledContent(contentRef.current);
        timeoutRef.current = null;
      }, 100); // 100ms throttle
    }

    return () => {
      // Don't clear on unmount so the last chunk gets rendered, 
      // but clear on re-renders if we want to cancel? No, leave it running.
    };
  }, [streamingContent]);

  // Ensure we render the final content immediately when unmounting or stopping?
  // isStreaming turns false, so this component unmounts. The final message is added to `messages` array instantly.

  return (
    <div
      id={`message-${messageIndex}`}
      data-message-index={messageIndex}
      className="flex flex-col gap-xs bg-surface p-md border-l-2 border-primary-container rounded-r-DEFAULT shadow-[0_1px_6px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center gap-sm text-primary-container mb-xs">
        <span className="material-symbols-outlined text-[16px]">
          smart_toy
        </span>
        <span className="font-label-caps text-label-caps uppercase">
          NimStudio AI
        </span>
        <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse ml-2"></span>
      </div>
      <div className="w-full overflow-hidden">
        <MarkdownRenderer content={throttledContent} />
      </div>
    </div>
  );
}
