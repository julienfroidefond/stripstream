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
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction pour simuler une progression graduelle
  const simulateProgress = useCallback(
    (requestId: string, start: number, end: number) => {
      let current = start;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      progressIntervalRef.current = setInterval(() => {
        if (current < end) {
          current = Math.min(current + Math.random() * 2, end);
          if (requestId === currentRequestId.current) {
            updateProgress(requestId, current);
          }
        } else {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }, 200);
    },
    [updateProgress]
  );

  useEffect(() => {
    // Si on a un requestId en cours, c'est que la navigation est terminée
    if (currentRequestId.current) {
      updateProgress(currentRequestId.current, 100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setTimeout(() => {
        if (currentRequestId.current) {
          completeProgress(currentRequestId.current);
          currentRequestId.current = null;
        }
      }, 100);
    }

    // Cleanup
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [pathname, searchParams, updateProgress, completeProgress]);

  const executeRequest = useCallback(
    async <T>(requestFn: () => Promise<T>): Promise<T> => {
      // On démarre un nouveau requestId uniquement si on n'en a pas déjà un
      if (!currentRequestId.current) {
        currentRequestId.current = Math.random().toString(36).substring(7);
        startProgress(currentRequestId.current);

        // Création d'un nouveau AbortController pour cette requête
        abortControllerRef.current = new AbortController();

        // On commence à 10% et on simule jusqu'à 30%
        updateProgress(currentRequestId.current, 10);
        simulateProgress(currentRequestId.current, 10, 30);
      }

      try {
        // On wrap la fonction de requête pour intercepter les appels fetch
        const wrappedFn = async () => {
          const originalFetch = window.fetch;
          window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            if (!currentRequestId.current) return originalFetch(input, init);

            // On passe à 40% quand la requête démarre
            updateProgress(currentRequestId.current, 40);
            simulateProgress(currentRequestId.current, 40, 80);

            const response = await originalFetch(input, {
              ...init,
              signal: abortControllerRef.current?.signal,
            });

            // On passe à 90% quand la requête est terminée
            updateProgress(currentRequestId.current, 90);
            simulateProgress(currentRequestId.current, 90, 95);

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
        // En cas d'erreur, on nettoie tout
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
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
    [startProgress, updateProgress, completeProgress, simulateProgress]
  );

  return { executeRequest };
}
