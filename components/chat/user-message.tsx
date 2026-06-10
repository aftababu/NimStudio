"use client";

import React, { useState, useRef, useEffect } from "react";

export function UserMessage({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      // Check if the scroll height exceeds the client height when clamped
      const element = textRef.current;
      setIsOverflowing(element.scrollHeight > element.clientHeight);
    }
  }, [content]);

  return (
    <div className="flex flex-col gap-xs">
      <div className="flex items-center gap-sm text-on-surface-variant mb-xs">
        <span className="material-symbols-outlined text-[16px]">person</span>
        <span className="font-label-caps text-label-caps uppercase">User</span>
      </div>
      <div className="flex flex-col items-start gap-1">
        <div
          ref={textRef}
          className={`font-body-lg text-body-lg text-on-surface leading-relaxed pr-lg whitespace-pre-wrap ${
            !isExpanded ? "line-clamp-3" : ""
          }`}
        >
          {content}
        </div>
        {isOverflowing && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary hover:text-primary-container text-sm font-medium transition-colors"
          >
            {isExpanded ? "See Less" : "See More"}
          </button>
        )}
      </div>
    </div>
  );
}
