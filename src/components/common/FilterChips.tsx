"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterChipItem<T extends string = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
  /** Quand il est fourni, le filtre devient un lien de navigation. */
  href?: string;
}

interface FilterChipsProps<T extends string> {
  items: FilterChipItem<T>[];
  value: T;
  onChange?: (value: T) => void;
  ariaLabel: string;
  testIdPrefix?: string;
  className?: string;
}

export function FilterChips<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  testIdPrefix,
  className,
}: FilterChipsProps<T>) {
  const isNavigation = items.length > 0 && items.every((item) => item.href);
  const wrapperClassName = cn("flex flex-wrap gap-1.5", className);

  const chips = items.map((item) => {
    const Icon = item.icon;
    const active = value === item.value;
    const testId = testIdPrefix ? `${testIdPrefix}-${item.value}` : undefined;

    const content = (
      <>
        {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
        {item.label}
        {typeof item.count === "number" && (
          <span
            className={cn(
              "ml-1.5 tabular-nums",
              active ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {item.count}
          </span>
        )}
      </>
    );

    if (item.href) {
      return (
        <Button key={item.value} asChild variant={active ? "default" : "ghost"} size="sm">
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-testid={testId}
          >
            {content}
          </Link>
        </Button>
      );
    }

    return (
      <Button
        key={item.value}
        type="button"
        variant={active ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange?.(item.value)}
        aria-pressed={active}
        data-testid={testId}
      >
        {content}
      </Button>
    );
  });

  if (isNavigation) {
    return (
      <nav aria-label={ariaLabel} className={wrapperClassName}>
        {chips}
      </nav>
    );
  }

  return (
    <div role="group" aria-label={ariaLabel} className={wrapperClassName}>
      {chips}
    </div>
  );
}
