"use client";

import { useNetworkProgress, simulateProgress } from "@/components/ui/network-progress";
import { useCallback } from "react";

export function useNetworkRequest() {
  const { startProgress, updateProgress, completeProgress } = useNetworkProgress();

  const executeRequest = useCallback(
    async <T>(requestFn: () => Promise<T>): Promise<T> => {
      const requestId = Math.random().toString(36).substring(7);

      try {
        startProgress(requestId);

        // Démarrer la simulation de progression
        const progressPromise = simulateProgress(requestId, updateProgress, 500);

        // Exécuter la requête
        const result = await requestFn();

        // Attendre que la simulation soit terminée
        await progressPromise;

        // Forcer la progression à 100% avant de terminer
        updateProgress(requestId, 100);
        setTimeout(() => completeProgress(requestId), 100);

        return result;
      } catch (error) {
        // En cas d'erreur, on termine quand même la progression
        completeProgress(requestId);
        throw error;
      }
    },
    [startProgress, updateProgress, completeProgress]
  );

  return { executeRequest };
}
