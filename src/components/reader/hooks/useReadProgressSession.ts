/* eslint-disable no-console */
import { useEffect, useState } from "react";
import type { NormalizedBook } from "@/lib/providers/types";
import { updateReadProgress } from "@/app/actions/read-progress";
import { useAnonymous } from "@/contexts/AnonymousContext";
import {
  ReadProgressSession,
  type ReadProgressUpdate,
} from "@/lib/reader/read-progress-session";

async function persistReadProgress(update: ReadProgressUpdate): Promise<void> {
  console.debug(
    `[reader/progress] sync bookId=${update.bookId} page=${update.page}/${update.totalPages}`
  );
  try {
    await updateReadProgress(update.bookId, update.page, update.completed, update.seriesId);
  } catch (error) {
    console.error(
      `[reader/progress] sync error bookId=${update.bookId} page=${update.page}`,
      error
    );
  }
}

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
  const [session] = useState(
    () =>
      new ReadProgressSession({
        bookId: book.id,
        seriesId: book.seriesId,
        totalPages,
        initialPage,
        anonymous: isAnonymous,
        persist: persistReadProgress,
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
    session.setAnonymous(isAnonymous);
  }, [session, isAnonymous]);

  useEffect(() => () => session.flush(), [session]);

  return session;
}
