// Choix du thème : automatique, clair, sombre.
//
// « Automatique » est le défaut : c'est le seul qui n'oblige à rien, un téléphone
// qui bascule en sombre le soir emmène l'application avec lui. Clair et sombre
// existent pour qu'un choix explicite tienne, quoi que fasse le système.

export const MODES = ['auto', 'light', 'dark'];
export const LIBELLES = { auto: 'Automatique', light: 'Clair', dark: 'Sombre' };
const CLE = 'bl_theme';

// Couleur de la barre d'état du téléphone : elle suit le fond de l'app, sinon un
// cadre d'une autre couleur coiffe l'application au démarrage.
export const COULEUR_BARRE = { light: '#f3f4f7', dark: '#000000' };

// Seul « auto » dépend du système ; les deux autres tiennent.
export const resoudreTheme = (mode, systemeSombre) =>
  mode === 'auto' ? (systemeSombre ? 'dark' : 'light') : mode === 'light' ? 'light' : 'dark';

// Une valeur inconnue (stockage corrompu) retombe sur l'automatique plutôt que
// d'imposer un thème arbitraire.
export const modeValide = (v) => (MODES.includes(v) ? v : 'auto');

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

export function lireMode(store) {
  try { return modeValide(stockage(store)?.getItem(CLE)); } catch { return 'auto'; }
}

export function ecrireMode(mode, store) {
  const s = stockage(store);
  if (!s) return { ok: false };
  try { s.setItem(CLE, modeValide(mode)); return { ok: true }; } catch { return { ok: false }; }
}
