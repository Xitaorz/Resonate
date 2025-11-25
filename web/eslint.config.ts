import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";
import pluginRouter from "@tanstack/eslint-plugin-router";
import { fileURLToPath } from "node:url";

export default defineConfig([
  ...pluginRouter.configs["flat/recommended"],
  globalIgnores(["**/dist/**", "**/node_modules/**"]),

  {
    name: "eslint/js",
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: { globals: globals.browser },
    extends: [js.configs.recommended],
  },

  {
    name: "eslint/ts",
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: fileURLToPath(new URL(".", import.meta.url)),
      },
    },
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      pluginReact.configs.flat.recommended,
      pluginReact.configs.flat["jsx-runtime"],
    ],
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
]);
