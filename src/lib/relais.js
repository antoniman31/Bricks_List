// Le relais Brickset (dossier `relais/`) : où il est, et comment lui demander la date d'un set. L'adresse et le
// jeton facultatif vivent dans le stockage de l'appareil, jamais dans la collection ni dans l'export, comme
// la clé Rebrickable. La réponse du relais est une entrée non fiable : la date est revalidée ici.
import { dateSortieValide } from './dates.js';
import { normaliserNumero } from './numero.js';

const CLE = 'bl_relais';
const FORME_JETON = /^[\x21-\x7E]{8,100}$/;
const DELAI_MS = 10_000;

function stockage(store) {
  try { return store ?? globalThis.localStorage ?? null; } catch { return null; }
}

// Une adresse https (ou http sur la machine locale, pour développer), sans identifiants, sans paramètres :
// c'est tout ce qu'un relais peut être. Renvoie l'adresse nettoyée (sans « / » final) ou null.
export function urlRelaisValide(v) {
  if (typeof v !== 'string' || v.length > 200) return null;
  let u;
  try { u = new URL(v.trim()); } catch { return null; }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) return null;
  if (u.username || u.password || u.search || u.hash) return null;
  return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
}

// Le jeton est facultatif : vide, ou 8 à 100 caractères ASCII imprimables sans espace (ce qu'un en-tête accepte).
export const jetonValide = (v) => typeof v === 'string' && (v === '' || FORME_JETON.test(v.trim()));

export function lireRelais(store) {
  try {
    const brut = JSON.parse(stockage(store)?.getItem(CLE) ?? 'null');
    const url = urlRelaisValide(brut?.url);
    if (!url) return { url: '', jeton: '' };
    return { url, jeton: typeof brut.jeton === 'string' && jetonValide(brut.jeton) ? brut.jeton.trim() : '' };
  } catch {
    return { url: '', jeton: '' };
  }
}

export function ecrireRelais({ url, jeton }, store) {
  const s = stockage(store);
  if (!s) return { ok: false, erreur: 'Stockage indisponible.' };
  try {
    const propre = urlRelaisValide(url);
    if (!propre) s.removeItem(CLE);
    else s.setItem(CLE, JSON.stringify({ url: propre, jeton: jetonValide(jeton) ? jeton.trim() : '' }));
    return { ok: true, erreur: null };
  } catch {
    return { ok: false, erreur: 'Écriture impossible.' };
  }
}

const MESSAGES = {
  cle: 'Brickset refuse la clé : vérifie le secret BRICKSET_KEY du relais.',
  limite: 'Limite quotidienne de Brickset atteinte : réessaie demain.',
  configuration: 'Le relais n\'a pas de clé Brickset : ajoute le secret BRICKSET_KEY.',
  jeton: 'Le relais exige un jeton : saisis-le dans Réglages.',
  delai: 'Le relais ne répond pas à temps.',
  numero: 'Numéro refusé par le relais.',
  reseau: 'Relais injoignable : vérifie l\'adresse et la connexion.',
  brickset: 'Brickset ne répond pas correctement.',
  reponse: 'Réponse du relais illisible.',
};
export const messageRelais = (code) => MESSAGES[code] ?? MESSAGES.reponse;

// Demande la date de sortie d'un set au relais. Renvoie { ok: true, trouve, lancement } (lancement null si
// Brickset n'en a pas) ou { ok: false, code }. Ne lève jamais : un échec réseau est un code comme un autre.
export async function recupererSortie(relais, numero, fetchFn = globalThis.fetch) {
  const n = normaliserNumero(numero);
  const base = urlRelaisValide(relais?.url);
  if (!n || !base) return { ok: false, code: 'numero' };
  let reponse;
  try {
    reponse = await fetchFn(`${base}/sortie?numero=${encodeURIComponent(n)}`, {
      headers: relais.jeton ? { 'X-Jeton': relais.jeton } : {},
      signal: AbortSignal.timeout(DELAI_MS),
    });
  } catch (e) {
    return { ok: false, code: e?.name === 'TimeoutError' ? 'delai' : 'reseau' };
  }
  let corps;
  try { corps = await reponse.json(); } catch { return { ok: false, code: 'reponse' }; }
  if (!reponse.ok) return { ok: false, code: typeof corps?.erreur === 'string' && corps.erreur in MESSAGES ? corps.erreur : 'reponse' };
  if (!corps || typeof corps !== 'object' || typeof corps.trouve !== 'boolean') return { ok: false, code: 'reponse' };
  return { ok: true, trouve: corps.trouve, lancement: dateSortieValide(corps.lancement) };
}
