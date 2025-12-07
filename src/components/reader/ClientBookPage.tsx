"use client";

import { useEffect, useState } from "react";
import { ClientBookWrapper } from "./ClientBookWrapper";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { KomgaBook } from "@/types/komga";
import logger from "@/lib/logger";

interface ClientBookPageProps {
  bookId: string;
}

export function ClientBookPage({ bookId }: ClientBookPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    book: KomgaBook;
    pages: number[];
    nextBook: KomgaBook | null;
  } | null>(null);

  const fetchBookData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/komga/books/${bookId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.code || ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
      }

      const bookData = await response.json();
      setData(bookData);
    } catch (err) {
      logger.error({ err }, "Error fetching book");
      setError(err instanceof Error ? err.message : ERROR_CODES.BOOK.PAGES_FETCH_ERROR);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

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
