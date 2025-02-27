"use client";

import { AlertCircle } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";

interface ErrorMessageProps {
  errorCode: string;
  variant?: "default" | "form";
}

export const ErrorMessage = ({ errorCode, variant = "default" }: ErrorMessageProps) => {
  const { t } = useTranslate();
  const message = t(`errors.${errorCode}`);

  if (variant === "form") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center gap-2 rounded-md bg-destructive/15 p-2.5 text-sm text-destructive"
      >
        <AlertCircle className="h-4 w-4" />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="relative overflow-hidden rounded-lg border border-destructive/50 bg-background p-6 shadow-lg dark:border-destructive/30 dark:bg-destructive/5"
    >
      <div className="absolute inset-0 bg-destructive/5 dark:bg-gradient-to-b dark:from-destructive/10 dark:to-destructive/5" />

      <div className="relative flex items-start gap-4">
        <div className="rounded-full bg-destructive/10 p-2 dark:bg-destructive/30">
          <AlertCircle className="h-5 w-5 text-destructive dark:text-red-400" />
        </div>

        <div className="flex-1">
          <h3 className="mb-1 font-medium text-destructive dark:text-red-400">
            Une erreur est survenue
          </h3>
          <p className="text-sm text-destructive/90 dark:text-red-300/90">{message}</p>
        </div>
      </div>
    </div>
  );
};
