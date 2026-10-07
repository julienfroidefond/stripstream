"use server";

import { getProvider } from "@/lib/providers/provider.factory";
import { getReaderData, type ReaderData } from "@/lib/reader/getReaderData";
import { AppError } from "@/utils/errors";

interface BookDataResult {
  success: boolean;
  data?: ReaderData;
  message?: string;
}

export async function getBookData(bookId: string): Promise<BookDataResult> {
  try {
    const provider = await getProvider();
    if (!provider) {
      return { success: false, message: "KOMGA_MISSING_CONFIG" };
    }
    const data = await getReaderData(provider, bookId);

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.code };
    }

    return { success: false, message: "BOOK_DATA_FETCH_ERROR" };
  }
}
