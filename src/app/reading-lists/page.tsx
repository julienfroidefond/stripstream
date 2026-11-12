import { ReadingListsContent } from "./ReadingListsContent";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
import { ERROR_CODES } from "@/constants/errorCodes";
import { loadSurface } from "@/lib/surfaces/load-surface";

export default async function ReadingListsPage() {
  const surface = await loadSurface({
    name: "reading-lists",
    fallbackCode: ERROR_CODES.STRIPSTREAM.CONNECTION_ERROR,
    load: async ({ provider }) => {
      const available = provider.supportsReadingLists;
      const lists = available ? await provider.getReadingLists() : [];
      return { lists, available };
    },
  });

  return (
    <SurfaceBoundary
      surface={surface}
      ready={(data) => (
        <ReadingListsContent lists={data.lists} available={data.available} />
      )}
    />
  );
}
