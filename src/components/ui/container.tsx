import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const containerVariants = cva("mx-auto px-4 sm:px-6 lg:px-8", {
  variants: {
    size: {
      default: "max-w-screen-2xl",
      narrow: "max-w-4xl",
      wide: "max-w-screen-3xl",
      full: "max-w-full",
    },
    spacing: {
      none: "",
      sm: "py-4",
      default: "py-8",
      lg: "py-12",
    },
  },
  defaultVariants: {
    size: "default",
    spacing: "default",
  },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: React.ElementType;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, spacing, as: Component = "div", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(containerVariants({ size, spacing }), className)}
        {...props}
      />
    );
  }
);

Container.displayName = "Container";

export { Container, containerVariants };

