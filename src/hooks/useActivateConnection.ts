"use client";

import { useCallback, useState } from "react";
import { activateConnection } from "@/app/actions/connections";
import type { ActionResult } from "@/lib/actions/action-runner";
import type { UnifiedConnection } from "@/lib/connections/client";
import { ERROR_CODES } from "@/constants/errorCodes";

export type ActivateConnectionResult = ActionResult<{ name: string }>;

function reloadPage(): void {
  window.location.reload();
}

/**
 * Seule politique d'activation d'une connexion côté client (ADR 0030).
 *
 * La connexion active vit dans un cookie HTTP-only. Un `router.refresh()` peut
 * conserver des segments RSC streamés pour l'ancien cookie (notamment en
 * développement) : après une activation réussie, on recharge donc toute la
 * route pour que chaque Server Component soit rendu avec la nouvelle connexion.
 * `pendingKey` reste posé jusqu'au rechargement, pour que l'UI garde son état
 * occupé ; il est remis à `null` sur échec.
 *
 * `reload` n'est injectable que pour les tests.
 */
export function useActivateConnection(reload: () => void = reloadPage) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const activate = useCallback(
    async (connection: UnifiedConnection): Promise<ActivateConnectionResult> => {
      setPendingKey(connection.key);
      let result: ActivateConnectionResult;
      try {
        result = await activateConnection({ provider: connection.provider, id: connection.id });
      } catch {
        result = {
          success: false,
          code: ERROR_CODES.CONFIG.ACTIVATE_ERROR,
          message: "Connection activation request failed",
        };
      }

      if (result.success) {
        reload();
      } else {
        setPendingKey(null);
      }
      return result;
    },
    [reload]
  );

  return { activate, pendingKey };
}
