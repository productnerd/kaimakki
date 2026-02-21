"use client";

import { useState } from "react";
import { useCart } from "@/providers/CartProvider";
import ChatPanel from "./ChatPanel";

interface ChatWidgetProps {
  mode: "landing" | "dashboard";
}

export default function ChatWidget({ mode }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isOpen: cartOpen } = useCart();

  // Hide the floating button when cart drawer is open
  if (cartOpen && !isOpen) return null;

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="
            fixed z-30
            bottom-0 right-0 w-full h-[80vh]
            sm:bottom-6 sm:right-6 sm:w-96 sm:h-[500px]
            bg-background border border-border sm:rounded-brand
            shadow-2xl flex flex-col overflow-hidden
          "
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-lime rounded-full" />
              <span className="font-display font-bold text-sm text-cream">
                Kaimakki Assistant
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-cream-31 hover:text-cream transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Content */}
          <ChatPanel mode={mode} />
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="
            fixed bottom-6 right-6 z-30
            w-14 h-14 rounded-full
            bg-accent text-brown
            shadow-lg hover:shadow-xl
            hover:scale-105 active:scale-95
            transition-all duration-200
            flex items-center justify-center
          "
          aria-label="Open chat"
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
      )}
    </>
  );
}
