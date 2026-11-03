import { validerSets } from './model.js';

export const CLE = 'bl_v1';
const VERSION = 1;

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

// Lit la collection. Le résultat dit toujours pourquoi il n'y a pas de données :
// `sets: null` avec `erreur: null` veut dire « première visite », alors qu'une
// `erreur` veut dire « il y a quelque chose mais je ne sais pas le lire ».
// La différence compte : on ne doit jamais écraser des données illisibles par
// une collection vide, elles sont peut-être récupérables à la main : le champ
// `illisible` permet à l'application de passer en lecture seule dans ce cas.
export function charger(store) {
  const s = stockage(store);
  if (!s) return { sets: null, corriges: 0, rejetes: 0, erreur: 'Stockage indisponible : rien ne sera enregistré.' };

  let brut;
  try { brut = s.getItem(CLE); } catch { return { sets: null, corriges: 0, rejetes: 0, erreur: 'Stockage inaccessible.' }; }
  if (brut == null) return { sets: null, corriges: 0, rejetes: 0, erreur: null };

  let donnees;
  try { donnees = JSON.parse(brut); } catch { return { sets: null, corriges: 0, rejetes: 0, erreur: 'Données enregistrées illisibles.', illisible: true }; }

  const liste = Array.isArray(donnees) ? donnees : donnees?.sets;
  if (!Array.isArray(liste)) return { sets: null, corriges: 0, rejetes: 0, erreur: 'Données enregistrées illisibles.', illisible: true };
  return { ...validerSets(liste), erreur: null };
}

// Une écriture qui échoue (stockage plein, mode privé) ne doit pas se perdre en
// silence : l'appelant reçoit le motif et l'affiche.
export function sauver(sets, store) {
  const s = stockage(store);
  if (!s) return { ok: false, erreur: 'Stockage indisponible.' };
  try {
    s.setItem(CLE, JSON.stringify({ version: VERSION, sets }));
    return { ok: true, erreur: null };
  } catch (e) {
    return { ok: false, erreur: e?.name === 'QuotaExceededError' ? 'Stockage plein.' : 'Écriture impossible.' };
  }
}
