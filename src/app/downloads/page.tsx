import { DownloadManager } from "@/components/downloads/DownloadManager";
import { withPageTiming } from "@/lib/hoc/withPageTiming";

export const dynamic = 'force-dynamic';

function DownloadsPage() {
  return (
    <>
      <DownloadManager />
    </>
  );
}

export default withPageTiming("DownloadsPage", DownloadsPage);
