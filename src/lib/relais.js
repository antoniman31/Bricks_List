// Le relais Brickset (dossier `relais/`) : où il est, et comment lui demander la date d'un set. L'adresse et le
// jeton facultatif vivent dans le stockage de l'appareil, jamais dans la collection ni dans l'export, comme
// la clé Rebrickable. La réponse du relais est une entrée non fiable : la date est revalidée ici.
import { dateSortieValide } from './dates.js';
import { urlRenduValide } from './boite.js';
import { normaliserNumero } from './numero.js';
import { prixValide } from './prix.js';
import { libelleCourt } from './libelle.js';

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
  absente: 'Pas de rendu chez Rebrickable pour ce set.',
  url: 'Adresse de rendu refusée par le relais.',
  rebrickable: 'Rebrickable ne répond pas correctement.',
  type: 'Le relais n\'a pas renvoyé une image.',
  taille: 'Image trop grosse pour le relais.',
};
export const messageRelais = (code) => MESSAGES[code] ?? MESSAGES.reponse;

// Demande la date de sortie (et le prix allemand) d'un set au relais. Renvoie { ok: true, trouve, lancement, retrait, prixDE, sousTheme }
// (lancement et prixDE null si Brickset n'en a pas) ou { ok: false, code }. Ne lève jamais : un échec réseau est un code comme un autre.
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
  // Le sous-thème : '' veut dire « Brickset n'en a pas » (à ne pas redemander), null « pas de réponse sur ce point ».
  const sousTheme = libelleCourt(corps.sousTheme);
  return { ok: true, trouve: corps.trouve, lancement: dateSortieValide(corps.lancement), retrait: dateSortieValide(corps.retrait), prixDE: prixValide(corps.prixDE), sousTheme };
}

const TAILLE_IMAGE_MAX = 6 * 1024 * 1024; // comme le relais ; l'image est réduite à 1 024 px avant d'être gardée
const DELAI_IMAGE_MS = 15_000;

// Demande au relais le rendu Rebrickable d'un set (le CDN n'a pas de CORS). Renvoie { ok: true, blob } ou
// { ok: false, code }. Ne lève jamais. Le contenu est une entrée non fiable : type et taille revérifiés ici,
// puis le décodage par le navigateur (`rendreRendu`) a le dernier mot.
export async function recupererImage(relais, urlRendu, fetchFn = globalThis.fetch) {
  const base = urlRelaisValide(relais?.url);
  if (!base || !urlRenduValide(urlRendu)) return { ok: false, code: 'url' };
  let reponse;
  try {
    reponse = await fetchFn(`${base}/image?url=${encodeURIComponent(urlRendu)}`, {
      headers: relais.jeton ? { 'X-Jeton': relais.jeton } : {},
      signal: AbortSignal.timeout(DELAI_IMAGE_MS),
    });
  } catch (e) {
    return { ok: false, code: e?.name === 'TimeoutError' ? 'delai' : 'reseau' };
  }
  if (!reponse.ok) {
    let corps = null;
    try { corps = await reponse.json(); } catch { /* corps illisible */ }
    return { ok: false, code: typeof corps?.erreur === 'string' && corps.erreur in MESSAGES ? corps.erreur : 'reponse' };
  }
  let blob;
  try { blob = await reponse.blob(); } catch { return { ok: false, code: 'reseau' }; }
  if (!/^image\/(jpeg|png|webp)$/.test(blob.type)) return { ok: false, code: 'type' };
  if (blob.size === 0 || blob.size > TAILLE_IMAGE_MAX) return { ok: false, code: 'taille' };
  return { ok: true, blob };
}

// Faut-il arrêter la copie des rendus après cet échec ? Une image refusée (trop grosse, absente, illisible) n'engage
// qu'elle-même : on passe à la suivante. Seules les vraies pannes du relais arrêtent tout : jeton refusé, relais
// injoignable, et plusieurs délais dépassés de suite (insister ne ferait que gaspiller du temps).
export const DELAIS_AVANT_ARRET = 3;
export function arretRelais(code, delaisDeSuite = 0) {
  if (code === 'jeton' || code === 'reseau' || code === 'configuration') return true;
  return code === 'delai' && delaisDeSuite >= DELAIS_AVANT_ARRET;
}

// Les notices PDF d'un set, d'après Brickset (route `/notices`, un appel Brickset par demande : à ne faire qu'à la
// demande, jamais en masse). Renvoie { ok: true, notices: [{ url, description }] } ou { ok: false, code }. Ne lève jamais.
// Les adresses sont revérifiées ici (https, chez LEGO ou Brickset) : elles finissent dans un lien cliquable.
const HOTES_NOTICE = ['lego.com', 'brickset.com'];
export function urlNoticeSure(v) {
  if (typeof v !== 'string' || v.length > 300) return null;
  let u;
  try { u = new URL(v); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port !== '') return null;
  const h = u.hostname.toLowerCase();
  return HOTES_NOTICE.some((d) => h === d || h.endsWith(`.${d}`)) ? u.href : null;
}

export async function recupererNotices(relais, numero, fetchFn = globalThis.fetch) {
  const n = normaliserNumero(numero);
  const base = urlRelaisValide(relais?.url);
  if (!n || !base) return { ok: false, code: 'numero' };
  let reponse;
  try {
    reponse = await fetchFn(`${base}/notices?numero=${encodeURIComponent(n)}`, {
      headers: relais.jeton ? { 'X-Jeton': relais.jeton } : {},
      signal: AbortSignal.timeout(DELAI_MS),
    });
  } catch (e) {
    return { ok: false, code: e?.name === 'TimeoutError' ? 'delai' : 'reseau' };
  }
  let corps;
  try { corps = await reponse.json(); } catch { return { ok: false, code: 'reponse' }; }
  if (!reponse.ok) return { ok: false, code: typeof corps?.erreur === 'string' && corps.erreur in MESSAGES ? corps.erreur : 'reponse' };
  if (!corps || typeof corps !== 'object' || !Array.isArray(corps.notices)) return { ok: false, code: 'reponse' };
  const notices = [];
  for (const x of corps.notices.slice(0, 12)) {
    const url = urlNoticeSure(x?.url);
    if (!url || notices.some((y) => y.url === url)) continue;
    const description = libelleCourt(x.description) ?? '';
    notices.push({ url, description });
  }
  return { ok: true, notices };
}
