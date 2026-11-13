"use client";

import type { NormalizedBook } from "@/lib/providers/types";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import { BookCard } from "./BookCard";
import type { DisplayBook } from "./bookGrouping";

interface BookListProps {
  books: DisplayBook[];
  onBookClick: (book: NormalizedBook) => void;
  isCompact?: boolean;
}

export function BookList({ books, onBookClick, isCompact = false }: BookListProps) {
  const { t } = useTranslate();

  if (!books.length) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground whitespace-pre-line">{t("books.empty")}</p>
      </div>
    );
  }

  return (
    <StaggerGroup className={cn("space-y-2", isCompact && "space-y-1")} reveal="scroll">
      {books.map((item) => (
        <StaggerItem key={item.key}>
          <BookCard
            item={item}
            layout="list"
            onBookClick={onBookClick}
            isCompact={isCompact}
          />
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
