"use client";

import { useEffect, useState } from "react";
import { ClientBookWrapper } from "./ClientBookWrapper";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { NormalizedBook } from "@/lib/providers/types";
import logger from "@/lib/logger";
import { getBookData } from "@/app/actions/books";

interface ClientBookPageProps {
  bookId: string;
  initialData?: {
    book: NormalizedBook;
    pages: number[];
    nextBook: NormalizedBook | null;
  };
  initialError?: string;
}

export function ClientBookPage({ bookId, initialData, initialError }: ClientBookPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    book: NormalizedBook;
    pages: number[];
    nextBook: NormalizedBook | null;
  } | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, initialData, initialError]);

  const fetchBookData = async () => {
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
  };

  const handleRetry = () => {
    fetchBookData();
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

  return <ClientBookWrapper book={data.book} pages={data.pages} nextBook={data.nextBook} />;
}
