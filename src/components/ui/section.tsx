"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { drawLine } from "@/lib/motion";
import { SplitWords, VIEWPORT_MARGIN } from "@/components/motion";

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
  visible: { transition: { staggerChildren: 0.08 } },
};

/** L'icône tombe en place et rebondit : le titre qui suit s'appuie sur elle. */
const iconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.3, rotate: -60 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 380, damping: 16, mass: 0.8 },
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
                  <h2
                    className={cn(
                      "font-display text-2xl font-semibold tracking-tight",
                      titleClassName
                    )}
                  >
                    <SplitWords text={title} />
                  </h2>
                  {/* Trait d'accent : il se trace une fois le titre posé. */}
                  <motion.span
                    aria-hidden
                    variants={reduce ? undefined : drawLine}
                    className="mt-1.5 block h-[3px] w-10 origin-left rounded-full bg-primary"
                  />
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
