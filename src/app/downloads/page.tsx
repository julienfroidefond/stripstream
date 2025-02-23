import { PageHeader } from "@/components/layout/PageHeader";
import { DownloadManager } from "@/components/downloads/DownloadManager";
import { withPageTiming } from "@/lib/hoc/withPageTiming";

function DownloadsPage() {
  return (
    <>
      <PageHeader title="Téléchargements" description="Gérez vos livres disponibles hors ligne" />
      <DownloadManager />
    </>
  );
}

export default withPageTiming("DownloadsPage", DownloadsPage);
