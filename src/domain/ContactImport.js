// ==========================================================================
// CAPVOYAGE - IMPORT DE CONTACTS MULTI-SOURCES (ADR-008)
// Fonctions pures : vCard, saisie en lot, doublons, conversion après tri.
// ==========================================================================

export const IMPORT_RELATIONSHIPS = ['Famille', 'Amis', 'Pro / Affaires', 'Guide / Chauffeur', 'Autre'];

const stripAccents = (str) => String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

export const normalizeName = (name) => stripAccents(name).toLowerCase().replace(/\s+/g, ' ').trim();

const normalizePhone = (phone) => String(phone || '').replace(/[^\d]/g, '');

function decodeQuotedPrintable(value) {
  const bytes = [];
  const text = value.replace(/=\r?\n/g, '');
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(text.slice(i + 1, i + 3))) {
      bytes.push(parseInt(text.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      const encoded = new TextEncoder().encode(text[i]);
      bytes.push(...encoded);
    }
  }
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return value;
  }
}

const unescapeVcf = (value) => value.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

/**
 * Analyse un fichier vCard (2.1 / 3.0 / 4.0) -> [{ name, phone, city }]
 */
export function parseVCard(text) {
  if (!text || typeof text !== 'string') return [];
  // Dépliage RFC 6350 : une ligne qui commence par espace/tab prolonge la précédente
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const contacts = [];
  let current = null;

  for (const rawLine of unfolded.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const upper = line.toUpperCase();
    if (upper === 'BEGIN:VCARD') { current = { name: '', phone: '', city: '', _n: '' }; continue; }
    if (upper === 'END:VCARD') {
      if (current) {
        const name = current.name || current._n;
        if (name) contacts.push({ name, phone: current.phone, city: current.city });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const head = line.slice(0, sep);
    let value = line.slice(sep + 1);
    const [propRaw, ...params] = head.split(';');
    const prop = propRaw.toUpperCase().replace(/^.*\./, ''); // retire un éventuel groupe « item1. »
    if (params.some(p => /ENCODING=QUOTED-PRINTABLE/i.test(p) || /^QUOTED-PRINTABLE$/i.test(p))) {
      value = decodeQuotedPrintable(value);
    }

    if (prop === 'FN') {
      current.name = unescapeVcf(value);
    } else if (prop === 'N') {
      const [family = '', given = ''] = value.split(';').map(unescapeVcf);
      current._n = `${given} ${family}`.replace(/\s+/g, ' ').trim();
    } else if (prop === 'TEL' && !current.phone) {
      current.phone = unescapeVcf(value);
    } else if (prop === 'ADR' && !current.city) {
      // ADR : boîte;étendue;rue;ville;région;code;pays
      current.city = unescapeVcf(value.split(';')[3] || '');
    }
  }
  return contacts;
}

/**
 * Saisie en lot : un contact par ligne, « Nom » ou « Nom, téléphone ».
 */
export function parseBulk(text) {
  if (!text || typeof text !== 'string') return [];
  const contacts = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const [name, ...rest] = line.split(/[,;\t]/);
    const cleanName = name.trim();
    if (!cleanName) continue;
    contacts.push({ name: cleanName, phone: rest.join(' ').trim(), city: '' });
  }
  return contacts;
}

/**
 * Prépare les lignes de l'écran de tri : relation par défaut, doublons décochés.
 */
export function buildSortRows(imported, existingContacts = [], defaultRelationship = 'Amis') {
  const knownNames = new Set(existingContacts.map(c => normalizeName(c.name)));
  const knownPhones = new Set(existingContacts.map(c => normalizePhone(c.phone)).filter(Boolean));
  const seen = new Set();

  return (imported || []).map(c => {
    const key = normalizeName(c.name);
    const phone = normalizePhone(c.phone);
    const duplicate = knownNames.has(key) || (phone && knownPhones.has(phone)) || seen.has(key);
    seen.add(key);
    return {
      name: c.name,
      phone: c.phone || '',
      city: c.city || '',
      relationship: defaultRelationship,
      ignored: !!duplicate,
      duplicate: !!duplicate
    };
  });
}

/**
 * Convertit les lignes triées en contacts prêts pour ContactService.addContact.
 */
export function toContacts(rows) {
  return (rows || [])
    .filter(r => r && !r.ignored && r.name && r.name.trim())
    .map(r => ({
      name: r.name.trim(),
      relationship: IMPORT_RELATIONSHIPS.includes(r.relationship) ? r.relationship : 'Autre',
      phone: r.phone || '',
      city: r.city || ''
    }));
}

/**
 * Filtre du sélecteur de contacts : insensible casse/accents, récents d'abord.
 * `recentIds` : identifiants dans l'ordre d'usage récent.
 */
export function filterContacts(contacts, query = '', recentIds = []) {
  const q = normalizeName(query);
  const rank = new Map(recentIds.map((id, i) => [id, i]));
  return (contacts || [])
    .filter(c => !c.archived && (!q || normalizeName(c.name).includes(q)))
    .sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id) : Infinity;
      const rb = rank.has(b.id) ? rank.get(b.id) : Infinity;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, 'fr');
    });
}
