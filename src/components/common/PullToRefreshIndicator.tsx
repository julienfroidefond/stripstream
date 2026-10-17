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

/**
 * Centering note: the wrapper is `inset-x-0` + `flex justify-center`, not
 * `left-1/2 -translate-x-1/2`. Tailwind v4 emits the latter through the CSS
 * `translate` property, which composes with (instead of replacing) an inline
 * `transform` — combining both shifted the indicator one full width to the
 * left. The inner column has a fixed width, so the bar, the icon and the
 * message share the same horizontal axis even when the label is wider than
 * the bar (iOS font boosting, narrow viewports).
 */
export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  progress,
  canRefresh,
  isHiding,
}: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing && !isHiding) return null;

  const rotation = progress * 180;
  const visible = (isPulling || isRefreshing) && !isHiding;
  const offsetY = visible ? (isRefreshing ? 60 : progress * 60) : -100;
  const fillWidth = isRefreshing ? 100 : Math.min(Math.max(progress, 0), 1) * 100;

  return (
    <div
      data-testid="pull-to-refresh-indicator"
      aria-hidden={!visible}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center transition-[transform,opacity]",
        isHiding ? "duration-300 ease-out" : "duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
      style={{ transform: `translateY(${offsetY}px)` }}
    >
      <div className="flex w-48 flex-col items-center">
        {/* Barre de fond */}
        <div
          data-testid="pull-to-refresh-bar"
          className="h-1 w-48 overflow-hidden rounded-full bg-muted"
        >
          {/* Barre de progression */}
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-200",
              canRefresh || isRefreshing ? "bg-primary" : "bg-muted-foreground"
            )}
            style={{ width: `${fillWidth}%` }}
          />
        </div>

        {/* Icône centrée */}
        <div className="mt-2 flex justify-center">
          <div
            data-testid="pull-to-refresh-icon"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200",
              canRefresh || isRefreshing
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isRefreshing && "animate-spin"
              )}
              style={{
                transform: isRefreshing ? "rotate(0deg)" : `rotate(${rotation}deg)`,
                animationDuration: isRefreshing ? "2s" : undefined,
              }}
            />
          </div>
        </div>

        {/* Message */}
        <div
          data-testid="pull-to-refresh-message"
          className={cn(
            "mt-2 w-max max-w-[85vw] text-center text-xs transition-opacity duration-200",
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
    </div>
  );
}
