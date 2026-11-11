import { ReadingListsContent } from "./ReadingListsContent";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ERROR_CODES } from "@/constants/errorCodes";
import { loadSurface } from "@/lib/surfaces/load-surface";

export default async function ReadingListsPage() {
  const surface = await loadSurface({
    name: "reading-lists",
    fallbackCode: ERROR_CODES.STRIPSTREAM.CONNECTION_ERROR,
    load: async ({ provider, providerType }) => {
      const isStripstream = providerType === "stripstream";
      const lists = isStripstream ? await provider.getHomeReadingLists() : [];
      return { lists, isStripstream };
    },
  });

  if (surface.status !== "ready") {
    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorMessage
          errorCode={surface.status === "error" ? surface.code : ERROR_CODES.STRIPSTREAM.CONNECTION_ERROR}
        />
      </main>
    );
  }

  return (
    <ReadingListsContent
      lists={surface.data.lists}
      isStripstream={surface.data.isStripstream}
    />
  );
}
