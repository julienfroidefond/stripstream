"use client";

import Link from "next/link";
import { useState } from "react";
import type { FocusEvent, PointerEvent as ReactPointerEvent } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReadingListCoverStack } from "./ReadingListCoverStack";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type { StripstreamReadingList } from "@/types/stripstream";

type ReadingListStatus = "unread" | "reading" | "read";

interface ReadingListCardProps {
  list: StripstreamReadingList;
  status: ReadingListStatus;
  /** Identifiant E2E spécifique à une surface (accueil, page listes…). */
  testId?: string;
  /** Voile de survol repris de l'ancienne carte d'accueil. */
  showHoverOverlay?: boolean;
}

export function ReadingListCard({
  list,
  status,
  testId,
  showHoverOverlay = false,
}: ReadingListCardProps) {
  const { t } = useTranslate();
  const { isAnonymous } = useAnonymous();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const active = hovered || focused || pressed;
  const isCompleted = !isAnonymous && status === "read";

  const handlePointerEnter = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === "mouse") setHovered(true);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === "mouse") setHovered(false);
    else setPressed(false);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== "mouse") setPressed(true);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== "mouse") setPressed(false);
  };

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    if (event.currentTarget.matches(":focus-visible")) setFocused(true);
  };

  const handleBlur = () => setFocused(false);

  return (
    <Link
      href={`/reading-lists/${list.id}`}
      data-testid={testId ?? `reading-list-card-${list.id}`}
      title={list.name}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setPressed(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        "group relative flex w-full flex-col gap-2 rounded-xl text-left transition-opacity motion-reduce:transition-none focus-visible:outline-hidden",
        isCompleted && "opacity-70"
      )}
    >
      <div className="relative">
        <ReadingListCoverStack covers={list.preview_covers} active={active} />
        {showHoverOverlay && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/30 to-transparent p-2.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
            <p className="line-clamp-2 text-left text-xs font-semibold text-white">
              {list.name}
            </p>
          </div>
        )}
        {!isAnonymous && (
          <StatusBadge
            status={status === "read" ? "success" : status === "reading" ? "reading" : "unread"}
            className="absolute right-2 top-2 z-30 bg-background/90 px-1.5 py-0.5 text-[10px]"
          >
            {t(`home.reading_lists.filters.${status}`)}
          </StatusBadge>
        )}
      </div>
      <div className="space-y-0.5 px-0.5">
        <p className="line-clamp-1 font-medium leading-tight transition-colors group-hover:text-primary motion-reduce:transition-none">
          {list.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("home.reading_lists.series_count", { count: list.series_count })}
        </p>
        {!isAnonymous && list.book_count > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("series.status.progress", {
              read: list.books_read_count,
              total: list.book_count,
            })}
          </p>
        )}
      </div>
      {/* Le halo est un enfant au-dessus de la pile : sinon les couvertures
          arrière, qui débordent de la carte, masquent le focus. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-40 rounded-xl opacity-0 ring-2 ring-ring group-focus-visible:opacity-100"
      />
    </Link>
  );
}
