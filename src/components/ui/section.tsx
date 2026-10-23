"use client";

import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VIEWPORT_MARGIN } from "@/components/motion";
import { gsap, prefersReducedMotion, SplitText, useGsapEffect } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  icon?: LucideIcon;
  description?: string;
  actions?: React.ReactNode;
  headerClassName?: string;
  titleClassName?: string;
  iconClassName?: string;
}

/**
 * En-tête de rangée, même relief que le hero : l'icône tombe en place et
 * rebondit, les mots du titre basculent en 3D, puis le trait d'accent se
 * trace. Les états de départ sont en CSS (`[data-section-header]`) ; la
 * cascade joue une fois, quand l'en-tête entre dans la fenêtre.
 */
function useSectionHeaderReveal(
  ref: React.RefObject<HTMLDivElement | null>,
  title: string | undefined
) {
  const reduce = usePrefersReducedMotion();
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || reduce) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setRevealed(true);
        observer.disconnect();
      },
      { rootMargin: VIEWPORT_MARGIN, threshold: 0.6 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, reduce]);

  useGsapEffect(
    () => {
      const header = ref.current;
      if (!header || !header.hasAttribute("data-section-header")) return;
      const icon = header.querySelector<HTMLElement>("[data-section-icon]");
      const heading = header.querySelector<HTMLElement>("[data-section-title]");
      const line = header.querySelector<HTMLElement>("[data-section-line]");
      const parts = [icon, heading, line].filter((part): part is HTMLElement => Boolean(part));
      const settle = () => {
        header.removeAttribute("data-section-header");
        gsap.set(parts, { clearProps: "opacity,transform" });
      };

      if (reduce || prefersReducedMotion()) {
        settle();
        return;
      }
      if (!revealed) return;

      const split = heading ? SplitText.create(heading, { type: "words" }) : null;
      const timeline = gsap.timeline({
        onComplete: () => {
          split?.revert();
          settle();
        },
      });

      if (icon) {
        timeline.fromTo(
          icon,
          { opacity: 0, scale: 0.3, rotate: -60 },
          { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2.6)" },
          0
        );
      }
      if (heading && split) {
        timeline.set(heading, { opacity: 1 }, 0.06).fromTo(
          split.words,
          {
            opacity: 0,
            yPercent: 60,
            rotateX: -90,
            transformPerspective: 500,
            transformOrigin: "50% 100%",
          },
          {
            opacity: 1,
            yPercent: 0,
            rotateX: 0,
            duration: 0.5,
            ease: "back.out(2)",
            stagger: 0.05,
          },
          0.06
        );
      }
      if (line) {
        timeline.fromTo(
          line,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.45, ease: "projection" },
          0.3
        );
      }

      return () => {
        timeline.kill();
        split?.revert();
      };
    },
    { dependencies: [reduce, revealed, title] }
  );

  return !reduce;
}

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
    const headerRef = React.useRef<HTMLDivElement>(null);
    const staged = useSectionHeaderReveal(headerRef, title);

    return (
      <section ref={ref} className={cn("space-y-4", className)} {...props}>
        {(title || actions) && (
          <div
            ref={headerRef}
            className={cn("flex items-center justify-between", headerClassName)}
            {...(staged ? { "data-section-header": "" } : {})}
          >
            {title && (
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <span data-section-icon className="inline-flex">
                    <Icon
                      aria-hidden
                      className={cn("h-5 w-5 text-muted-foreground", iconClassName)}
                    />
                  </span>
                )}
                <div>
                  <h2
                    data-section-title
                    className={cn(
                      "font-display text-2xl font-semibold tracking-tight",
                      titleClassName
                    )}
                  >
                    {title}
                  </h2>
                  {/* Trait d'accent : il se trace une fois le titre posé. */}
                  <span
                    aria-hidden
                    data-section-line
                    className="mt-1.5 block h-[3px] w-10 origin-left rounded-full bg-primary"
                  />
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  )}
                </div>
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </section>
    );
  }
);

Section.displayName = "Section";

export { Section };
