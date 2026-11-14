import { normaliserNumero } from './numero.js';
import { dateSortieValide, dateValide } from './dates.js';
import { normaliserEtiquettes } from './etiquettes.js';
import { SOURCES_PRIX, prixValide } from './prix.js';
import { libelleCourt } from './libelle.js';

export const STATUTS = ['possédé', 'souhaité'];
// Du moins avancé au plus avancé : le tri des stats et les puces suivent cet ordre.
export const ETATS = ['scellé', 'neuf', 'en cours', 'monté'];
// Anciens états, supprimés : « démonté » et « incomplet » ne sont plus proposés. Une collection ou une
// sauvegarde qui les contient les voit remis à « non précisé » (comptés, pour le dire à l'ouverture).
export const ETATS_RETIRES = ['démonté', 'incomplet'];

const ANNEE_MIN = 1949; // premières briques LEGO à tenons
const NOTES_MAX = 2000;
const EMPLACEMENT_MAX = 60;
export const OUI_NON = ['oui', 'non'];
// Envie d'acheter un set souhaité, du plus pressé au moins pressé. Les clés sont ce
// qui est stocké ; l'ordre du tableau est l'ordre de tri.
export const PRIORITES = ['forte', 'un-jour', 'pas-presse'];
// Image qui représente un set dans la liste : null = automatique (la règle des Réglages).
// D'où vient la date de sortie : saisie à la main (jamais écrasée par une mise à jour) ou donnée par Brickset.
export const SOURCES_SORTIE = ['manuelle', 'brickset'];
export const IMAGES_LISTE = ['boite', 'rendu', 'photo', 'photo-2', 'photo-3', 'photo-4', 'photo-5', 'photo-6'];
// Libellés choisis par Antoni (novembre 2026), du plus pressé au moins pressé. Les clés stockées (et exportées) n'ont pas changé :
// « un-jour » s'affiche « Envie » et « pas-presse » s'affiche « Un jour », pour ne rien migrer.
export const LIBELLES_PRIORITE = { forte: 'Prioritaire', 'un-jour': 'Envie', 'pas-presse': 'Un jour' };

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
export function normaliserSet(brut, { anneeMax = new Date().getFullYear() + 2, maintenant = new Date() } = {}) {
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
  const etatRetire = statut === 'possédé' && ETATS_RETIRES.includes(brut.etat);
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
  // Dates d'achat et de montage : comme l'état, elles ne concernent qu'un set possédé.
  // Une date impossible, avant 1949 ou dans le futur est écartée et comptée.
  const dateAchat = possede ? dateValide(brut.dateAchat, maintenant) : null;
  const dateMontage = possede ? dateValide(brut.dateMontage, maintenant) : null;
  // Étiquettes libres : pour les deux statuts (« à offrir » vaut en wishlist, « à revendre »
  // en collection). Ce qui est écarté (doublon, texte vide, trop long, trop nombreux) se compte.
  const etiquettes = normaliserEtiquettes(brut.etiquettes);
  // La priorité est l'inverse de l'état : elle n'a de sens que pour un set souhaité.
  // Acheter un set la fait donc disparaître d'elle-même, sans code dédié.
  const prioriteValide = brut.priorite == null || PRIORITES.includes(brut.priorite);
  const priorite = !possede && PRIORITES.includes(brut.priorite) ? brut.priorite : null;
  // Le choix de l'image de la liste vaut pour les deux statuts. « photo » est gardé même si la photo
  // manque (elle vit hors de la collection) : la liste retombe alors sur la boîte.
  // Date de sortie : pour les deux statuts. Sans date, pas de source ; une date sans source connue est
  // réputée saisie à la main, la plus prudente (une mise à jour automatique ne l'écrase pas).
  const dateSortie = dateSortieValide(brut.dateSortie);
  const sortieValide = brut.dateSortie == null || dateSortie !== null;
  const sourceValide = brut.sortieSource == null || SOURCES_SORTIE.includes(brut.sortieSource);
  const sortieSource = dateSortie === null ? null : SOURCES_SORTIE.includes(brut.sortieSource) ? brut.sortieSource : 'manuelle';
  // Retrait prévu par LEGO (donné par Brickset, jamais saisi à la main : pas de source) et sous-thème Brickset. Le sous-thème
  // vide ('') veut dire « Brickset n'en a pas » : null veut dire « jamais demandé », ce qui le fait redemander une fois.
  const dateRetrait = dateSortieValide(brut.dateRetrait);
  const sousTheme = libelleCourt(brut.sousTheme);
  // Prix officiel (euros) : comme la date de sortie, pour les deux statuts (il survit à « Acheté » et revient si on remet
  // le set en wishlist) ; sans prix, pas de source ; un prix sans source connue est réputé saisi à la main.
  const prix = prixValide(brut.prix);
  const prixOk = brut.prix == null || prix !== null;
  const prixSourceOk = brut.prixSource == null || SOURCES_PRIX.includes(brut.prixSource);
  const prixSource = prix === null ? null : SOURCES_PRIX.includes(brut.prixSource) ? brut.prixSource : 'manuelle';
  const imageListeValide = brut.imageListe == null || IMAGES_LISTE.includes(brut.imageListe);
  const imageListe = IMAGES_LISTE.includes(brut.imageListe) ? brut.imageListe : null;

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
      priorite: corriger(prioriteValide, priorite),
      imageListe: corriger(imageListeValide, imageListe),
      dateSortie: corriger(sortieValide, dateSortie),
      sortieSource: corriger(sourceValide, sortieSource),
      dateRetrait: corriger(brut.dateRetrait == null || dateRetrait !== null, dateRetrait),
      sousTheme: corriger(brut.sousTheme == null || typeof brut.sousTheme === 'string', sousTheme),
      prix: corriger(prixOk, prix),
      prixSource: corriger(prixSourceOk, prixSource),
      etiquettes: corriger(!etiquettes.corrige, etiquettes.liste),
      dateAchat: corriger(brut.dateAchat == null || !possede || dateAchat !== null, dateAchat),
      dateMontage: corriger(brut.dateMontage == null || !possede || dateMontage !== null, dateMontage),
    },
    corrections,
    etatRetire,
  };
}

// Valide une liste entière. Un identifiant en double est réattribué : deux
// fiches avec le même id s'écraseraient à la modification de l'une d'elles.
export function validerSets(liste, options) {
  const sets = [];
  const vus = new Set();
  let corriges = 0;
  let rejetes = 0;
  let etatsRetires = 0;
  if (!Array.isArray(liste)) return { sets, corriges, rejetes: 0, etatsRetires: 0 };

  for (const brut of liste) {
    const r = normaliserSet(brut, options);
    if (!r) { rejetes += 1; continue; }
    if (r.corrections > 0) corriges += 1;
    if (r.etatRetire) etatsRetires += 1;
    if (vus.has(r.set.id)) { r.set.id = nouvelId(); corriges += 1; }
    vus.add(r.set.id);
    sets.push(r.set);
  }
  return { sets, corriges, rejetes, etatsRetires };
}
