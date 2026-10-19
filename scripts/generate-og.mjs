// Generates public/og.png (1200x630) for social sharing.
import sharp from "sharp";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#064e3b"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="80" y="80" width="96" height="96" rx="24" fill="#10b981"/>
  <text x="128" y="148" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="56" fill="#fff">₹</text>
  <text x="200" y="150" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="56" fill="#fff">DhanDrashti</text>
  <text x="80" y="300" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="64" fill="#fff">Know where your money goes, in ₹.</text>
  <text x="80" y="370" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#a7f3d0">Expenses · Budgets with alerts · Savings goals · Recurring bills · Reports</text>
  <text x="80" y="540" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#94a3b8">Private, installable personal finance app for India</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile("public/og.png");
console.log("og.png generated");
