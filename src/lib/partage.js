import { validerSets } from './model.js';

const VERSION = 1;
export const TAILLE_MAX = 5 * 1024 * 1024;
const SETS_MAX = 5000;

// L'export ne contient que les sets. La clé Rebrickable vit dans un autre
// emplacement du stockage et ne doit jamais voyager dans un fichier qu'on peut
// envoyer, synchroniser ou commiter par erreur.
export function exporter(sets, maintenant = new Date()) {
  return {
    nom: `bricks-list-${maintenant.toISOString().slice(0, 10)}.json`,
    contenu: JSON.stringify({ version: VERSION, exporteLe: maintenant.toISOString(), sets }, null, 2),
  };
}

// Lit un fichier d'import sans lui faire confiance. Le résultat annonce ce qui a
// été corrigé ou ignoré, pour que l'utilisateur sache ce qu'il s'apprête à
// appliquer avant de le faire.
export function lireImport(texte) {
  const vide = { sets: [], corriges: 0, rejetes: 0 };
  if (typeof texte !== 'string' || texte.length > TAILLE_MAX) return { ...vide, erreur: 'Fichier illisible ou trop volumineux (5 Mo maximum).' };

  let donnees;
  try { donnees = JSON.parse(texte); } catch { return { ...vide, erreur: 'Ce fichier n\'est pas du JSON valide.' }; }

  const liste = Array.isArray(donnees) ? donnees : donnees?.sets;
  if (!Array.isArray(liste)) return { ...vide, erreur: 'Aucune liste de sets dans ce fichier.' };
  if (liste.length === 0) return { ...vide, erreur: 'Le fichier ne contient aucun set.' };
  if (liste.length > SETS_MAX) return { ...vide, erreur: `Trop de sets (${SETS_MAX} maximum).` };

  const r = validerSets(liste);
  if (r.sets.length === 0) return { ...r, erreur: 'Aucun set exploitable dans ce fichier.' };
  return { ...r, erreur: null };
}
