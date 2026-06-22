"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getLocalProgress } from "@/lib/progress";
import { speak } from "@/lib/tts";
import { ArrowLeft, Send, Volume2, Bot, Loader2, Mic, MicOff } from "lucide-react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type MicState = "idle" | "listening" | "processing";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [knownVocab, setKnownVocab] = useState<string[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [micState, setMicState] = useState<MicState>("idle");
  const [voiceMode, setVoiceMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    const progress = getLocalProgress();
    const completed = Object.entries(progress)
      .filter(([, v]) => v.status === "completed")
      .map(([id]) => id);
    setCompletedLessons(completed);

    if (completed.length > 0) {
      fetch(`/api/lesson-vocab?ids=${completed.join(",")}`)
        .then((r) => r.json())
        .then(({ vocab }) => setKnownVocab(vocab ?? []))
        .catch(() => {});
    }

    setMessages([{
      role: "assistant",
      content: completed.length > 0
        ? `Hola! 👋 Ja sam tvoj AI asistent za španski. Završio si ${completed.length} lekcij${completed.length === 1 ? "u" : completed.length < 5 ? "e" : "a"}. Možemo vježbati, prevoditi ili razgovarati. Šta bi volio? 😊`
        : `Hola! 👋 Ja sam tvoj AI asistent za španski. Mogu ti pomoći s osnovama, objašnjenjem ili prijevodima. Šta te zanima? 😊`,
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string, autoSpeak = false) => {
    if (!text.trim() || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, knownVocab, completedLessons }),
      });
      const { message } = await res.json();
      const reply = message ?? "...";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (autoSpeak) speak(reply);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Greška u konekciji. Pokušaj ponovo." }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, knownVocab, completedLessons]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage(text, voiceMode);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Prepoznavanje govora nije podržano. Koristi Chrome ili Safari.");
      return;
    }
    if (micState !== "idle") {
      recogRef.current?.stop();
      setMicState("idle");
      return;
    }

    setMicState("listening");
    const rec = new SR();
    // Detect language: if voice mode active listen in Spanish, else Bosnian/auto
    rec.lang = voiceMode ? "es-ES" : "bs";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recogRef.current = rec;

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setMicState("processing");
      sendMessage(transcript, voiceMode);
      setMicState("idle");
    };
    rec.onerror = () => setMicState("idle");
    rec.onend = () => setMicState((s) => s === "listening" ? "idle" : s);
    rec.start();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <Link href="/" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">AI Asistent</p>
          <p className="text-xs text-gray-400">Španski · Na osnovu tvojih lekcija</p>
        </div>
        {/* Voice mode toggle */}
        <button
          onClick={() => setVoiceMode((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            voiceMode
              ? "bg-emerald-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          {voiceMode ? "Glas ON" : "Glas OFF"}
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-emerald-500 text-white rounded-tr-sm"
                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-gray-700 rounded-tl-sm"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === "assistant" && (
                <button
                  onClick={() => speak(msg.content)}
                  className="mt-1.5 text-gray-400 hover:text-emerald-500 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mr-2 flex-shrink-0">
              <Bot className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {["Provjeri moj prijevod", "Predloži vježbu", "Kako se kaže...", "Objasni mi..."].map((s) => (
            <button
              key={s}
              onClick={() => { setInput(s); inputRef.current?.focus(); }}
              className="flex-shrink-0 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:border-emerald-400 transition-colors whitespace-nowrap cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        {/* Mic pulse indicator */}
        {micState === "listening" && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-gray-400">Slušam... {voiceMode ? "(Govori na španskom)" : "(Govori na bosanskom)"}</span>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Mic button */}
          <button
            onClick={startListening}
            disabled={loading || micState === "processing"}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
              micState === "listening"
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {micState === "listening" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={voiceMode ? "Ili ukucaj na španskom..." : "Pitaj nešto ili napiši na španskom..."}
            rows={1}
            className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 dark:text-white max-h-28 overflow-y-auto"
            style={{ lineHeight: "1.5" }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
