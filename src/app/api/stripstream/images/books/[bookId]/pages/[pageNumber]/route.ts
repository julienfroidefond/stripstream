import {
  createMediaRoute,
  mediaRouteError,
  parseMediaPageNumber,
} from "@/lib/media/media-route";
import { MEDIA_POLICIES } from "@/lib/media/policies";
import { ERROR_CODES } from "@/constants/errorCodes";

export const GET = createMediaRoute({
  provider: "stripstream",
  policy: MEDIA_POLICIES.stripstreamPage,
  ref: ({ bookId, pageNumber }, request) => {
    const page = parseMediaPageNumber(pageNumber);
    if (page === null) {
      return mediaRouteError(400, ERROR_CODES.IMAGE.FETCH_ERROR);
    }
    const query = new URL(request.url).search.slice(1);
    return {
      kind: "book-page",
      bookId,
      pageNumber: page,
      query: query || undefined,
    };
  },
});
