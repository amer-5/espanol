"use client";
import { useEffect, useState, useRef } from "react";
import { getUserId } from "@/lib/progress";
import { speak } from "@/lib/tts";
import { Trash2, Volume2, BookOpen, ArrowLeft, Plus, Loader2 } from "lucide-react";
import Link from "next/link";

interface Note {
  id: number;
  selectedText: string;
  translation: string | null;
  lessonId: string | null;
  createdAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userId = getUserId();
    fetch(`/api/notes?userId=${userId}`)
      .then((r) => r.json())
      .then(({ notes }) => setNotes(notes ?? []))
      .finally(() => setLoading(false));
  }, []);

  const addManual = async () => {
    if (!inputText.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId(), selectedText: inputText.trim() }),
      });
      if (res.ok) {
        const { note } = await res.json();
        setNotes((n) => [note, ...n]);
        setInputText("");
        inputRef.current?.focus();
      }
    } finally {
      setAdding(false);
    }
  };

  const deleteNote = async (id: number) => {
    const userId = getUserId();
    await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userId }),
    });
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            Moje bilješke
          </h1>
          <p className="text-sm text-gray-400">{notes.length} sačuvanih fraza</p>
        </div>
      </div>

      {/* Manual input */}
      <div className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addManual()}
          placeholder="Upiši špansku riječ ili frazu..."
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 text-gray-900 dark:text-white"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={addManual}
          disabled={!inputText.trim() || adding}
          className="w-12 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      {loading && (
        <div className="text-center text-gray-400 py-12 animate-pulse">Učitavam...</div>
      )}

      {!loading && notes.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-gray-500">Nemaš još bilješki.</p>
          <p className="text-sm text-gray-400 mt-1">Selektuj tekst u lekciji i tapni "Bilješke".</p>
        </div>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white text-base">{note.selectedText}</p>
                {note.translation && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">= {note.translation}</p>
                )}
                {note.lessonId && (
                  <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{note.lessonId}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => speak(note.selectedText)}
                  className="p-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
