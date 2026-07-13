// Generates lib/version.json from the current git commit so the running
// app can display which commit it was built from. Runs as a pre-build/
// pre-dev step (see package.json); the output is gitignored and always
// regenerated, so it can't go stale relative to what's actually deployed.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "version.json");

function git(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

let version;
try {
  version = {
    sha: git("git rev-parse HEAD"),
    shortSha: git("git rev-parse --short HEAD"),
    date: git("git log -1 --format=%cd --date=format:%Y-%m-%d"),
  };
} catch {
  version = { sha: "unknown", shortSha: "unknown", date: "unknown" };
}

writeFileSync(outPath, JSON.stringify(version, null, 2) + "\n");
