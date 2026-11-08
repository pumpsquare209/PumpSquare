"use client";

import { useState, useEffect, useCallback } from "react";
import ChatbotButton from "./ChatbotButton";
import ChatbotWindow from "./ChatbotWindow";

interface ChatbotWidgetProps {
  apiUrl?: string;
}

export default function ChatbotWidget({ apiUrl = "/api/chat" }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const backendApiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || "/api/chat";

  const toggleChat = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false);
      setIsOpen(true);
    } else {
      setIsOpen(prev => !prev);
    }
    setUnreadCount(0);
  }, [isMinimized]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  return (
    <>
      <ChatbotButton
        onToggle={toggleChat}
        isOpen={isOpen}
        isMinimized={isMinimized}
        unreadCount={unreadCount}
      />
      <ChatbotWindow
        isOpen={isOpen && !isMinimized}
        onClose={handleClose}
        onMinimize={handleMinimize}
        apiUrl={backendApiUrl}
      />
    </>
  );
}