import { notFound, redirect } from "next/navigation";
import { fetchReadingListDetail } from "@/lib/providers/provider.factory";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ReadingListContent } from "./ReadingListContent";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadingListPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const detail = await fetchReadingListDetail(id);

    if (!detail) notFound();

    return <ReadingListContent detail={detail} />;
  } catch (error) {
    if (
      error instanceof AppError &&
      error.code === ERROR_CODES.STRIPSTREAM.NOT_FOUND
    ) {
      notFound();
    }

    if (
      error instanceof AppError &&
      (error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ||
        error.code === ERROR_CODES.STRIPSTREAM.MISSING_CONFIG)
    ) {
      redirect("/settings");
    }

    notFound();
  }
}
