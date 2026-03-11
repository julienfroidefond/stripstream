import { Suspense } from "react";
import { ClientBookPage } from "@/components/reader/ClientBookPage";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { getProvider } from "@/lib/providers/provider.factory";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { redirect } from "next/navigation";
import logger from "@/lib/logger";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;

  try {
    const provider = await getProvider();
    if (!provider) redirect("/settings");

    const book = await provider.getBook(bookId);
    const pages = Array.from({ length: book.pageCount }, (_, i) => i + 1);

    let nextBook = null;
    try {
      nextBook = await provider.getNextBook(bookId);
    } catch (error) {
      logger.warn({ err: error, bookId }, "Failed to fetch next book, continuing without it");
    }

    return (
      <Suspense fallback={<BookSkeleton />}>
        <ClientBookPage bookId={bookId} initialData={{ book, pages, nextBook }} />
      </Suspense>
    );
  } catch (error) {
    // If config is missing, redirect to settings
    if (error instanceof AppError && (
      error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ||
      error.code === ERROR_CODES.STRIPSTREAM.MISSING_CONFIG
    )) {
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
