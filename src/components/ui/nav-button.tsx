"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_PROJECTION } from "@/lib/motion";

export interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  count?: number;
  /**
   * Identifiant partagé par les entrées d'une même liste : le fond actif
   * glisse d'une entrée à l'autre au lieu de sauter (layoutId framer-motion).
   */
  activeLayoutId?: string;
}

const NavButton = React.forwardRef<HTMLButtonElement, NavButtonProps>(
  ({ icon: Icon, label, active, count, activeLayoutId, className, ...props }, ref) => {
    const reduce = useReducedMotion();

    return (
      <button
        ref={ref}
        className={cn(
          "group relative w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          active ? "text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
          className
        )}
        {...props}
      >
        {active &&
          (activeLayoutId ? (
            <motion.span
              aria-hidden
              layoutId={activeLayoutId}
              className="absolute inset-0 rounded-lg bg-accent"
              transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_PROJECTION }}
            />
          ) : (
            <span aria-hidden className="absolute inset-0 rounded-lg bg-accent" />
          ))}
        {active && (
          <motion.span
            aria-hidden
            className="absolute left-0 top-[calc(50%-10px)] h-5 w-1 rounded-r-full bg-primary"
            initial={reduce ? false : { scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE_PROJECTION }}
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
