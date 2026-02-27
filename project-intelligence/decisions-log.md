<!-- Context: project-intelligence/decisions | Priority: medium | Version: 1.0 | Updated: 2026-02-27 -->

# Decisions Log

**Purpose**: Record architecture decisions with context and rationale.
**Last Updated**: 2026-02-27

## Quick Reference
- **Update When**: New architecture decisions
- **Audience**: Developers, architects

---

## ADR-001: Use Prisma with MongoDB

**Date**: 2024
**Status**: Accepted

**Context**: Need database for caching Komga responses and storing user preferences.

**Decision**: Use Prisma ORM with MongoDB adapter.

**Rationale**:
- Type-safe queries across the app
- Schema migration support
- Works well with MongoDB's flexible schema

**Alternatives Considered**:
- Mongoose: Less type-safe, manual schema management
- Raw MongoDB driver: No type safety, verbose

---

## ADR-002: Service Layer Pattern

**Date**: 2024
**Status**: Accepted

**Context**: API routes need business logic separated from HTTP handling.

**Decision**: Create service classes in `src/lib/services/` (BookService, SeriesService, etc.)

**Rationale**:
- Separation of concerns
- Testable business logic
- Reusable across API routes

**Example**:
```typescript
// API route (thin)
export async function GET(request: NextRequest, { params }) {
  const book = await BookService.getBook(bookId);
  return NextResponse.json(book);
}

// Service (business logic)
class BookService {
  static async getBook(bookId: string) { ... }
}
```

---

## ADR-003: Custom AppError with Error Codes

**Date**: 2024
**Status**: Accepted

**Context**: Need consistent error handling across API.

**Decision**: Custom `AppError` class with error codes from `ERROR_CODES` constant.

**Rationale**:
- Consistent error format: `{ error: { code, name, message } }`
- Typed error codes for client handling
- Centralized error messages via `getErrorMessage()`

---

## ADR-004: Radix UI + Tailwind for Components

**Date**: 2024
**Status**: Accepted

**Context**: Need accessible UI components without fighting a component library.

**Decision**: Use Radix UI primitives with custom Tailwind styling.

**Rationale**:
- Radix provides accessible primitives
- Full control over styling via Tailwind
- Shadcn-like pattern (cva + cn)

---

## ADR-005: Client-Side Request Deduplication

**Date**: 2024
**Status**: Accepted

**Context**: Multiple components may request same data (e.g., home page with series, books, continue reading).

**Decision**: `RequestDeduplicationService` with React query-like deduplication.

**Rationale**:
- Reduces Komga API calls
- Consistent data across components
- Configurable TTL

---

## ADR-006: PWA with Offline Book Storage

**Date**: 2024
**Status**: Accepted

**Context**: Users want to read offline, especially on mobile.

**Decision**: Next PWA + Service Worker + IndexedDB for storing book blobs.

**Rationale**:
- Full offline capability
- Background sync when online
- Local storage limits on mobile

---

## Related Files
- `technical-domain.md` - Tech stack details
- `business-domain.md` - Business context
