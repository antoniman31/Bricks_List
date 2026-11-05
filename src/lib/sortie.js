// Date de sortie d'un set : ce qu'on en dit, comment on trie et filtre dessus, quels sets interroger.
// La date elle-même est une chaîne AAAA-MM-JJ (voir dates.js), saisie à la main ou donnée par Brickset
// via le relais (voir relais.js).
import { joursJusque } from './dates.js';

// Où en est ce set : null sans date ; sinon { date, jours, aVenir }. « Aujourd'hui » compte comme sorti.
export function etatSortie(set, maintenant = new Date()) {
  const jours = joursJusque(set?.dateSortie, maintenant);
  if (jours === null) return null;
  return { date: set.dateSortie, jours, aVenir: jours > 0 };
}

const MOIS_COURTS = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// « 1 janv. 2027 », construit sans passer par un instant UTC (qui décalerait le jour).
export function dateCourte(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? MOIS_COURTS.format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : '';
}

// « demain », « dans 12 jours », « dans 5 mois » : un ordre de grandeur plutôt qu'un compte exact quand
// c'est loin (l'écart de quelques jours n'y change rien).
export function relatif(jours) {
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'demain';
  if (jours < 90) return `dans ${jours} jours`;
  const mois = Math.round(jours / 30.44);
  return mois < 24 ? `dans ${mois} mois` : `dans ${Math.round(jours / 365.25)} ans`;
}

// Le texte d'une carte : seulement pour un set pas encore sorti. `court` pour la grille (deux colonnes).
export function texteCarte(set, maintenant = new Date(), court = false) {
  const e = etatSortie(set, maintenant);
  if (!e || !e.aVenir) return null;
  return court ? `Sort ${relatif(e.jours)}` : `Sort le ${dateCourte(e.date)} · ${relatif(e.jours)}`;
}

// Les valeurs du filtre « Sortie ».
export const FILTRES_SORTIE = [
  { valeur: 'avenir', libelle: 'À venir' },
  { valeur: 'sorti', libelle: 'Déjà sorti' },
  { valeur: 'inconnue', libelle: 'Date inconnue' },
];

export function correspondSortie(set, valeur, maintenant = new Date()) {
  const e = etatSortie(set, maintenant);
  if (valeur === 'inconnue') return e === null;
  if (valeur === 'avenir') return e !== null && e.aVenir;
  if (valeur === 'sorti') return e !== null && !e.aVenir;
  return true;
}

// Tri « Date de sortie » : la prochaine sortie d'abord, puis les sets déjà sortis du plus récent au plus
// ancien, puis ceux sans date. Pour une wishlist, c'est « qu'est-ce qui arrive bientôt ».
export function comparerSorties(maintenant = new Date()) {
  const rang = (s) => { const e = etatSortie(s, maintenant); return e === null ? 2 : e.aVenir ? 0 : 1; };
  return (a, b) => {
    const ra = rang(a);
    const rb = rang(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) return a.dateSortie < b.dateSortie ? -1 : a.dateSortie > b.dateSortie ? 1 : 0;
    if (ra === 1) return a.dateSortie < b.dateSortie ? 1 : a.dateSortie > b.dateSortie ? -1 : 0;
    return 0;
  };
}

// Les sets à interroger : ceux dont la date peut encore bouger ou manque, sauf ceux dont la date a été
// saisie à la main. Un set déjà sorti avec une date n'est plus redemandé.
export function candidats(sets, maintenant = new Date()) {
  return sets.filter((s) => {
    if (s.sortieSource === 'manuelle') return false;
    const e = etatSortie(s, maintenant);
    return e === null || e.aVenir;
  });
}
