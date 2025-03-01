"use client";

import { CoverClient } from "./cover-client";
import { ProgressBar } from "./progress-bar";

interface BaseCoverProps {
  type: "series" | "book";
  id: string;
  alt?: string;
  className?: string;
  quality?: number;
  sizes?: string;
  isCompleted?: boolean;
}

interface BookCoverProps extends BaseCoverProps {
  type: "book";
  currentPage?: number;
  totalPages?: number;
}

interface SeriesCoverProps extends BaseCoverProps {
  type: "series";
  readBooks?: number;
  totalBooks?: number;
}

type CoverProps = BookCoverProps | SeriesCoverProps;

function getImageUrl(type: "series" | "book", id: string) {
  if (type === "series") {
    return `/api/komga/images/series/${id}/thumbnail`;
  }
  return `/api/komga/images/books/${id}/thumbnail`;
}

export function Cover(props: CoverProps) {
  const {
    type,
    id,
    alt = "Image de couverture",
    className,
    quality = 80,
    sizes = "100vw",
    isCompleted = false,
  } = props;

  const imageUrl = getImageUrl(type, id);

  const showProgress = () => {
    if (type === "book") {
      const { currentPage, totalPages } = props;
      return currentPage && totalPages && currentPage > 0 && !isCompleted ? (
        <ProgressBar progress={currentPage} total={totalPages} type="book" />
      ) : null;
    }

    if (type === "series") {
      const { readBooks, totalBooks } = props;
      return readBooks && totalBooks && readBooks > 0 && !isCompleted ? (
        <ProgressBar progress={readBooks} total={totalBooks} type="series" />
      ) : null;
    }
  };

  return (
    <div className="relative w-full h-full">
      <CoverClient
        imageUrl={imageUrl}
        alt={alt}
        className={className}
        quality={quality}
        sizes={sizes}
        isCompleted={isCompleted}
      />
      {showProgress()}
    </div>
  );
}
