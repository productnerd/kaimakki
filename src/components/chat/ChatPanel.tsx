"use client";

import { useChat } from "@ai-sdk/react";
import { type UIMessage, DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import ChatMessage from "./ChatMessage";

const STORAGE_KEY = "kaimakki-chat";

interface ChatPanelProps {
  mode: "landing" | "dashboard";
}

type StoredMsg = { id: string; role: "user" | "assistant"; content: string };

function storedToUIMessage(m: StoredMsg): UIMessage {
  return {
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  };
}

function getMessageText(m: UIMessage): string {
  return m.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

export default function ChatPanel({ mode }: ChatPanelProps) {
  const { user } = useAuth();
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load initial messages based on mode
  useEffect(() => {
    if (mode === "dashboard" && user) {
      const supabase = createClient();
      supabase
        .from("chat_messages")
        .select("id, role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setInitialMessages(data.map(storedToUIMessage));
          }
          setReady(true);
        });
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: StoredMsg[] = JSON.parse(saved);
          setInitialMessages(parsed.map(storedToUIMessage));
        }
      } catch {
        // Ignore parse errors
      }
      setReady(true);
    }
  }, [mode, user]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { mode },
      }),
    [mode]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: ready ? initialMessages : undefined,
  });

  // Save to localStorage in landing mode
  useEffect(() => {
    if (mode === "landing" && messages.length > 0) {
      try {
        const toStore: StoredMsg[] = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: getMessageText(m),
          }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch {
        // Ignore storage errors
      }
    }
  }, [mode, messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isStreaming = status === "streaming" || status === "submitted";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    sendMessage({ text: inputValue });
    setInputValue("");
  }

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-cream-61 text-sm">
              Hey! Need help picking a recipe, figuring out pricing, or understanding
              why we&apos;ll donate your money if you procrastinate?
            </p>
            <p className="text-cream-31 text-xs mt-1">
              Ask away. I don&apos;t judge. Much.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const text = getMessageText(m);
          if (!text) return null;
          return (
            <ChatMessage
              key={m.id}
              role={m.role as "user" | "assistant"}
              content={text}
            />
          );
        })}
        {isStreaming &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-cream-31 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-cream-31 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 bg-cream-31 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about our video services..."
          className="flex-1 px-4 py-2.5 rounded-brand bg-surface border border-border text-cream text-sm placeholder:text-cream-31 focus:outline-none focus:border-accent transition-colors"
          disabled={isStreaming}
        />
        <button
          type="submit"
          disabled={isStreaming || !inputValue.trim()}
          className="px-3 py-2.5 rounded-brand bg-accent text-brown font-medium text-sm hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
