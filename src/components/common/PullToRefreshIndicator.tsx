"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  progress: number;
  canRefresh: boolean;
  isHiding: boolean;
}

export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  progress,
  canRefresh,
  isHiding,
}: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing && !isHiding) return null;

  const rotation = progress * 180;
  const barWidth = Math.min(progress * 200, 200); // Barre de 200px max

  return (
    <div
      className={cn(
        "fixed top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all",
        isHiding ? "duration-300 ease-out" : "duration-200",
        (isPulling || isRefreshing) && !isHiding
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0"
      )}
      style={{
        transform: `translate(-50%, ${(isPulling || isRefreshing) && !isHiding ? (isRefreshing ? 60 : progress * 60) : -100}px)`,
      }}
    >
      {/* Barre de fond */}
      <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
        {/* Barre de progression */}
        <div
          className={cn(
            "h-full transition-all duration-200 rounded-full",
            canRefresh || isRefreshing ? "bg-primary" : "bg-muted-foreground"
          )}
          style={{
            width: `${isRefreshing ? 200 : barWidth}px`,
          }}
        />
      </div>

      {/* Icône centrée */}
      <div className="flex justify-center mt-2">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
            canRefresh || isRefreshing
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <RefreshCw
            className={cn("h-4 w-4 transition-all duration-200", isRefreshing && "animate-spin")}
            style={{
              transform: isRefreshing ? "rotate(0deg)" : `rotate(${rotation}deg)`,
              animationDuration: isRefreshing ? "2s" : undefined,
            }}
          />
        </div>
      </div>

      {/* Message */}
      <div
        className={cn(
          "mt-2 text-center text-xs transition-opacity duration-200",
          canRefresh || isRefreshing
            ? "text-primary opacity-100"
            : "text-muted-foreground opacity-70"
        )}
      >
        {isRefreshing
          ? "Actualisation..."
          : canRefresh
            ? "Relâchez pour actualiser"
            : "Tirez pour actualiser"}
      </div>
    </div>
  );
}
