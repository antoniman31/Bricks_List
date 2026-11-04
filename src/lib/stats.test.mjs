import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerStats } from './stats.js';
import { filtrer } from './recherche.js';

let n = 0;
const set = (o) => ({ id: `s${(n += 1)}`, numero: `${10000 + n}-1`, nom: `Set ${n}`, theme: '', annee: null, pieces: null, statut: 'possédé', etat: null, notes: '', image: null, dateAjout: null, ...o });

// Une collection volontairement tordue : données manquantes, un thème à égalité,
// des sets souhaités qui ne doivent pas entrer dans les chiffres de la collection.
const COLLECTION = [
  set({ nom: 'Faucon', theme: 'Star Wars', annee: 2017, pieces: 7541, etat: 'scellé' }),
  set({ nom: 'Titanic', theme: 'Icons', annee: 2021, pieces: 9090, etat: 'monté' }),
  set({ nom: 'Fondcombe', theme: 'Icons', annee: 2023, pieces: 6167, etat: 'monté' }),
  set({ nom: 'Ferrari', theme: 'Technic', annee: 2022, pieces: 3778, etat: 'en cours' }),
  set({ nom: 'Maman', theme: 'Ideas', annee: 2021, pieces: 3955 }),
  set({ nom: 'Sans rien' }),
  set({ nom: 'Sans pièces', theme: 'Technic', annee: 2020, etat: 'neuf' }),
  set({ nom: 'Souhaité 1', theme: 'Icons', annee: 2023, pieces: 2000, statut: 'souhaité' }),
  set({ nom: 'Souhaité 2', theme: 'Ideas', statut: 'souhaité' }),
];
const POSSEDES = COLLECTION.filter((s) => s.statut === 'possédé');

test('les chiffres de la collection ignorent la wishlist', () => {
  const { resume } = calculerStats(COLLECTION);
  assert.equal(resume.sets, 7);
  assert.equal(resume.pieces, 7541 + 9090 + 6167 + 3778 + 3955);
  assert.equal(resume.sansPieces, 2);
});

test('plus gros set', () => {
  assert.deepEqual(calculerStats(COLLECTION).resume.plusGros, { nom: 'Titanic', pieces: 9090 });
});

test('plus gros set absent quand aucune pièce n\'est connue', () => {
  assert.equal(calculerStats([set({ nom: 'x' })]).resume.plusGros, null);
});

test('une collection vide ne plante pas', () => {
  const s = calculerStats([]);
  assert.equal(s.resume.sets, 0);
  assert.deepEqual(s.themes, []);
  assert.equal(s.aCompleter.fiches, 0);
});

// L'invariant qui compte : le chiffre d'une barre est le nombre de sets de la liste
// qu'on obtient en la touchant, et la somme des barres est le total.
for (const dimension of ['themes', 'annees', 'etats']) {
  test(`${dimension} : chaque barre égale la liste filtrée correspondante`, () => {
    for (const b of calculerStats(COLLECTION)[dimension]) {
      const liste = filtrer(COLLECTION, { statut: 'possédé', ...b.filtre });
      assert.equal(b.sets, liste.length, `${b.libelle}: nombre de sets`);
      assert.equal(b.pieces, liste.reduce((t, s) => t + (s.pieces ?? 0), 0), `${b.libelle}: pièces`);
      assert.equal(b.piecesInconnues, liste.filter((s) => s.pieces == null).length, `${b.libelle}: pièces inconnues`);
    }
  });

  test(`${dimension} : la somme des barres égale le nombre de sets`, () => {
    assert.equal(calculerStats(COLLECTION)[dimension].reduce((t, b) => t + b.sets, 0), POSSEDES.length);
  });
}

test('thèmes triés par taille puis par nom, « Non renseigné » en dernier', () => {
  const t = calculerStats(COLLECTION).themes;
  assert.deepEqual(t.map((b) => b.libelle), ['Icons', 'Technic', 'Ideas', 'Star Wars', 'Non renseigné']);
  assert.deepEqual(t.at(-1).filtre, { manque: 'theme' });
});

test('états dans l\'ordre du modèle, avec « Non renseigné » quand il en manque', () => {
  const e = calculerStats(COLLECTION).etats;
  assert.deepEqual(e.map((b) => b.libelle), ['scellé', 'neuf', 'en cours', 'monté', 'Non renseigné']);
});

test('années dans l\'ordre du temps, par année quand l\'étalement est court', () => {
  const a = calculerStats(COLLECTION).annees;
  assert.deepEqual(a.map((b) => b.libelle), ['2017', '2020', '2021', '2022', '2023', 'Non renseigné']);
});

test('années par décennie quand la collection s\'étale', () => {
  const large = [set({ annee: 1999 }), set({ annee: 2004 }), set({ annee: 2011 }), set({ annee: 2024 }), set({ annee: 2025 })];
  const a = calculerStats(large).annees;
  assert.deepEqual(a.map((b) => b.libelle), ['1990–1999', '2000–2009', '2010–2019', '2020–2029']);
  for (const b of a) assert.equal(b.sets, filtrer(large, { statut: 'possédé', ...b.filtre }).length);
});

test('« à compléter » : les chiffres collent au filtre', () => {
  const { aCompleter } = calculerStats(COLLECTION);
  assert.equal(aCompleter.fiches, 3);
  for (const c of aCompleter.champs) {
    assert.equal(c.nombre, filtrer(COLLECTION, { statut: 'possédé', manque: c.cle }).length, c.cle);
  }
});

test('wishlist : sets et pièces à acquérir', () => {
  assert.deepEqual(calculerStats(COLLECTION).wishlist, { sets: 2, pieces: 2000, sansPieces: 1, priorites: [] });
});

// ---------- répartition par emplacement ----------
const rg = (o) => set({ theme: 'T', annee: 2020, pieces: 100, etat: 'monté', ...o });
const RANGE = [
  rg({ nom: 'A', emplacement: 'étagère 2', pieces: 100 }),
  rg({ nom: 'B', emplacement: 'étagère 2', pieces: null }),
  rg({ nom: 'C', emplacement: 'étagère 10' }),
  rg({ nom: 'D', emplacement: 'cave' }),
  rg({ nom: 'E', emplacement: '' }),
  rg({ nom: 'F', emplacement: '' }),
  rg({ nom: 'Souhait', statut: 'souhaité', etat: null, emplacement: '' }),
];

test('emplacements : vide tant que la fonction ne sert pas', () => {
  assert.deepEqual(calculerStats(COLLECTION).emplacements, []);
});

test('emplacements : ordre naturel puis « Non rangé » en dernier', () => {
  assert.deepEqual(calculerStats(RANGE).emplacements.map((b) => b.libelle), ['cave', 'étagère 2', 'étagère 10', 'Non rangé']);
});

test('emplacements : chaque barre égale la liste filtrée correspondante', () => {
  for (const b of calculerStats(RANGE).emplacements) {
    const liste = filtrer(RANGE, { statut: 'possédé', ...b.filtre });
    assert.equal(b.sets, liste.length, b.libelle);
    assert.equal(b.pieces, liste.reduce((t, x) => t + (x.pieces ?? 0), 0), `${b.libelle} : pièces`);
    assert.equal(b.piecesInconnues, liste.filter((x) => x.pieces == null).length, `${b.libelle} : inconnues`);
  }
});

test('emplacements : la somme des barres est le nombre de sets possédés', () => {
  assert.equal(calculerStats(RANGE).emplacements.reduce((t, b) => t + b.sets, 0), 6);
});

test('emplacements : « Non rangé » mène au filtre « sans emplacement »', () => {
  const vide = calculerStats(RANGE).emplacements.at(-1);
  assert.deepEqual(vide.filtre, { manque: 'emplacement' });
  assert.equal(vide.sets, 2);
});

test('« à compléter » compte « sans emplacement » une fois la fonction utilisée', () => {
  const { aCompleter } = calculerStats(RANGE);
  assert.deepEqual(aCompleter.champs.filter((c) => c.cle === 'emplacement').map((c) => c.nombre), [2]);
});

// ---------- priorité de la wishlist ----------
const wl = (o) => set({ statut: 'souhaité', ...o });
const SOUHAITS = [wl({ priorite: 'forte' }), wl({ priorite: 'forte' }), wl({ priorite: 'un-jour' }), wl({})];

test('wishlist : répartition par priorité, « non précisée » en dernier', () => {
  assert.deepEqual(calculerStats(SOUHAITS).wishlist.priorites, [
    { cle: 'forte', libelle: 'Envie forte', sets: 2 },
    { cle: 'un-jour', libelle: 'Un jour', sets: 1 },
    { cle: '', libelle: 'Non précisée', sets: 1 },
  ]);
});

test('wishlist : la somme des priorités est le nombre de sets souhaités', () => {
  const w = calculerStats(SOUHAITS).wishlist;
  assert.equal(w.priorites.reduce((t, p) => t + p.sets, 0), w.sets);
});

// ---------- activité de l'année ----------
const AUJ = new Date(2026, 10, 3);
const ACT = [
  rg({ dateAchat: '2026-02-01', dateMontage: '2026-02-05' }),
  rg({ dateAchat: '2026-03-01' }),
  rg({ dateAchat: '2025-12-31', dateMontage: '2026-01-01' }),
  rg({}),
];

test('activité : achetés et montés cette année seulement', () => {
  assert.deepEqual(calculerStats(ACT, AUJ).activite, { annee: 2026, achetes: 2, montes: 2 });
});

test('activité : absente tant qu\'aucune date n\'est saisie', () => {
  assert.equal(calculerStats([rg({}), rg({})], AUJ).activite, null);
});

test('activité : une année sans achat affiche 0, pas rien', () => {
  assert.deepEqual(calculerStats(ACT, new Date(2030, 0, 1)).activite, { annee: 2030, achetes: 0, montes: 0 });
});

test('stats : « Salon » et « salon » ne font qu\'une barre d\'emplacement', () => {
  const st = calculerStats([
    set({ nom: 'A', emplacement: 'Salon' }), set({ nom: 'B', emplacement: 'salon' }), set({ nom: 'C', emplacement: 'Salon' }), set({ nom: 'D', emplacement: 'Cave' }),
  ]);
  const salon = st.emplacements.find((b) => b.libelle === 'Salon');
  assert.equal(salon.sets, 3);
  assert.equal(st.emplacements.filter((b) => /salon/i.test(b.libelle)).length, 1);
  assert.equal(salon.filtre.emplacement, 'Salon');
});

// ---------- boîte et notice ----------
const BN = [
  set({ nom: 'A', boite: 'oui', notice: 'oui' }), set({ nom: 'B', boite: 'oui', notice: 'non' }), set({ nom: 'C', boite: 'non', notice: null }),
  set({ nom: 'D' }), set({ nom: 'W', statut: 'souhaité', boite: 'oui' }),
];

test('boîte et notice : trois barres au plus, et chaque barre égale la liste filtrée correspondante', () => {
  const st = calculerStats(BN);
  assert.deepEqual(st.boiteNotice.boite.map((b) => [b.libelle, b.sets]), [['Présente', 2], ['Absente', 1], ['Non précisée', 1]]);
  assert.deepEqual(st.boiteNotice.notice.map((b) => [b.libelle, b.sets]), [['Présente', 1], ['Absente', 1], ['Non précisée', 2]]);
  for (const b of [...st.boiteNotice.boite, ...st.boiteNotice.notice]) {
    assert.equal(b.sets, filtrer(BN, { statut: 'possédé', ...b.filtre }).length, b.libelle);
  }
});

test('boîte et notice : un set souhaité ne compte pas, et sans aucune valeur renseignée le bloc n\'existe pas', () => {
  assert.equal(calculerStats([set({ nom: 'A' }), set({ nom: 'B' })]).boiteNotice, null);
  assert.equal(calculerStats([set({ nom: 'W', statut: 'souhaité', boite: 'oui' })]).boiteNotice, null);
});

test('boîte et notice non précisées rejoignent « à compléter » une fois la fonction utilisée', () => {
  const st = calculerStats(BN);
  const cles = st.aCompleter.champs.map((c) => c.cle);
  assert.ok(cles.includes('boite') && cles.includes('notice'));
  assert.equal(st.aCompleter.champs.find((c) => c.cle === 'boite').nombre, 1);
  assert.equal(calculerStats([set({ nom: 'A', theme: '' })]).aCompleter.champs.some((c) => c.cle === 'boite'), false);
});

test('résumé : moyenne de pièces sur les sets connus seulement, et nombre de thèmes distincts', () => {
  const st = calculerStats([
    set({ nom: 'A', pieces: 1000, theme: 'X' }), set({ nom: 'B', pieces: 3000, theme: 'Y' }), set({ nom: 'C', pieces: null, theme: 'X' }), set({ nom: 'D', pieces: 2000, theme: '' }),
  ]);
  assert.equal(st.resume.moyennePieces, 2000);
  assert.equal(st.resume.themes, 2);
  assert.equal(calculerStats([set({ nom: 'A', pieces: null })]).resume.moyennePieces, null);
});

// ---------- tailles, étiquettes, records ----------
import { cleTaille } from './recherche.js';

test('cleTaille : quatre tranches, bornes comprises, et pas de taille sans pièces', () => {
  assert.equal(cleTaille(0), 'petit');
  assert.equal(cleTaille(499), 'petit');
  assert.equal(cleTaille(500), 'moyen');
  assert.equal(cleTaille(1499), 'moyen');
  assert.equal(cleTaille(1500), 'grand');
  assert.equal(cleTaille(2999), 'grand');
  assert.equal(cleTaille(3000), 'tres-grand');
  assert.equal(cleTaille(null), null);
});

const TAILLES_SETS = [set({ nom: 'A', pieces: 100 }), set({ nom: 'B', pieces: 800 }), set({ nom: 'C', pieces: 800 }), set({ nom: 'D', pieces: 4000 }), set({ nom: 'E', pieces: null })];

test('tailles : dans l\'ordre du petit au très gros, chaque barre égale la liste filtrée', () => {
  const st = calculerStats(TAILLES_SETS);
  assert.deepEqual(st.tailles.map((b) => [b.cle, b.sets]), [['petit', 1], ['moyen', 2], ['tres-grand', 1], ['', 1]]);
  for (const b of st.tailles) assert.equal(b.sets, filtrer(TAILLES_SETS, { statut: 'possédé', ...b.filtre }).length, b.libelle);
});

test('étiquettes : les plus utilisées d\'abord, une écriture par étiquette, bornées à 8', () => {
  const sets = [
    set({ nom: 'A', etiquettes: ['Cadeau', 'rare'] }), set({ nom: 'B', etiquettes: ['cadeau'] }), set({ nom: 'C', etiquettes: ['Cadeau'] }), set({ nom: 'D', etiquettes: ['rare'] }),
    ...Array.from({ length: 9 }, (_, i) => set({ nom: `X${i}`, etiquettes: [`t${i}`] })),
  ];
  const e = calculerStats(sets).etiquettes;
  assert.deepEqual(e.barres.slice(0, 2).map((b) => [b.libelle, b.sets]), [['Cadeau', 3], ['rare', 2]]);
  assert.equal(e.barres.length, 8);
  assert.equal(e.total, 11);
  for (const b of e.barres) assert.equal(b.sets, filtrer(sets, { statut: 'possédé', ...b.filtre }).length, b.libelle);
  assert.deepEqual(calculerStats([set({ nom: 'A' })]).etiquettes, { barres: [], total: 0 });
});

test('records : plus gros et plus petit, plus ancien et plus récent, seulement s\'ils diffèrent', () => {
  const r = calculerStats([
    set({ nom: 'Petit', pieces: 100, annee: 2005 }), set({ nom: 'Gros', pieces: 9000, annee: 2023 }), set({ nom: 'Milieu', pieces: 500, annee: 2015 }),
  ]).records;
  assert.deepEqual(r.plusPetit, { nom: 'Petit', pieces: 100 });
  assert.deepEqual(r.plusAncien, { nom: 'Petit', annee: 2005 });
  assert.deepEqual(r.plusRecent, { nom: 'Gros', annee: 2023 });
  const seul = calculerStats([set({ nom: 'A', pieces: 100, annee: 2020 }), set({ nom: 'B', pieces: 100, annee: 2020 })]).records;
  assert.equal(seul.plusPetit, null);
  assert.equal(seul.plusAncien, null);
  assert.equal(seul.plusRecent, null);
});

test('records : décennie et thème dominants menant à la bonne liste, emplacement le plus rempli', () => {
  const sets = [
    set({ nom: 'A', annee: 2012, theme: 'X', emplacement: 'Salon' }), set({ nom: 'B', annee: 2014, theme: 'X', emplacement: 'salon' }),
    set({ nom: 'C', annee: 2021, theme: 'Y', emplacement: 'Cave' }),
  ];
  const r = calculerStats(sets).records;
  assert.deepEqual([r.decennie.libelle, r.decennie.sets], ['2010–2019', 2]);
  assert.equal(filtrer(sets, { statut: 'possédé', ...r.decennie.filtre }).length, 2);
  assert.deepEqual([r.themeFavori.libelle, r.themeFavori.sets], ['X', 2]);
  assert.equal(filtrer(sets, { statut: 'possédé', ...r.themeFavori.filtre }).length, 2);
  assert.deepEqual([r.emplacementPlein.libelle, r.emplacementPlein.sets], ['Salon', 2]);
  assert.equal(filtrer(sets, { statut: 'possédé', ...r.emplacementPlein.filtre }).length, 2);
  // un seul thème, une seule décennie, un seul emplacement : rien à comparer
  const un = calculerStats([set({ nom: 'A', annee: 2012, theme: 'X', emplacement: 'Salon' })]).records;
  assert.equal(un.decennie, null);
  assert.equal(un.themeFavori, null);
  assert.equal(un.emplacementPlein, null);
});

test('records : doublons comptés par numéro, sets souhaités exclus', () => {
  const sets = [
    set({ nom: 'A', numero: '75192-1' }), set({ nom: 'A2', numero: '75192-1' }), set({ nom: 'A3', numero: '75192-1' }),
    set({ nom: 'B', numero: '10294-1' }), set({ nom: 'B2', numero: '10294-1' }),
    set({ nom: 'W', numero: '21330-1' }), set({ nom: 'W2', numero: '21330-1', statut: 'souhaité' }),
  ];
  assert.deepEqual(calculerStats(sets).records.doublons, { numeros: 2, enTrop: 3 });
  assert.equal(calculerStats([set({ nom: 'A' })]).records.doublons, null);
});
