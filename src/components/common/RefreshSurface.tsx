"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { revalidateForRefresh } from "@/app/actions/refresh";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import {
  RefreshProvider,
  type RefreshResult,
  type RefreshSurfaceValue,
} from "@/contexts/RefreshContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import type { RefreshScope } from "@/lib/cache/invalidation";
import logger from "@/lib/logger";

const REFRESH_ANIMATION_MS = 400;

interface RefreshSurfaceProps {
  scope: RefreshScope;
  id: string;
  children: ReactNode;
  /** Désactive le geste quand la surface n'a pas de scroll vertical. */
  pullToRefresh?: boolean;
}

/**
 * Cycle unique d'un rafraîchissement manuel : invalidation serveur, pending,
 * pull-to-refresh et un seul `router.refresh()` par cycle. Les boutons ne
 * connaissent que le contexte ; ils ne recopient ni l'action ni l'identifiant.
 *
 * La clé interne remet le cycle à zéro quand la page change de scope ou d'id
 * (par exemple une navigation de bibliothèque à bibliothèque).
 */
export function RefreshSurface(props: RefreshSurfaceProps) {
  return (
    <RefreshSurfaceRuntime
      key={`${props.scope}:${props.id}`}
      {...props}
    />
  );
}

function RefreshSurfaceRuntime({
  scope,
  id,
  children,
  pullToRefresh = true,
}: RefreshSurfaceProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inFlight = useRef<Promise<RefreshResult> | null>(null);

  const refresh = useCallback((): Promise<RefreshResult> => {
    if (inFlight.current) return inFlight.current;

    const run = (async (): Promise<RefreshResult> => {
      setIsRefreshing(true);
      try {
        await revalidateForRefresh(scope, id);
        router.refresh();
        await new Promise((resolve) => setTimeout(resolve, REFRESH_ANIMATION_MS));
        return { success: true };
      } catch (error) {
        logger.error({ err: error, scope, id }, "Refresh failed");
        return { success: false };
      } finally {
        inFlight.current = null;
        setIsRefreshing(false);
      }
    })();

    inFlight.current = run;
    return run;
  }, [id, router, scope]);

  const handlePullRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const pull = usePullToRefresh({
    onRefresh: handlePullRefresh,
    enabled: pullToRefresh && !isRefreshing,
  });

  const value = useMemo<RefreshSurfaceValue>(
    () => ({ scope, id, isRefreshing, refresh }),
    [id, isRefreshing, refresh, scope]
  );

  return (
    <RefreshProvider value={value}>
      {pullToRefresh && (
        <PullToRefreshIndicator
          isPulling={pull.isPulling}
          isRefreshing={pull.isRefreshing || isRefreshing}
          progress={pull.progress}
          canRefresh={pull.canRefresh}
          isHiding={pull.isHiding}
        />
      )}
      {children}
    </RefreshProvider>
  );
}
