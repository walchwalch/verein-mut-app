// Zentrale Einstellungen für den Abholdienst.
// Alles hier kann ohne Programmierkenntnisse angepasst werden (Texte/Adressen).

export const SITE = 'https://verein-mut.eu';
// Adresse, unter der die fertige Web-App + feed.json liegen (vor dem App-Store-Start auf Vereinsdomain umstellen)
export const PUBLIC_URL = process.env.PUBLIC_URL || 'https://spenden.mutig.app';

export const ORG = {
  name: 'Verein M.U.T. – Mensch Umwelt Tier',
  shortName: 'Verein M.U.T.',
  legalName: 'Verein Mensch Umwelt Tier (M.U.T.)',
  zvr: '188594101',
  address: 'Rechte Wienzeile 37/3/1, 1040 Wien, Österreich',
  email: 'office@verein-mut.eu',
  privacyEmail: 'datenschutz@verein-mut.eu',
  phone: '+43 1 9434111',
  board: 'Obmann: Dietmar Walch · Stellvertretender Obmann: Alexander Maier · Vorstandsmitglieder: Florina Bergmann, Thomas Walch',
  purpose: 'Der Verein Mensch Umwelt Tier (M.U.T.) ist ein nicht auf Gewinn gerichteter, gemeinnütziger Verein. Zweck ist die materielle und ideelle Unterstützung von Menschen in akuten Notlagen, insbesondere von Kindern und Gewaltbetroffenen, der Schutz einer ökologisch intakten Umwelt und der Einsatz für Tiere in Not.',
};

// Offizielle Kanäle (von der Homepage übernommen)
export const CHANNELS = {
  instagram: 'https://www.instagram.com/verein_mut/',
  facebook: 'https://www.facebook.com/VereinMUT.eu/',
  youtube: 'https://www.youtube.com/channel/UClmSEA3lUiwWuFmyCU04KZQ',
  podcast: 'https://open.spotify.com/show/2CFam3A85YxL7NMOeuZZVc',
  tiktok: process.env.TIKTOK_PROFILE_URL || '', // derzeit kein offizieller TikTok-Kanal bekannt
};
export const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UClmSEA3lUiwWuFmyCU04KZQ';

// Seiten für „Mitmachen“ (Links auf die Homepage)
export const LINKS = {
  home: SITE + '/',
  spenden: SITE + '/mitmachen-helfen/',
  mitglied: SITE + '/shop/foerdermitgliedschaft/',
  ehrenamt: SITE + '/mitmachen-helfen/arbeitskraft-spenden/',
  socialVolunteering: SITE + '/social-volunteering/',
  sachspenden: SITE + '/bedarfsliste/',
  jobs: SITE + '/mitmachen-helfen/praktika-und-jobs/',
  kontakt: SITE + '/kontakt/',
  crowdfunding: SITE + '/crowdfundings/',
  steuer: SITE + '/spende-steuerlich-absetzbar/',
  impressum: SITE + '/impressum/',
  datenschutzWeb: SITE + '/data-security/',
  events: SITE + '/events/',
  aktuelles: SITE + '/aktuelles/',
};

// Zuordnung Homepage-Kategorie -> Bereich (Bereiche kommen aus dem Menü „Was macht MUT?“)
export const CATEGORY_TO_AREA = [
  [/obdach|nothilfe/i, /obdach/i],
  [/famil|wohnhilfe|nele/i, /famil/i],
  [/lebensmittel/i, /lebensmittel/i],
  [/umwelt|klima|textil/i, /umwelt/i],
];
// Beiträge ohne passende Kategorie, aber mit diesem Wort im Titel -> Bereich
export const KEYWORD_TO_AREA = [
  [/frauen|frauencaf/i, /frau/i],
];

// Wörter, die beim automatischen Verknüpfen Beitrag <-> Projekt ignoriert werden
export const STOPWORDS = new Set(['projekt', 'verein', 'kostenlos', 'kostenloser', 'kostenlose', 'angebot', 'frauen', 'netzwerk', 'hilfe', 'salzburg', 'wien', 'yourself', 'mitmachen', 'helfen', 'gratis', 'sozial', 'kinder', 'familien', 'lebensmittel', 'unsere', 'unser', 'unseren', 'unserem', 'unserer', 'gemeinsam', 'menschen', 'charity', 'wochen', 'zeiten', 'familie']);

export const LIMITS = { posts: 40, social: 20, events: 40, blocks: 45, textChars: 6000 };
