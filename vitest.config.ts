import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      exclude: [
        "dist/**",
        "coverage/**",
        "tests/**",
        "src/server.ts",
        "src/db/checkConnection.ts",
        "src/scripts/**",
        "src/dev/**",
        "src/types/**",
      ],
    },
  },
});
