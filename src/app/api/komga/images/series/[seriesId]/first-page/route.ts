import { createMediaRoute } from "@/lib/media/media-route";
import { MEDIA_POLICIES } from "@/lib/media/policies";

export const GET = createMediaRoute({
  provider: "komga",
  policy: MEDIA_POLICIES.komgaImage,
  ref: ({ seriesId }) => ({ kind: "series-cover", seriesId }),
});
