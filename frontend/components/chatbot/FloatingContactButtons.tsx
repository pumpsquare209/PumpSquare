"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import ChatbotButton from "./ChatbotButton";
import ChatbotWindow from "./ChatbotWindow";

const whatsappIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="34"
    height="34"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.454.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.472.099-.174.05-.369-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403c-.757.249-1.527.398-2.415.398-2.35 0-4.156-1.792-4.156-4.155 0-2.363 1.807-4.155 4.156-4.155 1.068 0 2.005.32 2.77.866a6.093 6.093 0 0 1 2.46 1.885 5.81 5.81 0 0 1 2.412 4.347 5.985 5.985 0 0 1-1.59 3.437 5.88 5.88 0 0 1-.805 1.083c-.343.289-.718.48-1.075.583a25.278 25.278 0 0 1-1.65.61c-.789.26-1.627.26-2.21.135z" />
  </svg>
);

const message =
  "Hello Pumpsquare Team, I visited your website and would like to know more about your pumps and products. Could you please assist me?";

export default function FloatingContactButtons() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const whatsappUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : null;

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const backendApiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || "/api/chat";

  const toggleChat = useCallback(() => {
    if (isChatMinimized) {
      setIsChatMinimized(false);
      setIsChatOpen(true);
    } else {
      setIsChatOpen(prev => !prev);
    }
    setUnreadCount(0);
  }, [isChatMinimized]);

  const handleClose = useCallback(() => {
    setIsChatOpen(false);
    setIsChatMinimized(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsChatMinimized(true);
    setIsChatOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isChatOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isChatOpen, handleClose]);

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    if (!whatsappUrl) {
      e.preventDefault();
      console.warn("WhatsApp number not configured. Set NEXT_PUBLIC_WHATSAPP_NUMBER environment variable.");
    }
  };

  const showFloatingButtons = !isChatOpen && !isChatMinimized;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[10000] flex flex-col items-center gap-3">
        {showFloatingButtons && (
          <>
            <ChatbotButton
              onToggle={toggleChat}
              isOpen={isChatOpen}
              isMinimized={isChatMinimized}
              unreadCount={unreadCount}
            />
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with Pumpsquare on WhatsApp"
                className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-[0_8px_30px_rgba(37,211,102,0.4)] transition-all duration-300 flex items-center justify-center",
                  "bg-[#25D366] text-white hover:bg-[#1EB85A] hover:shadow-[0_12px_40px_rgba(37,211,102,0.5)] hover:scale-105"
                )}
              >
                {whatsappIcon}
              </a>
            ) : (
              <button
                type="button"
                onClick={handleWhatsAppClick}
                aria-label="Chat with Pumpsquare on WhatsApp (not configured)"
                className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-[0_8px_30px_rgba(37,211,102,0.4)] transition-all duration-300 flex items-center justify-center",
                  "bg-[#25D366] text-white opacity-60 cursor-not-allowed hover:scale-100"
                )}
              >
                {whatsappIcon}
                <span className="sr-only">WhatsApp number not configured</span>
              </button>
            )}
          </>
        )}
      </div>

      <ChatbotWindow
        isOpen={isChatOpen && !isChatMinimized}
        onClose={handleClose}
        onMinimize={handleMinimize}
        apiUrl={backendApiUrl}
      />
    </>
  );
}