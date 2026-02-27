<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.0 | Updated: 2026-02-27 -->

# Technical Domain

**Purpose**: Tech stack, architecture, development patterns for this project.
**Last Updated**: 2026-02-27

## Quick Reference
**Update Triggers**: Tech stack changes | New patterns | Architecture decisions
**Audience**: Developers, AI agents

## Primary Stack
| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Next.js | 15.5.9 | App Router, Server Components |
| Language | TypeScript | 5.3.3 | Type safety |
| Database | MongoDB | - | Flexible schema for media metadata |
| ORM | Prisma | 6.17.1 | Type-safe DB queries |
| Styling | Tailwind CSS | 3.4.1 | Utility-first |
| UI Library | Radix UI | - | Accessible components |
| Animation | Framer Motion | 12.x | Declarative animations |
| Auth | NextAuth | v5 | Session management |
| Validation | Zod | 3.22.4 | Schema validation |
| Logger | Pino | 10.x | Structured logging |

## Project Structure
```
src/
├── app/           # Next.js App Router pages
├── components/   # React components (ui/, features/)
├── lib/          # Services, utils, config
│   └── services/ # Business logic (BookService, etc.)
├── hooks/        # Custom React hooks
├── types/        # TypeScript type definitions
├── utils/        # Helper functions
├── contexts/     # React contexts
├── constants/    # App constants
└── i18n/         # Internationalization
```

## Code Patterns
### API Endpoint
```typescript
import { NextResponse } from "next/server";
import { BookService } from "@/lib/services/book.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";

export async function GET(request: NextRequest, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    const bookId: string = (await params).bookId;
    const data = await BookService.getBook(bookId);
    return NextResponse.json(data);
  } catch (error) {
    logger.error({ err: error }, "API Books - Erreur:");
    if (error instanceof AppError) {
      const isNotFound = error.code === ERROR_CODES.BOOK.NOT_FOUND;
      return NextResponse.json(
        { error: { code: error.code, name: "Error", message: getErrorMessage(error.code) } },
        { status: isNotFound ? 404 : 500 }
      );
    }
    return NextResponse.json(
      { error: { code: ERROR_CODES.BOOK.NOT_FOUND, name: "Error", message: "Internal error" } },
      { status: 500 }
    );
  }
}
```

### Component with Variants
```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center...", {
  variants: {
    variant: { default: "...", destructive: "...", outline: "..." },
    size: { default: "...", sm: "...", lg: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonProps, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
```

### Feature Component
```typescript
import type { KomgaBook } from "@/types/komga";

interface HomeContentProps {
  data: HomeData;
}

export function HomeContent({ data }: HomeContentProps) {
  return (
    <div className="space-y-12">
      {data.ongoing && <MediaRow titleKey="home.sections.continue" items={data.ongoing} />}
    </div>
  );
}
```

## Naming Conventions
| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | book-cover.tsx |
| Components | PascalCase | BookCover |
| Functions | camelCase | getBookById |
| Types | PascalCase | KomgaBook |
| Database | snake_case | read_progress |
| API Routes | kebab-case | /api/komga/books |

## Code Standards
- TypeScript strict mode enabled
- Zod for request/response validation
- Prisma for all database queries (type-safe)
- Server Components by default, Client Components when needed
- Custom AppError class with error codes
- Structured logging with Pino
- Error responses: `{ error: { code, name, message } }`

## Security Requirements
- Validate all user input with Zod
- Parameterized queries via Prisma (prevents SQL injection)
- Sanitize before rendering (React handles this)
- HTTPS only in production
- Auth via NextAuth v5
- Role-based access control (admin, user)
- API routes protected with session checks

## 📂 Codebase References
**API Routes**: `src/app/api/**/route.ts` - All API endpoints
**Services**: `src/lib/services/*.service.ts` - Business logic layer
**Components**: `src/components/ui/`, `src/components/*/` - UI and feature components
**Types**: `src/types/**` - TypeScript definitions
**Config**: package.json, tsconfig.json, prisma/schema.prisma

## Related Files
- business-domain.md - Business logic and domain model
- decisions-log.md - Architecture decisions
