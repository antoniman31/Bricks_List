import { normaliserNumero } from './numero.js';

export const STATUTS = ['possédé', 'souhaité'];
export const ETATS = ['scellé', 'monté', 'démonté', 'incomplet'];

const ANNEE_MIN = 1949; // premières briques LEGO à tenons
const NOTES_MAX = 2000;
const EMPLACEMENT_MAX = 60;
export const OUI_NON = ['oui', 'non'];

function nouvelId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function texte(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function entierDansBornes(v, min, max) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

// Une fiche venue du stockage, d'un import ou d'une API est une entrée non
// fiable : « pas une date » est une chaîne, donc un contrôle de type seul la
// laisserait passer et le NaN apparaîtrait à l'écran. Chaque champ est donc
// ramené à une valeur sûre, et on compte ce qui a été corrigé pour l'annoncer.
//
// Seul le numéro de set est indispensable : sans lui on ne sait pas de quel set
// il s'agit et rien ne permet de le retrouver, la fiche est rejetée (null).
export function normaliserSet(brut, { anneeMax = new Date().getFullYear() + 2 } = {}) {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return null;
  const numero = normaliserNumero(brut.numero);
  if (!numero) return null;

  let corrections = 0;
  const corriger = (valide, valeur) => {
    if (!valide) corrections += 1;
    return valeur;
  };

  const id = texte(brut.id);
  const nom = texte(brut.nom);
  const statutValide = STATUTS.includes(brut.statut);
  const statut = statutValide ? brut.statut : 'possédé';
  // L'état n'a de sens que pour un set possédé : un set souhaité n'est ni
  // monté ni scellé, et un état résiduel fausserait le filtre par état.
  const etatValide = brut.etat == null || ETATS.includes(brut.etat);
  const etat = statut === 'possédé' && ETATS.includes(brut.etat) ? brut.etat : null;
  const annee = entierDansBornes(brut.annee, ANNEE_MIN, anneeMax);
  const pieces = entierDansBornes(brut.pieces, 0, 100000);
  const image = typeof brut.image === 'string' && brut.image.startsWith('https://') ? brut.image : null;
  const dateAjout = typeof brut.dateAjout === 'string' && !Number.isNaN(Date.parse(brut.dateAjout)) ? brut.dateAjout : null;
  const notes = typeof brut.notes === 'string' ? brut.notes.slice(0, NOTES_MAX) : '';
  // Emplacement de rangement, boîte et notice : comme l'état, ils n'ont de sens que
  // pour un set qu'on possède. Les fiches d'avant ces champs n'en ont pas : ce n'est
  // pas une erreur, elles gardent simplement « non précisé ».
  const possede = statut === 'possédé';
  const emplacement = possede && typeof brut.emplacement === 'string' ? brut.emplacement.trim().slice(0, EMPLACEMENT_MAX) : '';
  const boiteValide = brut.boite == null || OUI_NON.includes(brut.boite);
  const boite = possede && OUI_NON.includes(brut.boite) ? brut.boite : null;
  const noticeValide = brut.notice == null || OUI_NON.includes(brut.notice);
  const notice = possede && OUI_NON.includes(brut.notice) ? brut.notice : null;

  return {
    set: {
      id: id || nouvelId(),
      numero,
      nom: corriger(nom !== '', nom || `Set ${numero}`),
      theme: texte(brut.theme),
      annee: corriger(brut.annee == null || annee !== null, annee),
      pieces: corriger(brut.pieces == null || pieces !== null, pieces),
      image: corriger(brut.image == null || image !== null, image),
      statut: corriger(brut.statut == null || statutValide, statut),
      etat: corriger(etatValide, etat),
      dateAjout: corriger(brut.dateAjout == null || dateAjout !== null, dateAjout),
      notes,
      emplacement,
      boite: corriger(boiteValide, boite),
      notice: corriger(noticeValide, notice),
    },
    corrections,
  };
}

// Valide une liste entière. Un identifiant en double est réattribué : deux
// fiches avec le même id s'écraseraient à la modification de l'une d'elles.
export function validerSets(liste, options) {
  const sets = [];
  const vus = new Set();
  let corriges = 0;
  let rejetes = 0;
  if (!Array.isArray(liste)) return { sets, corriges, rejetes: 0 };

  for (const brut of liste) {
    const r = normaliserSet(brut, options);
    if (!r) { rejetes += 1; continue; }
    if (r.corrections > 0) corriges += 1;
    if (vus.has(r.set.id)) { r.set.id = nouvelId(); corriges += 1; }
    vus.add(r.set.id);
    sets.push(r.set);
  }
  return { sets, corriges, rejetes };
}
