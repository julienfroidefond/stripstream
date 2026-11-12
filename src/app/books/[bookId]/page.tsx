import { Suspense } from "react";
import { ClientBookPage } from "@/components/reader/ClientBookPage";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
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

  return (
    <SurfaceBoundary
      surface={surface}
      error={(code) => (
        <Suspense fallback={<BookSkeleton />}>
          <ClientBookPage bookId={bookId} initialError={code} />
        </Suspense>
      )}
      ready={(data) => (
        <Suspense fallback={<BookSkeleton />}>
          <ClientBookPage bookId={bookId} initialData={data} />
        </Suspense>
      )}
    />
  );
}
