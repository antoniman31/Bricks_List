// Les chiffres ajoutés aux Stats avec les sous-onglets (novembre 2026) : médiane des pièces, sous-thèmes, plus gros et plus petits sets,
// pile à monter la plus ancienne, état des données, et pour la wishlist : retraits proches, prix par pièce, budget par thème. Logique pure
// (testée) ; `stats.js` les assemble, `StatsView.jsx` les affiche avec les composants et le style qui existaient déjà.
import { prixValide } from './prix.js';
import { centimesParPiece } from './prixPiece.js';
import { etatRetrait } from './sortie.js';
import { joursJusque } from './dates.js';

const parNom = (a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });

export function mediane(valeurs) {
  const v = valeurs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

// Les sous-thèmes (Brickset) les plus fournis. Sans aucun sous-thème connu : null (un bloc « 0 sous-thème » n'apprend rien).
// Chaque barre porte le filtre `sousTheme`, donc le chiffre et la liste concordent. `sans` : sets sans sous-thème connu.
export function sousThemes(sets, max = 8) {
  const groupes = new Map();
  for (const s of sets) if (typeof s.sousTheme === 'string' && s.sousTheme !== '') groupes.set(s.sousTheme, [...(groupes.get(s.sousTheme) ?? []), s]);
  if (groupes.size === 0) return null;
  const barres = [...groupes].map(([cle, liste]) => ({
    cle, libelle: cle, sets: liste.length, pieces: liste.reduce((t, s) => t + (s.pieces ?? 0), 0), piecesInconnues: liste.filter((s) => s.pieces == null).length, filtre: { sousTheme: cle },
  })).sort((a, b) => b.sets - a.sets || a.libelle.localeCompare(b.libelle, 'fr', { sensitivity: 'base' }));
  const avec = barres.reduce((t, b) => t + b.sets, 0);
  return { barres: barres.slice(0, max), distincts: barres.length, sans: sets.length - avec };
}

// Les `n` plus gros et les `n` plus petits sets par nombre de pièces. Sans assez de sets pour que les deux listes se distinguent : null.
export function extremes(sets, n = 5) {
  const avec = sets.filter((s) => Number.isInteger(s.pieces) && s.pieces > 0);
  const taille = Math.min(n, Math.floor(avec.length / 2));
  if (taille < 2) return null;
  const tri = [...avec].sort((a, b) => b.pieces - a.pieces || parNom(a, b));
  const ligne = (s) => ({ id: s.id, nom: s.nom, pieces: s.pieces, theme: s.theme ?? '' });
  return { gros: tri.slice(0, taille).map(ligne), petits: tri.slice(-taille).reverse().map(ligne) };
}

// La pile à monter, depuis le plus longtemps : les sets pas encore montés (états `aMonter`) dont on connaît la date d'achat, les `max`
// plus anciens. Sans date d'achat, on ne sait pas depuis quand : le set n'y figure pas (un nombre `sansDate` le dit).
export function pileAncienne(sets, aMonter, maintenant = new Date(), max = 5) {
  const restants = sets.filter((s) => aMonter.includes(s.etat));
  const datees = restants.filter((s) => joursJusque(s.dateAchat, maintenant) !== null);
  if (datees.length === 0) return null;
  const liste = datees
    .map((s) => ({ id: s.id, nom: s.nom, pieces: s.pieces ?? null, dateAchat: s.dateAchat, jours: -joursJusque(s.dateAchat, maintenant) }))
    .sort((a, b) => b.jours - a.jours || parNom(a, b))
    .slice(0, max);
  return { liste, total: datees.length, sansDate: restants.length - datees.length };
}

// L'état des données de la collection : combien de sets ont une date de sortie et un sous-thème connus.
export function donnees(sets) {
  if (sets.length === 0) return null;
  return {
    sets: sets.length,
    dateSortie: sets.filter((s) => s.dateSortie != null).length,
    sousTheme: sets.filter((s) => typeof s.sousTheme === 'string' && s.sousTheme !== '').length,
  };
}

const centimes = (liste) => liste.reduce((t, s) => t + Math.round(prixValide(s.prix) * 100), 0);

// Wishlist : ce qui part dans les six mois (nombre, budget des sets qui ont un prix, ceux sans prix) et ce qui n'est déjà plus à la vente.
// Null s'il n'y a ni l'un ni l'autre.
export function urgentWishlist(souhaites, maintenant = new Date()) {
  const bientot = [];
  const retires = [];
  for (const s of souhaites) {
    const e = etatRetrait(s, maintenant);
    if (!e) continue;
    if (e.retire) retires.push({ id: s.id, nom: s.nom });
    else if (e.bientot) bientot.push(s);
  }
  if (bientot.length === 0 && retires.length === 0) return null;
  const avecPrix = bientot.filter((s) => prixValide(s.prix) !== null);
  return {
    bientot: { sets: bientot.length, montant: centimes(avecPrix) / 100, sansPrix: bientot.length - avecPrix.length, avecPrix: avecPrix.length },
    retires: retires.sort(parNom),
  };
}

// Prix par pièce de la wishlist : le moyen (somme des prix ÷ somme des pièces des sets qui ont les deux), les `n` meilleurs et les `n` pires.
// Sans au moins deux sets chiffrés : null.
export function prixPieceWishlist(souhaites, n = 3) {
  const chiffres = souhaites.map((s) => ({ s, ct: centimesParPiece(s) })).filter((x) => x.ct !== null);
  if (chiffres.length < 2) return null;
  const somme = chiffres.reduce((t, { s }) => t + prixValide(s.prix) * 100, 0);
  const pieces = chiffres.reduce((t, { s }) => t + s.pieces, 0);
  const tri = [...chiffres].sort((a, b) => a.ct - b.ct || parNom(a.s, b.s));
  const taille = Math.min(n, Math.floor(chiffres.length / 2));
  const ligne = ({ s, ct }) => ({ id: s.id, nom: s.nom, ct });
  return { moyen: somme / pieces, sets: chiffres.length, meilleurs: tri.slice(0, taille).map(ligne), pires: tri.slice(-taille).reverse().map(ligne) };
}

// Budget de la wishlist par thème : le montant des sets qui ont un prix, du plus cher au moins cher. Un seul thème, ou aucun prix : null.
export function budgetThemes(souhaites) {
  const groupes = new Map();
  for (const s of souhaites) {
    if (prixValide(s.prix) === null) continue;
    const t = s.theme || '';
    groupes.set(t, [...(groupes.get(t) ?? []), s]);
  }
  if (groupes.size < 2) return null;
  return [...groupes].map(([t, liste]) => ({ cle: t, libelle: t === '' ? 'Sans thème' : t, sets: liste.length, montant: centimes(liste) / 100 }))
    .sort((a, b) => b.montant - a.montant || a.libelle.localeCompare(b.libelle, 'fr', { sensitivity: 'base' }));
}
