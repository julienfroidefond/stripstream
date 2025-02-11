"use client";

import { useRouter } from "next/navigation";
import { KomgaBook } from "@/types/komga";
import { useEffect, useState } from "react";
import { BookReader } from "@/components/reader/BookReader";
import { ImageOff } from "lucide-react";
import Image from "next/image";

interface BookData {
  book: KomgaBook;
  pages: number[];
}

export default function BookPage({ params }: { params: { bookId: string } }) {
  const router = useRouter();
  const [data, setData] = useState<BookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    const fetchBookData = async () => {
      try {
        const response = await fetch(`/api/komga/books/${params.bookId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors de la récupération du tome");
        }
        const data = await response.json();
        setData(data);
        setIsReading(true);
      } catch (error) {
        console.error("Erreur:", error);
        setError(error instanceof Error ? error.message : "Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookData();
  }, [params.bookId]);

  const handleCloseReader = () => {
    setIsReading(false);
    router.back();
  };

  if (isLoading) {
    return (
      <div className="container py-8 space-y-8 animate-pulse">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-48 h-72 bg-muted rounded-lg" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-8">
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">{error || "Données non disponibles"}</p>
        </div>
      </div>
    );
  }

  const { book, pages } = data;

  if (isReading) {
    return <BookReader book={book} pages={pages} onClose={handleCloseReader} />;
  }

  return (
    <div className="container py-8 space-y-8">
      {/* En-tête du tome */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Couverture */}
        <div className="w-48 shrink-0">
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
            {!imageError ? (
              <Image
                src={`/api/komga/images/books/${book.id}/thumbnail`}
                alt={`Couverture de ${book.metadata.title}`}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-12 h-12" />
              </div>
            )}
          </div>
        </div>

        {/* Informations */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">
              {book.metadata.title || `Tome ${book.metadata.number}`}
            </h1>
            <p className="text-muted-foreground">
              {book.seriesTitle} - Tome {book.metadata.number}
            </p>
          </div>

          {book.metadata.summary && (
            <p className="text-muted-foreground">{book.metadata.summary}</p>
          )}

          <div className="space-y-1 text-sm text-muted-foreground">
            {book.metadata.releaseDate && (
              <div>
                <span className="font-medium">Date de sortie :</span>{" "}
                {new Date(book.metadata.releaseDate).toLocaleDateString()}
              </div>
            )}
            {book.metadata.authors?.length > 0 && (
              <div>
                <span className="font-medium">Auteurs :</span>{" "}
                {book.metadata.authors
                  .map((author) => `${author.name} (${author.role})`)
                  .join(", ")}
              </div>
            )}
            {book.size && (
              <div>
                <span className="font-medium">Taille :</span> {book.size}
              </div>
            )}
            {book.media.pagesCount > 0 && (
              <div>
                <span className="font-medium">Pages :</span> {book.media.pagesCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
