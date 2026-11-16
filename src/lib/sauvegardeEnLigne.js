// La sauvegarde en ligne : la date de la dernière copie envoyée (sous sa propre clé, hors de la collection : elle ne voyage jamais
// dans un export) et la façon de décrire les copies gardées chez le relais. Le réseau est dans `relais.js`.
import { formaterOctets } from './octets.js';
import { libelleDelai } from './sauvegarde.js';

const CLE_ENVOI = 'bl_derniere_copie_en_ligne';
const JOUR_MS = 24 * 60 * 60 * 1000;

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

// Une date lue du stockage est une entrée non fiable : illisible ou dans le futur vaut « jamais ».
export function lireDernierEnvoi(store, maintenant = new Date()) {
  try {
    const v = stockage(store)?.getItem(CLE_ENVOI);
    const t = typeof v === 'string' ? Date.parse(v) : NaN;
    return Number.isNaN(t) || t > maintenant.getTime() + JOUR_MS ? null : new Date(t).toISOString();
  } catch { return null; }
}

export function noterEnvoi(maintenant = new Date(), store) {
  const s = stockage(store);
  if (!s) return { ok: false, erreur: 'Stockage indisponible.' };
  try { s.setItem(CLE_ENVOI, maintenant.toISOString()); return { ok: true, erreur: null }; } catch { return { ok: false, erreur: 'Écriture impossible.' }; }
}

// « 14 nov. 2026 à 15:30 » : la date d'une copie, dans le fuseau de l'appareil.
export function libelleCopie(iso, octets) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} à ${heure}${Number.isFinite(octets) && octets > 0 ? ` · ${formaterOctets(octets)}` : ''}`;
}

// La ligne d'état de la section : ce qu'il faut faire, ou la date de la dernière copie.
export function etatEnLigne({ relais, dernier, maintenant = new Date() }) {
  if (!relais?.url) return 'Ajoute l\'adresse du relais (Brickset).';
  if (!relais.jeton) return 'Ajoute le jeton du relais (Brickset).';
  if (!dernier) return 'Aucune copie envoyée depuis cet appareil.';
  const jours = Math.max(0, Math.floor((maintenant.getTime() - Date.parse(dernier)) / JOUR_MS));
  return jours === 0 ? 'Dernière copie envoyée aujourd\'hui.' : `Dernière copie envoyée il y a ${jours} jour${jours > 1 ? 's' : ''}.`;
}

// L'état en quelques mots, pour le titre de la section repliée.
export function resumeEnLigne({ relais, dernier, maintenant = new Date() }) {
  if (!relais?.url || !relais.jeton) return 'Relais à compléter';
  if (!dernier) return 'Aucune copie';
  const jours = Math.max(0, Math.floor((maintenant.getTime() - Date.parse(dernier)) / JOUR_MS));
  return `Envoyée ${libelleDelai(jours)}`;
}

// Envoi automatique (choix d'Antoni, 16 novembre 2026 : « tout réseau ») : à l'ouverture de l'app, une copie part si la
// dernière a plus de 7 jours. Jamais sans relais complet, jamais hors ligne, jamais pour une collection vide ni illisible
// (une collection illisible enverrait une copie quasi vide qui chasserait une bonne copie des 5 gardées).
export const ENVOI_AUTO_JOURS = 7;
export function envoiAutoDu({ relais, dernier, nbSets, lectureSeule, enLigne = true, maintenant = new Date(), seuilJours = ENVOI_AUTO_JOURS }) {
  if (!relais?.url || !relais.jeton || lectureSeule || !enLigne || !(nbSets > 0)) return false;
  const t = typeof dernier === 'string' ? Date.parse(dernier) : NaN;
  if (Number.isNaN(t)) return true;
  return maintenant.getTime() - t >= seuilJours * JOUR_MS;
}
