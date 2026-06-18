import { defineConfig } from "vitest/config";
import path from "node:path";

// Resolve the `@/*` alias (tsconfig paths) so tests can import app modules.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
