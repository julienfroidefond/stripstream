"use client";

import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  count?: number;
  /**
   * Identifiant partagé par les entrées d'une même liste : le fond actif
   * glisse d'une entrée à l'autre au lieu de sauter.
   */
  activeLayoutId?: string;
}

/**
 * Dernier bouton actif de chaque liste. Quand une autre entrée devient
 * active, son fond part de la position de celle-ci (FLIP) puis se pose.
 */
const lastActive = new Map<string, HTMLButtonElement>();

const NavButton = React.forwardRef<HTMLButtonElement, NavButtonProps>(
  ({ icon: Icon, label, active, count, activeLayoutId, className, ...props }, ref) => {
    const reduce = usePrefersReducedMotion();
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const backgroundRef = React.useRef<HTMLSpanElement>(null);
    const markerRef = React.useRef<HTMLSpanElement>(null);

    const setRefs = React.useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    useGSAP(
      () => {
        const button = buttonRef.current;
        if (!active || !button) return;
        const still = reduce || prefersReducedMotion();
        const timeline = gsap.timeline({ defaults: { ease: "projection" } });

        const background = backgroundRef.current;
        if (activeLayoutId && background) {
          const previous = lastActive.get(activeLayoutId);
          lastActive.set(activeLayoutId, button);
          if (!still && previous && previous !== button && previous.isConnected) {
            const from = previous.getBoundingClientRect();
            const to = button.getBoundingClientRect();
            if (to.width > 0 && to.height > 0) {
              timeline.fromTo(
                background,
                {
                  x: from.left - to.left,
                  y: from.top - to.top,
                  scaleX: from.width / to.width,
                  scaleY: from.height / to.height,
                  transformOrigin: "0% 0%",
                },
                { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.28 },
                0
              );
            }
          }
        }

        if (!still && markerRef.current) {
          timeline.fromTo(
            markerRef.current,
            { scaleY: 0, opacity: 0 },
            { scaleY: 1, opacity: 1, duration: 0.4, ease: "back.out(2.4)" },
            0.08
          );
        }

        return () => timeline.kill();
      },
      { dependencies: [active, activeLayoutId, reduce] }
    );

    return (
      <button
        ref={setRefs}
        className={cn(
          "group relative w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          active ? "text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
          className
        )}
        {...props}
      >
        {active && (
          <span
            ref={backgroundRef}
            aria-hidden
            className="absolute inset-0 rounded-lg bg-accent"
          />
        )}
        {active && (
          <span
            ref={markerRef}
            aria-hidden
            className="absolute left-0 top-[calc(50%-10px)] h-5 w-1 rounded-r-full bg-primary"
          />
        )}
        <div className="relative flex items-center">
          <span className="inline-flex transition-transform duration-200 ease-out group-hover:translate-x-0.5">
            <Icon className="mr-2 h-4 w-4" />
          </span>
          <span className="truncate">{label}</span>
        </div>
        {count !== undefined && (
          <span className="relative text-xs text-muted-foreground">{count}</span>
        )}
      </button>
    );
  }
);

NavButton.displayName = "NavButton";

export { NavButton };
