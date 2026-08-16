/**
 * Copies the MapLibre GL worker bundle into public/maplibre/ so the browser can
 * load it from a stable, same-origin URL.
 *
 * Why this exists: MapLibre v6 splits the web worker into its own
 * `maplibre-gl-worker.mjs`, which in turn does a *relative* import of
 * `./maplibre-gl-shared.mjs`. Webpack's `new URL(..., import.meta.url)` asset
 * handling emits the worker file but does not follow that relative import, so
 * the worker boots and then 404s on its sibling. Serving both files together
 * from public/ keeps the relative import intact.
 *
 * Runs automatically via the postinstall / predev / prebuild npm hooks, so a
 * `maplibre-gl` version bump can never leave a stale worker behind.
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(ROOT, "node_modules", "maplibre-gl", "dist");
const OUT_DIR = join(ROOT, "public", "maplibre");

// The worker plus the shared chunk it imports relatively. Keep in sync with
// the import at the top of maplibre-gl-worker.mjs.
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const version = JSON.parse(
  readFileSync(join(ROOT, "node_modules", "maplibre-gl", "package.json"), "utf8")
).version;

mkdirSync(OUT_DIR, { recursive: true });
for (const file of FILES) {
  copyFileSync(join(SRC_DIR, file), join(OUT_DIR, file));
}

console.log(`synced maplibre-gl ${version} worker -> public/maplibre/`);
