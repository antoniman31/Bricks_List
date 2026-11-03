const CLE_API = 'bl_rebrickable';
const CLE_THEMES = 'bl_themes';
// 8 à 100 caractères ASCII imprimables, sans espace : ce qu'une clé d'API peut
// être, et surtout ce qu'un en-tête HTTP accepte. Un retour à la ligne ou un
// caractère accentué collé par erreur ferait échouer `fetch` avant même l'envoi.
const FORME_CLE = /^[\x21-\x7E]{8,100}$/;

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

export function cleValide(cle) {
  return typeof cle === 'string' && FORME_CLE.test(cle.trim());
}

// La clé vit sous sa propre clé de stockage, jamais dans la collection : elle ne
// doit voyager ni dans l'export, ni dans une future sauvegarde.
export function lireCle(store) {
  try { return stockage(store)?.getItem(CLE_API) || ''; } catch { return ''; }
}

export function ecrireCle(cle, store) {
  const s = stockage(store);
  if (!s) return { ok: false, erreur: 'Stockage indisponible.' };
  try {
    if (cle === '') s.removeItem(CLE_API);
    else s.setItem(CLE_API, cle.trim());
    return { ok: true, erreur: null };
  } catch {
    return { ok: false, erreur: 'Écriture impossible.' };
  }
}

// Le cache de thèmes n'est qu'une optimisation : illisible ou absent, on repart
// de zéro. Chaque entrée est revalidée, car elle vient du stockage.
export function lireThemes(store) {
  try {
    const brut = JSON.parse(stockage(store)?.getItem(CLE_THEMES) ?? '{}');
    const cache = {};
    for (const [id, t] of Object.entries(brut ?? {})) {
      if (t && typeof t.name === 'string' && t.name !== '' && (t.parent_id === null || typeof t.parent_id === 'number')) {
        cache[id] = { name: t.name, parent_id: t.parent_id };
      }
    }
    return cache;
  } catch { return {}; }
}

export function ecrireThemes(cache, store) {
  try { stockage(store)?.setItem(CLE_THEMES, JSON.stringify(cache)); } catch { /* optimisation seulement */ }
}
