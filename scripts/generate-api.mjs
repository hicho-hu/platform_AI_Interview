import { execFileSync } from "node:child_process";
const schema = process.env.ADMIN_OPENAPI_URL || "docs/openapi.json";
execFileSync(
  process.execPath,
  [
    "node_modules/openapi-typescript/bin/cli.js",
    schema,
    "-o",
    "src/generated/api.d.ts",
  ],
  { stdio: "inherit" },
);
