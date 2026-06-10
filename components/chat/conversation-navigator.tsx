"use client";

import React from "react";
import { useChatStore } from "../../lib/store";
import { ConversationMarker } from "./conversation-marker";

export function ConversationNavigator() {
  const { messages, activeMessageIndex } = useChatStore();

  // Filter out only assistant messages and compute their display response index
  let responseCounter = 0;
  const assistantMarkers = messages
    .map((msg, index) => {
      // console.log("\n\n asistance marker", msg);

      if (msg.role === "assistant") {
        responseCounter++;
        
        // Find the preceding user message
        let userContent = "Greeting";
        let scrollTargetIndex = index; // default to scrolling to the assistant message
        
        if (index > 0 && messages[index - 1].role === "user") {
          userContent = messages[index - 1].content;
          scrollTargetIndex = index - 1; // Scroll to user input
        }

        return {
          index,
          targetIndex: scrollTargetIndex,
          responseIndex: responseCounter,
          content: userContent,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
    index: number;
    targetIndex: number;
    responseIndex: number;
    content: string;
    tittle?: string;
  }>;

  // Hide if there are barely any messages
  if (assistantMarkers.length <= 1) {
    return null;
  }

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 py-4 px-2 z-40 hidden lg:flex">
      {assistantMarkers.map((marker) => (
        <ConversationMarker
          key={marker.index}
          index={marker.index}
          targetIndex={marker.targetIndex}
          responseIndex={marker.responseIndex}
          isActive={activeMessageIndex === marker.index}
          content={marker.tittle || marker.content}
        />
      ))}
    </div>
  );
}
