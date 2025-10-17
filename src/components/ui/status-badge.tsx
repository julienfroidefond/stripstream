import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva("flex items-center gap-1", {
  variants: {
    status: {
      success: "bg-green-500/10 text-green-500 border-green-500/20",
      warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      error: "bg-red-500/10 text-red-500 border-red-500/20",
      info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      reading: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      unread: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    },
  },
  defaultVariants: {
    status: "info",
  },
});

export interface StatusBadgeProps
  extends Omit<BadgeProps, "variant">,
    VariantProps<typeof statusBadgeVariants> {
  icon?: LucideIcon;
  children: React.ReactNode;
}

const StatusBadge = ({ status, icon: Icon, children, className, ...props }: StatusBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </Badge>
  );
};

export { StatusBadge, statusBadgeVariants };

