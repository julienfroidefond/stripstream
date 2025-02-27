import { Suspense } from "react";
import { ClientBookWrapper } from "@/components/reader/ClientBookWrapper";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { BookService } from "@/lib/services/book.service";
import { notFound } from "next/navigation";
import { withPageTiming } from "@/lib/hoc/withPageTiming";
import { KomgaBookWithPages } from "@/types/komga";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

async function BookPage({ params }: { params: { bookId: string } }) {
  try {
    const data: KomgaBookWithPages = await BookService.getBook(params.bookId);

    return (
      <Suspense fallback={<BookSkeleton />}>
        <ClientBookWrapper book={data.book} pages={data.pages} />
      </Suspense>
    );
  } catch (error) {
    console.error("Erreur:", error);
    return (
      <div className="container py-8 space-y-8">
        <ErrorMessage error={error as Error} errorCode="BOOK_FETCH_ERROR" />
      </div>
    );
  }
}

export default withPageTiming("BookPage", BookPage);
