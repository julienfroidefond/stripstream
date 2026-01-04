"use client";

import { createContext, useContext, type ReactNode } from "react";

interface RefreshContextType {
  refreshLibrary?: (libraryId: string) => Promise<{ success: boolean; error?: string }>;
  refreshSeries?: (seriesId: string) => Promise<{ success: boolean; error?: string }>;
}

const RefreshContext = createContext<RefreshContextType>({});

export function RefreshProvider({
  children,
  refreshLibrary,
  refreshSeries,
}: {
  children: ReactNode;
  refreshLibrary?: (libraryId: string) => Promise<{ success: boolean; error?: string }>;
  refreshSeries?: (seriesId: string) => Promise<{ success: boolean; error?: string }>;
}) {
  return (
    <RefreshContext.Provider value={{ refreshLibrary, refreshSeries }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}

