// Legt beim App-Build den aktuellen Inhaltsstand in die App (für den allerersten Start ohne Internet).
import fs from 'node:fs/promises';
const URL_ = (process.env.PUBLIC_URL || 'https://spenden.mutig.app') + '/data/feed.json';
await fs.mkdir('www/data', { recursive: true });
try {
  const r = await fetch(URL_, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const feed = await r.json();
  await fs.writeFile('www/data/feed.json', JSON.stringify(feed));
  console.log('Inhaltsstand übernommen:', feed.generated, feed.posts.length, 'Beiträge');
} catch (e) { console.error('Inhaltsstand nicht geladen:', e.message); process.exit(1); }
