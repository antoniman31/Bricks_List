// Ce qui touche au navigateur pour une photo : décoder le fichier choisi, puis rendre le JPEG recadré.
// Couche mince (canvas) : le calcul du recadrage est dans `photos.js`, avec ses tests.
import { QUALITE_JPEG, SORTIE } from './photos.js';

// Les téléphones prennent des photos de 50 millions de pixels : on les ramène à 3 072 px de côté au
// plus pour que le recadrage et l'aperçu restent fluides, sans perdre de netteté à la sortie (1 024 px).
const COTE_MAX = 3072;

// Décode le fichier (l'orientation de la prise de vue est appliquée par le navigateur) et le dessine
// dans un canvas de travail. Rejette si ce n'est pas une image lisible.
export async function lireImage(fichier) {
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const echelle = Math.min(1, COTE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * echelle));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * echelle));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Dessine le rectangle `rect` de la source dans un canvas de la taille donnée.
export function dessiner(source, rect, cible) {
  const ctx = cible.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cible.width, cible.height);
  ctx.drawImage(source, rect.sx, rect.sy, rect.sl, rect.sh, 0, 0, cible.width, cible.height);
}

// Le JPEG final : 1 024 × 768, qualité 0,8.
export function rendreJpeg(source, rect) {
  const canvas = document.createElement('canvas');
  canvas.width = SORTIE.largeur;
  canvas.height = SORTIE.hauteur;
  dessiner(source, rect, canvas);
  return new Promise((resoudre, rejeter) => {
    canvas.toBlob((blob) => (blob ? resoudre(blob) : rejeter(new Error('rendu'))), 'image/jpeg', QUALITE_JPEG);
  });
}

// ---- Photos de boîte ----------------------------------------------------------------------------------

const COTE_BOITE = 1024;

// Une photo de boîte déjà affichée (`<img>` chargée avec `crossOrigin`, sinon le canvas serait « souillé » et
// illisible) devient un JPEG de 1 024 px au plus : une soixantaine de Ko au lieu de 400 à 750 Ko en PNG.
export function boiteVersJpeg(img) {
  const largeur = img.naturalWidth;
  const hauteur = img.naturalHeight;
  if (!largeur || !hauteur) return Promise.reject(new Error('image vide'));
  const echelle = Math.min(1, COTE_BOITE / Math.max(largeur, hauteur));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(largeur * echelle));
  canvas.height = Math.max(1, Math.round(hauteur * echelle));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resoudre, rejeter) => {
    canvas.toBlob((blob) => (blob ? resoudre(blob) : rejeter(new Error('rendu'))), 'image/jpeg', 0.85);
  });
}

// Charge la boîte d'une adresse (avec CORS) pour la sauvegarder ; null si l'image n'arrive pas (pas de photo
// chez BrickLink, ou BrickLink en panne : il répond alors une page web, que le navigateur refuse comme image).
export function chargerImageBoite(url, delaiMs = 10000) {
  return new Promise((resoudre) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const fin = (v) => { clearTimeout(minuteur); img.onload = null; img.onerror = null; resoudre(v); };
    const minuteur = setTimeout(() => fin(null), delaiMs);
    img.onload = () => fin(img);
    img.onerror = () => fin(null);
    img.src = url;
  });
}

// Le rendu reçu du relais (un blob image) devient le même JPEG que les boîtes. Rejette si le navigateur ne sait
// pas le décoder : un fichier corrompu ou déguisé n'entre pas dans le stockage.
export async function rendreRendu(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await boiteVersJpeg(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Le navigateur sait-il décoder cette image ? Dernier garde-fou à l'import : le début d'un fichier peut ressembler à
// un JPEG sans en être un. Ne lève jamais.
export async function imageDecodable(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img.naturalWidth > 0 && img.naturalHeight > 0;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
}
