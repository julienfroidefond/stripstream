"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RefreshScope } from "@/lib/cache/invalidation";

export interface RefreshResult {
  success: boolean;
  error?: string;
}

export interface RefreshSurfaceValue {
  /** La surface revalidée, avec son identifiant de données. */
  scope: RefreshScope;
  id: string;
  /** Vrai pendant tout le cycle : invalidation, refresh et animation. */
  isRefreshing: boolean;
  /** Le seul point d'entrée : les appels concurrents partagent le même cycle. */
  refresh: () => Promise<RefreshResult>;
}

const RefreshContext = createContext<RefreshSurfaceValue | null>(null);

export function RefreshProvider({
  value,
  children,
}: {
  value: RefreshSurfaceValue;
  children: ReactNode;
}) {
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export function useRefreshSurface(): RefreshSurfaceValue {
  const value = useContext(RefreshContext);
  if (!value) {
    throw new Error("useRefreshSurface must be used within a RefreshSurface");
  }
  return value;
}
