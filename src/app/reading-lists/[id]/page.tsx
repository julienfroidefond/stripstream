import { notFound } from "next/navigation";
import { ERROR_CODES } from "@/constants/errorCodes";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
import { loadSurface } from "@/lib/surfaces/load-surface";
import { ReadingListContent } from "./ReadingListContent";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadingListPage({ params }: PageProps) {
  const { id } = await params;

  const surface = await loadSurface({
    name: "reading-list-detail",
    fallbackCode: ERROR_CODES.STRIPSTREAM.NOT_FOUND,
    missingProvider: "unavailable",
    load: ({ provider }) => provider.getReadingListDetail(id),
  });

  return (
    <SurfaceBoundary
      surface={surface}
      unavailable={() => notFound()}
      error={() => notFound()}
      ready={(detail) => {
        if (!detail) notFound();
        return <ReadingListContent detail={detail} />;
      }}
    />
  );
}
