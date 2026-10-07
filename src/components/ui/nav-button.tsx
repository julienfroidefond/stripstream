import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  count?: number;
}

const NavButton = React.forwardRef<HTMLButtonElement, NavButtonProps>(
  ({ icon: Icon, label, active, count, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground",
          active && "bg-accent text-accent-foreground shadow-sm",
          className
        )}
        {...props}
      >
        <div className="flex items-center">
          <Icon className="mr-2 h-4 w-4" />
          <span className="truncate">{label}</span>
        </div>
        {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
      </button>
    );
  }
);

NavButton.displayName = "NavButton";

export { NavButton };
