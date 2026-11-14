// Relais Brickset pour les dates de sortie des sets. Un Cloudflare Worker d'un seul fichier : il se
// colle tel quel dans le tableau de bord Cloudflare, ou se déploie avec `wrangler deploy`.
//
// Pourquoi : l'API de Brickset n'envoie pas d'en-têtes CORS, un navigateur ne peut donc pas l'appeler
// directement. Le relais l'appelle à sa place, avec la clé Brickset gardée en secret côté Cloudflare
// (jamais dans l'application, jamais dans le dépôt), et ne renvoie que ce dont l'app a besoin.
//
//   GET /sortie?numero=75192-1  ->  { numero, trouve, lancement, retrait, disponibilite, prixDE, sousTheme }
//   GET /galerie?numero=75192-1  ->  { numero, trouve, images: [{ url, miniature }] }  (images supplémentaires de Brickset : DEUX appels Brickset)
//   GET /notices?numero=75192-1  ->  { numero, trouve, notices: [{ url, description }] }  (notices PDF de Brickset)
//   GET /image?url=https://cdn.rebrickable.com/media/sets/75192-1.jpg  ->  l'image elle-même, avec CORS
//     (ni le CDN de Rebrickable ni les images de Brickset n'en envoient : sans relais, l'app ne peut pas les copier sur l'appareil).
//     Route volontairement étroite : deux hôtes, un dossier chacun, des images, une taille maximale.
//
// Secrets et variables (voir relais/README.md) :
//   BRICKSET_KEY  (secret, obligatoire)  la clé de l'API Brickset
//   JETON         (secret, facultatif)   si défini, l'appel doit porter l'en-tête X-Jeton identique
//   ORIGINE       (variable)             sites autorisés à appeler depuis un navigateur, séparés par des virgules

const BRICKSET = 'https://brickset.com/api/v3.asmx/getSets';
const BRICKSET_IMAGES = 'https://brickset.com/api/v3.asmx/getAdditionalImages';
const BRICKSET_NOTICES = 'https://brickset.com/api/v3.asmx/getInstructions2';
const MAX_NOTICES = 12;
const MAX_IMAGES = 40;
const NUMERO = /^\d{3,7}-\d{1,2}$/;
const ORIGINE_PAR_DEFAUT = 'https://antoniman31.github.io';
const DELAI_MS = 8000;
// Deux hôtes seulement, chacun avec son dossier : les rendus de Rebrickable et la galerie de Brickset.
const HOTES_IMAGES = {
  'cdn.rebrickable.com': /^\/media\/sets\/[A-Za-z0-9_\-./]+\.(?:jpe?g|png|webp)$/i,
  'images.brickset.com': /^\/sets\/AdditionalImages\/[A-Za-z0-9_-]+\/[A-Za-z0-9_&.-]{1,80}\.(?:jpe?g|png|webp)$/i,
};
// 6 Mo : certains rendus dépassent 2 Mo ; l'appli les réduit à 1 024 px avant de les garder, la taille d'arrivée importe peu.
const TAILLE_IMAGE_MAX = 6 * 1024 * 1024;

// L'adresse d'image demandée, ou null si elle sort du cadre. Sans cette liste blanche le relais serait
// un proxy ouvert (SSRF, bande passante offerte à n'importe qui) : on n'accepte que les rendus de sets.
export function urlImageValide(brut) {
  let u;
  try { u = new URL(brut); } catch { return null; }
  const chemin = Object.hasOwn(HOTES_IMAGES, u.hostname) ? HOTES_IMAGES[u.hostname] : null;
  if (u.protocol !== 'https:' || !chemin || u.port !== '' || u.username || u.password) return null;
  if (u.search || u.hash || u.pathname.includes('..') || u.pathname.includes('//')) return null;
  return chemin.test(u.pathname) ? u.href : null;
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

// Un libellé court venu de Brickset (sous-thème) : du texte sans retour à la ligne, 60 caractères au plus, ou null.
// Un sous-thème vide est une vraie réponse (« Brickset n'en a pas ») : on renvoie '' pour que l'app ne le redemande pas.
export function libellePropre(v) {
  if (typeof v !== 'string') return null;
  return v.replace(/\p{Cc}+/gu, ' ').trim().slice(0, 60);
}

// Une adresse de notice renvoyée par Brickset : https, sans identifiants, chez Brickset ou LEGO seulement. Sans cette
// liste blanche, le relais ferait suivre à l'app n'importe quelle adresse qu'une réponse altérée lui glisserait.
export function urlNoticeValide(v) {
  if (typeof v !== 'string' || v.length > 300) return null;
  let u;
  try { u = new URL(v.trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port !== '') return null;
  const hote = u.hostname.toLowerCase();
  const permis = ['lego.com', 'brickset.com'].some((d) => hote === d || hote.endsWith(`.${d}`));
  return permis ? u.href : null;
}

// La liste de notices de `getInstructions2`, lue sans lui faire confiance. Les noms de champs (`URL`, `description`)
// suivent la documentation de l'API et n'ont pas été vus dans une vraie réponse : on accepte `url` aussi.
export function lireNotices(donnees, numero) {
  if (!donnees || typeof donnees !== 'object') return { ok: false, statut: 502, code: 'reponse' };
  if (donnees.status === 'success') {
    const liste = Array.isArray(donnees.instructions) ? donnees.instructions : [];
    const notices = [];
    for (const n of liste) {
      const url = urlNoticeValide(n?.URL ?? n?.url);
      if (!url || notices.some((x) => x.url === url)) continue;
      notices.push({ url, description: libellePropre(n?.description) ?? '' });
      if (notices.length >= MAX_NOTICES) break;
    }
    return { ok: true, valeur: { numero, trouve: notices.length > 0, notices } };
  }
  const message = String(donnees.message ?? '').toLowerCase();
  if (message.includes('limit')) return { ok: false, statut: 429, code: 'limite' };
  if (message.includes('key') || message.includes('invalid')) return { ok: false, statut: 502, code: 'cle' };
  return { ok: false, statut: 502, code: 'brickset' };
}

// Une adresse d'image renvoyée par Brickset : https, sans identifiants, chez Brickset ou LEGO, comme pour les notices.
export const urlImageSetValide = urlNoticeValide;

// L'identifiant interne de Brickset (`setID`) du set demandé dans une réponse `getSets`, ou null. `getAdditionalImages` ne connaît
// que cet identifiant, pas le numéro du set.
export function identifiantBrickset(donnees, numero) {
  if (!donnees || donnees.status !== 'success' || !Array.isArray(donnees.sets)) return null;
  const set = donnees.sets.find((s) => s && `${s.number}-${s.numberVariant}` === numero);
  return Number.isInteger(set?.setID) && set.setID > 0 ? set.setID : null;
}

// Les images supplémentaires de `getAdditionalImages`, lues sans lui faire confiance. Les noms de champs (`imageURL`,
// `thumbnailURL`) suivent la documentation de l'API et n'ont pas été vus dans une vraie réponse.
export function lireImagesSet(donnees, numero) {
  if (!donnees || typeof donnees !== 'object') return { ok: false, statut: 502, code: 'reponse' };
  if (donnees.status === 'success') {
    const liste = Array.isArray(donnees.additionalImages) ? donnees.additionalImages : [];
    const images = [];
    for (const i of liste) {
      const url = urlImageSetValide(i?.imageURL ?? i?.imageUrl);
      if (!url || images.some((x) => x.url === url)) continue;
      images.push({ url, miniature: urlImageSetValide(i?.thumbnailURL ?? i?.thumbnailUrl) });
      if (images.length >= MAX_IMAGES) break;
    }
    return { ok: true, valeur: { numero, trouve: images.length > 0, images } };
  }
  const message = String(donnees.message ?? '').toLowerCase();
  if (message.includes('limit')) return { ok: false, statut: 429, code: 'limite' };
  if (message.includes('key') || message.includes('invalid')) return { ok: false, statut: 502, code: 'cle' };
  return { ok: false, statut: 502, code: 'brickset' };
}

// La réponse de Brickset, lue sans lui faire confiance. Renvoie { ok: true, valeur } ou
// { ok: false, statut, code } : un code court pour l'app, jamais le texte brut de Brickset.
export function lireBrickset(donnees, numero) {
  if (!donnees || typeof donnees !== 'object') return { ok: false, statut: 502, code: 'reponse' };
  if (donnees.status === 'success') {
    const sets = Array.isArray(donnees.sets) ? donnees.sets : [];
    const set = sets.find((s) => s && `${s.number}-${s.numberVariant}` === numero);
    if (!set) return { ok: true, valeur: { numero, trouve: false, lancement: null, retrait: null, disponibilite: null, prixDE: null, sousTheme: null } };
    return {
      ok: true,
      valeur: {
        numero,
        trouve: true,
        lancement: datePropre(set.launchDate),
        retrait: datePropre(set.exitDate),
        disponibilite: typeof set.availability === 'string' ? set.availability.slice(0, 60) : null,
        prixDE: prixPropre(set.LEGOCom?.DE?.retailPrice),
        sousTheme: libellePropre(set.subtheme),
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

// Deux appels Brickset : `getSets` donne l'identifiant interne du set, `getAdditionalImages` ses images. Ils comptent tous deux dans
// la limite de 100 appels par jour : l'application ne l'appelle que pour un set à la fois, à la demande.
async function appelerBrickset(adresse, champs, fetchFn) {
  const reponse = await fetchFn(adresse, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(champs).toString(),
    signal: AbortSignal.timeout(DELAI_MS),
  });
  if (!reponse.ok) throw Object.assign(new Error('brickset'), { code: 'brickset' });
  return reponse.json();
}

async function traiterGalerie(numero, env, rep, fetchFn) {
  try {
    const sets = await appelerBrickset(BRICKSET, { apiKey: env.BRICKSET_KEY, userHash: '', params: JSON.stringify({ setNumber: numero }) }, fetchFn);
    const lu = lireBrickset(sets, numero);
    if (!lu.ok) return rep(lu.statut, { erreur: lu.code });
    const id = identifiantBrickset(sets, numero);
    if (!id) return rep(200, { numero, trouve: false, images: [] });
    const r = lireImagesSet(await appelerBrickset(BRICKSET_IMAGES, { apiKey: env.BRICKSET_KEY, setID: String(id) }, fetchFn), numero);
    return r.ok ? rep(200, r.valeur) : rep(r.statut, { erreur: r.code });
  } catch (e) {
    return rep(e?.name === 'TimeoutError' ? 504 : 502, { erreur: e?.name === 'TimeoutError' ? 'delai' : 'brickset' });
  }
}

export async function traiter(request, env, { fetchFn = fetch } = {}) {
  const h = entetes(request, env);
  const rep = (statut, corps) => new Response(corps === null ? null : JSON.stringify(corps), { status: statut, headers: h });

  if (request.method === 'OPTIONS') return rep(204, null);
  if (request.method !== 'GET') return rep(405, { erreur: 'methode' });
  const url = new URL(request.url);
  if (url.pathname !== '/sortie' && url.pathname !== '/image' && url.pathname !== '/notices' && url.pathname !== '/galerie') return rep(404, { erreur: 'introuvable' });
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

  if (url.pathname === '/galerie') return traiterGalerie(numero, env, rep, fetchFn);

  const notices = url.pathname === '/notices';
  let donnees;
  try {
    const reponse = await fetchFn(notices ? BRICKSET_NOTICES : BRICKSET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      // Corps de formulaire plutôt qu'adresse : la clé ne finit pas dans un journal d'accès.
      body: new URLSearchParams(
        notices
          ? { apiKey: env.BRICKSET_KEY, setNumber: numero }
          : { apiKey: env.BRICKSET_KEY, userHash: '', params: JSON.stringify({ setNumber: numero }) },
      ).toString(),
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (!reponse.ok) return rep(502, { erreur: 'brickset' });
    donnees = await reponse.json();
  } catch (e) {
    return rep(e?.name === 'TimeoutError' ? 504 : 502, { erreur: e?.name === 'TimeoutError' ? 'delai' : 'brickset' });
  }

  const r = notices ? lireNotices(donnees, numero) : lireBrickset(donnees, numero);
  return r.ok ? rep(200, r.valeur) : rep(r.statut, { erreur: r.code });
}

export default {
  fetch: (request, env) => traiter(request, env),
};
