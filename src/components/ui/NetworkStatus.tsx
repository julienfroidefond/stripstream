"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff } from "lucide-react";

export function NetworkStatus() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
      <WifiOff className="h-4 w-4" />
      <span>Hors ligne</span>
    </div>
  );
}
