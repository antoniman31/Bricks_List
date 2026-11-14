// Le prix par pièce d'un set de la wishlist, en centimes par pièce : le prix officiel divisé par le nombre de pièces. Pas de prix ou
// pas de pièces, pas de chiffre. Les seuils de couleur sont fixes (choix d'Antoni) : sous 8 ct c'est un bon prix, au-dessus de 12 ct
// c'est cher ; ils ne valent pas pour tous les thèmes (un Technic à 10 ct est correct, un Icons à 10 ct est cher), la pastille porte donc
// toujours le chiffre écrit : la couleur n'est jamais seule à dire quelque chose.
import { prixValide } from './prix.js';

export const SEUIL_BON = 8;
export const SEUIL_CHER = 12;

export function centimesParPiece(set) {
  const prix = prixValide(set?.prix);
  const pieces = set?.pieces;
  if (prix === null || !Number.isInteger(pieces) || pieces <= 0) return null;
  return (prix * 100) / pieces;
}

// « 11 ct/pièce », « 7,5 ct/pièce » : une décimale seulement sous 10 ct, où elle change la lecture.
export function formaterCentimes(ct) {
  if (typeof ct !== 'number' || !Number.isFinite(ct) || ct < 0) return '';
  const arrondi = ct < 10 ? Math.round(ct * 10) / 10 : Math.round(ct);
  return `${String(arrondi).replace('.', ',')} ct/pièce`;
}

// « bon », « cher » ou « moyen » ; la limite exacte (8 ou 12) reste « moyen ».
export function niveauPrixPiece(ct) {
  if (typeof ct !== 'number' || !Number.isFinite(ct)) return null;
  return ct < SEUIL_BON ? 'bon' : ct > SEUIL_CHER ? 'cher' : 'moyen';
}

// Tri : le moins cher la pièce d'abord ; un set sans prix par pièce en dernier.
export function comparerPrixPiece(a, b) {
  const ca = centimesParPiece(a);
  const cb = centimesParPiece(b);
  if (ca === null || cb === null) return ca === cb ? 0 : ca === null ? 1 : -1;
  return ca - cb;
}
