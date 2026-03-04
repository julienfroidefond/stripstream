"use server";

import { BookService } from "@/lib/services/book.service";
import { AppError } from "@/utils/errors";
import type { KomgaBook } from "@/types/komga";
import logger from "@/lib/logger";

interface BookDataResult {
  success: boolean;
  data?: {
    book: KomgaBook;
    pages: number[];
    nextBook: KomgaBook | null;
  };
  message?: string;
}

export async function getBookData(bookId: string): Promise<BookDataResult> {
  try {
    const data = await BookService.getBook(bookId);
    let nextBook = null;
    try {
      nextBook = await BookService.getNextBook(bookId, data.book.seriesId);
    } catch (error) {
      logger.warn({ err: error, bookId }, "Failed to fetch next book in server action");
    }

    return {
      success: true,
      data: {
        ...data,
        nextBook,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.code };
    }

    return { success: false, message: "BOOK_DATA_FETCH_ERROR" };
  }
}
