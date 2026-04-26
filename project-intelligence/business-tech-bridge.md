<!-- Context: project-intelligence/bridge | Priority: medium | Version: 1.0 | Updated: 2026-02-27 -->

# Business-Tech Bridge

**Purpose**: Map business concepts to technical implementation.
**Last Updated**: 2026-02-27

## Quick Reference
- **Update When**: New features that bridge business and tech
- **Audience**: Developers, product

---

## Business → Technical Mapping

| Business Concept | Technical Implementation |
|-----------------|------------------------|
| Read comics | `BookService.getBook()`, BookReader component |
| Sync progress | Komga API calls in `ReadProgressService` |
| Offline reading | Service Worker + IndexedDB via `ClientOfflineBookService` |
| User preferences | MongoDB + `PreferencesService` |
| Library management | `LibraryService`, `SeriesService` |
| Authentication | NextAuth v5 + `AuthServerService` |

---

## User Flows → API Routes

| User Action | API Route | Service |
|-------------|-----------|---------|
| View home | `GET /api/komga/home` | `HomeService` |
| Browse series | `GET /api/komga/libraries/:id/series` | `SeriesService` |
| Read book | `GET /api/komga/books/:id` | `BookService` |
| Update progress | `POST /api/komga/books/:id/read-progress` | `BookService` |
| Download book | `GET /api/komga/images/books/:id/pages/:n` | `ImageService` |

---

## Components → Services

| UI Component | Service Layer |
|--------------|---------------|
| HomeContent | HomeService |
| SeriesGrid | SeriesService |
| BookCover | BookService |
| BookReader | ImageService |
| FavoritesButton | FavoriteService |
| SettingsPanel | PreferencesService |

---

## Data Flow

```
User Request → API Route → Service → Komga API / MongoDB → Response
                ↓
            Logger (Pino)
```

---

## Related Files
- `technical-domain.md` - Tech stack and code patterns
- `business-domain.md` - Business context
- `decisions-log.md` - Architecture decisions
