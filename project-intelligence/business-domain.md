<!-- Context: project-intelligence/business | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Business Domain

**Purpose**: Business context, problems solved, and value created for the comic/manga reader app.
**Last Updated**: 2026-02-27

## Quick Reference
- **Update When**: Business direction changes, new features shipped
- **Audience**: Developers needing context, stakeholders

## Project Identity
```
Project Name: Stripstream
Tagline: Modern web reader for digital comics and manga
Problem: Need a responsive, feature-rich web interface for reading comics from Komga servers
Solution: Next.js PWA that syncs with Komga API, supports offline reading, multiple reading modes
```

## Target Users
| Segment | Who | Needs | Pain Points |
|---------|-----|-------|--------------|
| Comic/Manga Readers | Users with Komga servers | Read comics in browser | Komga web UI is limited |
| Mobile Readers | iPad/Android users | Offline reading, touch gestures | No native mobile app |
| Library Organizers | Users with large collections | Search, filter, track progress | Hard to manage |

## Value Proposition
**For Users**:
- Read comics anywhere via responsive PWA
- Offline reading with local storage
- Multiple viewing modes (single/double page, RTL, scroll)
- Progress sync with Komga server
- Light/Dark mode, language support (EN/FR)

**For Business**:
- Open source showcase
- Demonstrates Next.js + Komga integration patterns

## Key Features
- **Sync**: Read progress, series/books lists with Komga
- **Reader**: RTL, double/single page, zoom, thumbnails, fullscreen
- **Offline**: PWA with local book downloads
- **UI**: Dark/light, responsive, loading/error states
- **Lists**: Pagination, search, mark read/unread, favorites
- **Settings**: Cache TTL, Komga config, display preferences

## Tech Stack Context
- Integrates with **Komga** (comic server API)
- Uses **MongoDB** for local caching/preferences
- **NextAuth** for authentication (session-based)

## Success Metrics
| Metric | Target |
|--------|--------|
| Page load | <2s |
| Reader responsiveness | 60fps |
| PWA install rate | Track via analytics |

## Constraints
- Requires Komga server (not standalone)
- Mobile storage limits for offline books

## Related Files
- `technical-domain.md` - Tech stack and code patterns
- `business-tech-bridge.md` - Business-technical mapping
