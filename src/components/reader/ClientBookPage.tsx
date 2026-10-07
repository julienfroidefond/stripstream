"use client";

import { useCallback, useEffect, useState } from "react";
import { ClientBookWrapper } from "./ClientBookWrapper";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";
import { getBookData } from "@/app/actions/books";
import { revalidateForRefresh } from "@/app/actions/refresh";
import type { ReaderData } from "@/lib/reader/getReaderData";

interface ClientBookPageProps {
  bookId: string;
  initialData?: ReaderData;
  initialError?: string;
}

export function ClientBookPage({ bookId, initialData, initialError }: ClientBookPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReaderData | null>(null);

  const fetchBookData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getBookData(bookId);
      if (!result.success || !result.data) {
        throw new Error(result.message || ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
      }

      setData(result.data);
    } catch (err) {
      logger.error({ err }, "Error fetching book");
      setError(err instanceof Error ? err.message : ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  // Use SSR data if available
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }
    if (initialError) {
      setError(initialError);
      setLoading(false);
      return;
    }
    fetchBookData();
  }, [bookId, initialData, initialError, fetchBookData]);

  const handleRetry = () => {
    fetchBookData();
  };

  const handleRefresh = async () => {
    await revalidateForRefresh("book", bookId);
    await fetchBookData();
  };

  if (loading) {
    return <BookSkeleton />;
  }

  if (error) {
    return (
      <div className="container py-8 space-y-8">
        <ErrorMessage errorCode={error} onRetry={handleRetry} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-8 space-y-8">
        <ErrorMessage errorCode={ERROR_CODES.BOOK.PAGES_FETCH_ERROR} onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <ClientBookWrapper
      book={data.book}
      pages={data.pages}
      nextBook={data.nextBook}
      readerInfo={data.readerInfo}
      onRefresh={handleRefresh}
    />
  );
}
