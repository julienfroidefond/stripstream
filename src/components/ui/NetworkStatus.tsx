"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff } from "lucide-react";

export function NetworkStatus() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed right-4 top-[calc(4.5rem+env(safe-area-inset-top,0px))] z-[110] flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-destructive-foreground shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1">
      <WifiOff className="h-4 w-4" />
      <span>Hors ligne</span>
    </div>
  );
}
