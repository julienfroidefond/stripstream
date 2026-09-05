"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { NormalizedBook } from "@/lib/providers/types";
import { Button } from "@/components/ui/button";

// Chargement du lecteur lourd uniquement quand l'utilisateur clique sur « Commencer la lecture ».
const BookReader = dynamic(() => import("./BookReader").then((m) => m.BookReader), {
  ssr: false,
  loading: () => null,
});

interface ClientBookReaderProps {
  book: NormalizedBook;
  pages: number[];
}

export function ClientBookReader({ book, pages }: ClientBookReaderProps) {
  const router = useRouter();
  const [isReading, setIsReading] = useState(false);

  const handleStartReading = () => {
    setIsReading(true);
  };

  const handleCloseReader = () => {
    setIsReading(false);
    //Fetch une nouvelle route pour rafraichir les différents caches
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
