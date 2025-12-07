import { Suspense } from "react";
import { ClientBookPage } from "@/components/reader/ClientBookPage";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;

  return (
    <Suspense fallback={<BookSkeleton />}>
      <ClientBookPage bookId={bookId} />
    </Suspense>
  );
}
