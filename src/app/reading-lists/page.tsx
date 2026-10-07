import { redirect } from "next/navigation";
import { ReadingListsContent } from "./ReadingListsContent";
import { getActiveProviderType, getProvider } from "@/lib/providers/provider.factory";

export default async function ReadingListsPage() {
  const [provider, providerType] = await Promise.all([
    getProvider(),
    getActiveProviderType(),
  ]);

  if (!provider) redirect("/settings");

  const isStripstream = providerType === "stripstream";
  const lists = isStripstream ? await provider.getHomeReadingLists() : [];

  return <ReadingListsContent lists={lists} isStripstream={isStripstream} />;
}
