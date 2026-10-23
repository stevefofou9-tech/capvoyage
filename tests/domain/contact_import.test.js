import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseVCard, parseBulk, buildSortRows, toContacts, filterContacts } from '../../src/domain/ContactImport.js';

describe('Suite 23 : Import de contacts (TC-CTX)', () => {
  test('TC-CTX-001 : vCard de 3 fiches', () => {
    const vcf = ['A', 'B', 'C'].map((n, i) => `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Contact ${n}\r\nTEL;TYPE=CELL:+237 6 00 00 00 0${i}\r\nEND:VCARD`).join('\r\n');
    const r = parseVCard(vcf);
    assert.equal(r.length, 3);
    assert.deepEqual([r[0].name, r[0].phone], ['Contact A', '+237 6 00 00 00 00']);
  });

  test('TC-CTX-002 : pliage, N sans FN, quoted-printable', () => {
    const vcf = [
      'BEGIN:VCARD', 'VERSION:2.1', 'N:Mbarga;Paul;;;', 'TEL:699001122', 'END:VCARD',
      'BEGIN:VCARD', 'FN:Tante', ' Marie', 'ADR:;;rue;Douala;;;Cameroun', 'END:VCARD',
      'BEGIN:VCARD', 'FN;ENCODING=QUOTED-PRINTABLE:Andr=C3=A9', 'END:VCARD'
    ].join('\n');
    const r = parseVCard(vcf);
    assert.equal(r[0].name, 'Paul Mbarga');
    assert.equal(r[1].name, 'TanteMarie');
    assert.equal(r[1].city, 'Douala');
    assert.equal(r[2].name, 'André');
  });

  test('TC-CTX-003 : texte invalide ou vide', () => {
    assert.deepEqual(parseVCard('n importe quoi'), []);
    assert.deepEqual(parseVCard(''), []);
    assert.deepEqual(parseVCard(null), []);
  });

  test('TC-CTX-004 : saisie en lot', () => {
    const r = parseBulk('Paul\n\nMarie, 6 99 00 00 00\n  \n');
    assert.equal(r.length, 2);
    assert.equal(r[1].phone, '6 99 00 00 00');
  });

  test('TC-CTX-005 : doublons marqués et ignorés par défaut', () => {
    const rows = buildSortRows(
      [{ name: 'Paul Mbarga', phone: '' }, { name: 'Nouveau', phone: '+237 699 00 11 22' }, { name: 'paul  mbarga', phone: '' }, { name: 'Zoé', phone: '' }],
      [{ name: 'Paul Mbarga', phone: '' }, { name: 'Autre', phone: '237699001122' }]
    );
    assert.deepEqual(rows.map(r => r.ignored), [true, true, true, false]);
  });

  test('TC-CTX-006 : 12 importés, 2 ignorés, 1 en Famille', () => {
    const rows = buildSortRows(Array.from({ length: 12 }, (_, i) => ({ name: `C${i}`, phone: '' })), [], 'Amis');
    rows[0].ignored = true; rows[1].ignored = true; rows[2].relationship = 'Famille';
    const out = toContacts(rows);
    assert.equal(out.length, 10);
    assert.equal(out[0].relationship, 'Famille');
    assert.equal(out[1].relationship, 'Amis');
  });

  test('TC-CTX-007 : relation invalide -> Autre', () => {
    assert.equal(toContacts([{ name: 'X', relationship: 'Roi' }])[0].relationship, 'Autre');
  });

  test('TC-CTX-008 : filtre insensible aux accents, récents d abord', () => {
    const cs = [{ id: '1', name: 'Pascal' }, { id: '2', name: 'Oncle Paul' }, { id: '3', name: 'Éloïse' }, { id: '4', name: 'Archivé Pa', archived: true }];
    assert.deepEqual(filterContacts(cs, 'pa', ['2']).map(c => c.id), ['2', '1']);
    assert.deepEqual(filterContacts(cs, 'eloise').map(c => c.id), ['3']);
  });
});
