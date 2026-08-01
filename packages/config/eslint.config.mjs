import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

/**
 * Configuration ESLint de base, partagée par tous les paquets.
 * Format « flat config » (ESLint 9).
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/generated/**",
      "**/playwright-report/**",
      "**/next-env.d.ts",
      "**/test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // Les variables préfixées d'un « _ » sont volontairement inutilisées.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Autorise `void promise` pour signaler explicitement un flottant assumé.
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // `any` est une porte ouverte : on l'interdit, `unknown` existe.
      "@typescript-eslint/no-explicit-any": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.mjs", "**/*.js", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Les fichiers de test ont besoin de plus de souplesse.
    files: ["**/*.test.ts", "**/*.test.tsx", "**/e2e/**"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },
  prettier,
);
