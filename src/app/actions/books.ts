"use server";

import { BookService } from "@/lib/services/book.service";
import { AppError } from "@/utils/errors";
import type { KomgaBook } from "@/types/komga";

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
    const nextBook = await BookService.getNextBook(bookId, data.book.seriesId);

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
