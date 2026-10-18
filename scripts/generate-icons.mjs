// Generates the app's logo and PWA icons from the brand masters in brand/
// (run after changing the logo: npm run icons)
//   brand/monkii-logo-sticker.png  gorilla with its cream sticker border (used in the app)
//   brand/monkii-logo.png          the same without the border (for light backgrounds, print)
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const sticker = path.join(root, "brand", "monkii-logo-sticker.png");
const INK = "#1A0F05"; // monkii-ink, the dark theme background

const resized = (size) => sharp(sticker).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });

// Logo shown in the header and on the sign-in pages (up to 64 px wide, so 3x)
await resized(192).webp({ quality: 90 }).toFile(path.join(root, "src", "assets", "monkii-logo.webp"));

// Browser tab and installed app: transparent, full logo
for (const [file, size] of [["favicon-32.png", 32], ["favicon-48.png", 48], ["pwa-192.png", 192], ["pwa-512.png", 512]]) {
  await resized(size).png().toFile(path.join(publicDir, file));
}

// Icons that cannot be transparent: the logo on the dark brand background.
// Maskable icons keep the logo inside the 80% safe zone of Android masks.
async function onInk(file, size, ratio) {
  const inner = await resized(Math.round(size * ratio)).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: INK } })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toFile(path.join(publicDir, file));
}
await onInk("apple-touch-icon.png", 180, 0.86);
await onInk("pwa-maskable-512.png", 512, 0.74);

console.log("Logo and icons generated");
