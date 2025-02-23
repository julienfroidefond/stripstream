import { LibrariesContent } from "@/components/libraries/LibrariesContent";
import { LibraryService } from "@/lib/services/library.service";
import { withPageTiming } from "@/lib/hoc/withPageTiming";

async function LibrariesPage() {
  try {
    const libraries = await LibraryService.getLibraries();
    return <LibrariesContent libraries={libraries} />;
  } catch (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Une erreur est survenue"}
          </p>
        </div>
      </main>
    );
  }
}

export default withPageTiming("LibrariesPage", LibrariesPage);
