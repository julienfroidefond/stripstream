"use client";

import { useEffect } from "react";

import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";
import { WallError } from "@/components/wall/WallError";

export default function WallRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error({ err: error, digest: error.digest }, "Le Wall : erreur de route");
  }, [error]);

  return <WallError code={ERROR_CODES.WALL.FETCH_ERROR} onRetry={reset} />;
}
