# À faire : reprise de session (état au 13 novembre 2026)

Ce fichier dit **où on s'est arrêtés** et **quoi faire ensuite**, dans l'ordre. Il complète `docs/SUITE.md` (état
complet du projet, décisions, limites) et `CLAUDE.md` (règles de travail). Lire les trois avant de commencer.

Dernière PR fusionnée : **#69** (rendus Rebrickable copiés par le relais) ; en cours : sauvegarde complète avec les
images. Branche de travail unique : `ccr-bf63eeba-887je4`. Qualité : lint OK, 407 tests, `verif:ui` 480 écrans.

Depuis la PR #66 : transfert collection ↔ wishlist (#67), boîtes BrickLink gardées sur l'appareil (#68), rendus
Rebrickable gardés via la route `/image` du relais (#69), export/import avec toutes les images. **BrickLink est hors ligne**
(« activité inhabituelle », déclaration du 11 novembre 2026, aucune date de retour) : à son retour, Réglages > Images sur
l'appareil > « Sauvegarder toutes les images ». Les rendus se copient dès que l'adresse du relais est saisie dans Réglages.

## 1. Tout de suite : mettre en service les dates de sortie automatiques

L'application est prête (champ `dateSortie`, affichage, tri, filtre, bouton « Mettre à jour les dates », réglage du
relais). **Ce qui manque est de côté Cloudflare**, et la vraie réponse de Brickset n'a jamais été vue.

État du relais (Worker Cloudflare `bricks-relais`, code dans `relais/`) :
- Déployé et à jour (vérifié en lecture : le code en ligne contient le diagnostic `proches` de la PR #65).
- Dépôt GitHub relié à Cloudflare (Workers Builds) : chemin `/relais`, commande de construction **vide**, commande de
  déploiement `npx wrangler deploy`. Chaque fusion sur `main` reconstruit le relais.
- La clé Brickset (qu'Antoni a reçue, demande faite sur brickset.com) est un **secret** `BRICKSET_KEY` à saisir dans
  Cloudflare > `bricks-relais` > Settings > Variables and Secrets (type **Secret**, nom exact). **Jamais la clé dans une
  conversation, un fichier ou le dépôt.**
- Dernier test d'Antoni : `…/sortie?numero=72051-1` répondait `{"erreur":"configuration"}` (le relais ne trouvait pas
  `BRICKSET_KEY`), avant la PR #65. Après la PR, la réponse doit citer des noms voisins s'il y a une faute de frappe.

À faire, dans l'ordre :
1. Antoni recharge `https://bricks-relais.<son-compte>.workers.dev/sortie?numero=72051-1` et colle le résultat :
   - JSON avec `"trouve"` : succès, passer au point 2 ;
   - `{"erreur":"configuration","proches":[…]}` : un réglage a un nom proche de la clé, corriger le nom ;
   - `{"erreur":"configuration"}` seul : recréer le secret `BRICKSET_KEY` (type Secret) puis redéployer ;
   - `{"erreur":"cle"}` : Brickset refuse la clé (copie incomplète, ou clé pas encore activée) ;
   - `{"erreur":"limite"}` : limite quotidienne atteinte, réessayer demain.
2. **Lire la vraie réponse de Brickset** et vérifier que `lireBrickset` (`relais/worker.js`) l'interprète : noms des
   champs (`launchDate`, `exitDate`, `availability`, `number`, `numberVariant`), format des dates. Si le format diffère,
   ajuster le relais et ses tests (`relais/worker.test.mjs`). Le test réel n'a jamais eu lieu : tout est vérifié avec
   un Brickset simulé.
3. Dans l'appli : Réglages > Dates de sortie > saisir l'adresse du relais > « Tester » (interroge le Faucon, 75192-1,
   attendu : « sorti le 1 oct. 2017 ») > « Enregistrer » > « Mettre à jour les dates ». Vérifier sur le S26 que les
   sets de la wishlist pas encore sortis affichent « Sort le … · dans n jours ».
4. Confirmer **le prix de la clé et sa limite quotidienne** (page de Brickset, non confirmés) et les consigner dans
   `docs/SUITE.md`.

## 2. Nettoyage et outillage Cloudflare

- **Check GitHub « Workers Builds: bricks-list » en échec sur chaque PR** : reste d'un premier projet Cloudflare
  supprimé. Antoni doit retirer cette ancienne connexion au dépôt (Cloudflare, ou GitHub > Settings > Applications >
  Cloudflare Workers and Pages). Ce n'est pas lié au code. Le vrai check est « Workers Builds: bricks-relais ».
- `relais/wrangler.toml` contient `keep_vars = true` et un bloc `[previews.vars]` : la commande de prévisualisation
  de Cloudflare (`npx wrangler preview`, bêta) l'exige pour les branches. Si elle redevient capricieuse :
  Settings > Builds > Preview command > `npx wrangler versions upload`, ou désactiver les Preview builds.
- **Connecteur Cloudflare** : Antoni a ajouté (ou va ajouter) `https://mcp.cloudflare.com/mcp` dans claude.ai
  (Réglages > Connecteurs). Il n'apparaît que dans une **nouvelle** session. L'ancien connecteur « Cloudflare Developer
  Platform » est en lecture seule pour les Workers (lister, lire le code) et ne voit ni les secrets ni les réglages
  de construction. Au début de la prochaine session : regarder quels outils le nouveau connecteur offre
  (réglages de construction ? secrets ?) **sans supposer** ; ne jamais manipuler la valeur d'une clé.
- Le plugin Cloudflare installé en session n'était pas activable (`/reload-plugins` n'existe pas en session distante) ;
  le conteneur est éphémère, rien à nettoyer.

## 3. Photos : export (fait) et pistes de boîtes

L'export contient toutes les images (voir `docs/SUITE.md`, « Sauvegarde complète avec les images »). Piste ouverte pour de
vraies boîtes sans BrickLink : l'appel `getAdditionalImages` de l'API Brickset (images supplémentaires d'un set, souvent des
photos de boîte, **non vérifié**) via le relais, une fois `BRICKSET_KEY` en secret. À regarder avec une vraie réponse avant de
coder. Les images principales de Brickset (`images.brickset.com`) sont des rendus, comme Rebrickable ; LEGO.com écarté
(adresses non déductibles, pas d'API publique).

## 4. Idées retenues, pas commencées (ordre à choisir par Antoni)

- **« Quoi monter ? »** : tirage au sort parmi les scellés, neufs et en cours, avec filtre de taille.
- **Export CSV** de la collection (séparateur point-virgule, BOM UTF-8 pour l'Excel français ; lecture seule).
- **Transfert téléphone ↔ PC** : essayer d'abord l'existant (Partager > Partage rapide Android/Windows, puis
  Réglages > Importer un fichier ; l'import accepte `.txt`). Si le geste pèse : lien (données compressées après le `#`,
  rien ne passe par un serveur) et QR allégé (PC vers téléphone seulement : Chrome Windows n'a pas de lecteur de QR).
  Détails et mesures dans `docs/SUITE.md`.
- **Choix de l'image en sélection multiple** (idée D de la page de maquettes) : seulement si Antoni doit changer des
  dizaines de sets d'un coup. **Plusieurs photos par set** (idée E) : seulement s'il le demande.
- Écartés pour l'instant : synchronisation Drive/serveur, Brickognize (conditions d'utilisation à risque), images Brickset.

## 5. À tester par Antoni sur son S26

- Les dates de sortie (voir point 1.3) et la saisie à la main sur la fiche (ligne « Sortie »).
- Déjà validé sur son S26 : photos (appareil photo, recadrage), choix de l'image de la liste, filtres par onglet.
- Les photos de boîte viennent de BrickLink (adresses déduites du numéro, non officielles) : si des sets restent sur
  leur numéro, le noter.

## 6. Façon de travailler (rappel, détail dans `CLAUDE.md`)

- Antoni : français, tutoiement, réponses courtes, franchise. **Proposer puis attendre un « ok » explicite** avant de
  toucher au code ; « Pose des questions » signifie utiliser AskUserQuestion ; pour des visuels, publier une maquette
  en Artifact (privé).
- Fusion par squash **dès que le CI est vert** (choix d'Antoni), sauf si une donnée peut être perdue : demander, et
  rappeler d'exporter d'abord. Compter les tests et les écrans de `verif:ui` dans `docs/SUITE.md` à chaque PR.
- Git : repartir de `origin/main`, branche `ccr-bf63eeba-887je4`, avant le push `git merge -s ours --no-edit
  origin/ccr-bf63eeba-887je4` (le push forcé est refusé), PR en brouillon, abonnement à la PR, fusion avec
  `expectedHeadSha`. Ne pas enchaîner `npm test` et `git push` avec des `;` : un test en échec ne doit pas partir.
- Un contrôle « de non-vacuité » (casser exprès le code et vérifier que le test échoue) a été fait pour les parcours
  `verif:ui` sensibles ; continuer à le faire pour les protections de données.
- **Aucune clé dans une conversation, un fichier ou le dépôt** (Brickset, Rebrickable, Cloudflare). La clé Rebrickable se
  saisit dans les Réglages de l'appli ; celle de Brickset dans les secrets du Worker ; jamais d'export de collection ni de
  `.env` dans le dépôt. Une clé Rebrickable est apparue dans une capture d'écran : Antoni devait la régénérer.
