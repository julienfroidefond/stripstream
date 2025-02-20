import { CoverClient } from "./cover-client";

interface CoverProps {
  type: "series" | "book";
  id: string;
  alt?: string;
  className?: string;
  quality?: number;
  sizes?: string;
  isCompleted?: boolean;
}

function getImageUrl(type: "series" | "book", id: string) {
  if (type === "series") {
    return `/api/komga/images/series/${id}/thumbnail`;
  }
  return `/api/komga/images/books/${id}/thumbnail`;
}

export function Cover({
  type,
  id,
  alt = "Image de couverture",
  className,
  quality = 80,
  sizes = "100vw",
  isCompleted = false,
}: CoverProps) {
  const imageUrl = getImageUrl(type, id);

  return (
    <CoverClient
      imageUrl={imageUrl}
      alt={alt}
      className={className}
      quality={quality}
      sizes={sizes}
      isCompleted={isCompleted}
    />
  );
}
