import { getUnitTest } from "@/lib/lessons";
import TestPlayer from "@/components/lesson/TestPlayer";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const test = getUnitTest(id);

  if (!test) notFound();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <ChevronLeft className="w-4 h-4" />
            Nazad
          </Link>
        </div>
        <TestPlayer test={test} />
      </div>
    </div>
  );
}
