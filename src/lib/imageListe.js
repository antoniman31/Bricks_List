// Quelle image représente un set dans la liste : un choix par fiche (`set.imageListe`, dans la
// collection donc dans l'export) et, pour les sets sans choix, une règle de l'appareil (hors export,
// comme le thème ou la vue). Les images possibles : la boîte (BrickLink), le rendu (Rebrickable) et
// la photo personnelle (IndexedDB), et une image de la galerie Brickset gardée sur l'appareil (`extra:<nom>`).
import { choixExtra, nomDeChoix } from './galerie.js';

export const REGLES = [
  { cle: 'boite', libelle: 'Boîte, sinon rendu' },
  { cle: 'photo', libelle: 'Ma photo quand elle existe' },
  { cle: 'rendu', libelle: 'Rendu Rebrickable' },
];
const CLE = 'bl_image_liste';

// Une valeur inconnue (stockage corrompu) retombe sur le comportement d'origine.
export const regleValide = (v) => (REGLES.some((r) => r.cle === v) ? v : 'boite');

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

export function lireRegle(store) {
  try { return regleValide(stockage(store)?.getItem(CLE)); } catch { return 'boite'; }
}

export function ecrireRegle(regle, store) {
  if (!REGLES.some((r) => r.cle === regle)) return;
  try { stockage(store)?.setItem(CLE, regle); } catch { /* sans stockage, le choix dure jusqu'au rechargement */ }
}

// ---- Plusieurs photos personnelles par set -------------------------------------------------------------------
// Jusqu'à six photos par set. La première garde la clé historique (l'identifiant du set), les suivantes sont `<id>#2`…`<id>#6` dans
// le même magasin : les photos déjà gardées et les sauvegardes d'avant restent valables telles quelles. Dans `imageListe`, la
// première est « photo » (comme avant) et les autres « photo-2 »…« photo-6 ».
// Un choix d'image de liste est valide s'il est connu : boîte, rendu, une des six photos, ou « extra:<nom> » d'une image de la galerie Brickset.
export const CHOIX_FIXES = ['boite', 'rendu', 'photo', 'photo-2', 'photo-3', 'photo-4', 'photo-5', 'photo-6'];
export const choixListeValide = (v) => CHOIX_FIXES.includes(v) || nomDeChoix(v) !== null;
export const PHOTOS_MAX = 6;
export const NUMEROS_PHOTO = [1, 2, 3, 4, 5, 6];
export const clePhoto = (id, n) => (n === 1 ? id : `${id}#${n}`);
export const choixPhoto = (n) => (n === 1 ? 'photo' : `photo-${n}`);
// Le numéro de photo d'un choix d'image de liste (« photo » → 1, « photo-3 » → 3), ou null si ce n'est pas une photo personnelle.
export function numeroPhotoDe(choix) {
  if (choix === 'photo') return 1;
  const m = /^photo-([2-6])$/.exec(typeof choix === 'string' ? choix : '');
  return m ? Number(m[1]) : null;
}
// L'identifiant de set et le numéro de photo d'une clé du magasin des photos, ou null si la clé n'a pas la forme attendue.
export function lireClePhoto(cle) {
  if (typeof cle !== 'string' || cle === '') return null;
  const i = cle.lastIndexOf('#');
  if (i < 0) return { id: cle, n: 1 };
  const n = Number(cle.slice(i + 1));
  return /^[2-6]$/.test(cle.slice(i + 1)) && i > 0 ? { id: cle.slice(0, i), n } : null;
}

// L'image à montrer pour ce set : « boite », « rendu », « photo », « photo-2 »… ou « extra:<nom> ». Le choix de la fiche l'emporte
// sur la règle. Une photo ou une image voulue mais absente retombe sur la boîte, comme une boîte absente retombe
// sur le rendu (c'est l'affichage qui s'en charge). `aPhoto` : un booléen (la première photo existe) ou une fonction
// (n) => la photo n existe ; `aExtra` : (nom) => cette image Brickset est gardée sur l'appareil.
export function choisirImage(set, regle, aPhoto, aExtra = () => false) {
  const voulu = set.imageListe ?? regle;
  const existe = typeof aPhoto === 'function' ? aPhoto : (n) => n === 1 && Boolean(aPhoto);
  const nom = nomDeChoix(voulu);
  if (nom !== null) return aExtra(nom) ? voulu : 'boite';
  const n = numeroPhotoDe(voulu);
  if (n !== null) return existe(n) ? voulu : 'boite';
  return voulu === 'rendu' ? 'rendu' : 'boite';
}

// Les images d'un set, dans l'ordre du carrousel de la fiche : la boîte, le rendu Rebrickable (s'il y en a un), les photos
// personnelles (jusqu'à six), les images de la galerie Brickset, puis une dernière diapositive « ajouter » tant qu'il reste de la place
// (et si la fiche n'est pas en lecture seule). `photos` : l'ensemble des clés du magasin des photos. La clé d'une diapositive est aussi
// ce qu'on stocke dans `imageListe` quand on la choisit pour la liste. Les photos portent leur numéro de place (`n`), qui peut avoir des
// trous. `extras` : { galerie, gardees } = la liste Brickset connue de ce set (ou []) et les noms des images gardées sur l'appareil ; sans
// liste, on montre quand même celles qui sont gardées (elles se voient hors ligne).
export function diapositives(set, photos, lectureSeule = false, extras = { galerie: [], gardees: new Set() }) {
  const perso = NUMEROS_PHOTO.filter((n) => photos.has(clePhoto(set.id, n)));
  const liste = [{ cle: 'boite', libelle: 'Boîte' }];
  if (set.image) liste.push({ cle: 'rendu', libelle: 'Rendu' });
  perso.forEach((n, i) => liste.push({ cle: choixPhoto(n), libelle: perso.length > 1 ? `Ma photo ${i + 1}` : 'Ma photo', n }));
  const gardees = extras.gardees ?? new Set();
  const galerie = extras.galerie?.length > 0 ? extras.galerie : [...gardees].map((nom) => ({ nom, url: null, miniature: null, boite: false }));
  for (const e of galerie) liste.push({ cle: choixExtra(e.nom), libelle: 'Brickset', extra: e, gardee: gardees.has(e.nom) });
  if (!lectureSeule && perso.length < PHOTOS_MAX) liste.push({ cle: 'ajout', libelle: 'Ajouter une photo' });
  return liste;
}
