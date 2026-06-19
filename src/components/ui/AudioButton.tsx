"use client";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";

interface AudioButtonProps {
  text: string;
  lang?: string;
  className?: string;
  size?: "sm" | "md";
}

export default function AudioButton({ text, lang = "es-ES", className, size = "md" }: AudioButtonProps) {
  return (
    <button
      onClick={() => speak(text, lang)}
      aria-label={`Izgovor: ${text}`}
      title="Klikni za izgovor"
      className={cn(
        "cursor-pointer rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors active:scale-90",
        size === "sm" ? "p-1.5" : "p-2",
        className
      )}
    >
      <Volume2 className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
    </button>
  );
}
