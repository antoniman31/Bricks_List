// Les images supplémentaires d'un set chez Brickset (une trentaine pour le Faucon : photos d'ambiance, boîte, couverture et dos
// de la notice…). Elles se regardent en ligne ; celles qu'on GARDE sont copiées sur l'appareil (par le relais, qui seul peut les lire :
// leur serveur n'envoie pas de CORS) et entrent dans la sauvegarde. Ici seulement la logique pure : adresses, noms, clés, lecture d'une
// réponse non fiable. Le stockage est dans `photosDB.js`, l'appel réseau dans `relais.js`.
import { normaliserNumero } from './numero.js';

const HOTE = 'images.brickset.com';
const CHEMIN = /^\/sets\/AdditionalImages\/[A-Za-z0-9_-]+\/([A-Za-z0-9_&.-]{1,80}\.(?:jpe?g|png|webp))$/i;
const NOM = /^[A-Za-z0-9_&.-]{1,80}\.(?:jpe?g|png|webp)$/i;
// Six images gardées au plus par set : de quoi choisir, sans que la sauvegarde ne grossisse sans limite.
export const EXTRAS_MAX = 6;
export const GALERIE_MAX = 40;

const nomSur = (n) => typeof n === 'string' && NOM.test(n) && !n.includes('..');

// Le nom de fichier d'une image de la galerie (« 75192_Box1_V39.jpg »), ou null si l'adresse n'est pas une image de la galerie de Brickset :
// https, bon hôte, bon dossier, ni identifiants, ni paramètres, ni « .. ». Le nom identifie l'image dans son set.
export function nomImageBrickset(url) {
  if (typeof url !== 'string' || url.length > 300) return null;
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname !== HOTE || u.port !== '' || u.username || u.password || u.search || u.hash) return null;
  if (u.pathname.includes('..') || u.pathname.includes('//')) return null;
  const m = CHEMIN.exec(u.pathname);
  return m && nomSur(m[1]) ? m[1] : null;
}
export const urlImageBrickset = (url) => (nomImageBrickset(url) ? new URL(url).href : null);

// Clé d'une image gardée dans le magasin `extras` : « 75192-1|75192_Box1_V39.jpg ».
export const cleExtra = (numero, nom) => `${numero}|${nom}`;
export function lireCleExtra(cle) {
  if (typeof cle !== 'string') return null;
  const i = cle.indexOf('|');
  if (i < 1) return null;
  const numero = cle.slice(0, i);
  const nom = cle.slice(i + 1);
  return normaliserNumero(numero) === numero && nomSur(nom) ? { numero, nom } : null;
}

// Ce qu'on stocke dans `imageListe` quand une de ces images représente le set dans la liste : « extra:<nom> ».
export const choixExtra = (nom) => `extra:${nom}`;
export function nomDeChoix(choix) {
  if (typeof choix !== 'string' || !choix.startsWith('extra:')) return null;
  const nom = choix.slice(6);
  return nomSur(nom) ? nom : null;
}

// Une image dont le nom parle de boîte (« Box1_V39 ») : on la propose comme boîte du set.
export const estImageBoite = (nom) => /box/i.test(nom);

// La liste d'images d'une réponse du relais (`{ images: [...] }`) ou d'un stockage (le tableau seul), lue sans lui faire confiance.
// Renvoie null si ce n'est pas une liste ; sinon [{ url, miniature, nom, boite }], sans doublon, 40 au plus.
export function lireGalerie(brut) {
  const liste = Array.isArray(brut) ? brut : Array.isArray(brut?.images) ? brut.images : null;
  if (!liste) return null;
  const sortie = [];
  for (const i of liste) {
    const url = urlImageBrickset(i?.url);
    const nom = url ? nomImageBrickset(url) : null;
    if (!url || !nom || sortie.some((x) => x.nom === nom)) continue;
    sortie.push({ url, miniature: urlImageBrickset(i?.miniature), nom, boite: estImageBoite(nom) });
    if (sortie.length >= GALERIE_MAX) break;
  }
  return sortie;
}
