import { ERROR_CODES } from "@/constants/errorCodes";
import {
  createMediaRoute,
  mediaRouteError,
  parseMediaPageNumber,
} from "@/lib/media/media-route";
import { MEDIA_POLICIES } from "@/lib/media/policies";

export const GET = createMediaRoute({
  provider: "komga",
  policy: MEDIA_POLICIES.komgaReaderPage,
  ref: ({ bookId, pageNumber }) => {
    const page = parseMediaPageNumber(pageNumber);
    if (page === null) {
      return mediaRouteError(
        400,
        ERROR_CODES.IMAGE.FETCH_ERROR,
        "Image fetch error"
      );
    }
    return { kind: "book-page", bookId, pageNumber: page };
  },
});
