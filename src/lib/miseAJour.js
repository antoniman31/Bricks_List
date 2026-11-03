// Mise à jour de l'app installée. Le service worker prend la main dès qu'une nouvelle version
// est prête (skipWaiting + clientsClaim), mais la page déjà affichée garde l'ancien code : on le
// dit à l'utilisateur, qui recharge quand ça l'arrange (pas de rechargement forcé : une saisie
// en cours ne se perd pas). Même principe que Chrono-MCU.
//
// `sw` et `doc` sont injectables pour que les tests n'aient besoin ni de navigateur ni de réseau.

const INTERVALLE_MIN_MS = 60 * 1000;

// La page affichée est-elle plus ancienne que celle du serveur ? La page d'accueil référence le fichier
// de code par son nom, qui change à chaque version : si le nom lu sur le serveur n'est plus celui que
// cette page a chargé, une nouvelle version existe. Sans cette comparaison, un rechargement qui a déjà
// chargé la dernière version annoncerait quand même « nouvelle version » quand le worker se met à jour.
export async function pageObsolete({ doc = globalThis.document, chercher = globalThis.fetch?.bind(globalThis), adresse = globalThis.location?.pathname } = {}) {
  try {
    const actuel = doc?.querySelector?.('script[src*="assets/index-"]')?.getAttribute('src')?.match(/assets\/index-[^/]+\.js/)?.[0];
    if (!actuel || !chercher) return true;
    const reponse = await chercher(adresse, { cache: 'no-store' });
    const serveur = (await reponse.text()).match(/assets\/index-[^"'/]+\.js/)?.[0];
    return Boolean(serveur) && serveur !== actuel;
  } catch {
    // Illisible : mieux vaut proposer un rechargement inutile que de cacher une vraie mise à jour.
    return true;
  }
}

// Vérification à la demande (bouton des Réglages). Contrairement à `pageObsolete`, qui sert à décider
// d'afficher un bandeau et penche donc vers « oui » en cas de doute, ici chaque issue a son message :
//   'a-jour'     la page affichée porte déjà le fichier de code du serveur ;
//   'obsolete'   le serveur en annonce un autre : une nouvelle version existe ;
//   'hors-ligne' le serveur n'a pas répondu (pas de réseau, erreur) : on ne sait pas, et on le dit ;
//   'inconnu'    pas de fichier de code à comparer (mode développement) : rien à vérifier.
// On demande aussi au navigateur de chercher un nouveau service worker, pour qu'il soit prêt au rechargement.
export async function verifierMiseAJour({ sw = globalThis.navigator?.serviceWorker, doc = globalThis.document, chercher = globalThis.fetch?.bind(globalThis), adresse = globalThis.location?.pathname } = {}) {
  try {
    const reg = await sw?.getRegistration?.();
    await reg?.update?.();
    const reponse = await chercher(adresse, { cache: 'no-store' });
    if (!reponse.ok) return 'hors-ligne';
    const actuel = doc?.querySelector?.('script[src*="assets/index-"]')?.getAttribute('src')?.match(/assets\/index-[^/]+\.js/)?.[0];
    const serveur = (await reponse.text()).match(/assets\/index-[^"'/]+\.js/)?.[0];
    if (!actuel || !serveur) return 'inconnu';
    return serveur === actuel ? 'a-jour' : 'obsolete';
  } catch {
    return 'hors-ligne';
  }
}

export function surveillerMisesAJour({ quandPrete, sw = globalThis.navigator?.serviceWorker, doc = globalThis.document, maintenant = () => Date.now(), verifier = pageObsolete }) {
  if (!sw || !doc) return () => {};

  // Pas d'annonce à la toute première installation : aucun worker ne contrôlait la page, ce n'est
  // pas une mise à jour mais le premier démarrage hors ligne.
  const avaitUnWorker = Boolean(sw.controller);
  const surChangement = () => { if (avaitUnWorker) Promise.resolve(verifier()).then((obsolete) => { if (obsolete) quandPrete(); }); };
  sw.addEventListener('controllerchange', surChangement);

  // Rouvrir l'app installée depuis l'arrière-plan ne recharge pas la page, donc le navigateur
  // ne cherche pas de nouvelle version : on le demande nous-mêmes au retour au premier plan, au
  // plus une fois par minute (un aller-retour rapide entre deux applis ne multiplie pas les requêtes).
  let derniere = -Infinity;
  const surVisibilite = () => {
    if (doc.visibilityState !== 'visible') return;
    const t = maintenant();
    if (t - derniere < INTERVALLE_MIN_MS) return;
    derniere = t;
    // Hors ligne ou worker absent : la vérification échoue en silence, la prochaine ouverture réessaiera.
    Promise.resolve(sw.ready).then((reg) => reg?.update?.()).catch(() => {});
  };
  doc.addEventListener('visibilitychange', surVisibilite);

  return () => {
    sw.removeEventListener('controllerchange', surChangement);
    doc.removeEventListener('visibilitychange', surVisibilite);
  };
}
