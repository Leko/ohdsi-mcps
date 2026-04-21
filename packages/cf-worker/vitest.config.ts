import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      reporter: [
        ["text", { skipFull: false }],
        "text-summary",
        "json-summary",
      ],
      reportsDirectory: "./coverage",
    },
  },
});
