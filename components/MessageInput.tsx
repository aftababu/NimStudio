"use client";

import { useRef, ChangeEvent, KeyboardEvent, useState } from "react";
import { useChatStore } from "../lib/store";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useShallow } from "zustand/react/shallow";

export function MessageInput() {
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    addMessage,
    setIsStreaming,
    setStreamingContent,
    appendStreamingContent,
    isStreaming,
    activeModelId,
    activeConversationId,
    setActiveConversationId,
    activeProjectId,
  } = useChatStore(
    useShallow((state) => ({
      addMessage: state.addMessage,
      setIsStreaming: state.setIsStreaming,
      setStreamingContent: state.setStreamingContent,
      appendStreamingContent: state.appendStreamingContent,
      isStreaming: state.isStreaming,
      activeModelId: state.activeModelId,
      activeConversationId: state.activeConversationId,
      setActiveConversationId: state.setActiveConversationId,
      activeProjectId: state.activeProjectId,
    })),
  );

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorAlert(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `http://localhost:3001/api/documents/${activeProjectId || "default"}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Failed to upload document");
      }

      const result = await response.json();
      if (result.success && result.data?.filename) {
        if (textareaRef.current) {
          const appendText = ` @${result.data.filename} `;
          textareaRef.current.value += appendText;
          textareaRef.current.focus();
        }
      }
    } catch (err: any) {
      setErrorAlert(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
    if (isStreaming || isUploading) return;

    if (!content) {
      setErrorAlert("Please enter some text or attach a file.");
      return;
    }

    setErrorAlert(null);

    textareaRef.current.value = "";
    textareaRef.current.style.height = "44px";

    const newUserMessage = { role: "user" as const, content };
    addMessage(newUserMessage);

    setIsStreaming(true);
    setStreamingContent("");

    abortControllerRef.current = new AbortController();

    try {
      const state = useChatStore.getState();
      const response = await fetch("http://localhost:3001/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: content,
          model: state.activeModelId,
          conversationId: state.activeConversationId,
          projectId: state.activeProjectId,
        }),
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errorMessage = errData.error;
        } catch (e) {}
        throw new Error(errorMessage);
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
        let displayError = error.message || "An unexpected error occurred";

        // Sanitize ugly database errors
        if (
          displayError.includes("Failed query") ||
          displayError.includes("SQLITE_CONSTRAINT") ||
          displayError.includes("FOREIGN KEY constraint")
        ) {
          displayError =
            "Something went wrong saving to the database. Please check your project configuration.";
        } else if (
          displayError.includes("Failed to fetch") ||
          displayError.includes("NetworkError")
        ) {
          displayError =
            "Unable to connect to the server. Is the backend running?";
        }

        setErrorAlert(displayError);
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
    <div className="absolute bottom-0 left-0 w-full p-lg bg-gradient-to-t from-surface via-surface-container-low to-transparent pt-xl z-10">
      <div className="max-w-3xl mx-auto relative">
        {errorAlert && (
          <div className="mb-2 px-md py-sm bg-error/10 border border-error/20 rounded-md flex items-center justify-between shadow-sm">
            <span className="text-error text-sm font-medium">{errorAlert}</span>
            <button
              onClick={() => setErrorAlert(null)}
              className="text-error hover:text-error-container p-1 rounded-md transition-colors"
              aria-label="Dismiss error"
            >
              <span className="material-symbols-outlined text-[16px]">
                close
              </span>
            </button>
          </div>
        )}
        <div className="flex items-end gap-sm bg-surface border border-transparent rounded-xl p-xs focus-within:border-primary-container transition-colors shadow-[0_1px_6px_rgba(0,0,0,0.2)]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isStreaming}
            aria-label="Add attachment"
            className="p-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {isUploading ? (
              <span className="material-symbols-outlined animate-spin">
                sync
              </span>
            ) : (
              <span className="material-symbols-outlined">add</span>
            )}
          </button>
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-body-md resize-none max-h-[150px] min-h-[44px] py-sm px-xs custom-scrollbar outline-none"
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message NimStudio..."
            rows={1}
            disabled={isStreaming || isUploading}
          />
          {isStreaming ? (
            <button
              onClick={() => abortControllerRef.current?.abort()}
              aria-label="Stop generation"
              className="cursor-pointer pt-sm px-sm text-error hover:text-error-container bg-surface-container-high hover:bg-surface-container-highest rounded-lg transition-colors flex-shrink-0 self-center"
            >
              <span className="material-symbols-outlined text-[20px]">
                stop
              </span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isStreaming || isUploading}
              aria-label="Send message"
              className="cursor-pointer p-sm text-on-surface-variant hover:text-primary-container bg-surface-container-high hover:bg-surface-container-highest rounded-lg transition-colors flex-shrink-0 mb-[2px] mr-[2px] disabled:opacity-50"
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
