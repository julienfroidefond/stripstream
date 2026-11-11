import { ReadingListsContent } from "./ReadingListsContent";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
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
      available={surface.data.available}
    />
  );
}
