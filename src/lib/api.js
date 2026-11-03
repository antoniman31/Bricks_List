// Seul endroit qui parle au réseau. Rebrickable autorise les appels depuis un
// navigateur (CORS ouvert, en-tête Authorization accepté), donc aucun relais
// n'est nécessaire.
const BASE = 'https://rebrickable.com/api/v3/lego';
const ATTENTE_MAX_MS = 3000;

export class ErreurRebrickable extends Error {
  constructor(code, detail) {
    super(detail ?? code);
    this.code = code;
  }
}

const attendreReel = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Rebrickable limite le débit : la première recherche d'un set enchaîne plusieurs
// appels (le set, puis la chaîne de ses thèmes) et peut recevoir un 429. Une
// seule nouvelle tentative, après l'attente demandée (plafonnée), suffit dans le
// cas normal ; au-delà, on le dit plutôt que de boucler.
export async function appeler(chemin, cle, { fetcher = globalThis.fetch, attendre = attendreReel } = {}) {
  for (let essai = 0; essai < 2; essai += 1) {
    let reponse;
    try {
      reponse = await fetcher(`${BASE}${chemin}`, {
        headers: { Authorization: `key ${cle}`, Accept: 'application/json' },
      });
    } catch {
      throw new ErreurRebrickable('reseau');
    }

    if (reponse.status === 429 && essai === 0) {
      const secondes = Number(reponse.headers?.get?.('Retry-After'));
      const ms = Number.isFinite(secondes) && secondes > 0 ? Math.min(secondes * 1000, ATTENTE_MAX_MS) : 1000;
      await attendre(ms);
      continue;
    }
    if (reponse.status === 401 || reponse.status === 403) throw new ErreurRebrickable('cle');
    if (reponse.status === 404) throw new ErreurRebrickable('introuvable');
    if (reponse.status === 429) throw new ErreurRebrickable('limite');
    if (!reponse.ok) throw new ErreurRebrickable('serveur', `HTTP ${reponse.status}`);

    try { return await reponse.json(); } catch { throw new ErreurRebrickable('reponse'); }
  }
  throw new ErreurRebrickable('limite');
}
