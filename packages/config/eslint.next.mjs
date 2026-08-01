import base from "./eslint.config.mjs";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/**
 * Configuration ESLint pour l'application Next.js.
 *
 * La règle la plus importante ici est `no-restricted-syntax` sur
 * `"use client"` dans les fichiers `page.tsx` / `layout.tsx` : marquer une page
 * entière comme composant client annule le bénéfice des React Server
 * Components (cf. ADR-0001) et ferait exploser le budget JavaScript sans
 * qu'aucun test ne s'en aperçoive. La régression est donc détectée
 * mécaniquement plutôt qu'à la relecture.
 */
export default [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ["src/app/**/page.tsx", "src/app/**/layout.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExpressionStatement > Literal[value='use client']",
          message:
            "Une page ou un layout ne doit pas être un composant client (ADR-0001). " +
            "Extrayez la partie interactive dans un composant dédié marqué \"use client\".",
        },
      ],
    },
  },
];
