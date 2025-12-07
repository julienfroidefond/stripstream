import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  icon?: LucideIcon;
  description?: string;
  actions?: React.ReactNode;
  headerClassName?: string;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  (
    { title, icon: Icon, description, actions, children, className, headerClassName, ...props },
    ref
  ) => {
    return (
      <section ref={ref} className={cn("space-y-4", className)} {...props}>
        {(title || actions) && (
          <div className={cn("flex items-center justify-between", headerClassName)}>
            {title && (
              <div className="flex items-center gap-2">
                {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
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
