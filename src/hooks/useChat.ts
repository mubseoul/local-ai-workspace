import { useCallback, useRef } from "react";
import { useAppStore } from "../store/appStore";

export function useChat() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    messages,
    isStreaming,
    streamingContent,
    activeConversation,
    chatMode,
    sendMessage,
    createConversation,
    error,
  } = useAppStore();

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      if (!activeConversation) {
        await createConversation(chatMode);
        // Small delay for state to settle
        await new Promise((r) => setTimeout(r, 100));
      }

      const conv = useAppStore.getState().activeConversation;
      if (conv) {
        await sendMessage(content);
      }
    },
    [isStreaming, activeConversation, chatMode, createConversation, sendMessage]
  );

  return {
    messages,
    isStreaming,
    streamingContent,
    activeConversation,
    send,
    inputRef,
    error,
  };
}
