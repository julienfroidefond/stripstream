import { DownloadManager } from "@/components/downloads/DownloadManager";
import { withPageTiming } from "@/lib/hoc/withPageTiming";

function DownloadsPage() {
  return (
    <>
      <DownloadManager />
    </>
  );
}

export default withPageTiming("DownloadsPage", DownloadsPage);
