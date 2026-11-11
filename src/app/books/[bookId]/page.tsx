import { Suspense } from "react";
import { ClientBookPage } from "@/components/reader/ClientBookPage";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { getReaderData } from "@/lib/reader/getReaderData";
import { ERROR_CODES } from "@/constants/errorCodes";
import { loadSurface } from "@/lib/surfaces/load-surface";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;

  const surface = await loadSurface({
    name: "book",
    fallbackCode: ERROR_CODES.BOOK.NOT_FOUND,
    load: ({ provider }) => getReaderData(provider, bookId),
  });

  if (surface.status === "ready") {
    return (
      <Suspense fallback={<BookSkeleton />}>
        <ClientBookPage bookId={bookId} initialData={surface.data} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<BookSkeleton />}>
      <ClientBookPage
        bookId={bookId}
        initialError={surface.status === "error" ? surface.code : ERROR_CODES.BOOK.NOT_FOUND}
      />
    </Suspense>
  );
}
