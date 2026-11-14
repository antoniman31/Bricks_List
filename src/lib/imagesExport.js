// Les images dans la sauvegarde : photos personnelles, boîtes gardées et rendus Rebrickable gardés. Ici seulement
// la logique pure (encodage, validation) ; la lecture et l'écriture dans IndexedDB sont dans `photosDB.js`, le
// décodage par le navigateur dans `photoNavigateur.js`.
//
// Forme dans le fichier : `images: { photos: { <id du set>: <base64>, <id du set>#2: <base64>, … }, extras: { <numéro>|<nom du fichier>: <base64> }, boites: { <numéro>: <base64> }, rendus: { … } }`.
// Tout est du JPEG (c'est ce que l'appli enregistre), donc pas de type à transporter. Un fichier sans `images`
// (ancienne version) reste valable, et une ancienne version qui lit un fichier avec `images` les ignore.
import { OCTETS_MAX } from './photos.js';
import { normaliserNumero } from './numero.js';
import { lireClePhoto } from './imageListe.js';
import { lireCleExtra } from './galerie.js';

export const GROUPES = ['photos', 'boites', 'rendus', 'extras'];
// Un fichier avec images pèse des dizaines de Mo ; sans images, la limite d'avant (5 Mo) reste valable.
export const TAILLE_MAX_AVEC_IMAGES = 200 * 1024 * 1024;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const LONGUEUR_B64_MAX = Math.ceil(OCTETS_MAX / 3) * 4;

// Le début d'un JPEG : on ne se fie ni à l'extension ni à un type annoncé par le fichier.
const estJpeg = (octets) => octets.length > 3 && octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff;

export function base64VersOctets(texte) {
  if (typeof texte !== 'string' || texte.length === 0 || texte.length > LONGUEUR_B64_MAX || texte.length % 4 !== 0 || !BASE64.test(texte)) return null;
  try {
    const binaire = atob(texte);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i += 1) octets[i] = binaire.charCodeAt(i);
    return octets.length <= OCTETS_MAX && estJpeg(octets) ? octets : null;
  } catch {
    return null;
  }
}

// Octets -> base64, par blocs : `String.fromCharCode(...tout)` fait déborder la pile sur une image de 100 Ko.
export function octetsVersBase64(octets) {
  let binaire = '';
  for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(binaire);
}

// Le bloc `images` à écrire : `entrees` = { photos: [[id, Uint8Array], …], boites: […], rendus: […], extras: […] }.
export function blocImages(entrees) {
  const bloc = {};
  for (const g of GROUPES) {
    bloc[g] = {};
    for (const [cle, octets] of entrees?.[g] ?? []) bloc[g][cle] = octetsVersBase64(octets);
  }
  return bloc;
}

export const nombreImages = (entrees) => GROUPES.reduce((n, g) => n + (entrees?.[g]?.length ?? 0), 0);

// Lit le bloc `images` d'un fichier sans lui faire confiance. On ne garde que les images qui se rattachent à un
// set du fichier : une photo dont l'id n'est pas dans la liste (photos), ou une boîte/un rendu dont le numéro
// n'y est pas, serait un orphelin que le démarrage purgerait de toute façon. Une entrée de forme douteuse est
// refusée et comptée, jamais écrite.
export function lireImages(brut, sets) {
  const r = { photos: [], boites: [], rendus: [], extras: [], refusees: 0 };
  if (brut == null) return r;
  if (typeof brut !== 'object' || Array.isArray(brut)) return { ...r, refusees: 1 };
  const ids = new Set(sets.map((s) => s.id));
  const numeros = new Set(sets.map((s) => normaliserNumero(s.numero)).filter(Boolean));
  for (const g of GROUPES) {
    const groupe = brut[g];
    if (groupe == null) continue;
    if (typeof groupe !== 'object' || Array.isArray(groupe)) { r.refusees += 1; continue; }
    for (const [cle, valeur] of Object.entries(groupe)) {
      // Une image gardée de la galerie Brickset a pour clé « numéro|nom » : le numéro doit être celui d'un set du fichier.
      const valide = g === 'photos' ? ids.has(lireClePhoto(cle)?.id) : g === 'extras' ? numeros.has(lireCleExtra(cle)?.numero) : numeros.has(cle);
      const octets = valide ? base64VersOctets(valeur) : null;
      if (octets) r[g].push([cle, octets]);
      else r.refusees += 1;
    }
  }
  return r;
}

export function resume(images) {
  const morceaux = [];
  const n = (k, un, plusieurs) => { const c = images[k].length; if (c > 0) morceaux.push(`${c} ${c > 1 ? plusieurs : un}`); };
  n('photos', 'photo', 'photos');
  n('boites', 'boîte', 'boîtes');
  n('rendus', 'rendu', 'rendus');
  n('extras', 'image Brickset', 'images Brickset');
  return morceaux.join(', ');
}
