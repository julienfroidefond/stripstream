import { Suspense } from "react";
import { ClientBookWrapper } from "@/components/reader/ClientBookWrapper";
import { BookSkeleton } from "@/components/skeletons/BookSkeleton";
import { BookService } from "@/lib/services/book.service";
import { notFound } from "next/navigation";
import { withPageTiming } from "@/lib/hoc/withPageTiming";

async function BookPage({ params }: { params: { bookId: string } }) {
  try {
    const data = await BookService.getBook(params.bookId);

    return (
      <Suspense fallback={<BookSkeleton />}>
        <ClientBookWrapper book={data.book} pages={data.pages} />
      </Suspense>
    );
  } catch (error) {
    console.error("Erreur:", error);
    notFound();
  }
}

export default withPageTiming("BookPage", BookPage);
