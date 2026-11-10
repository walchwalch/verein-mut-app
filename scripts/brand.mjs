// Lädt Logo/Favicon von der Vereins-Homepage und erzeugt daraus App-Icons, Startbild und Web-Icons.
// Läuft in GitHub Actions (Internetzugang). Ohne Internet wird ein Text-Logo als Ersatz erzeugt.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LOGO_URL = 'https://verein-mut.eu/wp-content/uploads/2020/11/MUT-Logo-Text-weiss-scaled.png';
const GREEN = '#239747', DARK = '#006826';
const out = (...p) => path.join(ROOT, ...p);

async function logo() {
  try {
    const r = await fetch(LOGO_URL, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return sharp(Buffer.from(await r.arrayBuffer())).trim().png().toBuffer();
  } catch (e) {
    console.warn('Logo nicht geladen (' + e.message + ') – Ersatz-Logo wird verwendet');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420"><text x="450" y="250" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="230" fill="#fff" text-anchor="middle">M|U|T</text><text x="450" y="370" font-family="Montserrat, Arial, sans-serif" font-weight="600" font-size="70" fill="#fff" text-anchor="middle">Mensch Umwelt Tier</text></svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
}
async function onGreen(buf, size, ratio, bg = GREEN) {
  const w = Math.round(size * ratio);
  const l = await sharp(buf).resize({ width: w, height: Math.round(size * ratio), fit: 'inside' }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } }).composite([{ input: l, gravity: 'center' }]).flatten({ background: bg }).png().toBuffer();
}

const L = await logo();
await fs.mkdir(out('www/img'), { recursive: true });
await fs.mkdir(out('store'), { recursive: true });
await sharp(L).resize({ width: 520 }).png().toFile(out('www/img/logo-weiss.png'));
const icon = await onGreen(L, 1024, 0.72);
await fs.writeFile(out('store/icon-1024.png'), icon);
await sharp(icon).resize(512).toFile(out('www/img/icon-512.png'));
await sharp(icon).resize(192).toFile(out('www/img/icon-192.png'));
await sharp(icon).resize(180).toFile(out('www/img/apple-touch-icon.png'));
await sharp(icon).resize(64).toFile(out('www/img/favicon.png'));
// iOS-App-Icon (ohne Transparenz) + Startbild
const iosIcon = out('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
try {
  await fs.access(path.dirname(iosIcon));
  await sharp(icon).removeAlpha().toFile(iosIcon);
  const splash = await onGreen(L, 2732, 0.28);
  for (const n of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
    await sharp(splash).removeAlpha().toFile(out('ios/App/App/Assets.xcassets/Splash.imageset', n));
} catch { /* ohne iOS-Ordner nur Web-Icons */ }
console.log('Branding erzeugt.');
