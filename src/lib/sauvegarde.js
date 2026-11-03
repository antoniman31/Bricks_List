// Suivi de la sauvegarde : quand a-t-on exporté pour la dernière fois, est-ce
// qu'il est temps de le refaire, et Chrome nous laissera-t-il nos données ?
// La date vit sous sa propre clé de stockage, hors de la collection : elle ne
// doit jamais voyager dans un export, et la perdre ne coûte rien.

const CLE_DERNIERE = 'bl_derniere_sauvegarde';
export const SEUIL_JOURS = 30;
const JOUR_MS = 24 * 60 * 60 * 1000;

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

// Une date lue du stockage est une entrée non fiable : texte illisible, ou date
// dans le futur (horloge déréglée), valent « jamais » plutôt que « il y a -3 jours ».
// Un jour de tolérance couvre un changement de fuseau ou d'heure.
function dateValide(valeur, maintenant) {
  if (typeof valeur !== 'string') return null;
  const t = Date.parse(valeur);
  if (Number.isNaN(t) || t > maintenant.getTime() + JOUR_MS) return null;
  return new Date(t).toISOString();
}

export function lireDerniereSauvegarde(store, maintenant = new Date()) {
  try { return dateValide(stockage(store)?.getItem(CLE_DERNIERE), maintenant); } catch { return null; }
}

export function noterSauvegarde(maintenant = new Date(), store) {
  const s = stockage(store);
  if (!s) return { ok: false, erreur: 'Stockage indisponible.' };
  try {
    s.setItem(CLE_DERNIERE, maintenant.toISOString());
    return { ok: true, erreur: null };
  } catch {
    return { ok: false, erreur: 'Écriture impossible.' };
  }
}

export function joursDepuis(iso, maintenant = new Date()) {
  const valide = dateValide(iso, maintenant);
  if (!valide) return null;
  return Math.max(0, Math.floor((maintenant.getTime() - Date.parse(valide)) / JOUR_MS));
}

// Rappelle de sauvegarder seulement s'il y a quelque chose à perdre : une
// collection vide n'a rien à protéger, et le rappel serait du bruit.
export function etatSauvegarde({ nbSets, derniere, maintenant = new Date(), seuil = SEUIL_JOURS }) {
  const jours = joursDepuis(derniere, maintenant);
  const jamais = jours == null;
  return { jours, jamais, rappel: nbSets > 0 && (jamais || jours >= seuil) };
}

export function libelleDelai(jours) {
  if (jours == null) return 'jamais';
  if (jours === 0) return 'aujourd\'hui';
  if (jours === 1) return 'hier';
  return `il y a ${jours} jours`;
}

// Demande à Chrome de ne pas effacer nos données quand l'appareil manque de place.
// Chrome tranche seul (surtout pour une PWA installée) : on affiche le verdict
// réel, jamais une promesse. `gestionnaire` est navigator.storage, injectable.
export async function demanderPersistance(gestionnaire = globalThis.navigator?.storage) {
  try {
    if (!gestionnaire?.persisted) return 'inconnu';
    if (await gestionnaire.persisted()) return 'protege';
    if (!gestionnaire.persist) return 'inconnu';
    return (await gestionnaire.persist()) ? 'protege' : 'non-garanti';
  } catch {
    return 'inconnu';
  }
}
