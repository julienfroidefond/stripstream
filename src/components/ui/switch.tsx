"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "role" | "aria-checked"
> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, checked, defaultChecked, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      onCheckedChange?.(event.target.checked);
    };

    return (
      <div className="relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={handleChange}
          className={cn(
            "peer h-[24px] w-[44px] cursor-pointer appearance-none rounded-full border-2 border-transparent transition-colors",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "bg-input checked:bg-primary",
            className
          )}
          role="switch"
          aria-checked={checked ?? defaultChecked ?? false}
          {...props}
        />
        {/* Le curseur glisse sur un ressort et s'étire pendant l'appui, du côté
            opposé à sa destination (origine à gauche quand il part à droite). */}
        <span
          className={cn(
            "pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-background ring-0",
            "origin-left transition-[translate,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            "peer-checked:origin-right peer-checked:translate-x-[20px] peer-active:scale-x-[1.25]",
            "motion-reduce:transition-none"
          )}
        />
      </div>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
