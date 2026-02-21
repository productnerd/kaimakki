"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap
          ${
            isUser
              ? "bg-accent text-brown rounded-br-md"
              : "bg-surface border border-border text-cream rounded-bl-md"
          }
        `}
      >
        {content}
      </div>
    </div>
  );
}
