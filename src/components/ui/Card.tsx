import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "highlighted" | "success" | "error";
}

export default function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 shadow-sm",
        {
          "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700": variant === "default",
          "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700": variant === "highlighted",
          "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700": variant === "success",
          "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700": variant === "error",
        },
        className
      )}
      {...props}
    />
  );
}
