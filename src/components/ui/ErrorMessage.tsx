"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";
import { Button } from "@/components/ui/button";
import logger from "@/lib/logger";

interface ErrorMessageProps {
  errorCode: string;
  error?: Error;
  variant?: "default" | "form";
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorMessage = ({
  errorCode,
  error,
  variant = "default",
  onRetry,
  retryLabel,
}: ErrorMessageProps) => {
  const { t } = useTranslate();
  const message = t(`errors.${errorCode}`);

  if (error) {
    logger.error(error);
  }

  if (variant === "form") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center gap-2 rounded-md bg-destructive/15 p-2.5 text-sm text-destructive"
      >
        <AlertCircle className="h-4 w-4" />
        <p>{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="ghost" size="sm" className="ml-auto">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="relative overflow-hidden rounded-lg border border-destructive/50 bg-card p-6 dark:border-destructive/30"
    >
      <div className="absolute inset-0 bg-destructive/5" />

      <div className="relative flex items-start gap-4">
        <div className="rounded-full bg-destructive/10 p-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>

        <div className="flex-1">
          <h3 className="mb-1 font-medium text-destructive">
            {t("errors.GENERIC_ERROR")}
          </h3>
          <p className="text-sm text-muted-foreground">{message}</p>

          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-4 border-destructive/30 hover:bg-destructive/10"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryLabel || t("common.retry")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
