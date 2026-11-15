/* eslint-disable no-console */
import { useCallback, useEffect, useState } from "react";
import type { NormalizedBook } from "@/lib/providers/types";
import { updateReadProgress } from "@/app/actions/read-progress";
import { useToast } from "@/components/ui/use-toast";
import { ERROR_CODES } from "@/constants/errorCodes";
import { useAnonymous } from "@/contexts/AnonymousContext";
import { useTranslate } from "@/hooks/useTranslate";
import { ReadProgressSession } from "@/lib/reader/read-progress-session";

interface UseReadProgressSessionOptions {
  book: NormalizedBook;
  totalPages: number;
  initialPage: number;
}

/**
 * Binds a book session to the reader progress policy. The session is created
 * once per mounted reader; target updates and the anonymous gate are forwarded
 * without recreating its pending timer or cursor.
 */
export function useReadProgressSession({
  book,
  totalPages,
  initialPage,
}: UseReadProgressSessionOptions): ReadProgressSession {
  const { isAnonymous } = useAnonymous();
  const { toast } = useToast();
  const { t } = useTranslate();
  const showSaveError = useCallback(
    (code: string) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t(`errors.${code}`),
      });
    },
    [t, toast]
  );

  const [session] = useState(
    () =>
      new ReadProgressSession({
        bookId: book.id,
        seriesId: book.seriesId,
        totalPages,
        initialPage,
        anonymous: isAnonymous,
        persist: async (update) => {
          console.debug(
            `[reader/progress] sync bookId=${update.bookId} page=${update.page}/${update.totalPages}`
          );
          try {
            const result = await updateReadProgress(
              update.bookId,
              update.page,
              update.completed,
              update.seriesId
            );
            if (!result.success) {
              console.error(
                `[reader/progress] sync failed bookId=${update.bookId} page=${update.page} code=${result.code}`
              );
              showSaveError(result.code);
            }
          } catch (error) {
            console.error(
              `[reader/progress] sync error bookId=${update.bookId} page=${update.page}`,
              error
            );
            showSaveError(ERROR_CODES.BOOK.PROGRESS_UPDATE_ERROR);
          }
        },
      })
  );

  useEffect(() => {
    session.updateTarget({
      bookId: book.id,
      seriesId: book.seriesId,
      totalPages,
    });
  }, [session, book.id, book.seriesId, totalPages]);

  useEffect(() => {
    if (
      totalPages > 0 &&
      (book.readProgress?.page ?? 0) >= totalPages &&
      !book.readProgress?.completed
    ) {
      session.track(totalPages);
    }
  }, [book.readProgress?.completed, book.readProgress?.page, session, totalPages]);

  useEffect(() => {
    session.setAnonymous(isAnonymous);
  }, [session, isAnonymous]);

  useEffect(() => {
    const flush = () => session.flush();
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      session.flush();
    };
  }, [session]);

  return session;
}
