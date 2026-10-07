import { listKomgaConfigs } from "@/app/actions/config";
import { listStripstreamConfigs } from "@/app/actions/stripstream-config";
import { ProviderSwitcher } from "@/components/layout/ProviderSwitcher";

export async function SidebarConnections() {
  const user = await import("@/lib/auth-utils")
    .then((m) => m.getCurrentUser())
    .catch(() => null);
  if (!user) return null;

  const [komgaConfigs, stripstreamConfigs] = await Promise.all([
    listKomgaConfigs().catch(() => []),
    listStripstreamConfigs().catch(() => []),
  ]);
  return (
    <ProviderSwitcher
      komgaConfigs={komgaConfigs}
      stripstreamConfigs={stripstreamConfigs}
    />
  );
}
