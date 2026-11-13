// Relais Brickset pour les dates de sortie des sets. Un Cloudflare Worker d'un seul fichier : il se
// colle tel quel dans le tableau de bord Cloudflare, ou se déploie avec `wrangler deploy`.
//
// Pourquoi : l'API de Brickset n'envoie pas d'en-têtes CORS, un navigateur ne peut donc pas l'appeler
// directement. Le relais l'appelle à sa place, avec la clé Brickset gardée en secret côté Cloudflare
// (jamais dans l'application, jamais dans le dépôt), et ne renvoie que ce dont l'app a besoin.
//
//   GET /sortie?numero=75192-1  ->  { numero, trouve, lancement, retrait, disponibilite, prixDE }
//   GET /image?url=https://cdn.rebrickable.com/media/sets/75192-1.jpg  ->  l'image elle-même, avec CORS
//     (le CDN de Rebrickable n'en envoie pas : sans relais, l'app ne peut pas copier le rendu sur l'appareil).
//     Route volontairement étroite : un seul hôte, un seul dossier, des images, une taille maximale.
//
// Secrets et variables (voir relais/README.md) :
//   BRICKSET_KEY  (secret, obligatoire)  la clé de l'API Brickset
//   JETON         (secret, facultatif)   si défini, l'appel doit porter l'en-tête X-Jeton identique
//   ORIGINE       (variable)             sites autorisés à appeler depuis un navigateur, séparés par des virgules

const BRICKSET = 'https://brickset.com/api/v3.asmx/getSets';
const NUMERO = /^\d{3,7}-\d{1,2}$/;
const ORIGINE_PAR_DEFAUT = 'https://antoniman31.github.io';
const DELAI_MS = 8000;
const HOTE_IMAGES = 'cdn.rebrickable.com';
const CHEMIN_IMAGE = /^\/media\/sets\/[A-Za-z0-9_\-./]+\.(?:jpe?g|png|webp)$/i;
const TAILLE_IMAGE_MAX = 2 * 1024 * 1024;

// L'adresse d'image demandée, ou null si elle sort du cadre. Sans cette liste blanche le relais serait
// un proxy ouvert (SSRF, bande passante offerte à n'importe qui) : on n'accepte que les rendus de sets.
export function urlImageValide(brut) {
  let u;
  try { u = new URL(brut); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname !== HOTE_IMAGES || u.port !== '' || u.username || u.password) return null;
  if (u.search || u.hash || u.pathname.includes('..') || u.pathname.includes('//')) return null;
  return CHEMIN_IMAGE.test(u.pathname) ? u.href : null;
}

// Une date de Brickset (« 2017-10-01T00:00:00Z ») devient « 2017-10-01 », ou null si elle n'a pas
// de sens : une valeur absente, un texte inattendu ou une date hors bornes ne doivent rien afficher.
export function datePropre(v) {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (annee < 1949 || annee > 2100 || mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

// Le prix public allemand (euros) d'après Brickset, ou null : un nombre positif et raisonnable, sinon rien. La France
// n'a pas de prix chez Brickset ; l'Allemagne est la seule région en euros. Le nom du champ vient de la
// documentation de l'API (LEGOCom.DE.retailPrice) et n'a jamais été vu dans une vraie réponse.
export function prixPropre(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 10000 ? Math.round(v * 100) / 100 : null;
}

// La réponse de Brickset, lue sans lui faire confiance. Renvoie { ok: true, valeur } ou
// { ok: false, statut, code } : un code court pour l'app, jamais le texte brut de Brickset.
export function lireBrickset(donnees, numero) {
  if (!donnees || typeof donnees !== 'object') return { ok: false, statut: 502, code: 'reponse' };
  if (donnees.status === 'success') {
    const sets = Array.isArray(donnees.sets) ? donnees.sets : [];
    const set = sets.find((s) => s && `${s.number}-${s.numberVariant}` === numero);
    if (!set) return { ok: true, valeur: { numero, trouve: false, lancement: null, retrait: null, disponibilite: null, prixDE: null } };
    return {
      ok: true,
      valeur: {
        numero,
        trouve: true,
        lancement: datePropre(set.launchDate),
        retrait: datePropre(set.exitDate),
        disponibilite: typeof set.availability === 'string' ? set.availability.slice(0, 60) : null,
        prixDE: prixPropre(set.LEGOCom?.DE?.retailPrice),
      },
    };
  }
  const message = String(donnees.message ?? '').toLowerCase();
  if (message.includes('limit')) return { ok: false, statut: 429, code: 'limite' };
  if (message.includes('key') || message.includes('invalid')) return { ok: false, statut: 502, code: 'cle' };
  return { ok: false, statut: 502, code: 'brickset' };
}

// En-têtes de réponse. L'autorisation CORS n'est donnée qu'aux sites listés : un autre site ne peut
// pas lire la réponse depuis un navigateur. (Un outil en ligne de commande, lui, n'a pas d'origine.)
function entetes(request, env) {
  const autorisees = String(env.ORIGINE ?? ORIGINE_PAR_DEFAUT).split(',').map((o) => o.trim()).filter(Boolean);
  const origine = request.headers.get('Origin');
  const h = { 'Content-Type': 'application/json; charset=utf-8', Vary: 'Origin', 'Cache-Control': 'no-store' };
  if (origine && autorisees.includes(origine)) {
    h['Access-Control-Allow-Origin'] = origine;
    h['Access-Control-Allow-Headers'] = 'X-Jeton';
    h['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

// Lit le corps par morceaux et s'arrête dès que la taille maximale est dépassée : on ne se fie pas à
// Content-Length, qu'un serveur peut omettre ou mentir sur.
async function lireBorne(reponse, max) {
  const lecteur = reponse.body?.getReader();
  if (!lecteur) return null;
  const morceaux = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { await lecteur.cancel(); return null; }
    morceaux.push(value);
  }
  const out = new Uint8Array(total);
  let pos = 0;
  for (const m of morceaux) { out.set(m, pos); pos += m.byteLength; }
  return out;
}

async function traiterImage(url, h, rep, fetchFn) {
  const cible = urlImageValide(url.searchParams.get('url') ?? '');
  if (!cible) return rep(400, { erreur: 'url' });
  try {
    // redirect: 'manual' : une redirection pourrait mener hors de la liste blanche.
    const reponse = await fetchFn(cible, { redirect: 'manual', signal: AbortSignal.timeout(DELAI_MS) });
    if (reponse.status === 404) return rep(404, { erreur: 'absente' });
    if (!reponse.ok) return rep(502, { erreur: 'rebrickable' });
    const type = (reponse.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return rep(502, { erreur: 'type' });
    const annonce = Number(reponse.headers.get('Content-Length'));
    if (annonce > TAILLE_IMAGE_MAX) return rep(502, { erreur: 'taille' });
    const octets = await lireBorne(reponse, TAILLE_IMAGE_MAX);
    if (!octets) return rep(502, { erreur: 'taille' });
    const entetesImage = { ...h, 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' };
    return new Response(octets, { status: 200, headers: entetesImage });
  } catch (e) {
    return rep(e?.name === 'TimeoutError' ? 504 : 502, { erreur: e?.name === 'TimeoutError' ? 'delai' : 'rebrickable' });
  }
}

export async function traiter(request, env, { fetchFn = fetch } = {}) {
  const h = entetes(request, env);
  const rep = (statut, corps) => new Response(corps === null ? null : JSON.stringify(corps), { status: statut, headers: h });

  if (request.method === 'OPTIONS') return rep(204, null);
  if (request.method !== 'GET') return rep(405, { erreur: 'methode' });
  const url = new URL(request.url);
  if (url.pathname !== '/sortie' && url.pathname !== '/image') return rep(404, { erreur: 'introuvable' });
  if (env.JETON && request.headers.get('X-Jeton') !== env.JETON) return rep(401, { erreur: 'jeton' });
  if (url.pathname === '/image') return traiterImage(url, h, rep, fetchFn);

  const numero = url.searchParams.get('numero') ?? '';
  if (!NUMERO.test(numero)) return rep(400, { erreur: 'numero' });
  if (!env.BRICKSET_KEY) {
    // Aide au diagnostic : les NOMS (jamais les valeurs) de réglages qui ressemblent à la clé attendue, pour
    // repérer une faute de frappe (« BRICKSET_API_KEY », une espace en trop). JETON et ORIGINE n'y figurent pas.
    const proches = Object.keys(env).filter((k) => /brick|key|cle/i.test(k)).slice(0, 5);
    return rep(500, proches.length > 0 ? { erreur: 'configuration', proches } : { erreur: 'configuration' });
  }

  let donnees;
  try {
    const reponse = await fetchFn(BRICKSET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      // Corps de formulaire plutôt qu'adresse : la clé ne finit pas dans un journal d'accès.
      body: new URLSearchParams({ apiKey: env.BRICKSET_KEY, userHash: '', params: JSON.stringify({ setNumber: numero }) }).toString(),
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (!reponse.ok) return rep(502, { erreur: 'brickset' });
    donnees = await reponse.json();
  } catch (e) {
    return rep(e?.name === 'TimeoutError' ? 504 : 502, { erreur: e?.name === 'TimeoutError' ? 'delai' : 'brickset' });
  }

  const r = lireBrickset(donnees, numero);
  return r.ok ? rep(200, r.valeur) : rep(r.statut, { erreur: r.code });
}

export default {
  fetch: (request, env) => traiter(request, env),
};
