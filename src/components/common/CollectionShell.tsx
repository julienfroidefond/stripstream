"use client";

import type { ReactNode, RefObject } from "react";

import { Pagination } from "@/components/ui/Pagination";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";

interface CollectionShellProps {
  children: ReactNode;
  /** Bloc secondaire conservé sous la grille (ex. tomes spéciaux). */
  footer?: ReactNode;
  toolbar: ReactNode;
  search?: ReactNode;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalElements: number;
  /** Clé i18n du compte affiché, ex. `series.display.showing`. */
  showingKey: string;
  /** Libellé affiché quand la collection est vide. */
  emptyText: string;
  /** Clé i18n de la pagination, ex. `series.display.page`. */
  pageKey: string;
  busy: boolean;
  gridRef: RefObject<HTMLDivElement | null>;
  onPageChange: (page: number) => void | Promise<void>;
  /** Titre de section affiché dans un panneau (séries). */
  eyebrow?: string;
  title?: string;
  /** Reprend le panneau de surface et le titre de la bibliothèque. */
  panel?: boolean;
  toolbarAlign?: "start" | "end";
  className?: string;
}

/**
 * Cadre commun des collections paginées : compte, recherche, barre d'outils,
 * atténuation pendant la navigation, contenu et pagination. Les grilles ne
 * fournissent que leurs cartes et, pour les tomes, le regroupement des tomes
 * manquants.
 */
export function CollectionShell({
  children,
  footer,
  toolbar,
  search,
  currentPage,
  totalPages,
  pageSize,
  totalElements,
  showingKey,
  emptyText,
  pageKey,
  busy,
  gridRef,
  onPageChange,
  eyebrow,
  title,
  panel = false,
  toolbarAlign = "start",
  className,
}: CollectionShellProps) {
  const { t } = useTranslate();
  const startIndex = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalElements);
  const showingText =
    totalElements === 0
      ? emptyText
      : t(showingKey, { start: startIndex, end: endIndex, total: totalElements });

  const toolbarRow = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        toolbarAlign === "end" && "justify-end"
      )}
    >
      {toolbar}
    </div>
  );

  return (
    <div className={cn("space-y-8", className)}>
      {panel ? (
        <div className="rounded-2xl bg-surface-1 p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              {eyebrow && (
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                  {title}
                </h2>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{showingText}</p>
          </div>

          <div className="space-y-3">
            {search}
            <div className="pb-1">{toolbarRow}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-right text-sm text-muted-foreground">{showingText}</p>
          {toolbarRow}
        </div>
      )}

      {/* Pendant la navigation, la grille s'atténue et recule un peu ; elle est
          remontée à chaque nouveau contenu, et toutes ses cartes rejouent leur
          entrée. */}
      <div
        ref={gridRef}
        aria-busy={busy}
        className={cn(
          "transition-[opacity,scale] duration-300 ease-projection motion-reduce:transition-none",
          busy && "pointer-events-none scale-[0.985] opacity-45"
        )}
      >
        {children}
      </div>

      {footer}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="order-2 text-sm text-muted-foreground sm:order-1">
          {t(pageKey, { current: currentPage, total: totalPages })}
        </p>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          className="order-1 sm:order-2"
        />
      </div>
    </div>
  );
}
