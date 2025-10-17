import { Suspense } from "react";
import { ClientBookPage } from "@/components/reader/ClientBookPage";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { withPageTiming } from "@/lib/hoc/withPageTiming";

async function BookPage({ params }: { params: { bookId: string } }) {
  const { bookId } = await params;
  
  return (
    <Suspense fallback={<BookSkeleton />}>
      <ClientBookPage bookId={bookId} />
    </Suspense>
  );
}

export default withPageTiming("BookPage", BookPage);
