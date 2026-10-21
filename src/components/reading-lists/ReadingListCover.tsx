"use client";

import { useMemo, useState } from "react";
import { BookMarked } from "lucide-react";
import { StripstreamAdapter } from "@/lib/providers/stripstream/stripstream.adapter";
import { cn } from "@/lib/utils";

interface ReadingListCoverProps {
  covers: string[];
  alt: string;
  className?: string;
  placeholderClassName?: string;
}

/**
 * Preview cover of a reading list. `preview_covers` mixes book UUIDs and raw
 * `cover_url` values (series without any book yet), and either can be
 * unreachable: fall through to the next distinct preview before the neutral
 * icon. Duplicates are dropped so a shared broken URL cannot stall the
 * fallthrough on a DOM `src` that never changes.
 */
export function ReadingListCover({
  covers,
  alt,
  className,
  placeholderClassName,
}: ReadingListCoverProps) {
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
  const src = sources.find((source) => !failedSources.has(source));

  if (!src) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center", placeholderClassName)}>
        <BookMarked className="h-12 w-12 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSources((previous) => new Set(previous).add(src))}
      className={className}
    />
  );
}
