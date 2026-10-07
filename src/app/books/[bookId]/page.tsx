import { Suspense } from "react";
import { ClientBookPage } from "@/components/reader/ClientBookPage";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { getProvider } from "@/lib/providers/provider.factory";
import { getReaderData } from "@/lib/reader/getReaderData";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { redirect } from "next/navigation";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;

  try {
    const provider = await getProvider();
    if (!provider) redirect("/settings");
    const readerData = await getReaderData(provider, bookId);

    return (
      <Suspense fallback={<BookSkeleton />}>
        <ClientBookPage bookId={bookId} initialData={readerData} />
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
