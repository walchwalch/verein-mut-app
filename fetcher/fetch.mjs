// Abholdienst: holt Projekte, Beiträge, Termine (Homepage) und Beiträge der eigenen Social-Media-Kanäle
// und schreibt alles in <out>/data/feed.json. Bilder werden verkleinert nach <out>/media/ gespiegelt,
// damit die App sie offline speichern kann. Zugangsdaten kommen nur aus Umgebungsvariablen (GitHub-Secrets).
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { XMLParser } from 'fast-xml-parser';
import { SITE, PUBLIC_URL, ORG, CHANNELS, LINKS, YOUTUBE_CHANNEL_ID, CATEGORY_TO_AREA, KEYWORD_TO_AREA, STOPWORDS, LIMITS } from './config.mjs';

const OUT = path.resolve(process.argv[2] || 'dist');
const MEDIA = path.join(OUT, 'media');
const UA = 'VereinMUT-App-Feed/1.0 (+' + PUBLIC_URL + ')';
const GRAPH = 'https://graph.facebook.com/v23.0';
const log = (...a) => console.log('[feed]', ...a);
const warn = (...a) => console.warn('[feed] WARNUNG:', ...a);

// ---------- Hilfsfunktionen ----------
async function get(url, opt = {}, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { ...opt, headers: { 'User-Agent': UA, ...(opt.headers || {}) }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${url.replace(/access_token=[^&]+/, 'access_token=***')}`);
      return r;
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise(res => setTimeout(res, 1500 * i));
    }
  }
}
const getJSON = (u, o) => get(u, o).then(r => r.json());
const getText = (u, o) => get(u, o).then(r => r.text());
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
const clean = s => (s || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const htmlText = h => clean(cheerio.load('<div>' + (h || '') + '</div>')('div').text());
const norm = s => (s || '').toLowerCase().replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z0-9]+/g, ' ');
const slugify = s => norm(s).trim().replace(/\s+/g, '-');
const short = (s, n = 220) => { s = clean(s).replace(/\n+/g, ' '); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + ' …' : s; };
const absUrl = u => { try { return new URL(u, SITE).href; } catch { return null; } };

// ---------- Bilder spiegeln ----------
const mirrored = new Map();
async function mirror(url, width = 900) {
  if (!url) return null;
  if (mirrored.has(url)) return mirrored.get(url);
  const p = (async () => {
    try {
      const buf = Buffer.from(await (await get(url, {}, 2)).arrayBuffer());
      const name = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16) + '.jpg';
      const img = sharp(buf, { failOn: 'none' }).rotate().resize({ width, withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 74, mozjpeg: true });
      await fs.writeFile(path.join(MEDIA, name), await img.toBuffer());
      return PUBLIC_URL + '/media/' + name;
    } catch (e) { warn('Bild nicht geladen:', url.slice(0, 120), e.message); return null; }
  })();
  mirrored.set(url, p);
  return p;
}

// ---------- Inhaltsblöcke aus HTML ----------
function imgSrc($, el) {
  const e = $(el);
  const srcset = e.attr('data-lazy-srcset') || e.attr('srcset') || '';
  // größte Variante bis ca. 1024 px aus srcset
  const cands = srcset.split(',').map(s => s.trim().split(/\s+/)).filter(a => a[0]).map(([u, w]) => [u, parseInt(w) || 0]).filter(a => a[1] <= 1100).sort((a, b) => b[1] - a[1]);
  const u = cands[0]?.[0] || e.attr('data-lazy-src') || e.attr('data-src') || e.attr('src');
  if (!u || u.startsWith('data:') || /\.svg(\?|$)/i.test(u)) return null;
  const w = parseInt(e.attr('width') || '0');
  if (w && w < 200) return null; // Icons/Logos überspringen
  return absUrl(u);
}
const CTA = /jetzt spenden|sofort helfen|spende zählt|spenden und|unterstütze unsere|fördermitglied werden|newsletter/i;
function blocksFromHtml(html, { elementor = false } = {}) {
  const $ = cheerio.load(html || '');
  $('script,style,noscript,form,iframe,button,.elementor-widget-button,.elementor-widget-posts,.elementor-widget-form,.sharedaddy,.jp-relatedposts,nav').remove();
  const blocks = []; let chars = 0;
  const push = b => {
    if (blocks.length >= LIMITS.blocks || chars > LIMITS.textChars) return;
    if (b.text) {
      b.text = clean(b.text);
      if (!b.text || b.text.startsWith('«') || b.text.length < 2) return;
      if (b.text.length < 260 && CTA.test(b.text)) return;
      if (blocks.some(x => x.text === b.text)) return;
      chars += b.text.length;
    }
    if (b.src && blocks.some(x => x.src === b.src)) return;
    blocks.push(b);
  };
  const walk = root => {
    root.find('h1,h2,h3,h4,h5,p,li,img').each((_, el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'img') { const s = imgSrc($, el); if (s) push({ t: 'img', src: s, alt: clean($(el).attr('alt') || '') }); return; }
      if (tag === 'p' && $(el).closest('li').length) return;
      if (tag === 'li' && $(el).find('li').length) return;
      const text = $(el).text();
      push({ t: /^h/.test(tag) ? 'h' : tag === 'li' ? 'li' : 'p', text });
    });
  };
  if (elementor && $('[data-widget_type]').length) {
    $('[data-widget_type]').each((_, w) => {
      const type = ($(w).attr('data-widget_type') || '').split('.')[0];
      if (type === 'heading') push({ t: 'h', text: $(w).find('.elementor-heading-title').text() });
      else if (type === 'text-editor' || type === 'toggle' || type === 'accordion' || type === 'icon-list') {
        const root = $(w);
        if (!root.find('p,li,h2,h3,h4').length) push({ t: 'p', text: root.text() }); else walk(root);
      } else if (type === 'image' || type === 'image-gallery' || type === 'gallery' || type === 'image-box') walk($(w));
    });
  } else walk($.root());
  // Absätze, die nur aus Überschriften-Duplikaten bestehen, rauswerfen; mehrere Zeilen in einem Absatz trennen
  return blocks.flatMap(b => b.t === 'p' && b.text.includes('\n') ? b.text.split('\n').filter(Boolean).map(text => ({ t: 'p', text })) : [b]);
}
async function mirrorBlocks(blocks, maxImgs = 8) {
  let n = 0; const out = [];
  for (const b of blocks) {
    if (b.t === 'img') { if (n >= maxImgs) continue; const src = await mirror(b.src); if (src) { out.push({ ...b, src }); n++; } }
    else out.push(b);
  }
  return out;
}
const firstText = (blocks, min = 60) => (blocks.find(b => b.t === 'p' && b.text.length >= min) || blocks.find(b => b.t === 'p'))?.text || '';

// ---------- Projekte aus dem Menü „Was macht MUT?“ ----------
async function loadProjects() {
  const html = await getText(SITE + '/');
  const $ = cheerio.load(html);
  const top = $('nav.elementor-nav-menu--main a').filter((_, a) => /was macht mut/i.test($(a).text())).first();
  if (!top.length) throw new Error('Menü „Was macht MUT?“ nicht gefunden');
  const areas = [], list = [], seen = new Map();
  top.closest('li').children('ul').children('li').each((_, li) => {
    const name = clean($(li).children('a').first().text());
    const id = slugify(name);
    areas.push({ id, name });
    $(li).children('ul').find('a').each((_, a) => {
      const href = absUrl($(a).attr('href') || '');
      if (!href || !href.startsWith(SITE)) return;
      const u = new URL(href); const slug = u.pathname.split('/').filter(Boolean).pop();
      if (!slug) return;
      if (seen.has(slug)) { seen.get(slug).areas.push(id); return; }
      const p = { slug, menuTitle: clean($(a).text()), url: u.origin + u.pathname, area: id, areas: [id] };
      seen.set(slug, p); list.push(p);
    });
  });
  log('Projekte im Menü:', list.length, 'Bereiche:', areas.map(a => a.name).join(', '));
  const projects = (await pool(list, 4, async p => {
    try {
      let page = (await getJSON(`${SITE}/wp-json/wp/v2/pages?slug=${encodeURIComponent(p.slug)}&_embed=wp:featuredmedia`))[0];
      let blocks, title, image, modified;
      if (page) {
        title = htmlText(page.title.rendered);
        blocks = blocksFromHtml(page.content.rendered, { elementor: true });
        image = featured(page);
        modified = page.modified_gmt + 'Z';
      } else {
        const h = await getText(p.url); const $p = cheerio.load(h);
        const main = $p('[data-elementor-type="wp-page"],[data-elementor-type="wp-post"]').first();
        title = clean($p('meta[property="og:title"]').attr('content') || $p('title').text()).replace(/\s*[-–|]\s*Verein MUT\s*$/i, '');
        blocks = blocksFromHtml(main.length ? $p.html(main) : h, { elementor: true });
        image = $p('meta[property="og:image"]').attr('content') || null;
      }
      const headline = blocks.find(b => b.t === 'h')?.text;
      blocks = await mirrorBlocks(blocks, 10);
      const img = await mirror(image) || blocks.find(b => b.t === 'img')?.src || null;
      // Titelbild nicht doppelt im Text
      blocks = blocks.filter(b => !(b.t === 'img' && b.src === img));
      return { id: 'p-' + p.slug, slug: p.slug, title: p.menuTitle || title, pageTitle: title, headline, area: p.area, areas: p.areas, url: p.url, image: img, summary: short(firstText(blocks)), blocks, modified };
    } catch (e) { warn('Projekt', p.slug, e.message); return null; }
  })).filter(Boolean);
  // Stichwörter zum Verknüpfen mit Beiträgen
  for (const p of projects) {
    const words = new Set([...norm(p.title + ' ' + p.slug.replace(/-/g, ' ')).split(' ')].filter(w => w.length >= 6 && !STOPWORDS.has(w)));
    p.keywords = [...words];
  }
  return { areas, projects };
}
function featured(obj) {
  const m = obj._embedded?.['wp:featuredmedia']?.[0];
  if (!m || m.code) return null;
  const s = m.media_details?.sizes || {};
  return (s.large || s.medium_large || s.full || {}).source_url || m.source_url || null;
}

// ---------- Homepage-Beiträge ----------
async function loadPosts(areas) {
  const cats = await getJSON(`${SITE}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,parent`);
  const catName = Object.fromEntries(cats.map(c => [c.id, htmlText(c.name)]));
  const standorte = cats.find(c => /standorte/i.test(c.name))?.id;
  const posts = await getJSON(`${SITE}/wp-json/wp/v2/posts?per_page=${LIMITS.posts}&_embed=wp:featuredmedia`);
  return pool(posts, 4, async p => {
    const names = p.categories.map(c => catName[c]).filter(Boolean);
    const title = htmlText(p.title.rendered);
    const areaIds = new Set();
    for (const n of names) for (const [re, areaRe] of CATEGORY_TO_AREA) if (re.test(n)) areas.filter(a => areaRe.test(a.name)).forEach(a => areaIds.add(a.id));
    for (const [re, areaRe] of KEYWORD_TO_AREA) if (re.test(title)) areas.filter(a => areaRe.test(a.name)).forEach(a => areaIds.add(a.id));
    const place = p.categories.map(c => cats.find(x => x.id === c)).find(c => c && c.parent === standorte);
    const blocks = await mirrorBlocks(blocksFromHtml(p.content.rendered), 6);
    const image = await mirror(featured(p)) || blocks.find(b => b.t === 'img')?.src || null;
    return {
      id: 'w-' + p.id, channel: 'web', title, date: p.date_gmt + 'Z', url: p.link,
      image, text: short(htmlText(p.excerpt.rendered) || firstText(blocks), 260),
      blocks: blocks.filter(b => !(b.t === 'img' && b.src === image)),
      areas: [...areaIds], place: place ? htmlText(place.name) : null,
      media: names.some(n => /medien/i.test(n)),
    };
  });
}

// ---------- Termine (Event-Plugin + iCal je Termin) ----------
function icsField(ics, key) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  const ev = unfolded.slice(unfolded.indexOf('BEGIN:VEVENT'));
  const m = ev.match(new RegExp('^' + key + '(;[^:\\n]*)?:(.*)$', 'm'));
  return m ? { params: m[1] || '', value: m[2].trim().replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, '\n') } : null;
}
function viennaToISO(stamp) { // 20261118T103000 (Ortszeit Wien) -> ISO UTC
  const [, y, mo, d, h = '00', mi = '00'] = stamp.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  const guess = Date.UTC(+y, mo - 1, +d, +h, +mi);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess));
  const g = t => +parts.find(p => p.type === t).value;
  const asLocal = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'));
  return new Date(guess - (asLocal - guess)).toISOString();
}
function parseTime(f) {
  if (!f) return null;
  if (/VALUE=DATE(?!-)/.test(f.params) && !/T/.test(f.value)) return { iso: viennaToISO(f.value), allDay: true };
  if (/Z$/.test(f.value)) { const v = f.value; return { iso: new Date(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T${v.slice(9, 11)}:${v.slice(11, 13)}:00Z`).toISOString(), allDay: false }; }
  return { iso: viennaToISO(f.value), allDay: false };
}

const MONTHS = { jaenner: 1, januar: 1, februar: 2, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };
async function eventFromHtml(url) {
  const $ = cheerio.load(await getText(url));
  const txt = clean($('.evge-meta-date-summary').first().text() || $('main').text());
  const m = txt.match(/(\d{1,2})\.\s*([A-Za-zÄäÖöÜü]+)\s+(\d{4})(?:[^\d]{1,8}(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2}))?/);
  if (!m) throw new Error('kein Datum auf der Seite');
  const mo = MONTHS[norm(m[2]).trim()]; if (!mo) throw new Error('Monat unbekannt: ' + m[2]);
  const p2 = n => String(n).padStart(2, '0'); const day = `${m[3]}${p2(mo)}${p2(m[1])}`;
  const allDay = !m[4];
  const start = viennaToISO(day + (allDay ? 'T000000' : `T${p2(m[4])}${m[5]}00`));
  const end = viennaToISO(day + (allDay ? 'T235900' : `T${p2(m[6])}${m[7]}00`));
  let location = clean($('[class*="venue"] , [class*="location"]').first().text()).split('\n')[0] || '';
  if (location.length < 6) location = '';
  return { start, end, allDay, location };
}
async function loadEvents(prev) {
  const list = await getJSON(`${SITE}/wp-json/wp/v2/evge_event?per_page=${LIMITS.events}&_embed=wp:featuredmedia`);
  const prevById = new Map((prev?.events || []).map(e => [e.id, e]));
  const now = Date.now();
  const events = await pool(list, 3, async e => {
    const id = 'e-' + e.id;
    const old = prevById.get(id);
    let start, end, allDay, location;
    if (old && old.modified === e.modified_gmt) ({ start, end, allDay, location } = old);
    if (location && location.length < 6) location = '';
    else {
      try {
        const ics = await getText(e.link + (e.link.includes('?') ? '&' : '?') + 'ical=1');
        const s = parseTime(icsField(ics, 'DTSTART')), en = parseTime(icsField(ics, 'DTEND'));
        if (!s) return null;
        start = s.iso; allDay = s.allDay; end = en?.iso || start;
        location = icsField(ics, 'LOCATION')?.value || '';
      } catch (err) {
        // Ersatz: Datum/Ort aus der Termin-Seite lesen (z. B. bei Serienterminen ohne iCal)
        try { ({ start, end, allDay, location } = await eventFromHtml(e.link)); }
        catch (err2) { warn('Termin', e.id, err.message, '/', err2.message); return null; }
      }
    }
    if (new Date(end).getTime() < now - 6 * 3600e3) return null;
    const blocks = await mirrorBlocks(blocksFromHtml(e.content.rendered), 3);
    return { id, title: htmlText(e.title.rendered), start, end, allDay, location, url: e.link, modified: e.modified_gmt, image: await mirror(featured(e)), text: short(firstText(blocks, 20), 300), blocks };
  });
  return events.filter(Boolean).sort((a, b) => a.start.localeCompare(b.start));
}

// ---------- YouTube (öffentlicher RSS-Feed des eigenen Kanals) ----------
async function loadYouTube() {
  const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`);
  const feed = new XMLParser({ ignoreAttributes: false }).parse(xml).feed;
  const entries = [].concat(feed.entry || []).slice(0, LIMITS.social);
  return pool(entries, 4, async en => {
    const vid = en['yt:videoId'];
    const g = en['media:group'] || {};
    return {
      id: 'yt-' + vid, channel: 'youtube', title: clean(String(en.title)), date: new Date(en.published).toISOString(),
      url: `https://www.youtube.com/watch?v=${vid}`, image: await mirror(`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`, 800),
      text: short(String(g['media:description'] || ''), 400), video: true,
    };
  });
}

// ---------- Facebook & Instagram (offizielle Meta Graph API, nur eigene Seite) ----------
async function metaIds(token) {
  let pageId = process.env.META_PAGE_ID;
  if (!pageId) pageId = (await getJSON(`${GRAPH}/me?fields=id,name&access_token=${token}`)).id;
  let igId = process.env.IG_USER_ID;
  if (!igId) igId = (await getJSON(`${GRAPH}/${pageId}?fields=instagram_business_account&access_token=${token}`)).instagram_business_account?.id;
  return { pageId, igId };
}
async function loadFacebook(token, pageId) {
  const r = await getJSON(`${GRAPH}/${pageId}/published_posts?fields=id,message,created_time,permalink_url,full_picture&limit=${LIMITS.social}&access_token=${token}`);
  return pool((r.data || []).filter(p => p.message || p.full_picture), 4, async p => ({
    id: 'fb-' + p.id, channel: 'facebook', title: firstLine(p.message) || 'Beitrag auf Facebook', date: new Date(p.created_time).toISOString(),
    url: p.permalink_url, image: await mirror(p.full_picture), text: clean(p.message || '').slice(0, 1500),
  }));
}
async function loadInstagram(token, igId) {
  const r = await getJSON(`${GRAPH}/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${LIMITS.social}&access_token=${token}`);
  return pool(r.data || [], 4, async m => ({
    id: 'ig-' + m.id, channel: 'instagram', title: firstLine(m.caption) || 'Beitrag auf Instagram', date: new Date(m.timestamp).toISOString(),
    url: m.permalink, image: await mirror(m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url), text: clean(m.caption || '').slice(0, 1500), video: m.media_type === 'VIDEO',
  }));
}
function firstLine(s) { const l = clean(s || '').split('\n').find(x => x.trim()) || ''; return l.length > 90 ? l.slice(0, 90).replace(/\s+\S*$/, '') + ' …' : l; }

// ---------- TikTok (offizielle Display API, nur wenn Zugang hinterlegt) ----------
async function loadTikTok() {
  const { TIKTOK_CLIENT_KEY: key, TIKTOK_CLIENT_SECRET: secret, TIKTOK_REFRESH_TOKEN: refresh } = process.env;
  const tok = await (await get('https://open.tiktokapis.com/v2/oauth/token/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_key: key, client_secret: secret, grant_type: 'refresh_token', refresh_token: refresh }) })).json();
  if (!tok.access_token) throw new Error('TikTok-Token konnte nicht erneuert werden');
  if (tok.refresh_token && tok.refresh_token !== refresh) warn('TikTok hat einen neuen Refresh-Token ausgegeben – Secret TIKTOK_REFRESH_TOKEN bitte erneuern.');
  const r = await (await get('https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url', { method: 'POST', headers: { Authorization: 'Bearer ' + tok.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ max_count: LIMITS.social }) })).json();
  return pool(r.data?.videos || [], 4, async v => ({
    id: 'tt-' + v.id, channel: 'tiktok', title: firstLine(v.title || v.video_description) || 'Video auf TikTok', date: new Date(v.create_time * 1000).toISOString(),
    url: v.share_url, image: await mirror(v.cover_image_url), text: clean(v.video_description || '').slice(0, 800), video: true,
  }));
}

// ---------- Ablauf ----------
async function main() {
  await fs.mkdir(MEDIA, { recursive: true }); await fs.mkdir(path.join(OUT, 'data'), { recursive: true });
  let prev = null;
  try { prev = await getJSON(PUBLIC_URL + '/data/feed.json', {}); log('Vorheriger Stand geladen:', prev.generated); } catch { log('Kein vorheriger Stand erreichbar (erster Lauf?)'); }
  const sources = {};
  const keepPrev = (ch) => (prev?.posts || []).filter(p => p.channel === ch);
  // Vorherige Bilder erneut spiegeln, falls eine Quelle ausfällt (sonst fehlen sie nach dem Neu-Veröffentlichen)
  const remirror = async items => pool(items, 4, async it => ({ ...it, image: it.image ? await reget(it.image) : null }));
  async function reget(u) { // eigenes, bereits gespiegeltes Bild erneut ablegen
    try { const name = u.split('/media/')[1]; if (!name) return u; const buf = Buffer.from(await (await get(u, {}, 2)).arrayBuffer()); await fs.writeFile(path.join(MEDIA, name), buf); return u; } catch { return null; }
  }
  async function source(name, fn, fallback) {
    try { const r = await fn(); sources[name] = { ok: true, count: Array.isArray(r) ? r.length : undefined, at: new Date().toISOString() }; return r; }
    catch (e) { warn(name, 'fehlgeschlagen:', e.message); sources[name] = { ok: false, error: e.message.slice(0, 200), at: new Date().toISOString() }; return fallback ? await fallback() : []; }
  }

  const { areas, projects } = await source('projects', loadProjects, async () => ({ areas: prev?.areas || [], projects: await pool(prev?.projects || [], 3, async p => ({ ...p, image: p.image && await reget(p.image), blocks: await pool(p.blocks || [], 3, async b => b.t === 'img' ? { ...b, src: await reget(b.src) } : b) })) }));
  const web = await source('web', () => loadPosts(areas), () => remirror(keepPrev('web')));
  const events = await source('events', () => loadEvents(prev), async () => (prev?.events || []).filter(e => new Date(e.end) > new Date()));
  const youtube = await source('youtube', loadYouTube, () => remirror(keepPrev('youtube')));
  let facebook = [], instagram = [];
  const token = process.env.META_PAGE_TOKEN;
  if (token) {
    const ids = await source('meta', () => metaIds(token), async () => ({}));
    if (ids.pageId) facebook = await source('facebook', () => loadFacebook(token, ids.pageId), () => remirror(keepPrev('facebook')));
    if (ids.igId) instagram = await source('instagram', () => loadInstagram(token, ids.igId), () => remirror(keepPrev('instagram')));
    else if (ids.pageId) sources.instagram = { ok: false, error: 'Kein Instagram-Business-Konto mit der Facebook-Seite verknüpft' };
  } else sources.meta = { ok: false, error: 'Kein Zugang hinterlegt (Secret META_PAGE_TOKEN fehlt)' };
  let tiktok = [];
  if (process.env.TIKTOK_REFRESH_TOKEN) tiktok = await source('tiktok', loadTikTok, () => remirror(keepPrev('tiktok')));

  // Beiträge mit Projekten verknüpfen (Stichwort im Titel/Text)
  const posts = [...web, ...youtube, ...facebook, ...instagram, ...tiktok].filter(Boolean);
  for (const p of posts) {
    const hay = ' ' + norm(p.title + ' ' + (p.text || '') + ' ' + (p.url || '')) + ' ';
    p.projects = projects.filter(pr => pr.keywords.some(k => hay.includes(k))).map(pr => pr.id);
    const areaSet = new Set(p.areas || []);
    for (const pid of p.projects) projects.find(x => x.id === pid).areas.forEach(a => areaSet.add(a));
    p.areas = [...areaSet];
  }
  for (const e of events) {
    const hay = ' ' + norm(e.title + ' ' + e.text) + ' ';
    e.projects = projects.filter(pr => pr.keywords.some(k => hay.includes(k))).map(pr => pr.id);
  }
  posts.sort((a, b) => b.date.localeCompare(a.date));

  const feed = {
    version: 1, generated: new Date().toISOString(), base: PUBLIC_URL,
    org: ORG, links: LINKS, channels: CHANNELS,
    areas, projects: projects.map(({ keywords, ...p }) => p), posts, events, sources,
  };
  await fs.writeFile(path.join(OUT, 'data', 'feed.json'), JSON.stringify(feed));
  const files = await fs.readdir(MEDIA);
  log(`Fertig: ${projects.length} Projekte, ${posts.length} Beiträge (${web.length} Homepage, ${youtube.length} YouTube, ${facebook.length} Facebook, ${instagram.length} Instagram, ${tiktok.length} TikTok), ${events.length} Termine, ${files.length} Bilder`);
  log('Quellen:', JSON.stringify(sources));
  if (!projects.length && !web.length) { console.error('Weder Projekte noch Beiträge – Abbruch, damit der alte Stand online bleibt.'); process.exit(1); }
}
export { blocksFromHtml, viennaToISO, parseTime, icsField };
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });
