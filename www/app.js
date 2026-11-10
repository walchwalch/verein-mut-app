/* Verein M.U.T. – App (läuft als iOS-App über Capacitor und als Web-App im Browser) */
(() => {
'use strict';

// ---------- Einstellungen ----------
const CAP = window.Capacitor;
const NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
const PUBLIC_URL = 'https://spenden.mutig.app'; // vor App-Store-Start auf Vereinsdomain umstellen
const REMOTE_FEED = NATIVE ? PUBLIC_URL + '/data/feed.json' : 'data/feed.json';
const BUNDLED_FEED = 'data/feed.json';
const RUNNER_LABEL = 'at.vereinmut.app.check';
const P = name => (NATIVE && CAP.Plugins && CAP.Plugins[name]) || null;

// ---------- Hilfen ----------
const $ = s => document.querySelector(s);
const main = $('#main');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso, o = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(iso).toLocaleDateString('de-AT', { timeZone: 'Europe/Vienna', ...o });
const fmtTime = iso => new Date(iso).toLocaleTimeString('de-AT', { timeZone: 'Europe/Vienna', hour: '2-digit', minute: '2-digit' });
function relDate(iso) {
  const d = new Date(iso), now = new Date();
  const days = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 864e5);
  if (days === 0) return 'Heute'; if (days === 1) return 'Gestern'; if (days < 7) return `vor ${days} Tagen`;
  return fmtDate(iso, { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
const ICON = {
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7.5h14V12"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-8.7A4.9 4.9 0 0 1 12 6.4a4.9 4.9 0 0 1 9 4.9C19 15.6 12 20 12 20z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c.8-3.8 3.9-6.3 7.5-6.3s6.7 2.5 7.5 6.3"/></svg>',
  hand: '<svg viewBox="0 0 24 24"><path d="M7 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1V4a1.5 1.5 0 0 1 3 0v6m0-4.5a1.5 1.5 0 0 1 3 0V11m0-3a1.5 1.5 0 0 1 3 0v6c0 4-3 7-7 7s-6-2-7.5-4.5L4 13.5c-.8-1.4.9-2.8 2.1-1.8L7 12.5"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1.5 1.5 0 0 1-1.5 1.5A16 16 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4z"/></svg>',
  work: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v2M3 12.5h18"/></svg>',
  people: '<svg viewBox="0 0 24 24"><circle cx="8.5" cy="8.5" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3 19c.5-3 2.7-5 5.5-5s5 2 5.5 5M14.5 14.3c.6-.2 1.3-.3 2-.3 2.4 0 4.2 1.7 4.5 4.5"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/></svg>',
  text: '<svg viewBox="0 0 24 24"><path d="M4 7V5h11v2M9.5 5v14M7.5 19h4M14 12v-1.5h7V12M17.5 10.5V19M16 19h3"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v3.5h3.5M4 13a8 8 0 0 0 14.6 4.5M20 20v-3.5h-3.5"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.7 5.4 3.7 8.5s-1.2 5.9-3.7 8.5c-2.5-2.6-3.7-5.4-3.7-8.5S9.5 6.1 12 3.5z"/></svg>',
  leaf: '<svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15M5 19l7-7"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
};
const CH = {
  web: { name: 'Homepage', short: 'Homepage' }, instagram: { name: 'Instagram', short: 'Instagram' },
  facebook: { name: 'Facebook', short: 'Facebook' }, youtube: { name: 'YouTube', short: 'YouTube' }, tiktok: { name: 'TikTok', short: 'TikTok' },
};

// ---------- Speicher (Capacitor Preferences in der App, sonst localStorage) ----------
const store = {
  async get(k) {
    try { const pr = P('Preferences'); if (pr) return JSON.parse((await pr.get({ key: k })).value || 'null'); return JSON.parse(localStorage.getItem('mut.' + k) || 'null'); } catch { return null; }
  },
  async set(k, v) {
    try { const pr = P('Preferences'); const s = JSON.stringify(v); if (pr) await pr.set({ key: k, value: s }); else localStorage.setItem('mut.' + k, s); } catch { /* Speicher voll/gesperrt */ }
  },
};

// ---------- Bild-Zwischenspeicher (IndexedDB) für Offline-Lesen ----------
const imgCache = (() => {
  let dbp = null; const urls = new Map();
  const db = () => dbp || (dbp = new Promise((res, rej) => { try { const r = indexedDB.open('mut-bilder', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }));
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('img', mode); const r = fn(t.objectStore('img')); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
  async function getBlob(u) { try { return await tx('readonly', s => s.get(u)); } catch { return null; } }
  async function put(u) {
    try { const r = await fetch(u, { mode: 'cors' }); if (!r.ok) return null; const b = await r.blob(); await tx('readwrite', s => s.put(b, u)); return b; } catch { return null; }
  }
  async function src(u) {
    if (!u) return null; if (urls.has(u)) return urls.get(u);
    let b = await getBlob(u); if (!b && navigator.onLine !== false) b = await put(u);
    const s = b ? URL.createObjectURL(b) : u; urls.set(u, s); return s;
  }
  async function prefetch(list) {
    for (const u of list) { if (!u) continue; if (!(await getBlob(u))) await put(u); }
    try { // nicht mehr gebrauchte Bilder entfernen
      const keep = new Set(list); const keys = await tx('readonly', s => s.getAllKeys());
      const del = (keys || []).filter(k => !keep.has(k)); if (del.length) await tx('readwrite', s => del.forEach(k => s.delete(k)));
    } catch { }
  }
  return { src, prefetch };
})();
function hydrateImages(root = document) {
  root.querySelectorAll('img[data-src]').forEach(async img => {
    const u = img.dataset.src; img.removeAttribute('data-src');
    img.src = await imgCache.src(u);
    img.onerror = () => { img.style.visibility = 'hidden'; };
  });
}
const imgTag = (u, alt = '') => u ? `<img data-src="${esc(u)}" alt="${esc(alt)}" loading="lazy" decoding="async">` : '';

// ---------- Zustand ----------
const S = { feed: null, seen: null, bookmarks: new Set(), settings: { notify: false, large: false }, filter: { channel: 'alle', area: 'alle', q: '' }, offline: false, loadedAt: null, newIds: new Set() };
const byId = id => S.feed?.posts.find(p => p.id === id);
const project = slug => S.feed?.projects.find(p => p.slug === slug || p.id === slug);
const areaName = id => S.feed?.areas.find(a => a.id === id)?.name || '';

// ---------- Daten laden ----------
async function loadFeed({ silent } = {}) {
  let fresh = null;
  try {
    const r = await fetch(REMOTE_FEED + (REMOTE_FEED.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 60000), { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    fresh = await r.json();
    await store.set('feed', fresh);
    S.offline = false;
  } catch {
    S.offline = true;
    if (!S.feed) S.feed = await store.get('feed');
    if (!S.feed) { try { S.feed = await (await fetch(BUNDLED_FEED)).json(); } catch { } }
  }
  if (fresh) S.feed = fresh;
  S.loadedAt = new Date();
  updateNew();
  banner();
  if (!silent) render();
  else if (fresh) render(true);
  if (S.feed && navigator.onLine !== false) setTimeout(() => imgCache.prefetch(allImages()), 1200);
  syncRunner();
  return !!fresh;
}
function allImages() {
  const f = S.feed; const out = [];
  f.projects.forEach(p => { out.push(p.image); (p.blocks || []).forEach(b => b.t === 'img' && out.push(b.src)); });
  f.posts.forEach(p => { out.push(p.image); (p.blocks || []).forEach(b => b.t === 'img' && out.push(b.src)); });
  f.events.forEach(e => out.push(e.image));
  return [...new Set(out.filter(Boolean))];
}
function updateNew() {
  if (!S.feed) return;
  const ids = S.feed.posts.map(p => p.id).concat(S.feed.projects.map(p => p.id), S.feed.events.map(e => e.id));
  if (!S.seen) { S.seen = new Set(ids); store.set('seen', [...S.seen]); }
  S.newIds = new Set(ids.filter(id => !S.seen.has(id)));
  const dot = document.querySelector('.tabs a[data-tab="aktuell"] .dot');
  if (dot) dot.hidden = !S.feed.posts.some(p => S.newIds.has(p.id));
}
function markSeen() {
  if (!S.feed) return;
  S.feed.posts.concat(S.feed.projects, S.feed.events).forEach(x => S.seen.add(x.id));
  store.set('seen', [...S.seen].slice(-800));
  const dot = document.querySelector('.tabs a[data-tab="aktuell"] .dot'); if (dot) dot.hidden = true;
}
function banner() {
  const b = $('#banner');
  if (S.offline && S.feed) { b.hidden = false; b.textContent = `Offline – du siehst den gespeicherten Stand vom ${fmtDate(S.feed.generated, { day: 'numeric', month: 'numeric' })}, ${fmtTime(S.feed.generated)} Uhr.`; }
  else b.hidden = true;
}

// ---------- Aktionen ----------
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
async function openLink(url, { external = false } = {}) {
  if (!url) return;
  if (NATIVE) {
    try { if (external || !/^https?:/.test(url)) { await P('AppLauncher').openUrl({ url }); return; } await P('Browser').open({ url, presentationStyle: 'popover', toolbarColor: '#006826' }); return; } catch { }
  }
  if (/^(mailto|tel):/.test(url)) location.href = url; else window.open(url, '_blank', 'noopener');
}
async function share({ title, text, url }) {
  try {
    if (NATIVE && P('Share')) { await P('Share').share({ title, text, url, dialogTitle: 'Teilen' }); return; }
    if (navigator.share) { await navigator.share({ title, text, url }); return; }
    await navigator.clipboard.writeText(url); toast('Link kopiert');
  } catch (e) { if (e && e.name !== 'AbortError' && !/cancel/i.test(e.message || '')) toast('Teilen nicht möglich'); }
}
function toggleBookmark(id) {
  if (S.bookmarks.has(id)) { S.bookmarks.delete(id); toast('Von der Merkliste entfernt'); }
  else { S.bookmarks.add(id); toast('Auf der Merkliste gespeichert'); }
  store.set('bookmarks', [...S.bookmarks]);
  const b = document.querySelector('[data-act="bookmark"]'); if (b) b.setAttribute('aria-pressed', S.bookmarks.has(id));
}
function icsText(e) {
  const d = iso => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const x = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Verein MUT//App//DE', 'BEGIN:VEVENT', 'UID:' + e.id + '@verein-mut.eu', 'DTSTAMP:' + d(new Date().toISOString()),
    'DTSTART:' + d(e.start), 'DTEND:' + d(e.end), 'SUMMARY:' + x(e.title), 'LOCATION:' + x(e.location), 'DESCRIPTION:' + x((e.text || '') + '\n' + e.url), 'URL:' + e.url, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
async function addToCalendar(e) {
  const cal = P('CapacitorCalendar');
  if (cal) {
    try {
      await cal.createEventWithPrompt({ title: e.title, location: e.location || undefined, startDate: Date.parse(e.start), endDate: Date.parse(e.end), isAllDay: !!e.allDay, description: e.text || undefined, url: e.url });
      return;
    } catch (err) { toast('Kalender nicht verfügbar'); return; }
  }
  const blob = new Blob([icsText(e)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = e.title.replace(/[^\wäöüÄÖÜß -]+/g, '').slice(0, 40).trim() + '.ics';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Termin als Kalenderdatei geladen');
}

// ---------- Benachrichtigungen ----------
async function syncRunner() {
  const br = P('BackgroundRunner'); if (!br || !S.feed) return;
  const known = S.feed.posts.map(p => p.id).concat(S.feed.projects.map(p => p.id), S.feed.events.map(e => e.id)).slice(0, 300);
  try { await br.dispatchEvent({ label: RUNNER_LABEL, event: 'syncSettings', details: { notify: !!S.settings.notify, known, feed: REMOTE_FEED } }); } catch { }
}
async function setNotify(on) {
  if (on) {
    const ln = P('LocalNotifications');
    if (!ln) { toast('Benachrichtigungen gibt es in der iPhone-App'); return false; }
    try {
      let p = await ln.checkPermissions();
      if (p.display !== 'granted') p = await ln.requestPermissions();
      if (p.display !== 'granted') { toast('Bitte Mitteilungen in den iPhone-Einstellungen erlauben'); return false; }
    } catch { return false; }
  }
  S.settings.notify = on; await store.set('settings', S.settings); syncRunner();
  toast(on ? 'Du wirst über Neues informiert' : 'Benachrichtigungen aus');
  return true;
}

// ---------- Kopfzeile ----------
function header({ title = '', back = false, actions = '' } = {}) {
  $('#logo').hidden = !!title; const t = $('#title'); t.hidden = !title; t.textContent = title;
  $('#back').hidden = !back; $('#topActions').innerHTML = actions;
  document.title = title ? title + ' – Verein M.U.T.' : 'Verein M.U.T.';
}
const actBtn = (act, icon, label, pressed) => `<button class="icon-btn" data-act="${act}" aria-label="${label}"${pressed !== undefined ? ` aria-pressed="${pressed}"` : ''}>${ICON[icon]}</button>`;

// ---------- Bausteine ----------
const badge = ch => `<span class="badge ${ch}">${CH[ch]?.short || ch}</span>`;
function postCard(p) {
  const isNew = S.newIds.has(p.id);
  return `<a class="card" href="#/beitrag/${encodeURIComponent(p.id)}">
    ${p.image ? `<div class="img">${imgTag(p.image)}${p.video ? `<div class="play" aria-hidden="true"><span>${ICON.play}</span></div>` : ''}</div>` : ''}
    <div class="body"><div class="meta">${badge(p.channel)}${isNew ? '<span class="badge new">Neu</span>' : ''}<span>${relDate(p.date)}</span>${p.place ? `<span>· ${esc(p.place)}</span>` : ''}</div>
    <h3>${esc(p.title)}</h3>${p.text ? `<p>${esc(p.text)}</p>` : ''}</div></a>`;
}
function projectCard(p, row = false) {
  if (row) return `<a class="card row" href="#/projekt/${encodeURIComponent(p.slug)}"><div class="thumb">${imgTag(p.image)}</div><div class="body"><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></div></a>`;
  return `<a class="card" href="#/projekt/${encodeURIComponent(p.slug)}"><div class="img">${imgTag(p.image, p.title)}</div><div class="body"><div class="meta">${esc(areaName(p.area))}</div><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></div></a>`;
}
function eventCard(e) {
  const d = new Date(e.start);
  return `<a class="card row" href="#/termin/${encodeURIComponent(e.id)}"><div class="date-box" aria-hidden="true"><span>${d.toLocaleDateString('de-AT', { weekday: 'short', timeZone: 'Europe/Vienna' })}</span><b>${d.toLocaleDateString('de-AT', { day: 'numeric', timeZone: 'Europe/Vienna' }).replace('.', '')}</b><span>${d.toLocaleDateString('de-AT', { month: 'short', timeZone: 'Europe/Vienna' }).replace('.', '')}</span></div>
    <div class="body"><h3>${esc(e.title)}</h3><p>${e.allDay ? 'Ganztägig' : fmtTime(e.start) + ' – ' + fmtTime(e.end) + ' Uhr'}${e.location ? ' · ' + esc(e.location.split(',')[0]) : ''}</p></div></a>`;
}
function blocksHtml(blocks = []) {
  let h = '', inList = false;
  for (const b of blocks) {
    if (b.t !== 'li' && inList) { h += '</ul>'; inList = false; }
    if (b.t === 'h') h += `<h3>${esc(b.text)}</h3>`;
    else if (b.t === 'p') h += `<p>${esc(b.text)}</p>`;
    else if (b.t === 'li') { if (!inList) { h += '<ul>'; inList = true; } h += `<li>${esc(b.text)}</li>`; }
    else if (b.t === 'img') h += `<figure>${imgTag(b.src, b.alt)}${b.alt && b.alt.length > 3 && !/^img|dsc|whatsapp/i.test(b.alt) ? `<figcaption>${esc(b.alt)}</figcaption>` : ''}</figure>`;
  }
  return h + (inList ? '</ul>' : '');
}
const empty = (msg, icon = 'leaf') => `<div class="empty">${ICON[icon]}<p>${msg}</p></div>`;

// ---------- Seiten ----------
function pageFeed(params) {
  header({ actions: actBtn('refresh', 'refresh', 'Aktualisieren') });
  const f = S.feed;
  const projFilter = params.get('projekt');
  const channels = ['alle', ...Object.keys(CH).filter(c => f.posts.some(p => p.channel === c))];
  const areas = f.areas.filter(a => f.posts.some(p => p.areas.includes(a.id)));
  const q = S.filter.q.trim().toLowerCase();
  let list = f.posts.filter(p => (S.filter.channel === 'alle' || p.channel === S.filter.channel) && (S.filter.area === 'alle' || p.areas.includes(S.filter.area)));
  if (projFilter) list = list.filter(p => (p.projects || []).includes(projFilter));
  if (q) list = list.filter(p => (p.title + ' ' + p.text).toLowerCase().includes(q));
  const pr = projFilter && f.projects.find(p => p.id === projFilter);
  main.innerHTML = `
    <div class="ptr" id="ptr">Zum Aktualisieren ziehen</div>
    <h2>Neuigkeiten</h2>
    ${pr ? `<p class="lead">Beiträge zu <b>${esc(pr.title)}</b> · <a href="#/aktuell">alle anzeigen</a></p>` : `<p class="lead">Von unserer Homepage und unseren Kanälen – in einer Zeitleiste.</p>`}
    <label class="sr" for="q">Beiträge durchsuchen</label>
    <input class="search" id="q" type="search" placeholder="Suchen …" value="${esc(S.filter.q)}" autocomplete="off">
    <div class="filterlabel" id="fl1">Kanal</div>
    <div class="chips" role="group" aria-labelledby="fl1">${channels.map(c => `<button class="chip" data-ch="${c}" aria-pressed="${S.filter.channel === c}">${c === 'alle' ? 'Alle' : CH[c].name}</button>`).join('')}</div>
    ${areas.length ? `<div class="filterlabel" id="fl2">Bereich</div>
    <div class="chips" role="group" aria-labelledby="fl2"><button class="chip" data-area="alle" aria-pressed="${S.filter.area === 'alle'}">Alle Bereiche</button>${areas.map(a => `<button class="chip" data-area="${a.id}" aria-pressed="${S.filter.area === a.id}">${esc(a.name)}</button>`).join('')}</div>` : ''}
    <div class="list grid2" id="feedlist">${list.length ? list.map(postCard).join('') : empty('Keine Beiträge für diese Auswahl.')}</div>
    <p class="small muted" style="margin-top:18px">Stand: ${fmtDate(f.generated, { day: 'numeric', month: 'numeric', year: 'numeric' })}, ${fmtTime(f.generated)} Uhr</p>`;
  main.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { S.filter.channel = b.dataset.ch; render(true); });
  main.querySelectorAll('[data-area]').forEach(b => b.onclick = () => { S.filter.area = b.dataset.area; render(true); });
  const qi = $('#q'); qi.oninput = () => { S.filter.q = qi.value; clearTimeout(qi.t); qi.t = setTimeout(() => { const pos = qi.selectionStart; render(true); const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); }, 250); };
  setTimeout(markSeen, 1500);
}
function pagePost(id) {
  const p = byId(id); if (!p) return notFound();
  header({ title: p.channel === 'web' ? 'Neuigkeit' : CH[p.channel].name, back: true, actions: actBtn('bookmark', 'bookmark', 'Merken', S.bookmarks.has(p.id)) + actBtn('share', 'share', 'Teilen') });
  const linked = (p.projects || []).map(project).filter(Boolean);
  const isSocial = p.channel !== 'web';
  main.innerHTML = `
    ${p.image ? `<div class="hero">${imgTag(p.image, p.title)}${p.video ? `<div class="play" aria-hidden="true"><span>${ICON.play}</span></div>` : ''}</div>` : ''}
    <div class="meta">${badge(p.channel)}<span>${fmtDate(p.date)}</span>${p.place ? `<span>· ${esc(p.place)}</span>` : ''}</div>
    <h2 style="margin-top:8px">${esc(p.title)}</h2>
    <div class="article">${isSocial ? `<p class="caption">${esc(p.text)}</p>` : (p.blocks && p.blocks.length ? blocksHtml(p.blocks) : `<p>${esc(p.text)}</p>`)}</div>
    <div class="actions">
      <button class="btn" data-open="${esc(p.url)}">${ICON.ext}${p.channel === 'web' ? 'Auf der Homepage lesen' : p.video ? `Video auf ${CH[p.channel].name} ansehen` : `Auf ${CH[p.channel].name} öffnen`}</button>
    </div>
    ${linked.length ? `<h3>Zum Projekt</h3><div class="list">${linked.map(x => projectCard(x, true)).join('')}</div>` : ''}`;
  S.acts = ({ share: () => share({ title: p.title, text: p.title + ' – Verein M.U.T.', url: p.url }), bookmark: () => toggleBookmark(p.id) });
}
function pageProjects() {
  header({ actions: actBtn('refresh', 'refresh', 'Aktualisieren') });
  const f = S.feed;
  main.innerHTML = `<h2>Unsere Projekte</h2><p class="lead">Wofür sich der Verein M.U.T. einsetzt – tippe ein Projekt an für Details.</p>` +
    f.areas.map(a => { const ps = f.projects.filter(p => p.area === a.id); return ps.length ? `<div class="area-title">${esc(a.name)}</div><div class="list grid2">${ps.map(p => projectCard(p)).join('')}</div>` : ''; }).join('') +
    (f.projects.length ? '' : empty('Projekte werden geladen …'));
}
function pageProject(slug) {
  const p = project(slug); if (!p) return notFound();
  header({ title: p.title, back: true, actions: actBtn('bookmark', 'bookmark', 'Merken', S.bookmarks.has(p.id)) + actBtn('share', 'share', 'Teilen') });
  const posts = S.feed.posts.filter(x => (x.projects || []).includes(p.id));
  const events = S.feed.events.filter(x => (x.projects || []).includes(p.id));
  main.innerHTML = `
    ${p.image ? `<div class="hero">${imgTag(p.image, p.title)}</div>` : ''}
    <div class="meta"><span class="badge">${esc(areaName(p.area))}</span></div>
    <h2 style="margin-top:8px">${esc(p.headline && p.headline.length < 120 ? p.headline : p.title)}</h2>
    <div class="article">${blocksHtml(p.blocks.filter(b => b.text !== p.headline))}</div>
    <div class="actions">
      <button class="btn" data-open="${esc(p.url)}">${ICON.globe}Zur Projektseite auf der Homepage</button>
      <a class="btn light" href="#/mitmachen">${ICON.hand}Projekt unterstützen</a>
    </div>
    ${events.length ? `<h3>Termine</h3><div class="list">${events.map(eventCard).join('')}</div>` : ''}
    ${posts.length ? `<h3>Neuigkeiten zum Projekt</h3><div class="list">${posts.slice(0, 4).map(postCard).join('')}</div>${posts.length > 4 ? `<div class="actions"><a class="btn outline" href="#/aktuell?projekt=${encodeURIComponent(p.id)}">Alle ${posts.length} Beiträge</a></div>` : ''}` : ''}`;
  S.acts = ({ share: () => share({ title: p.title, text: p.title + ' – ein Projekt des Verein M.U.T.', url: p.url }), bookmark: () => toggleBookmark(p.id) });
}
function pageEvents() {
  header({ actions: actBtn('refresh', 'refresh', 'Aktualisieren') });
  const ev = S.feed.events.filter(e => new Date(e.end) > Date.now() - 3 * 3600e3);
  let h = `<h2>Termine</h2><p class="lead">Veranstaltungen im Verein – mit einem Tipp in deinen Kalender.</p>`, month = '';
  if (!ev.length) h += empty('Derzeit sind keine Termine eingetragen.', 'clock') + `<div class="actions"><button class="btn outline" data-open="${esc(S.feed.links.events)}">${ICON.ext}Veranstaltungen auf der Homepage</button></div>`;
  else { h += '<div class="list">'; for (const e of ev) { const m = fmtDate(e.start, { month: 'long', year: 'numeric' }); if (m !== month) { h += `</div><div class="month">${m}</div><div class="list">`; month = m; } h += eventCard(e); } h += '</div>'; }
  main.innerHTML = h;
}
function pageEvent(id) {
  const e = S.feed.events.find(x => x.id === id); if (!e) return notFound();
  header({ title: 'Termin', back: true, actions: actBtn('bookmark', 'bookmark', 'Merken', S.bookmarks.has(e.id)) + actBtn('share', 'share', 'Teilen') });
  const sameDay = fmtDate(e.start) === fmtDate(e.end);
  const when = e.allDay ? fmtDate(e.start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' (ganztägig)'
    : fmtDate(e.start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '<br>' + fmtTime(e.start) + ' – ' + (sameDay ? '' : fmtDate(e.end) + ', ') + fmtTime(e.end) + ' Uhr';
  const linked = (e.projects || []).map(project).filter(Boolean);
  main.innerHTML = `
    ${e.image ? `<div class="hero">${imgTag(e.image, e.title)}</div>` : ''}
    <h2>${esc(e.title)}</h2>
    <div class="facts"><div>${ICON.clock}<span>${when}</span></div>${e.location ? `<div>${ICON.pin}<span><a href="#" data-map="${esc(e.location)}">${esc(e.location)}</a></span></div>` : ''}</div>
    <div class="actions"><button class="btn" data-act="calendar">${ICON.cal}In Kalender eintragen</button></div>
    <div class="article">${e.blocks && e.blocks.length ? blocksHtml(e.blocks) : `<p>${esc(e.text)}</p>`}</div>
    <div class="actions"><button class="btn outline" data-open="${esc(e.url)}">${ICON.ext}Termin auf der Homepage (Anmeldung)</button></div>
    ${linked.length ? `<h3>Zum Projekt</h3><div class="list">${linked.map(x => projectCard(x, true)).join('')}</div>` : ''}`;
  S.acts = ({ calendar: () => addToCalendar(e), share: () => share({ title: e.title, text: `${e.title} – ${fmtDate(e.start)}`, url: e.url }), bookmark: () => toggleBookmark(e.id) });
  main.querySelectorAll('[data-map]').forEach(a => a.onclick = ev => { ev.preventDefault(); openLink('https://maps.apple.com/?q=' + encodeURIComponent(a.dataset.map), { external: true }); });
}
function pageJoin() {
  header({});
  const L = S.feed.links, O = S.feed.org, C = S.feed.channels;
  const tile = (icon, title, sub, url, wide) => `<button class="tile${wide ? ' wide' : ''}" data-open="${esc(url)}"><span class="ic">${ICON[icon]}</span><span style="display:flex;flex-direction:column;gap:3px"><b>${title}</b><span>${sub}</span></span></button>`;
  main.innerHTML = `
    <h2>Mitmachen</h2><p class="lead">Es gibt viele Wege, Menschen, Umwelt und Tieren zu helfen.</p>
    <div class="tiles">
      ${tile('user', 'Mitglied werden', 'Fördermitglied werden und regelmäßig helfen', L.mitglied)}
      ${tile('hand', 'Ehrenamt', 'Zeit und Arbeitskraft spenden', L.ehrenamt)}
      ${tile('people', 'Social Volunteering', 'Engagement mit dem Team deiner Firma', L.socialVolunteering)}
      ${tile('box', 'Sachspenden', 'Was wir gerade brauchen', L.sachspenden)}
      ${tile('work', 'Praktika & Jobs', 'Arbeiten beim Verein M.U.T.', L.jobs)}
      ${tile('mail', 'Kontakt', 'Schreib uns oder ruf an', L.kontakt)}
    </div>
    <h3>Spenden</h3>
    <div class="note">Spenden sind nur über unsere Homepage möglich, nicht in der App. Der Knopf öffnet die Homepage in Safari.</div>
    <div class="actions"><button class="btn warm" data-ext="${esc(L.spenden)}">${ICON.heart}Spenden auf verein-mut.eu</button></div>
    <h3>Direkt erreichen</h3>
    <div class="menu">
      <a href="mailto:${esc(O.email)}">${ICON.mail}<span class="grow">E-Mail<small>${esc(O.email)}</small></span>${ICON.chev}</a>
      <a href="tel:${esc(O.phone.replace(/\s/g, ''))}">${ICON.phone}<span class="grow">Telefon<small>${esc(O.phone)}</small></span>${ICON.chev}</a>
      <button data-map="${esc(O.address)}">${ICON.pin}<span class="grow">Vereinszentrum<small>${esc(O.address)}</small></span>${ICON.chev}</button>
    </div>
    <h3>Unsere Kanäle</h3>
    <div class="menu">
      ${C.instagram ? `<button data-ext="${esc(C.instagram)}">${ICON.globe}<span class="grow">Instagram<small>@verein_mut</small></span>${ICON.chev}</button>` : ''}
      ${C.facebook ? `<button data-ext="${esc(C.facebook)}">${ICON.globe}<span class="grow">Facebook</span>${ICON.chev}</button>` : ''}
      ${C.youtube ? `<button data-ext="${esc(C.youtube)}">${ICON.play}<span class="grow">YouTube</span>${ICON.chev}</button>` : ''}
      ${C.podcast ? `<button data-ext="${esc(C.podcast)}">${ICON.mic}<span class="grow">Podcast</span>${ICON.chev}</button>` : ''}
      ${C.tiktok ? `<button data-ext="${esc(C.tiktok)}">${ICON.play}<span class="grow">TikTok</span>${ICON.chev}</button>` : ''}
      <button data-open="${esc(L.home)}">${ICON.globe}<span class="grow">Homepage<small>verein-mut.eu</small></span>${ICON.chev}</button>
    </div>`;
  main.querySelectorAll('[data-ext]').forEach(b => b.onclick = () => openLink(b.dataset.ext, { external: true }));
  main.querySelectorAll('[data-map]').forEach(b => b.onclick = () => openLink('https://maps.apple.com/?q=' + encodeURIComponent(b.dataset.map), { external: true }));
}
function pageMore() {
  header({});
  main.innerHTML = `
    <h2>Mehr</h2>
    <div class="menu">
      <a href="#/merkliste">${ICON.bookmark}<span class="grow">Merkliste<small>${S.bookmarks.size ? S.bookmarks.size + ' gespeichert' : 'Projekte, Beiträge und Termine merken'}</small></span>${ICON.chev}</a>
    </div>
    <h3>Einstellungen</h3>
    <div class="menu">
      <label>${ICON.bell}<span class="grow">Benachrichtigungen<small>Bei neuen Projekten, Beiträgen und Terminen${NATIVE ? '' : ' (nur in der iPhone-App)'}</small></span><span class="switch"><input type="checkbox" id="sw-notify" ${S.settings.notify ? 'checked' : ''} ${NATIVE ? '' : 'disabled'} aria-label="Benachrichtigungen"><i></i></span></label>
      <label>${ICON.text}<span class="grow">Größere Schrift<small>Texte in der App vergrößern</small></span><span class="switch"><input type="checkbox" id="sw-large" ${S.settings.large ? 'checked' : ''} aria-label="Größere Schrift"><i></i></span></label>
      <button data-act="refresh">${ICON.refresh}<span class="grow">Jetzt aktualisieren<small>Stand: ${S.feed ? fmtDate(S.feed.generated, { day: 'numeric', month: 'numeric' }) + ', ' + fmtTime(S.feed.generated) + ' Uhr' : '–'}</small></span></button>
    </div>
    <h3>Über die App</h3>
    <div class="menu">
      <a href="#/info">${ICON.info}<span class="grow">Über den Verein</span>${ICON.chev}</a>
      <a href="#/datenschutz">${ICON.shield}<span class="grow">Datenschutz</span>${ICON.chev}</a>
      <a href="#/impressum">${ICON.info}<span class="grow">Impressum</span>${ICON.chev}</a>
    </div>
    <p class="small muted">Version 1.0 · Inhalte automatisch von verein-mut.eu und den offiziellen Kanälen des Vereins.</p>`;
  $('#sw-notify').onchange = async ev => { const ok = await setNotify(ev.target.checked); if (!ok) ev.target.checked = S.settings.notify; };
  $('#sw-large').onchange = ev => { S.settings.large = ev.target.checked; document.documentElement.classList.toggle('large', S.settings.large); store.set('settings', S.settings); };
}
function pageBookmarks() {
  header({ title: 'Merkliste', back: true });
  const f = S.feed; const ids = [...S.bookmarks].reverse();
  const items = ids.map(id => { const p = f.projects.find(x => x.id === id); if (p) return projectCard(p, true); const po = byId(id); if (po) return postCard(po); const e = f.events.find(x => x.id === id); return e ? eventCard(e) : ''; }).filter(Boolean);
  main.innerHTML = `<h2>Merkliste</h2>` + (items.length ? `<div class="list">${items.join('')}</div>` : empty('Noch nichts gemerkt. Tippe bei einem Projekt, Beitrag oder Termin oben auf das Lesezeichen.', 'bookmark'));
}
function pageInfo() {
  header({ title: 'Über den Verein', back: true });
  const O = S.feed.org;
  main.innerHTML = `<h2>${esc(O.name)}</h2><div class="article"><p>${esc(O.purpose)}</p><p>Der Verein wurde 2005 in Wien gegründet und ist heute in Wien, Salzburg, St. Pölten und im Mostviertel tätig.</p></div>
    <div class="actions"><button class="btn" data-open="${esc(S.feed.links.home)}">${ICON.globe}verein-mut.eu besuchen</button></div>`;
}
function pagePrivacy() {
  header({ title: 'Datenschutz', back: true });
  const O = S.feed.org;
  main.innerHTML = `<div class="legal"><h2>Datenschutz in der App</h2>
    <p><b>Kurz gesagt:</b> Die App braucht kein Konto, speichert keine persönlichen Daten auf unseren Servern, enthält keine Werbung und keine Tracker oder Analyse-Werkzeuge.</p>
    <h3>Welche Daten die App lädt</h3><p>Die App lädt öffentlich verfügbare Inhalte (Projekte, Beiträge, Termine, Bilder) von ${esc(PUBLIC_URL.replace('https://', ''))} und verein-mut.eu. Dabei wird – wie bei jedem Website-Aufruf – deine IP-Adresse technisch übermittelt; die Anbieter (GitHub Pages als Hoster, der Webserver von verein-mut.eu) speichern sie kurzzeitig in Server-Protokollen. Es werden keine Cookies gesetzt.</p>
    <h3>Was nur auf deinem Gerät gespeichert wird</h3><p>Zwischengespeicherte Inhalte zum Offline-Lesen, deine Merkliste, gelesene Beiträge und deine Einstellungen. Diese Daten verlassen dein Gerät nicht. Wenn du die App löschst, sind sie weg.</p>
    <h3>Benachrichtigungen</h3><p>Nur wenn du sie einschaltest und das iPhone dich um Erlaubnis fragt. Die App prüft dann gelegentlich im Hintergrund, ob es Neues gibt, und zeigt eine Mitteilung direkt auf deinem Gerät an. Es wird dafür keine Gerätekennung an uns oder Dritte übertragen.</p>
    <h3>Kalender</h3><p>Beim Eintragen eines Termins öffnet sich der Kalender deines iPhones. Die App liest deinen Kalender nicht.</p>
    <h3>Links nach außen</h3><p>Wenn du einen Link zur Homepage oder zu Instagram, Facebook, YouTube oder TikTok öffnest, gelten dort die Datenschutzbestimmungen des jeweiligen Anbieters. Für verein-mut.eu: <a href="#" data-open="${esc(S.feed.links.datenschutzWeb)}">Datenschutzerklärung der Homepage</a>.</p>
    <h3>Verantwortlich und Kontakt</h3><p>${esc(O.legalName)}, ${esc(O.address)}<br>Datenschutz: <a href="mailto:${esc(O.privacyEmail)}">${esc(O.privacyEmail)}</a></p>
    <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie auf Beschwerde bei der Österreichischen Datenschutzbehörde (dsb.gv.at).</p></div>`;
}
function pageImprint() {
  header({ title: 'Impressum', back: true });
  const O = S.feed.org;
  main.innerHTML = `<div class="legal"><h2>Impressum</h2>
    <h3>Medieninhaber und Herausgeber</h3><p>${esc(O.legalName)}<br>ZVR-Zahl: ${esc(O.zvr)}</p>
    <h3>Vereinssitz und Zustellanschrift</h3><p>${esc(O.address)}</p>
    <h3>Kontakt</h3><p>E-Mail: <a href="mailto:${esc(O.email)}">${esc(O.email)}</a><br>Telefon: <a href="tel:${esc(O.phone.replace(/\s/g, ''))}">${esc(O.phone)}</a><br>Website: <a href="#" data-open="${esc(S.feed.links.home)}">verein-mut.eu</a></p>
    <h3>Vorstand und Vertretungsbefugnis</h3><p>${esc(O.board)}</p>
    <h3>Vereinszweck</h3><p>${esc(O.purpose)}</p>
    <h3>Grundlegende Richtung (§ 25 MedienG)</h3><p>Die App informiert über Ziele, Projekte, Aktivitäten und Veranstaltungen des Vereins M.U.T.</p>
    <p class="small muted">Vollständiges Impressum: <a href="#" data-open="${esc(S.feed.links.impressum)}">verein-mut.eu/impressum</a></p></div>`;
}
function notFound() { header({ title: 'Nicht gefunden', back: true }); main.innerHTML = empty('Dieser Inhalt ist nicht mehr verfügbar.') + `<div class="actions"><a class="btn" href="#/aktuell">Zu den Neuigkeiten</a></div>`; }

function bindActions(map) {
  document.querySelectorAll('[data-act]').forEach(b => {
    const a = b.dataset.act;
    b.onclick = a === 'refresh' ? async () => { toast('Wird aktualisiert …'); const ok = await loadFeed({ silent: true }); toast(ok ? 'Auf dem neuesten Stand' : 'Keine Verbindung – gespeicherter Stand'); } : map[a];
  });
  main.querySelectorAll('[data-open]').forEach(b => b.onclick = ev => { ev.preventDefault(); openLink(b.dataset.open); });
}

// ---------- Navigation ----------
let depth = 0;
function route() {
  const [path, query = ''] = (location.hash || '#/aktuell').slice(1).split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { tab: parts[0] || 'aktuell', id: parts[1], params: new URLSearchParams(query) };
}
function render(keepScroll) {
  const y = window.scrollY;
  if (!S.feed) { header({}); main.innerHTML = '<div class="list"><div class="skeleton"></div><div class="skeleton"></div></div>'; return; }
  const r = route();
  const tabOf = { beitrag: 'aktuell', projekt: 'projekte', termin: 'termine', merkliste: 'mehr', datenschutz: 'mehr', impressum: 'mehr', info: 'mehr' };
  const activeTab = tabOf[r.tab] || r.tab;
  document.querySelectorAll('.tabs a').forEach(a => { if (a.dataset.tab === activeTab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const pages = { aktuell: () => pageFeed(r.params), beitrag: () => pagePost(r.id), projekte: pageProjects, projekt: () => pageProject(r.id), termine: pageEvents, termin: () => pageEvent(r.id), mitmachen: pageJoin, mehr: pageMore, merkliste: pageBookmarks, info: pageInfo, datenschutz: pagePrivacy, impressum: pageImprint };
  S.acts = {};
  (pages[r.tab] || pages.aktuell)();
  bindActions(S.acts);
  hydrateImages(main);
  hydrateImages(document.getElementById('top'));
  if (keepScroll) window.scrollTo(0, y); else { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
}
window.addEventListener('hashchange', () => { depth++; render(); });
$('#back').onclick = () => { if (depth > 0 && history.length > 1) { depth -= 2; history.back(); } else location.hash = '#/' + ({ beitrag: 'aktuell', projekt: 'projekte', termin: 'termine' }[route().tab] || 'mehr'); };

// Zum Aktualisieren nach unten ziehen
(() => {
  let y0 = null, dy = 0;
  window.addEventListener('touchstart', e => { y0 = window.scrollY <= 0 && route().tab === 'aktuell' ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
  window.addEventListener('touchmove', e => { if (y0 === null) return; dy = e.touches[0].clientY - y0; const p = $('#ptr'); if (p) { p.style.height = Math.min(Math.max(dy - 10, 0), 50) + 'px'; p.textContent = dy > 80 ? 'Loslassen zum Aktualisieren' : 'Zum Aktualisieren ziehen'; } }, { passive: true });
  window.addEventListener('touchend', async () => { const p = $('#ptr'); if (y0 !== null && dy > 80) { if (p) p.textContent = 'Wird aktualisiert …'; await loadFeed({ silent: true }); } if (p) p.style.height = '0'; y0 = null; });
})();

// ---------- Start ----------
async function start() {
  S.settings = { ...S.settings, ...(await store.get('settings') || {}) };
  document.documentElement.classList.toggle('large', !!S.settings.large);
  S.bookmarks = new Set(await store.get('bookmarks') || []);
  const seen = await store.get('seen'); S.seen = seen ? new Set(seen) : null;
  S.feed = await store.get('feed');
  if (S.feed) { updateNew(); render(); }
  else render();
  await loadFeed({ silent: !!S.feed });
  if (NATIVE) {
    try { P('StatusBar')?.setStyle({ style: 'DARK' }); } catch { }
    try { P('SplashScreen')?.hide(); } catch { }
    try { P('App')?.addListener('resume', () => loadFeed({ silent: true })); } catch { }
    try { P('LocalNotifications')?.addListener('localNotificationActionPerformed', () => { location.hash = '#/aktuell'; }); } catch { }
  } else if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  window.addEventListener('online', () => loadFeed({ silent: true }));
  window.addEventListener('offline', () => { S.offline = true; banner(); });
}
start();
})();
