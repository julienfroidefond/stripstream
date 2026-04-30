"use client";

import { useEffect } from "react";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";

export default function SeriesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error({ err: error, digest: error.digest }, "Series error boundary triggered");
  }, [error]);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <ErrorMessage errorCode={ERROR_CODES.SERIES.FETCH_ERROR} error={error} onRetry={reset} />
      </div>
    </main>
  );
}
