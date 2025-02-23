"use client";

import { useEffect, useState, useCallback } from "react";
import { KomgaBook } from "@/types/komga";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Check, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import Link from "next/link";
import { BookOfflineButton } from "@/components/ui/book-offline-button";

type BookStatus = "idle" | "downloading" | "available" | "error";

interface BookDownloadStatus {
  status: BookStatus;
  progress: number;
  timestamp: number;
  lastDownloadedPage?: number;
}

interface DownloadedBook {
  book: KomgaBook;
  status: BookDownloadStatus;
}

export function DownloadManager() {
  const [downloadedBooks, setDownloadedBooks] = useState<DownloadedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const getStorageKey = useCallback((bookId: string) => `book-status-${bookId}`, []);

  const loadDownloadedBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const books: DownloadedBook[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("book-status-")) {
          const bookId = key.replace("book-status-", "");
          const status = JSON.parse(localStorage.getItem(key) || "");
          if (status.status !== "idle") {
            try {
              const response = await fetch(`/api/komga/books/${bookId}`);
              if (!response.ok) throw new Error("Livre non trouvé");
              const bookData = await response.json();
              books.push({
                book: bookData.book,
                status,
              });
            } catch (error) {
              console.error(`Erreur lors de la récupération du livre ${bookId}:`, error);
              localStorage.removeItem(key);
            }
          }
        }
      }
      setDownloadedBooks(books);
    } catch (error) {
      console.error("Erreur lors du chargement des livres:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les livres téléchargés",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateBookStatuses = useCallback(() => {
    setDownloadedBooks((prevBooks) => {
      return prevBooks.map((downloadedBook) => {
        const status = JSON.parse(
          localStorage.getItem(getStorageKey(downloadedBook.book.id)) || "{}"
        );
        if (!status || status.status === "idle") {
          return downloadedBook;
        }
        return {
          ...downloadedBook,
          status,
        };
      });
    });
  }, [getStorageKey]);

  useEffect(() => {
    loadDownloadedBooks();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith("book-status-")) {
        updateBookStatuses();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(updateBookStatuses, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [loadDownloadedBooks, updateBookStatuses]);

  const handleDeleteBook = async (book: KomgaBook) => {
    try {
      const cache = await caches.open("stripstream-books");
      await cache.delete(`/api/komga/images/books/${book.id}/pages`);
      for (let i = 1; i <= book.media.pagesCount; i++) {
        await cache.delete(`/api/komga/images/books/${book.id}/pages/${i}`);
      }
      localStorage.removeItem(getStorageKey(book.id));
      setDownloadedBooks((prev) => prev.filter((b) => b.book.id !== book.id));
      toast({
        title: "Livre supprimé",
        description: "Le livre n'est plus disponible hors ligne",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression du livre:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const handleRetryDownload = async (book: KomgaBook) => {
    // Réinitialise le statut et laisse le composant BookOfflineButton gérer le téléchargement
    localStorage.removeItem(getStorageKey(book.id));
    setDownloadedBooks((prev) => prev.filter((b) => b.book.id !== book.id));
    toast({
      title: "Téléchargement relancé",
      description: "Le téléchargement va reprendre depuis le début",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="all" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="all">Tous ({downloadedBooks.length})</TabsTrigger>
          <TabsTrigger value="downloading">
            En cours ({downloadedBooks.filter((b) => b.status.status === "downloading").length})
          </TabsTrigger>
          <TabsTrigger value="available">
            Disponibles ({downloadedBooks.filter((b) => b.status.status === "available").length})
          </TabsTrigger>
          <TabsTrigger value="error">
            Erreurs ({downloadedBooks.filter((b) => b.status.status === "error").length})
          </TabsTrigger>
        </TabsList>
        {downloadedBooks.some((b) => b.status.status === "error") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const errorBooks = downloadedBooks.filter((b) => b.status.status === "error");
              errorBooks.forEach((book) => handleRetryDownload(book.book));
              toast({
                title: "Relance des téléchargements",
                description: `${errorBooks.length} téléchargement(s) relancé(s)`,
              });
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Tout relancer
          </Button>
        )}
      </div>

      <TabsContent value="all" className="space-y-4">
        {downloadedBooks.map(({ book, status }) => (
          <BookDownloadCard
            key={book.id}
            book={book}
            status={status}
            onDelete={() => handleDeleteBook(book)}
            onRetry={() => handleRetryDownload(book)}
          />
        ))}
        {downloadedBooks.length === 0 && (
          <p className="text-center text-muted-foreground p-8">Aucun livre téléchargé</p>
        )}
      </TabsContent>

      <TabsContent value="downloading" className="space-y-4">
        {downloadedBooks
          .filter((b) => b.status.status === "downloading")
          .map(({ book, status }) => (
            <BookDownloadCard
              key={book.id}
              book={book}
              status={status}
              onDelete={() => handleDeleteBook(book)}
              onRetry={() => handleRetryDownload(book)}
            />
          ))}
        {downloadedBooks.filter((b) => b.status.status === "downloading").length === 0 && (
          <p className="text-center text-muted-foreground p-8">Aucun téléchargement en cours</p>
        )}
      </TabsContent>

      <TabsContent value="available" className="space-y-4">
        {downloadedBooks
          .filter((b) => b.status.status === "available")
          .map(({ book, status }) => (
            <BookDownloadCard
              key={book.id}
              book={book}
              status={status}
              onDelete={() => handleDeleteBook(book)}
              onRetry={() => handleRetryDownload(book)}
            />
          ))}
        {downloadedBooks.filter((b) => b.status.status === "available").length === 0 && (
          <p className="text-center text-muted-foreground p-8">Aucun livre disponible hors ligne</p>
        )}
      </TabsContent>

      <TabsContent value="error" className="space-y-4">
        {downloadedBooks
          .filter((b) => b.status.status === "error")
          .map(({ book, status }) => (
            <BookDownloadCard
              key={book.id}
              book={book}
              status={status}
              onDelete={() => handleDeleteBook(book)}
              onRetry={() => handleRetryDownload(book)}
            />
          ))}
        {downloadedBooks.filter((b) => b.status.status === "error").length === 0 && (
          <p className="text-center text-muted-foreground p-8">Aucune erreur</p>
        )}
      </TabsContent>
    </Tabs>
  );
}

interface BookDownloadCardProps {
  book: KomgaBook;
  status: BookDownloadStatus;
  onDelete: () => void;
  onRetry: () => void;
}

function BookDownloadCard({ book, status, onDelete, onRetry }: BookDownloadCardProps) {
  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} Mo`;
  };

  const getStatusIcon = (status: BookStatus) => {
    switch (status) {
      case "downloading":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "available":
        return <Check className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: BookStatus) => {
    switch (status) {
      case "downloading":
        return "En cours de téléchargement";
      case "available":
        return "Disponible hors ligne";
      case "error":
        return "Erreur de téléchargement";
      default:
        return "Non téléchargé";
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="relative w-12 aspect-[2/3] bg-muted rounded overflow-hidden">
          <Image
            src={`/api/komga/images/books/${book.id}/thumbnail`}
            alt={`Couverture de ${book.metadata?.title}`}
            className="object-cover"
            fill
            sizes="48px"
            priority={false}
          />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/books/${book.id}`}
            className="hover:underline hover:text-primary transition-colors"
          >
            <h3 className="font-medium truncate">
              {book.metadata?.title || `Tome ${book.metadata?.number}`}
            </h3>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatSize(book.sizeBytes)}</span>
            <span>•</span>
            <span>
              {status.status === "downloading"
                ? `${Math.floor((status.progress * book.media.pagesCount) / 100)}/${
                    book.media.pagesCount
                  } pages`
                : `${book.media.pagesCount} pages`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {getStatusIcon(status.status)}
            <span>{getStatusText(status.status)}</span>
          </div>
          {status.status === "downloading" && (
            <div className="flex items-center gap-2 mt-2">
              <Progress value={status.progress} className="flex-1" />
              <span className="text-xs text-muted-foreground w-12 text-right">
                {Math.round(status.progress)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status.status === "error" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRetry}
              title="Réessayer"
              className="h-8 w-8 p-0 rounded-br-lg rounded-tl-lg"
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          <BookOfflineButton book={book} />
          {status.status !== "downloading" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              title="Supprimer"
              className="h-8 w-8 p-0 rounded-br-lg rounded-tl-lg"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
