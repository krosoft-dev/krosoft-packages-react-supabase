import { createReactConfig } from "@krosoft/tooling-eslint-react";

export default [
  { ignores: ["*.config.js"] },
  ...createReactConfig({
    tsconfigRootDir: import.meta.dirname,
    project: ["./tsconfig.eslint.json"],
  }),
];
