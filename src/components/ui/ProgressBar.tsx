import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  color?: "emerald" | "blue" | "amber";
}

export default function ProgressBar({ value, className, color = "emerald" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          {
            "bg-emerald-500": color === "emerald",
            "bg-blue-500": color === "blue",
            "bg-amber-500": color === "amber",
          }
        )}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
