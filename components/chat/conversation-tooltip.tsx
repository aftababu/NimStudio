import React from "react";

interface ConversationTooltipProps {
  content: string;
  responseIndex: number;
}

export function ConversationTooltip({
  content,
  responseIndex,
}: ConversationTooltipProps) {
  // Extract the first 5-10 meaningful words
  const words = content.split(/\s+/).filter((w) => w.trim().length > 0);
  const truncated =
    words.slice(0, 8).join(" ") + (words.length > 8 ? "..." : "");

  return (
    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg shadow-lg pointer-events-none w-max max-w-[200px] z-50 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="text-[10px] font-label-caps uppercase text-on-surface-variant tracking-wider mb-1">
        Request {responseIndex}
      </div>
      <div className="text-xs text-on-surface line-clamp-2 leading-snug">
        {truncated}
      </div>
      {/* Tooltip caret pointing right */}
      <div className="absolute top-1/2 -right-[5px] -translate-y-1/2 border-[5px] border-transparent border-l-surface-container-highest" />
    </div>
  );
}
