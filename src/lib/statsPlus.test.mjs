import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetThemes, donnees, extremes, mediane, pileAncienne, prixPieceWishlist, sousThemes, urgentWishlist } from './statsPlus.js';

const AUJOURDHUI = new Date(2026, 10, 14, 10, 0); // 14 novembre 2026
let n = 0;
const set = (o) => ({ id: `s${(n += 1)}`, nom: `Set ${n}`, numero: `${10000 + n}-1`, statut: 'possédé', theme: '', pieces: null, ...o });

test('mediane : au milieu, entre deux valeurs arrondie, rien sans valeur', () => {
  assert.equal(mediane([5, 1, 3]), 3);
  assert.equal(mediane([1, 2, 3, 4]), 3); // 2,5 arrondi
  assert.equal(mediane([100]), 100);
  assert.equal(mediane([]), null);
  assert.equal(mediane([null, undefined, NaN, 'x']), null);
});

test('sousThemes : les plus fournis, avec leur filtre, null sans aucun', () => {
  const sets = [set({ sousTheme: 'UCS', pieces: 100 }), set({ sousTheme: 'UCS', pieces: null }), set({ sousTheme: 'Mario Kart' }), set({ sousTheme: '' }), set({})];
  const r = sousThemes(sets);
  assert.deepEqual(r.barres.map((b) => [b.libelle, b.sets, b.filtre]), [['UCS', 2, { sousTheme: 'UCS' }], ['Mario Kart', 1, { sousTheme: 'Mario Kart' }]]);
  assert.deepEqual([r.distincts, r.sans], [2, 2]);
  assert.equal(r.barres[0].pieces, 100);
  assert.equal(r.barres[0].piecesInconnues, 1);
  assert.equal(sousThemes([set({ sousTheme: '' }), set({})]), null);
  assert.equal(sousThemes([]), null);
  const beaucoup = Array.from({ length: 12 }, (_, i) => set({ sousTheme: `T${i}` }));
  assert.equal(sousThemes(beaucoup, 8).barres.length, 8);
  assert.equal(sousThemes(beaucoup, 8).distincts, 12);
});

test('extremes : les plus gros et les plus petits, jamais le même set dans les deux listes ; null sans assez de sets', () => {
  const sets = [100, 500, 300, 900, 50, 700, 200, 400, 1000, 20, 600, 800].map((p, i) => set({ nom: `S${i}`, pieces: p }));
  const r = extremes(sets);
  assert.deepEqual(r.gros.map((s) => s.pieces), [1000, 900, 800, 700, 600]);
  assert.deepEqual(r.petits.map((s) => s.pieces), [20, 50, 100, 200, 300]);
  const quatre = extremes([10, 20, 30, 40].map((p) => set({ pieces: p })));
  assert.deepEqual([quatre.gros.length, quatre.petits.length], [2, 2]);
  assert.equal(extremes([10, 20, 30].map((p) => set({ pieces: p }))), null);
  assert.equal(extremes([set({ pieces: null }), set({ pieces: 0 })]), null);
  assert.equal(extremes([]), null);
});

test('pileAncienne : les plus anciens des sets à monter, avec la date d\'achat ; sans date, comptés à part', () => {
  const sets = [
    set({ nom: 'Récent', etat: 'scellé', dateAchat: '2026-10-01' }),
    set({ nom: 'Vieux', etat: 'neuf', dateAchat: '2023-11-14' }),
    set({ nom: 'Monté', etat: 'monté', dateAchat: '2020-01-01' }),
    set({ nom: 'Sans date', etat: 'scellé', dateAchat: null }),
    set({ nom: 'Moyen', etat: 'scellé', dateAchat: '2025-01-01' }),
  ];
  const r = pileAncienne(sets, ['scellé', 'neuf'], AUJOURDHUI);
  assert.deepEqual(r.liste.map((s) => [s.nom, s.jours]), [['Vieux', 1096], ['Moyen', 682], ['Récent', 44]]);
  assert.deepEqual([r.total, r.sansDate], [3, 1]);
  assert.equal(pileAncienne(sets, ['scellé', 'neuf'], AUJOURDHUI, 2).liste.length, 2);
  assert.equal(pileAncienne([set({ etat: 'scellé' })], ['scellé'], AUJOURDHUI), null);
  assert.equal(pileAncienne([], ['scellé'], AUJOURDHUI), null);
});

test('donnees : dates de sortie et sous-thèmes connus', () => {
  const r = donnees([set({ dateSortie: '2020-01-01', sousTheme: 'UCS' }), set({ dateSortie: '2021-01-01', sousTheme: '' }), set({})]);
  assert.deepEqual(r, { sets: 3, dateSortie: 2, sousTheme: 1 });
  assert.equal(donnees([]), null);
});

test('urgentWishlist : retraits dans les six mois (nombre, budget, sans prix) et sets déjà retirés ; null sans rien', () => {
  const sets = [
    set({ nom: 'A', statut: 'souhaité', dateRetrait: '2026-12-31', prix: 100 }),
    set({ nom: 'B', statut: 'souhaité', dateRetrait: '2027-03-01', prix: 49.99 }),
    set({ nom: 'C', statut: 'souhaité', dateRetrait: '2027-02-01' }),
    set({ nom: 'Loin', statut: 'souhaité', dateRetrait: '2028-01-01', prix: 10 }),
    set({ nom: 'Retiré', statut: 'souhaité', dateRetrait: '2026-01-01' }),
    set({ nom: 'Sans date', statut: 'souhaité', prix: 5 }),
  ];
  const r = urgentWishlist(sets, AUJOURDHUI);
  assert.deepEqual(r.bientot, { sets: 3, montant: 149.99, sansPrix: 1, avecPrix: 2 });
  assert.deepEqual(r.retires.map((x) => x.nom), ['Retiré']);
  assert.equal(urgentWishlist([set({ statut: 'souhaité', dateRetrait: '2028-01-01' }), set({ statut: 'souhaité' })], AUJOURDHUI), null);
  assert.equal(urgentWishlist([], AUJOURDHUI), null);
});

test('prixPieceWishlist : prix moyen par pièce, meilleurs et pires ; null sans deux sets chiffrés', () => {
  const sets = [
    set({ nom: 'Bon', prix: 50, pieces: 1000 }), // 5 ct
    set({ nom: 'Moyen', prix: 100, pieces: 1000 }), // 10 ct
    set({ nom: 'Cher', prix: 150, pieces: 1000 }), // 15 ct
    set({ nom: 'Sans prix', pieces: 500 }),
    set({ nom: 'Sans pièces', prix: 30 }),
  ];
  const r = prixPieceWishlist(sets);
  assert.equal(r.moyen, 10);
  assert.equal(r.sets, 3);
  assert.deepEqual(r.meilleurs.map((s) => s.nom), ['Bon']);
  assert.deepEqual(r.pires.map((s) => s.nom), ['Cher']);
  const six = Array.from({ length: 6 }, (_, i) => set({ nom: `S${i}`, prix: 10 * (i + 1), pieces: 100 }));
  assert.deepEqual(prixPieceWishlist(six).meilleurs.map((s) => s.nom), ['S0', 'S1', 'S2']);
  assert.deepEqual(prixPieceWishlist(six).pires.map((s) => s.nom), ['S5', 'S4', 'S3']);
  assert.equal(prixPieceWishlist([set({ prix: 10, pieces: 100 })]), null);
  assert.equal(prixPieceWishlist([]), null);
});

test('budgetThemes : montant par thème, du plus cher au moins cher ; null avec un seul thème ou sans prix', () => {
  const sets = [
    set({ theme: 'Star Wars', prix: 849.99 }), set({ theme: 'Star Wars', prix: 100 }), set({ theme: 'Icons', prix: 679.99 }), set({ theme: 'Icons' }), set({ theme: '', prix: 20 }),
  ];
  assert.deepEqual(budgetThemes(sets), [
    { cle: 'Star Wars', libelle: 'Star Wars', sets: 2, montant: 949.99 },
    { cle: 'Icons', libelle: 'Icons', sets: 1, montant: 679.99 },
    { cle: '', libelle: 'Sans thème', sets: 1, montant: 20 },
  ]);
  assert.equal(budgetThemes([set({ theme: 'A', prix: 10 }), set({ theme: 'A', prix: 20 })]), null);
  assert.equal(budgetThemes([set({ theme: 'A' }), set({ theme: 'B' })]), null);
});
