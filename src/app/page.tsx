import { getProvider } from "@/lib/providers/provider.factory";
import { HomeContent } from "@/components/home/HomeContent";
import { HomeClientWrapper } from "@/components/home/HomeClientWrapper";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { FavoriteService } from "@/lib/services/favorite.service";
import { PreferencesService } from "@/lib/services/preferences.service";
import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";
import { redirect } from "next/navigation";

export default async function HomePage() {
  try {
    const provider = await getProvider();
    if (!provider) redirect("/settings");

    const [homeData, favorites, preferences] = await Promise.all([
      provider.getHomeData(),
      FavoriteService.listFavorites(),
      PreferencesService.getPreferences().catch(() => null),
    ]);

    // Enrich the books that power the hero with their per-book details
    // (BookDetails has `summary` + UUID seriesId on Stripstream, where list
    // endpoints only give the series name). We then look up matching series
    // metadata (genres / authors / series-level summary) as a richer fallback.
    const heroBookIds = Array.from(
      new Set(
        [...(homeData.onDeck ?? []), ...(homeData.ongoingBooks ?? [])].map((b) => b.id)
      )
    );
    const enrichedHeroBooks = (
      await Promise.all(
        heroBookIds.map((id) => provider.getBook(id).catch(() => null))
      )
    ).filter((b): b is NormalizedBook => b !== null);

    const heroBookById = new Map(enrichedHeroBooks.map((b) => [b.id, b] as const));
    const mergeBook = (b: NormalizedBook): NormalizedBook => {
      const enriched = heroBookById.get(b.id);
      return enriched ? { ...b, ...enriched } : b;
    };

    const heroSeriesIds = Array.from(
      new Set(enrichedHeroBooks.map((b) => b.seriesId).filter((id): id is string => !!id))
    );
    const heroSeries = (
      await Promise.all(
        heroSeriesIds.map((id) => provider.getSeriesById(id).catch(() => null))
      )
    ).filter((s): s is NormalizedSeries => s !== null);

    const data = {
      ...homeData,
      onDeck: (homeData.onDeck ?? []).map(mergeBook),
      ongoingBooks: (homeData.ongoingBooks ?? []).map(mergeBook),
      favorites,
      heroSeries,
    };

    return (
      <HomeClientWrapper>
        <HomeContent data={data} isAnonymous={preferences?.anonymousMode ?? false} />
      </HomeClientWrapper>
    );
  } catch (error) {
    if (error instanceof AppError && (
      error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ||
      error.code === ERROR_CODES.STRIPSTREAM.MISSING_CONFIG
    )) {
      redirect("/settings");
    }

    const errorCode = error instanceof AppError ? error.code : ERROR_CODES.HOME.FETCH_ERROR;

    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage errorCode={errorCode} />
      </main>
    );
  }
}
