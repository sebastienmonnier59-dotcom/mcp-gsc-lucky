#!/usr/bin/env node
/**
 * Build script : transpile TS → JS avec esbuild (rapide, pas de typecheck).
 * Pour le typecheck, utilisez `npm run typecheck` (tsc --noEmit).
 */
import { build } from "esbuild";
import { chmodSync, existsSync, rmSync, mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";

const SRC = "src";
const OUT = "dist";

// Clean
if (existsSync(OUT)) {
  rmSync(OUT, { recursive: true, force: true });
}
mkdirSync(OUT, { recursive: true });

// Collecte tous les .ts (sauf tests)
function walkTs(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkTs(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

const entryPoints = walkTs(SRC);

await build({
  entryPoints,
  outdir: OUT,
  outbase: SRC,
  platform: "node",
  format: "esm",
  target: "node18",
  bundle: false,
  sourcemap: false,
  logLevel: "info",
});

// chmod +x sur les bin
for (const bin of ["dist/index.js", "dist/auth.js"]) {
  if (existsSync(bin)) {
    chmodSync(bin, 0o755);
    console.log(`chmod +x ${bin}`);
  }
}

console.log(`Build complete: ${entryPoints.length} files → ${OUT}/`);
