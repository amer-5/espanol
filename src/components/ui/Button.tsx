"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm": variant === "primary",
            "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600": variant === "secondary",
            "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700": variant === "ghost",
            "bg-red-500 text-white hover:bg-red-600": variant === "danger",
            "bg-green-500 text-white hover:bg-green-600": variant === "success",
          },
          {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2.5 text-base": size === "md",
            "px-6 py-3.5 text-lg": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export default Button;
