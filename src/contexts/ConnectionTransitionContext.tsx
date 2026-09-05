"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface ConnectionTransitionContextValue {
  isSwitchingConnection: boolean;
  beginConnectionSwitch: () => void;
  cancelConnectionSwitch: () => void;
}

const ConnectionTransitionContext = createContext<ConnectionTransitionContextValue | null>(null);

export function ConnectionTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  const isSwitchingConnection = pendingLocation === locationKey;

  // Once navigation commits a different location, this becomes false without
  // an extra state update. The route's Suspense boundaries then take over.
  const beginConnectionSwitch = useCallback(() => setPendingLocation(locationKey), [locationKey]);
  const cancelConnectionSwitch = useCallback(() => setPendingLocation(null), []);

  const value = useMemo(
    () => ({
      isSwitchingConnection,
      beginConnectionSwitch,
      cancelConnectionSwitch,
    }),
    [beginConnectionSwitch, cancelConnectionSwitch, isSwitchingConnection]
  );

  return (
    <ConnectionTransitionContext.Provider value={value}>
      {children}
    </ConnectionTransitionContext.Provider>
  );
}

export function useConnectionTransition() {
  const context = useContext(ConnectionTransitionContext);
  if (!context) {
    throw new Error("useConnectionTransition must be used within ConnectionTransitionProvider");
  }
  return context;
}
