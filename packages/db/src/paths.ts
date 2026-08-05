import path from "node:path";
import { fileURLToPath } from "node:url";

// packages/db/src/paths.ts -> repo root is three levels up. Anchoring here
// (rather than process.cwd()) means PGLITE_PATH resolves to the same file
// whether it's read from apps/api or from a packages/db CLI script.
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export function resolveFromRepoRoot(maybeRelativePath: string): string {
  return path.isAbsolute(maybeRelativePath) ? maybeRelativePath : path.join(REPO_ROOT, maybeRelativePath);
}
