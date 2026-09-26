import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(scriptDir, "..");
const repoRoot = join(webRoot, "..", "..");
const sourceDir = join(repoRoot, "node_modules", "maplibre-gl", "dist");
const targetDir = join(webRoot, "public", "maplibre");

await mkdir(targetDir, { recursive: true });

for (const filename of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(join(sourceDir, filename), join(targetDir, filename));
}

console.log("Prepared MapLibre worker assets in public/maplibre");
