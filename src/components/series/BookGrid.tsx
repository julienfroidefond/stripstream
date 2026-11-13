"use client";

import type { NormalizedBook } from "@/lib/providers/types";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { BookCard } from "./BookCard";
import type { DisplayBook } from "./bookGrouping";

interface BookGridProps {
  books: DisplayBook[];
  onBookClick: (book: NormalizedBook) => void;
  isCompact?: boolean;
}

export function BookGrid({ books, onBookClick, isCompact = false }: BookGridProps) {
  const { t } = useTranslate();

  if (!books.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground whitespace-pre-line">{t("books.empty")}</p>
      </div>
    );
  }

  return (
    <StaggerGroup
      className={cn(
        "grid gap-x-4 gap-y-7 md:gap-x-5",
        isCompact
          ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      )}
      reveal="scroll"
      effect="settle"
      stagger={0.09}
    >
      {books.map((item) => (
        <StaggerItem key={item.key} className="relative h-full">
          <BookCard item={item} layout="grid" onBookClick={onBookClick} />
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
