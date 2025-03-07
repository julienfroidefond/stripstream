import { Suspense } from "react";
import { ClientBookWrapper } from "@/components/reader/ClientBookWrapper";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { BookService } from "@/lib/services/book.service";
import { withPageTiming } from "@/lib/hoc/withPageTiming";
import type { KomgaBookWithPages } from "@/types/komga";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

async function BookPage({ params }: { params: { bookId: string } }) {
  try {
    const { bookId } = await params;
    const data: KomgaBookWithPages = await BookService.getBook(bookId);
    const nextBook = await BookService.getNextBook(bookId, data.book.seriesId);
    return (
      <Suspense fallback={<BookSkeleton />}>
        <ClientBookWrapper book={data.book} pages={data.pages} nextBook={nextBook} />
      </Suspense>
    );
  } catch (error) {
    console.error("Erreur:", error);
    if (error instanceof AppError) {
      return (
        <div className="container py-8 space-y-8">
          <ErrorMessage errorCode={error.code} />
        </div>
      );
    }
    return (
      <div className="container py-8 space-y-8">
        <ErrorMessage errorCode={ERROR_CODES.SERIES.FETCH_ERROR} />
      </div>
    );
  }
}

export default withPageTiming("BookPage", BookPage);
