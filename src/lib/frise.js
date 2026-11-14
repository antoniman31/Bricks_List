// La frise des dates d'une fiche de set : trois étapes côte à côte (sortie, achat, montage pour un set possédé ; ajout et
// sortie pour un set souhaité), chacune avec sa date, son état (faite, à venir, vide) et, quand elle a un sens, le temps
// écoulé depuis l'étape d'avant. Logique pure : la fiche ne fait que l'afficher.
import { aujourdhuiISO, joursJusque } from './dates.js';
import { relatif } from './sortie.js';

const FORME = /^(\d{4})-(\d{2})-(\d{2})$/;
const parties = (iso) => { const m = FORME.exec(iso ?? ''); return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null; };
const jourUTC = (p) => Date.UTC(p[0], p[1] - 1, p[2]);
const pluriel = (n, mot, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;

// Le temps entre deux dates « jour », en mots courts : « 5 jours », « 3 semaines », « 5 mois », « 7 ans 5 mois ».
// Vide si une date manque ou si la seconde est avant la première (un écart négatif ne dit rien d'utile).
export function ecartEntre(debut, fin) {
  const a = parties(debut);
  const b = parties(fin);
  if (!a || !b) return '';
  const jours = Math.round((jourUTC(b) - jourUTC(a)) / 86_400_000);
  if (jours < 0) return '';
  if (jours === 0) return 'le même jour';
  if (jours < 14) return pluriel(jours, 'jour');
  if (jours < 60) return pluriel(Math.round(jours / 7), 'semaine');
  // Mois entiers du calendrier : du 12 mars au 12 avril, un mois, quel que soit le nombre de jours.
  const mois = (b[0] - a[0]) * 12 + (b[1] - a[1]) - (b[2] < a[2] ? 1 : 0);
  if (mois < 12) return `${mois} mois`;
  const ans = Math.floor(mois / 12);
  const reste = mois % 12;
  return reste === 0 ? pluriel(ans, 'an') : `${pluriel(ans, 'an')} ${reste} mois`;
}

// La date d'ajout est un instant ISO : on en garde le jour dans le fuseau de l'appareil.
const jourDAjout = (iso) => {
  const d = typeof iso === 'string' ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? aujourdhuiISO(d) : null;
};

// Les étapes à afficher. `cle` est le champ du set qu'on édite en touchant l'étape, ou null si elle ne s'édite pas (la date
// d'ajout). `etat` : « fait », « futur » (une sortie annoncée) ou « vide » (pas de date : on propose d'en ajouter une).
export function etapesFrise(set, maintenant = new Date()) {
  const etat = (date) => (!date ? 'vide' : joursJusque(date, maintenant) > 0 ? 'futur' : 'fait');
  const sortie = set.dateSortie ?? null;
  // Une sortie à venir se dit par « dans n jours » ; une sortie passée n'a pas d'étape avant elle, donc pas d'écart.
  const sousSortie = etat(sortie) === 'futur' ? relatif(joursJusque(sortie, maintenant)) : '';

  if (set.statut === 'souhaité') {
    const ajout = jourDAjout(set.dateAjout);
    const etapes = [
      { cle: null, libelle: 'Ajouté le', date: ajout, etat: etat(ajout), sous: '' },
      { cle: 'dateSortie', libelle: 'Sortie', date: sortie, etat: etat(sortie), sous: sousSortie },
    ];
    // Le retrait prévu par LEGO (donné par Brickset, pas modifiable) : une étape de plus seulement s'il est connu.
    const retrait = set.dateRetrait ?? null;
    if (retrait) etapes.push({ cle: null, libelle: 'Retrait', date: retrait, etat: etat(retrait), sous: etat(retrait) === 'futur' ? relatif(joursJusque(retrait, maintenant)) : 'retiré' });
    return etapes;
  }
  const achat = set.dateAchat ?? null;
  const montage = set.dateMontage ?? null;
  const ecart = (debut, fin) => { const e = ecartEntre(debut, fin); return e ? `+ ${e}` : ''; };
  return [
    { cle: 'dateSortie', libelle: 'Sortie', date: sortie, etat: etat(sortie), sous: sousSortie },
    { cle: 'dateAchat', libelle: 'Acheté le', date: achat, etat: etat(achat), sous: ecart(sortie, achat) },
    { cle: 'dateMontage', libelle: 'Monté le', date: montage, etat: etat(montage), sous: ecart(achat, montage) },
  ];
}

// La date d'une étape en deux lignes : « 1 oct. » et « 2017 » (trois cartes côte à côte sur 360 px n'ont pas la place d'un mois entier).
export function dateEnDeux(iso) {
  const p = parties(iso);
  if (!p) return null;
  const jour = new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return { jour, annee: String(p[0]) };
}

// L'icône de chaque étape (noms de `Icones.jsx`) : parler à l'œil avant de lire le libellé.
export const ICONES_ETAPE = { 'Sortie': 'calendrier', 'Retrait': 'calendrier', 'Acheté le': 'panier', 'Monté le': 'coche', 'Ajouté le': 'souhaits' };
