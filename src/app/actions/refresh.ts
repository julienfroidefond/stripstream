"use server";

import { invalidateForRefresh, type RefreshScope } from "@/lib/cache/invalidation";

export type { RefreshScope };

/**
 * Invalide le cache Next.js pour forcer un re-fetch au prochain router.refresh().
 * À appeler côté client avant router.refresh() sur les boutons / pull-to-refresh.
 */
export async function revalidateForRefresh(scope: RefreshScope, id: string): Promise<void> {
  invalidateForRefresh(scope, id);
}
