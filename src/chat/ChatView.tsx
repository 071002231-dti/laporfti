import React, { useRef, useEffect } from "react";
import { useChat } from "./ChatContext";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { Loader2 } from "lucide-react";

export const ChatView: React.FC = () => {
  const { messages, isLoading } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Chat background pattern (Full width) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: "#efeae2",
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-[#efeae2]/80 dark:to-[#0b141a]/90 pointer-events-none" />

      {/* Scrollable Container centered */}
      <div className="flex-1 overflow-y-auto py-6 z-10 flex flex-col items-center">
        <div className="w-full max-w-4xl px-2 sm:px-4 flex flex-col">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start mb-2 px-3 sm:px-6">
              <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-md px-5 py-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Memproses...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* Input bar */}
      <div className="z-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-xl shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="w-full max-w-4xl mx-auto">
          <ChatInput />
        </div>
      </div>
    </div>
  );
};
