"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KomgaBook } from "@/types/komga";
import { BookReader } from "./BookReader";
import { Button } from "@/components/ui/button";

interface ClientBookReaderProps {
  book: KomgaBook;
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
