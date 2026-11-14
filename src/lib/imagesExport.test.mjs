import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base64VersOctets, blocImages, lireImages, nombreImages, octetsVersBase64, resume } from './imagesExport.js';
import { exporter, lireImport } from './partage.js';

const jpeg = (n = 10, octet = 7) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(n).fill(octet)]);
const SETS = [
  { id: 'a1', numero: '75192-1', nom: 'Faucon', statut: 'possédé' },
  { id: 'b2', numero: '10294-1', nom: 'Titanic', statut: 'souhaité' },
];

test('octets <-> base64 : aller-retour, y compris sur une image de plusieurs centaines de Ko', () => {
  const grosse = new Uint8Array(600 * 1024).map((_, i) => (i % 251)); grosse[0] = 0xff; grosse[1] = 0xd8; grosse[2] = 0xff;
  assert.deepEqual(base64VersOctets(octetsVersBase64(jpeg())), jpeg());
  assert.deepEqual(base64VersOctets(octetsVersBase64(grosse)), grosse);
});

test('base64VersOctets : refuse ce qui n\'est pas un JPEG raisonnable', () => {
  const b64 = (o) => octetsVersBase64(o);
  const texte = (t) => new TextEncoder().encode(t);
  for (const v of [null, undefined, 42, '', 'pas du base64 !', 'abc', b64(new Uint8Array([1, 2, 3, 4, 5, 6])), b64(texte('<svg xmlns=...></svg>')), b64(new Uint8Array(1024 * 1024 + 1).fill(0xff))]) {
    assert.equal(base64VersOctets(v), null, String(v).slice(0, 20));
  }
});

test('export avec images puis lecture : tout revient, rattaché aux bons sets', () => {
  const entrees = { photos: [['a1', jpeg(5, 1)]], boites: [['75192-1', jpeg(5, 2)], ['10294-1', jpeg(5, 3)]], rendus: [['10294-1', jpeg(5, 4)]] };
  const { contenu, nom } = exporter(SETS, new Date('2026-11-13T10:00:00Z'), entrees);
  assert.equal(nom, 'bricks-list-2026-11-13.json');
  const r = lireImport(contenu);
  assert.equal(r.erreur, null);
  assert.equal(r.sets.length, 2);
  assert.equal(nombreImages(r.images), 4);
  assert.equal(r.images.refusees, 0);
  assert.deepEqual(r.images.photos, [['a1', jpeg(5, 1)]]);
  assert.deepEqual(r.images.rendus, [['10294-1', jpeg(5, 4)]]);
  assert.equal(resume(r.images), '1 photo, 2 boîtes, 1 rendu');
});

test('export sans images : le fichier d\'avant, et l\'import ne signale aucune image', () => {
  const { contenu } = exporter(SETS);
  assert.ok(!contenu.includes('"images"'));
  assert.equal(lireImport(contenu).images, null);
});

test('un fichier sans images garde la limite de 5 Mo, un fichier avec images non', () => {
  const rempli = (images) => JSON.stringify({ sets: SETS, images, bourrage: 'x'.repeat(6 * 1024 * 1024) });
  assert.match(lireImport(rempli(undefined)).erreur, /5 Mo/);
  assert.equal(lireImport(rempli({ photos: {} })).erreur, null);
});

test('images hostiles : clés étrangères, types faux, formes inattendues, jamais écrites', () => {
  const b = (o) => octetsVersBase64(o);
  const texte = (t) => new TextEncoder().encode(t);
  // JSON.parse, comme à l'arrivée du fichier : un littéral `{ '__proto__': … }` ne créerait pas la clé.
  const bloc = JSON.parse(JSON.stringify({
    photos: { a1: b(jpeg()), inconnu: b(jpeg()), b2: 'n\'importe quoi' },
    boites: { '75192-1': b(jpeg()), '99999-1': b(jpeg()), 'x/../y': b(jpeg()), '10294-1': b(texte('GIF89a......')) },
    rendus: [1, 2, 3],
  }).replace('"inconnu"', '"__proto__"'));
  const r = lireImages(bloc, SETS);
  assert.deepEqual(r.photos.map(([k]) => k), ['a1']);
  assert.deepEqual(r.boites.map(([k]) => k), ['75192-1']);
  assert.deepEqual(r.rendus, []);
  assert.equal(r.refusees, 6); // 2 photos, 3 boîtes, 1 groupe de forme fausse
  for (const v of ['texte', 5, [], true]) assert.equal(lireImages(v, SETS).refusees, 1);
  assert.deepEqual(lireImages(undefined, SETS), { photos: [], boites: [], rendus: [], refusees: 0 });
});

test('blocImages : un groupe vide reste présent, les clés ne sont pas déformées', () => {
  assert.deepEqual(blocImages({ photos: [] }), { photos: {}, boites: {}, rendus: {} });
  assert.deepEqual(Object.keys(blocImages({ boites: [['75192-1', jpeg()]] }).boites), ['75192-1']);
});

test('lireImages : les photos supplémentaires (id#2…id#6) se rattachent à leur set, les clés bancales sont refusées', () => {
  const b = (o) => octetsVersBase64(o);
  const bloc = { photos: { a1: b(jpeg()), 'a1#2': b(jpeg()), 'a1#6': b(jpeg()), 'a1#7': b(jpeg()), 'a1#1': b(jpeg()), 'inconnu#2': b(jpeg()), 'a1#': b(jpeg()) } };
  const r = lireImages(bloc, SETS);
  assert.deepEqual(r.photos.map(([k]) => k), ['a1', 'a1#2', 'a1#6']);
  assert.equal(r.refusees, 4);
});
