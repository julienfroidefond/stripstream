"use client";

import { useNetworkProgress } from "@/components/ui/network-progress";
import { useCallback, useRef, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function useNetworkRequest() {
  const { startProgress, updateProgress, completeProgress } = useNetworkProgress();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRequestId = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Si on a un requestId en cours, c'est que la navigation est terminée
    if (currentRequestId.current) {
      updateProgress(currentRequestId.current, 100);
      setTimeout(() => {
        if (currentRequestId.current) {
          completeProgress(currentRequestId.current);
          currentRequestId.current = null;
        }
      }, 100);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [pathname, searchParams, updateProgress, completeProgress]);

  const executeRequest = useCallback(
    async <T>(requestFn: () => Promise<T>): Promise<T> => {
      if (!currentRequestId.current) {
        currentRequestId.current = Math.random().toString(36).substring(7);
        startProgress(currentRequestId.current);
        abortControllerRef.current = new AbortController();
      }

      try {
        const wrappedFn = async () => {
          const originalFetch = window.fetch;
          window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            if (!currentRequestId.current) return originalFetch(input, init);

            const response = await originalFetch(input, {
              ...init,
              signal: abortControllerRef.current?.signal,
            });

            return response;
          };

          try {
            return await requestFn();
          } finally {
            window.fetch = originalFetch;
          }
        };

        return await wrappedFn();
      } catch (error) {
        if (currentRequestId.current) {
          completeProgress(currentRequestId.current);
          currentRequestId.current = null;
        }
        if (abortControllerRef.current) {
          abortControllerRef.current = null;
        }
        throw error;
      }
    },
    [startProgress, updateProgress, completeProgress]
  );

  return { executeRequest };
}
