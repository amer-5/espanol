"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { BookmarkPlus, Copy, Volume2, X } from "lucide-react";
import { getUserId } from "@/lib/progress";
import { speak } from "@/lib/tts";

interface MenuState {
  x: number;
  y: number;
  text: string;
}

export default function SelectionMenu({ lessonId }: { lessonId?: string }) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    setMenu(null);
    setSaved(false);
  }, []);

  const onSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 2) { setMenu(null); return; }

    const range = sel?.getRangeAt(0);
    if (!range) return;
    const rect = range.getBoundingClientRect();
    // Position above selection, centered
    setMenu({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY - 8,
      text,
    });
    setSaved(false);
  }, []);

  useEffect(() => {
    const onMouseUp = () => setTimeout(onSelectionChange, 10);
    const onTouchEnd = () => setTimeout(onSelectionChange, 200);
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) onSelectionChange();
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("keyup", onKeyUp);

    // Dismiss on outside click
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };
    document.addEventListener("mousedown", onMouseDown);

    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [onSelectionChange, dismiss]);

  // Block default context menu on lesson content
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const sel = window.getSelection()?.toString().trim();
      if (sel && sel.length > 0) e.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  const addNote = async () => {
    if (!menu || saving) return;
    setSaving(true);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getUserId(),
          selectedText: menu.text,
          lessonId,
        }),
      });
      setSaved(true);
      setTimeout(dismiss, 1200);
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    if (!menu) return;
    navigator.clipboard.writeText(menu.text);
    dismiss();
  };

  const tts = () => {
    if (!menu) return;
    speak(menu.text);
    dismiss();
  };

  if (!menu) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] flex items-center gap-1 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl px-2 py-1.5 text-xs border border-gray-700"
      style={{
        left: menu.x,
        top: menu.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      {saved ? (
        <span className="px-2 py-1 text-emerald-400 font-medium">✓ Dodano!</span>
      ) : (
        <>
          <button
            onClick={addNote}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            {saving ? "Čuvam..." : "Bilješke"}
          </button>
          <div className="w-px h-4 bg-gray-600" />
          <button
            onClick={tts}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-blue-600 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            TTS
          </button>
          <div className="w-px h-4 bg-gray-600" />
          <button
            onClick={copy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-gray-600 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            Kopiraj
          </button>
          <div className="w-px h-4 bg-gray-600" />
          <button onClick={dismiss} className="p-1.5 rounded-xl hover:bg-gray-600 cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </>
      )}
      {/* Arrow */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-gray-800" />
    </div>
  );
}
