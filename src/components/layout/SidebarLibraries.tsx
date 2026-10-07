import { getProvider } from "@/lib/providers/provider.factory";
import { SidebarLibrariesView } from "./SidebarLibrariesView";

export async function SidebarLibraries() {
  const user = await import("@/lib/auth-utils")
    .then((m) => m.getCurrentUser())
    .catch(() => null);
  if (!user) return null;

  const provider = await getProvider();
  const libraries = provider ? await provider.getLibraries().catch(() => []) : [];
  return <SidebarLibrariesView libraries={libraries} />;
}
