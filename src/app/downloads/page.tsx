import { PageHeader } from "@/components/layout/PageHeader";
import { DownloadManager } from "@/components/downloads/DownloadManager";

export default function DownloadsPage() {
  return (
    <>
      <PageHeader title="Téléchargements" description="Gérez vos livres disponibles hors ligne" />
      <DownloadManager />
    </>
  );
}
