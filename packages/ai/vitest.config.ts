import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // adapters/anthropic.ts n'est exercé que par la suite « en direct »
      // (AI_LIVE=1, manuelle, jamais en CI — ADR-0011) : il ne peut pas être
      // couvert par des tests hors ligne sans se réduire à un mock du SDK
      // qui ne prouverait rien de plus que les tests de contrat déjà passés
      // sur adapters/fake.ts.
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts",
        "src/**/index.ts",
        "src/adapters/anthropic.ts",
      ],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
});
