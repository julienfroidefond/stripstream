"use client";

import { useMemo, useState } from "react";
import { BookMarked } from "lucide-react";
import { BookCoverScene } from "@/components/ui/book-cover-scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { StripstreamAdapter } from "@/lib/providers/stripstream/stripstream.adapter";
import { cn } from "@/lib/utils";

interface ReadingListCoverStackProps {
  covers: string[];
  active: boolean;
  className?: string;
}

const MAX_VISIBLE_COVERS = 3;

/**
 * Aperçu d'une liste de lecture : la première série sert de livre, les deux
 * suivantes restent derrière et s'écartent au survol. Cela montre d'un coup
 * d'œil qu'une liste rassemble plusieurs séries, sans perdre l'effet de livre
 * 3D utilisé ailleurs dans l'application.
 */
export function ReadingListCoverStack({
  covers,
  active,
  className,
}: ReadingListCoverStackProps) {
  const reduceMotion = usePrefersReducedMotion();
  const fanned = active && !reduceMotion;
  const sources = useMemo(
    () =>
      Array.from(
        new Set(
          (covers ?? [])
            .map(StripstreamAdapter.resolveReadingListPreviewCover)
            .filter(Boolean)
        )
      ),
    [covers]
  );
  const [failedSources, setFailedSources] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const visibleSources = sources
    .filter((source) => !failedSources.has(source))
    .slice(0, MAX_VISIBLE_COVERS);
  const [frontCover, ...backCovers] = visibleSources;

  const markFailed = (source: string) => {
    setFailedSources((previous) => {
      if (previous.has(source)) return previous;
      const next = new Set(previous);
      next.add(source);
      return next;
    });
  };

  if (!frontCover) {
    return (
      <div
        className={cn(
          "relative flex aspect-2/3 items-center justify-center rounded-xl bg-surface-2",
          className
        )}
      >
        <BookMarked className="h-12 w-12 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-2/3", className)}>
      {backCovers.map((src, index) => {
        const isFirstBack = index === 0;

        return (
          <div
            key={src}
            aria-hidden
            className={cn(
              "absolute inset-0 overflow-hidden rounded-[2px_6px_6px_2px] bg-surface-2",
              "shadow-[0_3px_10px_rgba(0,0,0,0.18)] ring-1 ring-black/15 dark:ring-white/15",
              "transition-transform duration-500 ease-projection motion-reduce:transition-none",
              isFirstBack ? "z-10" : "z-0",
              isFirstBack
                ? fanned
                  ? "-translate-y-1.5 rotate-[3deg]"
                  : "translate-x-[1px] translate-y-[2px] rotate-[0.75deg]"
                : fanned
                  ? "-translate-y-2 -rotate-[3deg]"
                  : "-translate-x-[1px] translate-y-[3px] -rotate-[0.75deg]"
            )}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              onError={() => markFailed(src)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        );
      })}

      <BookCoverScene
        active={active}
        contained
        className="z-20"
        cover={
          <img
            src={frontCover}
            alt=""
            loading="lazy"
            onError={() => markFailed(frontCover)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        }
      />
    </div>
  );
}
