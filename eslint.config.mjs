import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Async Server Components intentionally use try/catch around JSX to provide
  // graceful degradation when data fetching fails. The react-hooks/error-boundaries
  // rule is meant for client components and doesn't apply here.
  {
    files: [
      "src/components/cockpit/**/*.tsx",
      "src/components/socle/Weather.tsx",
    ],
    rules: {
      "react-hooks/error-boundaries": "off",
    },
  },
]);

export default eslintConfig;
