<!-- Context: project-intelligence/living-notes | Priority: low | Version: 1.0 | Updated: 2026-02-27 -->

# Living Notes

**Purpose**: Development notes, TODOs, and temporary information.
**Last Updated**: 2026-02-27

## Quick Reference
- **Update When**: Adding dev notes, tracking issues
- **Audience**: Developers

---

## Current Focus

- Performance optimization (see PLAN_OPTIMISATION_PERFORMANCES.md)
- Reducing bundle size
- Image optimization

---

## Development Notes

### Service Layer
All business logic lives in `src/lib/services/`. API routes are thin wrappers.

### API Error Handling
Use `AppError` class from `@/utils/errors`. Always include error code from `ERROR_CODES`.

### Component Patterns
- UI components: `src/components/ui/` (Radix + Tailwind)
- Feature components: `src/components/*/` (by feature)
- Use `cva` for variant props
- Use `cn` from `@/lib/utils` for class merging

### Types
- Komga types: `src/types/komga/`
- App types: `src/types/`

### Database
- Prisma schema: `prisma/schema.prisma`
- MongoDB connection: `src/lib/prisma.ts`

---

## Known Issues

- Large libraries may be slow to load (pagination helps)
- Offline storage limited by device space

---

## Future Ideas

- [ ] Add more reader modes
- [ ] User collections/tags
- [ ] Reading statistics
- [ ] Better caching strategy

---

## Related Files
- `technical-domain.md` - Code patterns
- `decisions-log.md` - Architecture decisions
