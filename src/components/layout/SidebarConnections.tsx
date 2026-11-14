import { listConnections } from "@/app/actions/connections";
import { ProviderSwitcher } from "@/components/layout/ProviderSwitcher";

export async function SidebarConnections() {
  const user = await import("@/lib/auth/session")
    .then((m) => m.getCurrentUser())
    .catch(() => null);
  if (!user) return null;

  // L'échec est déjà journalisé par le runner. On masque le sélecteur plutôt
  // que d'afficher « aucune connexion » à tort.
  const result = await listConnections();
  if (!result.success) return null;

  return <ProviderSwitcher lists={result.lists} />;
}
