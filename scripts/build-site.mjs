// Stellt die Website zusammen: Web-App (www/) + feed.json + Bilder + Datenschutz-/Supportseite.
import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'dist'));
const DOMAIN = process.env.PAGES_DOMAIN || 'spenden.mutig.app';
await fs.mkdir(OUT, { recursive: true });
await fs.cp(path.join(ROOT, 'www'), OUT, { recursive: true, filter: s => !s.endsWith('.DS_Store') && !s.includes(path.join('www', 'data')) });
for (const page of ['datenschutz', 'support']) {
  await fs.mkdir(path.join(OUT, page), { recursive: true });
  await fs.copyFile(path.join(ROOT, 'site', page + '.html'), path.join(OUT, page, 'index.html'));
}
await fs.copyFile(path.join(ROOT, 'site', 'seite.css'), path.join(OUT, 'seite.css'));
await fs.writeFile(path.join(OUT, 'CNAME'), DOMAIN + '\n');
await fs.writeFile(path.join(OUT, '.nojekyll'), '');
// Service-Worker-Version an Build koppeln, damit Updates sicher ankommen
const sw = path.join(OUT, 'sw.js');
await fs.writeFile(sw, (await fs.readFile(sw, 'utf8')).replace("'mut-v1'", `'mut-${Date.now()}'`));
console.log('Website zusammengestellt in', OUT);
