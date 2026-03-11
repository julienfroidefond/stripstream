"use server";

import { getProvider } from "@/lib/providers/provider.factory";
import { AppError } from "@/utils/errors";
import type { NormalizedBook } from "@/lib/providers/types";
import logger from "@/lib/logger";

interface BookDataResult {
  success: boolean;
  data?: {
    book: NormalizedBook;
    pages: number[];
    nextBook: NormalizedBook | null;
  };
  message?: string;
}

export async function getBookData(bookId: string): Promise<BookDataResult> {
  try {
    const provider = await getProvider();
    if (!provider) {
      return { success: false, message: "KOMGA_MISSING_CONFIG" };
    }

    const book = await provider.getBook(bookId);
    const pages = Array.from({ length: book.pageCount }, (_, i) => i + 1);

    let nextBook: NormalizedBook | null = null;
    try {
      nextBook = await provider.getNextBook(bookId);
    } catch (error) {
      logger.warn({ err: error, bookId }, "Failed to fetch next book in server action");
    }

    return {
      success: true,
      data: { book, pages, nextBook },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.code };
    }

    return { success: false, message: "BOOK_DATA_FETCH_ERROR" };
  }
}
