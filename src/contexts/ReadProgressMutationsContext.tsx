"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  deleteReadProgress,
  updateReadProgress,
  updateSeriesReadStatus,
} from "@/app/actions/read-progress";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";
import logger from "@/lib/logger";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import {
  bookProgressSignature,
  dropSettled,
  resolveBook as resolveBookOverride,
  resolveSeries as resolveSeriesOverride,
  seriesProgressSignature,
  settleOverride,
  withOverride,
  type ReadOverrides,
} from "./read-progress-overrides";

export interface ReadProgressMutations {
  /** Le livre à afficher, marquage optimiste en cours compris. */
  resolveBook: (book: NormalizedBook) => NormalizedBook;
  /** La série à afficher, marquage optimiste en cours compris. */
  resolveSeries: (series: NormalizedSeries) => NormalizedSeries;
  /** Marque un livre lu / non lu. Résout `true` si le serveur l'a enregistré. */
  markBook: (book: NormalizedBook, read: boolean) => Promise<boolean>;
  /** Marque tous les livres d'une série. Résout `true` si tout a été enregistré. */
  markSeries: (series: NormalizedSeries, read: boolean) => Promise<boolean>;
  /** Valeur visée par le marquage en vol de ce livre, `null` au repos. */
  pendingBook: (bookId: string) => boolean | null;
  /** Valeur visée par le marquage en vol de cette série, `null` au repos. */
  pendingSeries: (seriesId: string) => boolean | null;
}

const ReadProgressMutationsContext = createContext<ReadProgressMutations | undefined>(
  undefined
);

type PendingMap = ReadonlyMap<string, boolean>;

function withPending(pending: PendingMap, id: string, value: boolean | null): Map<string, boolean> {
  const next = new Map(pending);
  if (value === null) next.delete(id);
  else next.set(id, value);
  return next;
}

function bookToastKey(read: boolean): string {
  return read ? "books.actions.markAsRead" : "books.actions.markAsUnread";
}

function seriesToastKey(read: boolean): string {
  return read ? "series.header.markAllRead" : "series.header.markAllUnread";
}

/**
 * L'unique protocole de mutation de la progression de lecture hors lecteur.
 *
 * Les surfaces (cartes de livre, en-tête de série) lisent l'état via
 * `resolveBook` / `resolveSeries`, appellent `markBook` / `markSeries` et
 * reçoivent l'état en vol via `pendingBook` / `pendingSeries`. Elles ne
 * connaissent ni les actions serveur, ni l'override optimiste, ni le rollback,
 * ni le toast, ni le `router.refresh()`. Le lecteur garde sa propre session de
 * progression (`useReadProgressSession`) : elle écrit en continu, sans toast.
 */
export function ReadProgressMutationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslate();
  const { toast } = useToast();

  const [bookOverrides, setBookOverrides] = useState<ReadOverrides>(() => new Map());
  const [seriesOverrides, setSeriesOverrides] = useState<ReadOverrides>(() => new Map());
  const bookPendingRef = useRef<PendingMap>(new Map());
  const seriesPendingRef = useRef<PendingMap>(new Map());
  const [bookPending, setBookPending] = useState<PendingMap>(() => new Map());
  const [seriesPending, setSeriesPending] = useState<PendingMap>(() => new Map());
  const [isRefreshing, startRefresh] = useTransition();

  // Le refresh lancé dans une transition reste « en cours » jusqu'à ce que le
  // nouvel arbre serveur soit affiché : à sa fin, les overrides réglés n'ont
  // plus de raison d'être, le serveur fait foi. Ajusté pendant le rendu (pas
  // d'effet) pour que le nouvel arbre et le retrait arrivent ensemble.
  const [wasRefreshing, setWasRefreshing] = useState(false);
  if (wasRefreshing !== isRefreshing) {
    setWasRefreshing(isRefreshing);
    if (!isRefreshing) {
      setBookOverrides(dropSettled);
      setSeriesOverrides(dropSettled);
    }
  }

  const refresh = useCallback(() => startRefresh(() => router.refresh()), [router]);

  const markBookPending = useCallback((bookId: string, value: boolean | null) => {
    bookPendingRef.current = withPending(bookPendingRef.current, bookId, value);
    setBookPending(bookPendingRef.current);
  }, []);

  const markSeriesPending = useCallback((seriesId: string, value: boolean | null) => {
    seriesPendingRef.current = withPending(seriesPendingRef.current, seriesId, value);
    setSeriesPending(seriesPendingRef.current);
  }, []);

  const resolveBook = useCallback(
    (book: NormalizedBook) => resolveBookOverride(bookOverrides, book),
    [bookOverrides]
  );

  const resolveSeries = useCallback(
    (series: NormalizedSeries) => resolveSeriesOverride(seriesOverrides, series),
    [seriesOverrides]
  );

  const pendingBook = useCallback(
    (bookId: string) => bookPending.get(bookId) ?? null,
    [bookPending]
  );

  const pendingSeries = useCallback(
    (seriesId: string) => seriesPending.get(seriesId) ?? null,
    [seriesPending]
  );

  const markBook = useCallback(
    async (book: NormalizedBook, read: boolean) => {
      if (bookPendingRef.current.has(book.id)) return false;

      const prefix = bookToastKey(read);
      setBookOverrides((current) =>
        withOverride(current, book.id, { read, observed: bookProgressSignature(book) })
      );
      markBookPending(book.id, read);

      try {
        const result = read
          ? await updateReadProgress(book.id, book.pageCount, true, book.seriesId)
          : await deleteReadProgress(book.id, book.seriesId);
        if (!result.success) throw new Error(result.message);

        toast({
          title: t(`${prefix}.success.title`),
          description: t(`${prefix}.success.description`),
        });
        setBookOverrides((current) => settleOverride(current, book.id));
        refresh();
        return true;
      } catch (error) {
        setBookOverrides((current) => withOverride(current, book.id, null));
        logger.error({ err: error }, "Erreur lors de la mise à jour du progresseur de lecture:");
        toast({
          variant: "destructive",
          title: t(`${prefix}.error.title`),
          description: t(`${prefix}.error.description`),
        });
        return false;
      } finally {
        markBookPending(book.id, null);
      }
    },
    [markBookPending, refresh, t, toast]
  );

  const markSeries = useCallback(
    async (series: NormalizedSeries, read: boolean) => {
      if (seriesPendingRef.current.has(series.id)) return false;

      const prefix = seriesToastKey(read);
      setSeriesOverrides((current) =>
        withOverride(current, series.id, {
          read,
          observed: seriesProgressSignature(series),
        })
      );
      markSeriesPending(series.id, read);

      try {
        const result = await updateSeriesReadStatus(series.id, read);
        // Les caches serveur sont invalidés même en cas d'échec partiel : on
        // rafraîchit dès que l'action a répondu, pour refléter ce qui a été
        // enregistré, puis le rollback retire l'override optimiste.
        if (result.success) {
          setSeriesOverrides((current) => settleOverride(current, series.id));
        }
        refresh();
        if (!result.success) throw new Error(result.message);

        toast({
          title: t(`${prefix}.success.title`),
          description: t(`${prefix}.success.description`, {
            count: result.updated ?? series.bookCount,
          }),
        });
        return true;
      } catch (error) {
        setSeriesOverrides((current) => withOverride(current, series.id, null));
        logger.error({ err: error }, "Erreur lors du marquage groupé de la série:");
        toast({
          variant: "destructive",
          title: t(`${prefix}.error.title`),
          description: t(`${prefix}.error.description`),
        });
        return false;
      } finally {
        markSeriesPending(series.id, null);
      }
    },
    [markSeriesPending, refresh, t, toast]
  );

  const value = useMemo<ReadProgressMutations>(
    () => ({ resolveBook, resolveSeries, markBook, markSeries, pendingBook, pendingSeries }),
    [resolveBook, resolveSeries, markBook, markSeries, pendingBook, pendingSeries]
  );

  return (
    <ReadProgressMutationsContext.Provider value={value}>
      {children}
    </ReadProgressMutationsContext.Provider>
  );
}

export function useReadProgressMutations(): ReadProgressMutations {
  const context = useContext(ReadProgressMutationsContext);
  if (!context) {
    throw new Error(
      "useReadProgressMutations must be used within a ReadProgressMutationsProvider"
    );
  }
  return context;
}
