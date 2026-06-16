"use client";
import { useState, useRef, useEffect } from "react";
import type { AIConversationSchema } from "@/types/lesson";
import { z } from "zod";
import AudioButton from "@/components/ui/AudioButton";
import Button from "@/components/ui/Button";
import { Send, Bot } from "lucide-react";

type AIConversation = z.infer<typeof AIConversationSchema>;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIChat({ config }: { config: AIConversation }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          systemPromptHint: config.systemPromptHint,
          level: config.level,
          allowedGrammar: config.allowedGrammar,
          scenario_bs: config.scenario_bs,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Lo siento, ha ocurrido un error. / Žao mi je, došlo je do greške." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[420px]">
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 mb-3 text-sm text-emerald-800 dark:text-emerald-200">
        <p className="font-medium">🤖 AI Sagovornik</p>
        <p>{config.scenario_bs}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Počni razgovor na španskom!</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 text-white text-xs">
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-emerald-500 text-white rounded-tr-sm"
                  : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-tl-sm"
              }`}
            >
              <p>{msg.content}</p>
              {msg.role === "assistant" && (
                <div className="mt-1">
                  <AudioButton text={msg.content.split("💡")[0].trim()} size="sm" />
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">AI</div>
            <div className="bg-white dark:bg-gray-700 rounded-2xl px-4 py-2.5 text-gray-400">
              <span className="animate-pulse">···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Piši na španskom..."
          className="flex-1 border-2 rounded-xl px-4 py-2.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-emerald-400"
        />
        <Button onClick={send} disabled={loading || !input.trim()} size="sm">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
