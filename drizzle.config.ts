import "dotenv/config"; // load DATABASE_URL from .env for the db:* scripts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // drizzle-kit reads DATABASE_URL from the environment. For local pushes,
    // export it or pass it inline: `DATABASE_URL=... npm run db:push`.
    url: process.env.DATABASE_URL!,
  },
});
