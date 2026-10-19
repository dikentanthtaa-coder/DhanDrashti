// Generates PWA icons (PNG) from an inline SVG using sharp.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const svg = (size, maskable = false) => {
  const pad = maskable ? size * 0.1 : 0;
  const r = maskable ? 0 : size * 0.22;
  const inner = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f766e"/>
      <stop offset="1" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" fill="url(#g)"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${size * 0.56}" fill="#ffffff">₹</text>
  <rect x="${size * 0.3}" y="${size * 0.78}" width="${size * 0.4}" height="${size * 0.045}" rx="${size * 0.02}" fill="#a7f3d0"/>
</svg>`;
};

mkdirSync("public/icons", { recursive: true });
const jobs = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-192.png", 192, true],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, false],
];
for (const [name, size, maskable] of jobs) {
  await sharp(Buffer.from(svg(size, maskable))).png().toFile(`public/icons/${name}`);
}
writeFileSync("public/icons/icon.svg", svg(512));
await sharp(Buffer.from(svg(64))).png().toFile("src/app/icon.png");
console.log("icons generated");
