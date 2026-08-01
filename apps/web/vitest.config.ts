import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Les tests de bout en bout appartiennent à Playwright : les inclure ici
    // ferait charger deux implémentations d'`expect` dans le même processus.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
