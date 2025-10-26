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
          <Button 
            onClick={onRetry}
            variant="ghost" 
            size="sm"
            className="ml-auto"
          >
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
      className="relative overflow-hidden rounded-lg border border-destructive/50 bg-background/80 backdrop-blur-md p-6 shadow-lg dark:border-destructive/30 dark:bg-destructive/5"
    >
      <div className="absolute inset-0 bg-destructive/5 dark:bg-gradient-to-b dark:from-destructive/10 dark:to-destructive/5" />

      <div className="relative flex items-start gap-4">
        <div className="rounded-full bg-destructive/10 p-2 dark:bg-destructive/30">
          <AlertCircle className="h-5 w-5 text-destructive dark:text-red-400" />
        </div>

        <div className="flex-1">
          <h3 className="mb-1 font-medium text-destructive dark:text-red-400">
            {t("errors.GENERIC_ERROR")}
          </h3>
          <p className="text-sm text-destructive/90 dark:text-red-300/90">{message}</p>
          
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
