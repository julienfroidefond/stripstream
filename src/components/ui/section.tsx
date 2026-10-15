"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_PROJECTION, maskUp } from "@/lib/motion";
import { VIEWPORT_MARGIN } from "@/components/motion";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  icon?: LucideIcon;
  description?: string;
  actions?: React.ReactNode;
  headerClassName?: string;
  titleClassName?: string;
  iconClassName?: string;
}

const headerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const iconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85, rotate: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.45, ease: EASE_PROJECTION },
  },
};

const Section = React.forwardRef<HTMLElement, SectionProps>(
  (
    {
      title,
      icon: Icon,
      description,
      actions,
      children,
      className,
      headerClassName,
      titleClassName,
      iconClassName,
      ...props
    },
    ref
  ) => {
    const reduce = useReducedMotion();
    const motionProps = reduce
      ? {}
      : {
          variants: headerVariants,
          initial: "hidden" as const,
          whileInView: "visible" as const,
          viewport: { once: true, amount: 0.6, margin: VIEWPORT_MARGIN },
        };

    return (
      <section ref={ref} className={cn("space-y-4", className)} {...props}>
        {(title || actions) && (
          <motion.div
            className={cn("flex items-center justify-between", headerClassName)}
            {...motionProps}
          >
            {title && (
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <motion.span variants={reduce ? undefined : iconVariants} className="inline-flex">
                    <Icon
                      aria-hidden
                      className={cn("h-5 w-5 text-muted-foreground", iconClassName)}
                    />
                  </motion.span>
                )}
                <div>
                  <span className="block overflow-hidden pb-0.5">
                    <motion.h2
                      variants={reduce ? undefined : maskUp}
                      className={cn(
                        "font-display text-2xl font-semibold tracking-tight",
                        titleClassName
                      )}
                    >
                      {title}
                    </motion.h2>
                  </span>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  )}
                </div>
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </motion.div>
        )}
        {children}
      </section>
    );
  }
);

Section.displayName = "Section";

export { Section };
