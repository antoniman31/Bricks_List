import { cleEmplacement, ecrituresEmplacements } from './emplacements.js';
import { ETATS, LIBELLES_PRIORITE, PRIORITES } from './model.js';
import { anneeDe } from './dates.js';
import { TAILLES, cleAnnee, cleTaille, libelleAnnee, manquants, modeAnnees } from './recherche.js';
import { cleEtiquette } from './etiquettes.js';
import { prixValide } from './prix.js';

// Chaque barre porte le filtre qui retrouve exactement ses sets. Le chiffre
// affiché et la liste obtenue en la touchant utilisent donc les mêmes prédicats
// (`filtrer`) et ne peuvent pas diverger : c'est ce que vérifie le test.

function total(sets) {
  return sets.reduce((somme, s) => somme + (s.pieces ?? 0), 0);
}

// Le budget de la wishlist : la somme des prix connus, au centime (en centimes entiers, sans écart de virgule), et le montant
// par priorité (seules les priorités qui ont un montant). Un set sans prix n'est jamais compté : on dit combien il y en a.
function budgetWishlist(souhaites) {
  const avec = souhaites.filter((s) => prixValide(s.prix) !== null);
  if (avec.length === 0) return null;
  const centimes = (liste) => liste.reduce((t, s) => t + Math.round(prixValide(s.prix) * 100), 0);
  const parPriorite = [
    ...PRIORITES.map((p) => ({ cle: p, libelle: LIBELLES_PRIORITE[p], liste: avec.filter((s) => s.priorite === p) })),
    { cle: '', libelle: 'Non précisée', liste: avec.filter((s) => !s.priorite) },
  ].filter((x) => x.liste.length > 0);
  return {
    total: centimes(avec) / 100,
    avecPrix: avec.length,
    sansPrix: souhaites.length - avec.length,
    // Certains prix sont des prix allemands pré-remplis : la vue le rappelle.
    prixDE: avec.some((s) => s.prixSource === 'brickset-de'),
    priorites: parPriorite.map((x) => ({ cle: x.cle, libelle: x.libelle, sets: x.liste.length, montant: centimes(x.liste) / 100 })),
  };
}

function barre(cle, libelle, sets, filtre) {
  return { cle, libelle, sets: sets.length, pieces: total(sets), piecesInconnues: sets.filter((s) => s.pieces == null).length, filtre };
}

// Regroupe par clé ; les sets sans valeur forment une dernière barre « Non
// renseigné » qui mène au filtre « à compléter » correspondant, au lieu d'être
// comptés comme un zéro ou oubliés.
function repartir(sets, cleDe, libelleDe, filtreDe, champManquant, trierBarres, libelleVide = 'Non renseigné') {
  const groupes = new Map();
  const vides = [];
  for (const s of sets) {
    const cle = cleDe(s);
    if (cle == null || cle === '') { vides.push(s); continue; }
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(s);
  }
  const barres = [...groupes].map(([cle, liste]) => barre(cle, libelleDe(cle), liste, filtreDe(cle)));
  barres.sort(trierBarres);
  if (vides.length > 0) barres.push(barre('', libelleVide, vides, { manque: champManquant }));
  return barres;
}

// Boîte ou notice : présente, absente, non précisée. Chaque barre porte son filtre (les filtres `boite`
// et `notice` de `filtrer`, ou « à compléter » pour le non précisé), donc le chiffre et la liste concordent.
function repartirOuiNon(sets, champ) {
  const parValeur = (v) => sets.filter((s) => (s[champ] ?? null) === v);
  return [
    barre('oui', 'Présente', parValeur('oui'), { [champ]: 'oui' }),
    barre('non', 'Absente', parValeur('non'), { [champ]: 'non' }),
    barre('', 'Non précisée', parValeur(null), { manque: champ }),
  ].filter((b) => b.sets > 0);
}

// Les étiquettes les plus utilisées, avec leur nombre de sets. Une écriture par étiquette (la première),
// comme les filtres : « Cadeau » et « cadeau » ne font qu'une barre.
function repartirEtiquettes(sets, max) {
  const parCle = new Map();
  for (const s of sets) {
    for (const e of s.etiquettes ?? []) {
      const cle = cleEtiquette(e);
      if (!parCle.has(cle)) parCle.set(cle, { texte: e, sets: [] });
      parCle.get(cle).sets.push(s);
    }
  }
  const barres = [...parCle].map(([cle, { texte, sets: liste }]) => barre(cle, texte, liste, { etiquette: texte }))
    .sort((a, b) => b.sets - a.sets || a.libelle.localeCompare(b.libelle, 'fr', { sensitivity: 'base' }));
  return { barres: barres.slice(0, max), total: barres.length };
}

// Ce qui se compare d'un coup d'œil : le plus gros, le plus petit, le plus ancien, le plus récent, le thème
// et la décennie qui dominent, l'emplacement le plus rempli, les doublons. Chaque ligne n'existe que si elle
// apprend quelque chose (un « plus ancien » identique au « plus récent » ne dit rien).
function records(possedes, themes, emplacements) {
  const avecPieces = possedes.filter((s) => s.pieces != null);
  const plusPetit = avecPieces.reduce((m, s) => (m === null || s.pieces < m.pieces ? s : m), null);
  const plusGros = avecPieces.reduce((m, s) => (m === null || s.pieces > m.pieces ? s : m), null);
  const avecAnnee = possedes.filter((s) => s.annee != null);
  const plusAncien = avecAnnee.reduce((m, s) => (m === null || s.annee < m.annee ? s : m), null);
  const plusRecent = avecAnnee.reduce((m, s) => (m === null || s.annee > m.annee ? s : m), null);
  const decennies = new Map();
  for (const s of avecAnnee) {
    const cle = cleAnnee(s.annee, 'decennie');
    decennies.set(cle, (decennies.get(cle) ?? 0) + 1);
  }
  const [decCle, decSets] = [...decennies].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? [null, 0];
  const nommes = themes.filter((b) => b.cle !== '');
  const lieux = emplacements.filter((b) => b.cle !== '');
  const pleinLieu = lieux.slice().sort((a, b) => b.sets - a.sets)[0];
  const parNumero = new Map();
  for (const s of possedes) parNumero.set(s.numero, (parNumero.get(s.numero) ?? 0) + 1);
  const doubles = [...parNumero.values()].filter((n) => n > 1);
  return {
    plusPetit: plusPetit && plusGros && plusPetit.pieces !== plusGros.pieces ? { nom: plusPetit.nom, pieces: plusPetit.pieces } : null,
    plusAncien: plusAncien && plusRecent && plusAncien.annee !== plusRecent.annee ? { nom: plusAncien.nom, annee: plusAncien.annee } : null,
    plusRecent: plusAncien && plusRecent && plusAncien.annee !== plusRecent.annee ? { nom: plusRecent.nom, annee: plusRecent.annee } : null,
    // Une décennie dominante n'a de sens que si les sets s'étalent sur plusieurs décennies.
    decennie: decennies.size > 1 ? { libelle: libelleAnnee(decCle), sets: decSets, filtre: { annee: decCle } } : null,
    themeFavori: nommes.length > 1 ? { libelle: nommes[0].libelle, sets: nommes[0].sets, filtre: nommes[0].filtre } : null,
    emplacementPlein: lieux.length > 1 ? { libelle: pleinLieu.libelle, sets: pleinLieu.sets, filtre: pleinLieu.filtre } : null,
    doublons: doubles.length > 0 ? { numeros: doubles.length, enTrop: doubles.reduce((t, n) => t + n - 1, 0) } : null,
  };
}


// ---- Avancement, pile à monter, activité ----

// « Monté » est l'état d'arrivée ; scellé, neuf et en cours sont ce qu'il reste à monter. Un set sans état
// n'est dans aucun des deux : on ne devine pas, il est signalé à part. Les pièces ne comptent que pour les sets
// dont on les connaît.
const A_MONTER = ['scellé', 'neuf', 'en cours'];

function avancement(possedes) {
  const avecEtat = possedes.filter((s) => s.etat != null);
  const montes = avecEtat.filter((s) => s.etat === 'monté');
  const restants = avecEtat.filter((s) => A_MONTER.includes(s.etat));
  if (montes.length + restants.length === 0) return null;
  const pm = total(montes);
  const pr = total(restants);
  return {
    montes: { sets: montes.length, pieces: pm },
    restants: { sets: restants.length, pieces: pr },
    pourcentage: pm + pr > 0 ? Math.round((pm / (pm + pr)) * 100) : null,
    sansEtat: possedes.length - avecEtat.length,
    sansPieces: avecEtat.filter((s) => s.pieces == null).length,
    parEtat: A_MONTER.map((e) => barre(e, e, restants.filter((s) => s.etat === e), { etat: e })).filter((b) => b.sets > 0),
  };
}

// Les douze derniers mois, du plus ancien au courant, avec ce qui s'y est passé. Les dates d'achat et de montage
// sont des jours locaux (AAAA-MM-JJ) ; la date d'ajout est un instant, ramené au mois local de l'appareil.
export function moisRecents(maintenant, n = 12) {
  const liste = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    liste.push({ cle: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, annee: d.getFullYear(), mois: d.getMonth() });
  }
  return liste;
}

function moisLocal(iso) {
  if (typeof iso !== 'string') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function activiteMensuelle(possedes, maintenant) {
  const mois = moisRecents(maintenant).map((m) => ({
    ...m,
    achetes: possedes.filter((s) => typeof s.dateAchat === 'string' && s.dateAchat.slice(0, 7) === m.cle).length,
    montes: possedes.filter((s) => typeof s.dateMontage === 'string' && s.dateMontage.slice(0, 7) === m.cle).length,
    ajoutes: possedes.filter((s) => moisLocal(s.dateAjout) === m.cle).length,
  }));
  const somme = (c) => mois.reduce((t, m) => t + m[c], 0);
  return {
    mois,
    achetes: somme('achetes'),
    montes: somme('montes'),
    ajoutes: somme('ajoutes'),
  };
}

// Délai entre l'achat et le montage, pour les sets qui ont les deux dates dans le bon ordre.
function delaiAchatMontage(possedes) {
  const jours = [];
  for (const s of possedes) {
    if (typeof s.dateAchat !== 'string' || typeof s.dateMontage !== 'string') continue;
    const a = Date.parse(`${s.dateAchat}T00:00:00Z`);
    const m = Date.parse(`${s.dateMontage}T00:00:00Z`);
    if (Number.isNaN(a) || Number.isNaN(m) || m < a) continue;
    jours.push(Math.round((m - a) / 86400000));
  }
  if (jours.length === 0) return null;
  return { jours: Math.round(jours.reduce((t, j) => t + j, 0) / jours.length), sets: jours.length };
}

const parTaille = (a, b) => b.sets - a.sets || a.libelle.localeCompare(b.libelle, 'fr', { sensitivity: 'base' });

export function calculerStats(sets, maintenant = new Date()) {
  const possedes = sets.filter((s) => s.statut === 'possédé');
  const souhaites = sets.filter((s) => s.statut === 'souhaité');

  const avecPieces = possedes.filter((s) => s.pieces != null);
  const plusGros = avecPieces.reduce((max, s) => (max === null || s.pieces > max.pieces ? s : max), null);

  const mode = modeAnnees(possedes);
  // « Salon » et « salon » ne font qu'une barre, affichée avec l'écriture la plus fréquente.
  const ecritures = ecrituresEmplacements(possedes);
  const themesBarres = repartir(possedes, (s) => s.theme, (t) => t, (t) => ({ theme: t }), 'theme', parTaille);
  // Seulement si la fonction sert : sans aucun emplacement, une seule barre « Non rangé »
  // qui répéterait le nombre total de sets n'apprendrait rien.
  const emplacementsBarres = possedes.some((s) => s.emplacement)
    ? repartir(possedes, (s) => cleEmplacement(s.emplacement), (c) => ecritures.get(c), (c) => ({ emplacement: ecritures.get(c) }), 'emplacement',
      (a, b) => a.libelle.localeCompare(b.libelle, 'fr', { sensitivity: 'base', numeric: true }), 'Non rangé')
    : [];

  return {
    resume: {
      sets: possedes.length,
      pieces: total(possedes),
      sansPieces: possedes.length - avecPieces.length,
      // La moyenne ne porte que sur les sets dont on connaît les pièces : compter les autres comme zéro la tirerait vers le bas.
      moyennePieces: avecPieces.length > 0 ? Math.round(total(avecPieces) / avecPieces.length) : null,
      themes: new Set(possedes.map((s) => s.theme).filter(Boolean)).size,
      plusGros: plusGros ? { nom: plusGros.nom, pieces: plusGros.pieces } : null,
    },
    themes: themesBarres,
    annees: repartir(possedes, (s) => (s.annee == null ? null : cleAnnee(s.annee, mode)), libelleAnnee, (c) => ({ annee: c }), 'annee',
      // Dans l'ordre du temps : une frise se lit de gauche à droite, pas par taille.
      (a, b) => a.cle.localeCompare(b.cle)),
    etats: repartir(possedes, (s) => s.etat, (e) => e, (e) => ({ etat: e }), 'etat',
      (a, b) => ETATS.indexOf(a.cle) - ETATS.indexOf(b.cle)),
    emplacements: emplacementsBarres,
    // Seulement si la fonction sert : sans aucune boîte ni notice renseignée, « 12 sets non précisés »
    // répéterait le nombre de sets sans rien apprendre.
    boiteNotice: possedes.some((s) => s.boite != null || s.notice != null)
      ? { boite: repartirOuiNon(possedes, 'boite'), notice: repartirOuiNon(possedes, 'notice') }
      : null,
    // Les tranches de taille, du petit au très gros ; les sets sans pièces forment « Non renseigné ».
    tailles: repartir(possedes, (s) => cleTaille(s.pieces), (c) => TAILLES.find((t) => t.cle === c).libelle, (c) => ({ taille: c }), 'pieces',
      (a, b) => TAILLES.findIndex((t) => t.cle === a.cle) - TAILLES.findIndex((t) => t.cle === b.cle)),
    etiquettes: repartirEtiquettes(possedes, 8),
    records: records(possedes, themesBarres, emplacementsBarres),
    aCompleter: manquants(possedes),
    // Seulement si au moins une date est saisie : sinon « 0 achetés, 0 montés » ferait
    // croire que rien n'a été acheté alors que rien n'a été renseigné.
    activite: possedes.some((s) => s.dateAchat || s.dateMontage)
      ? {
        annee: maintenant.getFullYear(),
        achetes: possedes.filter((s) => anneeDe(s.dateAchat) === maintenant.getFullYear()).length,
        montes: possedes.filter((s) => anneeDe(s.dateMontage) === maintenant.getFullYear()).length,
      }
      : null,
    avancement: avancement(possedes),
    // Seulement s'il s'est passé quelque chose sur les douze derniers mois : sinon douze colonnes vides.
    mensuel: (() => { const m = activiteMensuelle(possedes, maintenant); return m.achetes + m.montes + m.ajoutes > 0 ? m : null; })(),
    delai: delaiAchatMontage(possedes),
    wishlist: {
      sets: souhaites.length,
      pieces: total(souhaites),
      sansPieces: souhaites.filter((s) => s.pieces == null).length,
      budget: budgetWishlist(souhaites),
      // Seulement si la fonction sert : sinon une seule ligne « non précisée » = le total.
      priorites: souhaites.some((s) => s.priorite)
        ? [...PRIORITES.map((p) => ({ cle: p, libelle: LIBELLES_PRIORITE[p], sets: souhaites.filter((s) => s.priorite === p).length })),
          { cle: '', libelle: 'Non précisée', sets: souhaites.filter((s) => !s.priorite).length }].filter((x) => x.sets > 0)
        : [],
    },
  };
}
