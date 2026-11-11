import { createMediaRoute } from "@/lib/media/media-route";
import { MEDIA_POLICIES } from "@/lib/media/policies";

export const GET = createMediaRoute({
  provider: "komga",
  policy: MEDIA_POLICIES.komgaFile,
  ref: ({ bookId }) => ({ kind: "book-file", bookId }),
});
