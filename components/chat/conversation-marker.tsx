"use client";

import React, { useState } from 'react';
import { ConversationTooltip } from './conversation-tooltip';
import { useChatStore } from '../../lib/store';

interface ConversationMarkerProps {
  index: number;
  targetIndex: number;
  responseIndex: number;
  isActive: boolean;
  content: string;
}

export const ConversationMarker = React.memo(function ConversationMarker({
  index,
  targetIndex,
  responseIndex,
  isActive,
  content,
}: ConversationMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    console.log(`[ProgrammaticScroll] clickedMessageId: ${index}, targetIndex: ${targetIndex}`);
    // Lock the observer
    useChatStore.getState().setActiveMessageIndex(index);
    useChatStore.getState().setIsProgrammaticScroll(true);

    const el = document.getElementById(`message-${targetIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Reset the lock after smooth scroll animation completes (~800ms)
      setTimeout(() => {
        useChatStore.getState().setIsProgrammaticScroll(false);
      }, 800);
    } else {
      useChatStore.getState().setIsProgrammaticScroll(false);
    }
  };

  return (
    <div 
      className="relative flex items-center justify-center w-8 h-6 cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Scroll to response ${responseIndex}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* The marker bar/dot */}
      <div 
        className={`w-1 rounded-full transition-all duration-300 ease-in-out ${
          isActive 
            ? "h-full bg-primary" 
            : "h-2 bg-on-surface-variant/30 group-hover:bg-on-surface-variant group-hover:h-4"
        }`} 
      />

      {/* Tooltip rendering */}
      {isHovered && (
        <ConversationTooltip content={content} responseIndex={responseIndex} />
      )}
    </div>
  );
});
