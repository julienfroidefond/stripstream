import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` runs during `pnpm install` (postinstall) and in Docker
// builds where DATABASE_URL is not provided yet, so use a plain fallback
// instead of config's `env()` helper (which throws when the variable is unset).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/data/stripstream.db",
  },
});
