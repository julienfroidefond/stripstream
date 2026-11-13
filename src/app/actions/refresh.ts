"use server";

import { invalidateForRefresh, type RefreshScope } from "@/lib/cache/invalidation";
import { isValidRefreshTarget, REFRESH_RATE_LIMIT } from "@/lib/cache/refresh-target";
import { ActionError, runAction, type ActionResult } from "@/lib/actions/action-runner";
import { ERROR_CODES } from "@/constants/errorCodes";

export type { RefreshScope };

/**
 * Invalide le cache Next.js pour forcer un re-fetch au prochain router.refresh().
 * À appeler côté client avant router.refresh() sur les boutons / pull-to-refresh.
 * Passe par le runner comme toute action (ADR 0023) : session exigée, budget
 * par utilisateur, scope et identifiant validés avant toute invalidation.
 */
export async function revalidateForRefresh(scope: RefreshScope, id: string): Promise<ActionResult> {
  return runAction({
    name: "revalidateForRefresh",
    fallbackCode: ERROR_CODES.REFRESH.ERROR,
    logContext: { scope, id },
    requireUser: true,
    rateLimit: {
      key: ({ userId }) => `refresh:${userId}`,
      ...REFRESH_RATE_LIMIT,
    },
    guard: () => {
      if (!isValidRefreshTarget(scope, id)) {
        throw new ActionError(ERROR_CODES.REFRESH.INVALID_TARGET);
      }
    },
    execute: async () => {
      invalidateForRefresh(scope, id);
      return { message: "Cache invalidé" };
    },
  });
}
