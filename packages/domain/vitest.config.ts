import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts", "src/**/index.ts"],
      // Seuils élevés : ce paquet ne contient que du calcul pur (ADR-0011).
      // Un bug ici est silencieux et corrompt durablement la progression.
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
});
