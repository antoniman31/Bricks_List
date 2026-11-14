// Partager ou enregistrer l'image qu'on regarde : le nom du fichier et son extension. Pur, testé ; l'envoi lui-même
// (navigator.share, ou un lien de téléchargement) est dans la visionneuse.
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const extensionDe = (type) => EXTENSIONS[String(type).split(';')[0].trim().toLowerCase()] ?? null;

// « 75192-1-boite.jpg », « 75192-1-photo-2.jpg ». Le numéro vient de la collection mais sert de nom de fichier : on n'y garde
// que des lettres, chiffres, tirets et sous-tirets (pas de point : jamais de « .. »). Un type qui n'est pas une image donne null (on ne partage pas ça).
export function nomFichierImage(numero, cle, type) {
  const ext = extensionDe(type);
  if (!ext) return null;
  const propre = (t) => String(t ?? '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const base = [propre(numero), propre(cle)].filter(Boolean).join('-') || 'image';
  return `${base}.${ext}`;
}
