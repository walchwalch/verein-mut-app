// Läuft im Hintergrund (iOS entscheidet, wann – meist alle paar Stunden).
// Prüft, ob es neue Beiträge/Projekte/Termine gibt, und zeigt dann eine Mitteilung auf dem Gerät.
// Es wird nichts an einen Server gemeldet.
function kvGet(key) {
  try { var r = CapacitorKV.get(key); if (r && typeof r === 'object') return r.value || null; return r || null; } catch (e) { return null; }
}
addEventListener('syncSettings', function (resolve, reject, args) {
  try {
    CapacitorKV.set('notify', args && args.notify ? '1' : '0');
    if (args && args.known) CapacitorKV.set('known', JSON.stringify(args.known));
    if (args && args.feed) CapacitorKV.set('feed', args.feed);
    resolve();
  } catch (e) { reject(e); }
});
addEventListener('checkNews', async function (resolve, reject) {
  try {
    if (kvGet('notify') !== '1') { resolve(); return; }
    var url = kvGet('feed') || 'https://spenden.mutig.app/data/feed.json';
    var res = await fetch(url);
    var feed = await res.json();
    var known = JSON.parse(kvGet('known') || '[]');
    var set = {}; known.forEach(function (id) { set[id] = 1; });
    var items = [];
    feed.projects.forEach(function (p) { if (!set[p.id]) items.push({ id: p.id, title: 'Neues Projekt: ' + p.title }); });
    feed.events.forEach(function (e) { if (!set[e.id]) items.push({ id: e.id, title: 'Neuer Termin: ' + e.title }); });
    feed.posts.forEach(function (p) { if (!set[p.id]) items.push({ id: p.id, title: p.title }); });
    if (known.length && items.length) {
      CapacitorNotifications.schedule([{
        id: Math.floor(Date.now() / 1000) % 2000000000,
        title: items.length === 1 ? 'Neu beim Verein M.U.T.' : items.length + ' Neuigkeiten beim Verein M.U.T.',
        body: items[0].title.slice(0, 140),
      }]);
    }
    var all = feed.posts.map(function (p) { return p.id; }).concat(feed.projects.map(function (p) { return p.id; }), feed.events.map(function (e) { return e.id; }));
    CapacitorKV.set('known', JSON.stringify(known.concat(all).slice(-600)));
    resolve();
  } catch (e) { reject(e); }
});
