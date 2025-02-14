"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KomgaBook } from "@/types/komga";
import { BookReader } from "./BookReader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface ClientBookReaderProps {
  book: KomgaBook;
  pages: number[];
}

export function ClientBookReader({ book, pages }: ClientBookReaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isReading, setIsReading] = useState(false);

  const handleStartReading = () => {
    // Si le livre a une progression de lecture, on l'affiche dans un toast
    if (book.readProgress && book.readProgress.page && book.readProgress.page > 0) {
      toast({
        title: "Reprise de la lecture",
        description: `Reprise à la page ${book.readProgress.page}`,
      });
    }
    setIsReading(true);
  };

  const handleCloseReader = () => {
    setIsReading(false);
    router.back();
  };

  if (isReading) {
    return <BookReader book={book} pages={pages} onClose={handleCloseReader} />;
  }

  return (
    <Button onClick={handleStartReading} size="lg" className="w-full md:w-auto">
      Commencer la lecture
    </Button>
  );
}
