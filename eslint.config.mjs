import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off", // Disable the base rule as it can conflict with TypeScript
      // React Compiler-era rules from eslint-plugin-react-hooks v7 (bundled by
      // Next 16). purity and immutability are enforced (the codebase is clean).
      // set-state-in-effect stays a warning: the remaining hits are all
      // legitimate "fetch data on mount" effects whose full removal needs a
      // data-fetching-layer change, not a hooks tweak.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
