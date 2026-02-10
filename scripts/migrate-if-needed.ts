import process from "node:process";
import { spawnSync } from "node:child_process";

const shouldRunMigrations = process.env.RUN_DB_MIGRATIONS === "1";

if (!shouldRunMigrations) {
  console.log(
    "[migrate] Skipping migrations (set RUN_DB_MIGRATIONS=1 to enable).",
  );
  process.exit(0);
}

console.log("[migrate] Running migrations...");
const result = spawnSync("bun", ["run", "db:migrate"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
