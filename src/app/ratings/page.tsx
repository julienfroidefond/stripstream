import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  countReadSeries,
  filterReadSeries,
  getReadSeries,
  paginateReadSeries,
  parseReadSeriesSort,
  sortReadSeries,
  type ReadSeriesFilter,
} from "@/lib/services/read-series.service";
import { loadSurface } from "@/lib/surfaces/load-surface";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
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
  const { q, filter: rawFilter, page: rawPage, sort: rawSort } = await searchParams;

  const query = (q ?? "").slice(0, MAX_QUERY_LENGTH);
  const filter = parseFilter(rawFilter);
  const sort = parseReadSeriesSort(rawSort);

  const surface = await loadSurface({
    name: "ratings",
    fallbackCode: ERROR_CODES.SERIES.FETCH_ERROR,
    requireCapability: "ratings",
    load: async ({ provider }) => {
      const allSeries = await getReadSeries(provider);
      const counts = countReadSeries(allSeries);
      const matchingSeries = sortReadSeries(filterReadSeries(allSeries, query, filter), sort);
      const slice = paginateReadSeries(matchingSeries, parsePage(rawPage), PAGE_SIZE);

      return {
        series: slice.items,
        counts,
        page: slice.page,
        totalPages: slice.totalPages,
      };
    },
  });

  return (
    <SurfaceBoundary
      surface={surface}
      unavailable={() => <RatingsUnavailable />}
      ready={(data) => (
        <RatingsContent
          series={data.series}
          counts={data.counts}
          query={query}
          filter={filter}
          sort={sort}
          page={data.page}
          totalPages={data.totalPages}
        />
      )}
    />
  );
}
