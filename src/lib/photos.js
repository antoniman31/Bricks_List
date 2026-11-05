// Photo personnelle d'un set : la logique pure (recadrage 4:3, validation). Le navigateur
// (canvas) et le stockage (IndexedDB) vivent dans `photoNavigateur.js` et `photosDB.js`.

// Une photo de téléphone fait 3 à 8 Mo : elle est recadrée en 4:3 (le format des vignettes) puis
// réduite avant d'être gardée, ce qui donne environ 100 Ko par set.
export const SORTIE = { largeur: 1024, hauteur: 768 };
export const QUALITE_JPEG = 0.8;
export const ZOOM_MAX = 4;
// Garde-fou à la lecture : une entrée du stockage n'est pas fiable, même si c'est nous qui l'y avons mise.
export const OCTETS_MAX = 1024 * 1024;

const RATIO = SORTIE.largeur / SORTIE.hauteur;
const borner = (v, min, max) => Math.min(max, Math.max(min, v));
const nombre = (v, repli) => (Number.isFinite(v) ? v : repli);

// Le rectangle de la source à garder. Au zoom 1 c'est le plus grand 4:3 contenu dans l'image ; plus
// on zoome, plus il rétrécit. `px` et `py` (0 à 1) sont la part de la marge disponible : 0 colle le
// rectangle au bord gauche (ou haut), 1 au bord droit (ou bas). Ainsi un curseur règle toujours
// quelque chose, sans zone morte aux extrémités.
export function rectangleRecadrage(largeur, hauteur, { zoom = 1, px = 0.5, py = 0.5 } = {}) {
  if (!(largeur > 0) || !(hauteur > 0) || !Number.isFinite(largeur) || !Number.isFinite(hauteur)) return null;
  let bl = largeur;
  let bh = largeur / RATIO;
  if (bh > hauteur) { bh = hauteur; bl = hauteur * RATIO; }
  const z = borner(nombre(zoom, 1), 1, ZOOM_MAX);
  const sl = bl / z;
  const sh = bh / z;
  return {
    sx: borner(nombre(px, 0.5), 0, 1) * (largeur - sl),
    sy: borner(nombre(py, 0.5), 0, 1) * (hauteur - sh),
    sl,
    sh,
  };
}

// Un glissé de (dx, dy) pixels sur l'aperçu (de largeur `apercu` pixels) déplace l'image avec le
// doigt : le rectangle visé se déplace dans l'autre sens.
export function deplacer({ px, py }, dx, dy, apercu, rect, largeur, hauteur) {
  if (!(apercu > 0) || !rect) return { px, py };
  const echelle = rect.sl / apercu;
  const margeX = largeur - rect.sl;
  const margeY = hauteur - rect.sh;
  return {
    px: margeX > 0 ? borner(px - (dx * echelle) / margeX, 0, 1) : px,
    py: margeY > 0 ? borner(py - (dy * echelle) / margeY, 0, 1) : py,
  };
}

// Ce qu'on accepte de relire du stockage : un JPEG non vide, de taille raisonnable.
export function photoValide(blob) {
  return Boolean(blob) && typeof blob.size === 'number' && blob.size > 0 && blob.size <= OCTETS_MAX && blob.type === 'image/jpeg';
}
