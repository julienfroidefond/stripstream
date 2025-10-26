"use client";

import { useEffect, useState, useCallback } from "react";
import type { KomgaBook } from "@/types/komga";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Check, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import Link from "next/link";
import { BookOfflineButton } from "@/components/ui/book-offline-button";
import { useTranslate } from "@/hooks/useTranslate";
import logger from "@/lib/logger";

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
  const { t } = useTranslate();

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
              logger.error({ err: error }, `Erreur lors de la récupération du livre ${bookId}:`);
              localStorage.removeItem(key);
            }
          }
        }
      }
      setDownloadedBooks(books);
    } catch (error) {
      logger.error({ err: error }, "Erreur lors du chargement des livres:");
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
        title: t("downloads.toast.deleted"),
        description: t("downloads.toast.deletedDesc"),
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la suppression du livre:");
      toast({
        title: t("downloads.toast.error"),
        description: t("downloads.toast.errorDesc"),
        variant: "destructive",
      });
    }
  };

  const handleRetryDownload = async (book: KomgaBook) => {
    localStorage.removeItem(getStorageKey(book.id));
    setDownloadedBooks((prev) => prev.filter((b) => b.book.id !== book.id));
    toast({
      title: t("downloads.toast.retry"),
      description: t("downloads.toast.retryDesc"),
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
    <>
      <div className="container mx-auto px-4 py-8 space-y-12">
        <h1 className="text-3xl font-bold tracking-tight">{t("downloads.page.title")}</h1>
        {t("downloads.page.description") && (
          <p className="text-lg text-muted-foreground">{t("downloads.page.description")}</p>
        )}
      </div>
      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">
              {t("downloads.tabs.all", { count: downloadedBooks.length })}
            </TabsTrigger>
            <TabsTrigger value="downloading">
              {t("downloads.tabs.downloading", {
                count: downloadedBooks.filter((b) => b.status.status === "downloading").length,
              })}
            </TabsTrigger>
            <TabsTrigger value="available">
              {t("downloads.tabs.available", {
                count: downloadedBooks.filter((b) => b.status.status === "available").length,
              })}
            </TabsTrigger>
            <TabsTrigger value="error">
              {t("downloads.tabs.error", {
                count: downloadedBooks.filter((b) => b.status.status === "error").length,
              })}
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
                  title: t("downloads.toast.retryAll"),
                  description: t("downloads.toast.retryAllDesc", { count: errorBooks.length }),
                });
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t("downloads.actions.retryAll")}
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
            <p className="text-center text-muted-foreground p-8">{t("downloads.empty.all")}</p>
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
            <p className="text-center text-muted-foreground p-8">
              {t("downloads.empty.downloading")}
            </p>
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
            <p className="text-center text-muted-foreground p-8">
              {t("downloads.empty.available")}
            </p>
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
            <p className="text-center text-muted-foreground p-8">{t("downloads.empty.error")}</p>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

interface BookDownloadCardProps {
  book: KomgaBook;
  status: BookDownloadStatus;
  onDelete: () => void;
  onRetry: () => void;
}

function BookDownloadCard({ book, status, onDelete, onRetry }: BookDownloadCardProps) {
  const { t } = useTranslate();

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return t("downloads.info.size", { size: mb.toFixed(1) });
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
    return t(`downloads.status.${status}`);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="relative w-12 aspect-[2/3] bg-muted/80 backdrop-blur-md rounded overflow-hidden">
          <Image
            src={`/api/komga/images/books/${book.id}/thumbnail`}
            alt={t("books.coverAlt", { title: book.metadata?.title })}
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
              {book.metadata?.title || t("books.title", { number: book.metadata?.number })}
            </h3>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatSize(book.sizeBytes)}</span>
            <span>•</span>
            <span>
              {status.status === "downloading"
                ? t("downloads.info.pages", {
                    current: Math.floor((status.progress * book.media.pagesCount) / 100),
                    total: book.media.pagesCount,
                  })
                : t("downloads.info.totalPages", { count: book.media.pagesCount })}
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
              title={t("downloads.actions.retry")}
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
              title={t("downloads.actions.delete")}
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
