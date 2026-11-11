import { notFound } from "next/navigation";
import { ERROR_CODES } from "@/constants/errorCodes";
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

  if (surface.status !== "ready" || !surface.data) notFound();

  return <ReadingListContent detail={surface.data} />;
}
