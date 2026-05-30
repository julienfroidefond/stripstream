"use client";

import Link from "next/link";
import { ArrowLeft, Bookmark, BookMarked } from "lucide-react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { useTranslate } from "@/hooks/useTranslate";
import type { StripstreamReadingListDetail } from "@/types/stripstream";

interface ReadingListContentProps {
  detail: StripstreamReadingListDetail;
}

export function ReadingListContent({ detail }: ReadingListContentProps) {
  const router = useRouter();
  const { t } = useTranslate();
  const firstBookId = detail.items[0]?.first_book_id ?? null;

  return (
    <>
      {/* Banner header — full-width blurred bg */}
      <div className="relative min-h-[200px] w-screen -ml-[calc((100vw-100%)/2)] overflow-hidden">
        {/* Blurred cover background */}
        {firstBookId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/stripstream/images/books/${firstBookId}/thumbnail`}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover blur-sm scale-105 brightness-50"
          />
        )}
        {/* Fallback gradient when no cover */}
        {!firstBookId && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

        <div className="relative container mx-auto px-4 pt-10 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("home.reading_lists.back")}
          </button>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20">
              <Bookmark className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                {detail.name}
              </h1>
              {detail.description && (
                <p className="line-clamp-2 text-sm text-white/70">{detail.description}</p>
              )}
              <p className="text-sm text-white/60">
                {t("home.reading_lists.series_count", { count: detail.items.length })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Container>
        {detail.items.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">{t("home.reading_lists.empty")}</p>
        ) : (
          <div className="py-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {detail.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/series/${item.id}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/85 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-md"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
                    {item.first_book_id ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/stripstream/images/books/${item.first_book_id}/thumbnail`}
                        alt={item.name}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <BookMarked className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <p className="line-clamp-2 text-xs font-semibold text-white">{item.name}</p>
                      <p className="mt-0.5 text-[10px] text-white/70">{item.library_name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 px-2 py-2">
                    <span className="line-clamp-1 text-sm font-medium leading-tight">{item.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.library_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
