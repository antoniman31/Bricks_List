import { cleEmplacement, ecrituresEmplacements } from './emplacements.js';
import { ETATS, LIBELLES_PRIORITE, PRIORITES } from './model.js';
import { anneeDe } from './dates.js';
import { cleAnnee, libelleAnnee, manquants, modeAnnees } from './recherche.js';

// Chaque barre porte le filtre qui retrouve exactement ses sets. Le chiffre
// affiché et la liste obtenue en la touchant utilisent donc les mêmes prédicats
// (`filtrer`) et ne peuvent pas diverger : c'est ce que vérifie le test.

function total(sets) {
  return sets.reduce((somme, s) => somme + (s.pieces ?? 0), 0);
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

const parTaille = (a, b) => b.sets - a.sets || a.libelle.localeCompare(b.libelle, 'fr', { sensitivity: 'base' });

export function calculerStats(sets, maintenant = new Date()) {
  const possedes = sets.filter((s) => s.statut === 'possédé');
  const souhaites = sets.filter((s) => s.statut === 'souhaité');

  const avecPieces = possedes.filter((s) => s.pieces != null);
  const plusGros = avecPieces.reduce((max, s) => (max === null || s.pieces > max.pieces ? s : max), null);

  const mode = modeAnnees(possedes);
  // « Salon » et « salon » ne font qu'une barre, affichée avec l'écriture la plus fréquente.
  const ecritures = ecrituresEmplacements(possedes);

  return {
    resume: {
      sets: possedes.length,
      pieces: total(possedes),
      sansPieces: possedes.length - avecPieces.length,
      plusGros: plusGros ? { nom: plusGros.nom, pieces: plusGros.pieces } : null,
    },
    themes: repartir(possedes, (s) => s.theme, (t) => t, (t) => ({ theme: t }), 'theme', parTaille),
    annees: repartir(possedes, (s) => (s.annee == null ? null : cleAnnee(s.annee, mode)), libelleAnnee, (c) => ({ annee: c }), 'annee',
      // Dans l'ordre du temps : une frise se lit de gauche à droite, pas par taille.
      (a, b) => a.cle.localeCompare(b.cle)),
    etats: repartir(possedes, (s) => s.etat, (e) => e, (e) => ({ etat: e }), 'etat',
      (a, b) => ETATS.indexOf(a.cle) - ETATS.indexOf(b.cle)),
    // Seulement si la fonction sert : sans aucun emplacement, une seule barre « Non rangé »
    // qui répéterait le nombre total de sets n'apprendrait rien.
    emplacements: possedes.some((s) => s.emplacement)
      ? repartir(possedes, (s) => cleEmplacement(s.emplacement), (c) => ecritures.get(c), (c) => ({ emplacement: ecritures.get(c) }), 'emplacement',
        (a, b) => a.libelle.localeCompare(b.libelle, 'fr', { sensitivity: 'base', numeric: true }), 'Non rangé')
      : [],
    // Seulement si la fonction sert : sans aucune boîte ni notice renseignée, « 12 sets non précisés »
    // répéterait le nombre de sets sans rien apprendre.
    boiteNotice: possedes.some((s) => s.boite != null || s.notice != null)
      ? { boite: repartirOuiNon(possedes, 'boite'), notice: repartirOuiNon(possedes, 'notice') }
      : null,
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
    wishlist: {
      sets: souhaites.length,
      pieces: total(souhaites),
      sansPieces: souhaites.filter((s) => s.pieces == null).length,
      // Seulement si la fonction sert : sinon une seule ligne « non précisée » = le total.
      priorites: souhaites.some((s) => s.priorite)
        ? [...PRIORITES.map((p) => ({ cle: p, libelle: LIBELLES_PRIORITE[p], sets: souhaites.filter((s) => s.priorite === p).length })),
          { cle: '', libelle: 'Non précisée', sets: souhaites.filter((s) => !s.priorite).length }].filter((x) => x.sets > 0)
        : [],
    },
  };
}
