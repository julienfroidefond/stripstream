import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getActiveProviderType, getProvider } from "@/lib/providers/provider.factory";
import {
  countReadSeries,
  filterReadSeries,
  getReadSeries,
  paginateReadSeries,
  parseReadSeriesSort,
  sortReadSeries,
  type ReadSeriesFilter,
} from "@/lib/services/read-series.service";
import { AppError } from "@/utils/errors";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import frMessages from "@/i18n/messages/fr/common.json";
import enMessages from "@/i18n/messages/en/common.json";
import { RatingsContent } from "./RatingsContent";
import { RatingsUnavailable } from "./RatingsUnavailable";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get("NEXT_LOCALE")?.value;
  const messages = locale === "en" ? enMessages : frMessages;

  return {
    title: messages.ratings.title,
    description: messages.ratings.description,
  };
}

const PAGE_SIZE = 60;
const MAX_QUERY_LENGTH = 120;

interface RatingsPageProps {
  searchParams: Promise<{ q?: string; filter?: string; page?: string; sort?: string }>;
}

function parseFilter(value: string | undefined): ReadSeriesFilter {
  return value === "unrated" || value === "rated" ? value : "all";
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function RatingsPage({ searchParams }: RatingsPageProps) {
  const [{ q, filter: rawFilter, page: rawPage, sort: rawSort }, provider, providerType] = await Promise.all([
    searchParams,
    getProvider(),
    getActiveProviderType(),
  ]);

  if (!provider) redirect("/settings");

  if (providerType !== "stripstream") {
    return <RatingsUnavailable />;
  }

  const query = (q ?? "").slice(0, MAX_QUERY_LENGTH);
  const filter = parseFilter(rawFilter);
  const sort = parseReadSeriesSort(rawSort);

  try {
    const allSeries = await getReadSeries(provider);
    const counts = countReadSeries(allSeries);
    const matchingSeries = sortReadSeries(filterReadSeries(allSeries, query, filter), sort);
    const slice = paginateReadSeries(matchingSeries, parsePage(rawPage), PAGE_SIZE);

    return (
      <RatingsContent
        series={slice.items}
        counts={counts}
        query={query}
        filter={filter}
        sort={sort}
        page={slice.page}
        totalPages={slice.totalPages}
      />
    );
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ||
        error.code === ERROR_CODES.STRIPSTREAM.MISSING_CONFIG)
    ) {
      redirect("/settings");
    }

    const errorCode = error instanceof AppError ? error.code : ERROR_CODES.SERIES.FETCH_ERROR;
    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={errorCode} />
      </main>
    );
  }
}
