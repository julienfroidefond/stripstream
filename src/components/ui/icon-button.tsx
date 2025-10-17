import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends Omit<ButtonProps, "children"> {
  icon: LucideIcon;
  label?: string;
  tooltip?: string;
  iconClassName?: string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, label, tooltip, iconClassName, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(label ? "" : "aspect-square", className)}
        aria-label={tooltip || label}
        title={tooltip}
        {...props}
      >
        <Icon className={cn("h-4 w-4", label && "mr-2", iconClassName)} />
        {label && <span>{label}</span>}
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";

export { IconButton };

