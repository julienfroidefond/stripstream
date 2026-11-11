"use server";

import { getReaderData, type ReaderData } from "@/lib/reader/getReaderData";
import { ERROR_CODES } from "@/constants/errorCodes";
import { runProviderAction, type ActionResult } from "@/lib/actions/action-runner";

export async function getBookData(
  bookId: string
): Promise<ActionResult<{ data: ReaderData }>> {
  return runProviderAction<{ data: ReaderData }>({
    name: "getBookData",
    fallbackCode: ERROR_CODES.BOOK.FETCH_ERROR,
    fallbackMessage: "Erreur lors du chargement du livre",
    logContext: { bookId },
    execute: async ({ provider }) => ({
      message: "Livre chargé",
      data: await getReaderData(provider, bookId),
    }),
  });
}
