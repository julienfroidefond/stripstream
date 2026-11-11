import { createMediaRoute } from "@/lib/media/media-route";
import { MEDIA_POLICIES } from "@/lib/media/policies";

export const GET = createMediaRoute({
  provider: "stripstream",
  policy: MEDIA_POLICIES.stripstreamThumbnail,
  ref: ({ bookId }) => ({ kind: "book-cover", bookId }),
});
