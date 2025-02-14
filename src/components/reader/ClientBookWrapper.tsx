"use client";

import { KomgaBook } from "@/types/komga";
import { BookReader } from "./BookReader";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface ClientBookWrapperProps {
  book: KomgaBook;
  pages: number[];
}

export function ClientBookWrapper({ book, pages }: ClientBookWrapperProps) {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Si le livre a une progression de lecture, on l'affiche dans un toast
    if (book.readProgress && book.readProgress.page && book.readProgress.page > 0) {
      toast({
        title: "Reprise de la lecture",
        description: `Reprise à la page ${book.readProgress.page}`,
      });
    }
  }, [book.readProgress, toast]);

  const handleCloseReader = () => {
    router.back();
  };

  return <BookReader book={book} pages={pages} onClose={handleCloseReader} />;
}
