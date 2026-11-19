// MapLibre runs its map drawing in a Web Worker loaded from a separate file.
// Bundlers don't ship that file, so we serve it ourselves from /public.
// Runs automatically after `npm install` (see "postinstall" in package.json).
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/vendor", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/vendor/maplibre-gl-worker.mjs");
console.log("Copied MapLibre worker to public/vendor/");
