"use client";

import React, { createContext, useContext, useMemo } from "react";
import { normalizeStorageScope } from "@/lib/storage";

const UserScopeContext = createContext<string | undefined>(undefined);

/**
 * Exposes the signed-in user's id to client components that persist state in
 * `localStorage`. The value comes from the server layout (`getCurrentUser`), so
 * it is never guessed from client-side state, and two accounts sharing the
 * same browser profile get distinct storage namespaces.
 */
export function UserScopeProvider({
  scope,
  children,
}: {
  scope: string | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => normalizeStorageScope(scope), [scope]);

  return <UserScopeContext.Provider value={value}>{children}</UserScopeContext.Provider>;
}

export function useUserScope(): string {
  const scope = useContext(UserScopeContext);

  if (!scope) {
    throw new Error("useUserScope must be used within a UserScopeProvider");
  }

  return scope;
}
