import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva("flex items-center gap-1", {
  variants: {
    status: {
      success: "bg-[hsl(var(--chart-4)/0.14)] text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4)/0.3)]",
      warning: "bg-[hsl(var(--chart-2)/0.16)] text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2)/0.3)]",
      error: "bg-destructive/10 text-destructive border-destructive/30",
      info: "bg-primary/10 text-primary border-primary/30",
      reading: "bg-primary/10 text-primary border-primary/30",
      unread: "bg-[hsl(var(--chart-2)/0.16)] text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2)/0.3)]",
    },
  },
  defaultVariants: {
    status: "info",
  },
});

export interface StatusBadgeProps
  extends Omit<BadgeProps, "variant">, VariantProps<typeof statusBadgeVariants> {
  icon?: LucideIcon;
  children: React.ReactNode;
}

const StatusBadge = ({ status, icon: Icon, children, className, ...props }: StatusBadgeProps) => {
  return (
    <Badge variant="outline" className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </Badge>
  );
};

export { StatusBadge, statusBadgeVariants };
