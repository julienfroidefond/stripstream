"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "role" | "aria-checked"> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, checked, defaultChecked, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      onCheckedChange?.(event.target.checked);
    };

    return (
      <div className="relative inline-flex h-[24px] w-[44px] flex-shrink-0 cursor-pointer items-center rounded-full">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={handleChange}
          className={cn(
            "peer h-[24px] w-[44px] cursor-pointer appearance-none rounded-full border-2 border-transparent transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "bg-input checked:bg-primary",
            className
          )}
          role="switch"
          aria-checked={checked ?? defaultChecked ?? false}
          {...props}
        />
        <span className={cn(
          "pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          "peer-checked:translate-x-5"
        )} />
      </div>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
