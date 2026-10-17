// Generates the PWA PNG icons from public/favicon.svg (run once: npm run icons)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const svg = readFileSync(path.join(publicDir, "favicon.svg"));

const targets = [
  { file: "pwa-192.png", size: 192 },
  { file: "pwa-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(path.join(publicDir, file));
}

// Maskable icon: logo at 80% on a full-bleed brand background (safe zone for Android masks)
const inner = await sharp(svg, { density: 512 }).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#EA580C" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(path.join(publicDir, "pwa-maskable-512.png"));

console.log("Icons generated in", publicDir);
