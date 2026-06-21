import { getCurriculum } from "@/lib/lessons";
import CourseMap from "@/components/navigation/CourseMap";
import Link from "next/link";
import { BookOpen, Flame, RotateCcw, NotebookPen } from "lucide-react";

export default function HomePage() {
  const curriculum = getCurriculum();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top nav */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇪🇸</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Español</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">A1 → B1 · Bosanski</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/srs"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ponavljanje
            </Link>
          </div>
        </div>
      </header>

      {/* Daily goal banner */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white mb-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-lg">Dnevni cilj 🎯</p>
              <p className="text-sm opacity-90 mt-1">1 nova lekcija + ponavljanje vokabulara</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-2">
              <Flame className="w-4 h-4" />
              <span className="font-bold text-sm" id="streak-count">-</span>
              <span className="text-xs opacity-80">dan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Course map */}
      <CourseMap curriculum={curriculum} />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 z-20">
        <div className="max-w-2xl mx-auto flex">
          <Link href="/" className="flex-1 flex flex-col items-center py-3 text-emerald-600 dark:text-emerald-400">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs mt-0.5 font-medium">Lekcije</span>
          </Link>
          <Link href="/srs" className="flex-1 flex flex-col items-center py-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <RotateCcw className="w-5 h-5" />
            <span className="text-xs mt-0.5">Ponavljanje</span>
          </Link>
          <Link href="/notes" className="flex-1 flex flex-col items-center py-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <NotebookPen className="w-5 h-5" />
            <span className="text-xs mt-0.5">Bilješke</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
