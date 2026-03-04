import { Suspense } from "react";
import { ClientBookPage } from "@/components/reader/ClientBookPage";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { redirect } from "next/navigation";
import logger from "@/lib/logger";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;

  try {
    // SSR: Fetch directly on server instead of client-side XHR
    const data = await BookService.getBook(bookId);
    let nextBook = null;
    try {
      nextBook = await BookService.getNextBook(bookId, data.book.seriesId);
    } catch (error) {
      logger.warn({ err: error, bookId }, "Failed to fetch next book, continuing without it");
    }

    return (
      <Suspense fallback={<BookSkeleton />}>
        <ClientBookPage bookId={bookId} initialData={{ ...data, nextBook }} />
      </Suspense>
    );
  } catch (error) {
    // If config is missing, redirect to settings
    if (error instanceof AppError && error.code === ERROR_CODES.KOMGA.MISSING_CONFIG) {
      redirect("/settings");
    }

    // Pass error to client component
    const errorCode = error instanceof AppError ? error.code : ERROR_CODES.BOOK.NOT_FOUND;
    return (
      <Suspense fallback={<BookSkeleton />}>
        <ClientBookPage bookId={bookId} initialError={errorCode} />
      </Suspense>
    );
  }
}
