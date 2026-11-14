# À faire : reprise de session (état au 13 novembre 2026)

Ce fichier dit **où on s'est arrêtés** et **quoi faire ensuite**, dans l'ordre. Il complète `docs/SUITE.md` (état
complet du projet, décisions, limites) et `CLAUDE.md` (règles de travail). Lire les trois avant de commencer.

Dernière PR fusionnée : **#73** (TODO) ; en cours : Réglages réorganisés et wishlist allégée. Branche de travail unique :
`ccr-bf63eeba-887je4`. Qualité : lint OK, 425 tests, `verif:ui` 576 écrans.

Depuis la PR #66 : transfert collection ↔ wishlist (#67), boîtes BrickLink gardées sur l'appareil (#68), rendus
Rebrickable gardés via la route `/image` du relais (#69), sauvegarde complète avec toutes les images (#70), prix officiel
de la wishlist (#71), correctif de la copie des rendus (#72).

## 1. Tout de suite

1. ~~Réorganiser les Réglages~~ : fait (quatre groupes, états en une ligne, une section ouverte à la fois ; voir `docs/SUITE.md`). La wishlist
   n'a plus que le total et un bouton-icône « Copier la liste » (la mise à jour dates et prix est dans Réglages > Relais).
2. **Antoni, sur son S26** : relancer Réglages > Images sur l'appareil > « Sauvegarder toutes les images » (avant #72, la
   copie des rendus s'était arrêtée après 8 images sur un « image trop grosse » ; on ne sait pas quel set) et coller le
   message, qui nomme maintenant les sets refusés. Puis faire un **export complet** (Réglages > Sauvegarde) : il contient
   photos, boîtes, rendus et prix, et pèse des dizaines de Mo.
3. **BrickLink est hors ligne** (« activité inhabituelle », déclaration du 11 novembre 2026, aucune date de retour). 51 boîtes
   sont déjà gardées sur l'appareil ; à son retour, relancer « Sauvegarder toutes les images » pour les autres.

## 2. Le relais Cloudflare : en service depuis le 13 novembre

Worker `bricks-relais` (code dans `relais/`), adresse `https://bricks-relais.antoniman31.workers.dev`, saisie dans Réglages >
Connexions > Relais. **Vérifié avec une vraie réponse de Brickset** pour le Faucon (75192-1) : `lancement` 2017-10-01, `retrait`
2026-12-31, `disponibilite` « LEGO exclusive », `prixDE` 849.99. Donc `LEGOCom.DE.retailPrice` est le bon champ. Antoni a lancé
« Mettre à jour dates et prix » : 53 dates et 33 prix DE enregistrés (wishlist de 34 sets, un seul sans prix).

- Les deux routes : `GET /sortie?numero=` (dates et prix DE), `GET /image?url=` (rendus Rebrickable, seulement `cdn.rebrickable.com/media/sets/…`,
  6 Mo au plus). CORS limité à `https://antoniman31.github.io`.
- Déploiement : Workers Builds relié au dépôt, nom `bricks-relais` (doit correspondre à `wrangler.toml`), **répertoire racine
  `/relais`**, commande de build **vide**, déploiement `npx wrangler deploy`, aperçus activés (`npx wrangler preview`). Chaque
  fusion sur `main` redéploie.
- **La clé** : secret `BRICKSET_KEY` dans Paramètres de `bricks-relais`, **première section « Variables d'exécution et secrets »**,
  type Secret. Pièges rencontrés : la section « Variables et secrets » de **Builds** n'est pas lue par le relais (réponse
  `{"erreur":"configuration"}`) ; une entrée saisie sous le nom `ORIGINE` (au lieu de `BRICKSET_KEY`) masque la vraie origine
  autorisée. **Jamais la clé dans une conversation, un fichier ou le dépôt.**
- **Limite Brickset : 100 appels `getSets` par jour et par clé.** « Mettre à jour dates et prix » fait un appel par set
  (dates manquantes ou à venir, prix vides ou pré-remplis) : une première mise à jour en consomme environ 55, ne pas la relancer
  le même jour. Le prix et la limite exacts de la clé restent à confirmer sur la page de Brickset, puis à consigner dans `docs/SUITE.md`.
- Les prix sont des **prix allemands** (la France n'a pas de prix chez Brickset), marqués « DE » ; un prix saisi à la main n'est
  jamais écrasé. À vérifier par Antoni sur quelques sets (LEGO.fr).
- Le check GitHub « Workers Builds: bricks-relais » a échoué une fois sur la PR #72 (« This Worker does not exist on your
  account », juste après la recréation du Worker) puis réussi à la tentative suivante : passager. L'ancien check
  « Workers Builds: bricks-list » a été retiré.
- Connecteurs Cloudflare dans claude.ai : l'ancien « Cloudflare Developer Platform » lit les Workers mais pas les secrets ni
  les réglages de build ; ne jamais manipuler la valeur d'une clé. Pour guider Antoni dans le tableau de bord, lui faire
  envoyer une capture à chaque écran.

## 3. Pistes ouvertes

- **Vraies boîtes sans BrickLink** : l'appel `getAdditionalImages` de l'API Brickset (images supplémentaires d'un set, souvent
  des photos de boîte, **non vérifié**), maintenant faisable puisque la clé marche : tester d'abord sur un set avec une vraie
  réponse (une route d'essai du relais), puis décider. Les images principales de Brickset (`images.brickset.com`) sont des
  rendus, comme Rebrickable ; LEGO.com écarté (adresses non déductibles, pas d'API publique).
- **Libellés de la wishlist** : faits (novembre 2026) : « Prioritaire », « Envie », « Un jour » (les clés stockées `forte`, `un-jour`, `pas-presse`
  n'ont pas changé).
- **Prix** : seulement le prix officiel de la wishlist (exception au cadrage). Pas de prix du marché ni de prix payé.
- **Fichier d'export lourd** : si le partage vers Drive ou Messages traîne, ajouter un bouton « sans les images ».

## 4. Idées retenues, pas commencées (ordre à choisir par Antoni)

Proposées le 14 novembre : (1) **sets bientôt retirés** (la date de retrait de Brickset, déjà renvoyée par le relais dans `retrait`, n'est pas encore
utilisée : affichage « Retrait le … », filtre « Bientôt retirés », tri ; seuil à décider, 6 mois recommandé) ; (3) **notice LEGO** : faite ; (4) **budget de la
wishlist par priorité** dans les statistiques. Antoni n'a retenu que la notice pour l'instant. À vérifier par lui : que le lien « Notice LEGO » ouvre
bien la bonne page sur son téléphone.


- **« Quoi monter ? »** : tirage au sort parmi les scellés, neufs et en cours, avec filtre de taille.
- **Export CSV** de la collection (séparateur point-virgule, BOM UTF-8 pour l'Excel français ; lecture seule).
- **Transfert téléphone ↔ PC** : le fichier d'export complet suffit pour l'instant (Partager > Partage rapide, puis Réglages >
  Importer un fichier ; l'import accepte `.txt`). Si le geste pèse : lien (données compressées après le `#`) et QR allégé ;
  détails dans `docs/SUITE.md`. Les images, elles, ne tiennent ni dans un lien ni dans un QR.
- **Choix de l'image en sélection multiple** (idée D de la page de maquettes) : seulement si Antoni doit changer des dizaines de
  sets d'un coup. **Plusieurs photos par set** (idée E) : seulement s'il le demande.
- Écartés pour l'instant : synchronisation Drive/serveur, Brickognize (conditions d'utilisation à risque), images principales
  de Brickset, LEGO.fr.

## 5. À tester par Antoni sur son S26

- Les dates de sortie et les prix DE sur la wishlist (total, tri par prix, filtre par tranche, saisie à la main sur la fiche).
- La sauvegarde des images (point 1.2) et l'export complet, puis, un jour, la restauration sur un appareil vidé.
- Déjà validé : photos (appareil photo, recadrage), choix de l'image de la liste, filtres par onglet, relais joignable.
- Les photos de boîte viennent de BrickLink (adresses déduites du numéro, non officielles) : si des sets restent sur leur
  numéro, le noter.

## 6. Façon de travailler (rappel, détail dans `CLAUDE.md`)

- Antoni : français, tutoiement, réponses courtes, franchise. **Proposer puis attendre un « ok » explicite** avant de
  toucher au code ; « Pose des questions » signifie utiliser AskUserQuestion ; pour des visuels, publier une maquette
  en Artifact (privé).
- Fusion par squash **dès que le CI est vert** (choix d'Antoni), sauf si une donnée peut être perdue : demander, et
  rappeler d'exporter d'abord. Compter les tests et les écrans de `verif:ui` dans `docs/SUITE.md` à chaque PR.
- Git : repartir de `origin/main`, branche `ccr-bf63eeba-887je4`, avant le push `git merge -s ours --no-edit
  origin/ccr-bf63eeba-887je4` (le push forcé est refusé), PR en brouillon, abonnement à la PR, fusion avec
  `expectedHeadSha` **complet (40 caractères)**. Ne pas enchaîner `npm test` et `git push` avec des `;` : un test en échec ne
  doit pas partir. Un contrôle qui casse le code exprès ne doit jamais être commité (restaurer avant tout commit).
- Un contrôle « de non-vacuité » (casser exprès le code et vérifier que le test échoue) a été fait pour les parcours
  `verif:ui` sensibles ; continuer à le faire pour les protections de données.
- **Aucune clé dans une conversation, un fichier ou le dépôt** (Brickset, Rebrickable, Cloudflare). La clé Rebrickable se
  saisit dans les Réglages de l'appli ; celle de Brickset dans les secrets du Worker ; jamais d'export de collection ni de
  `.env` dans le dépôt. Une clé Rebrickable est apparue dans une capture d'écran : Antoni devait la régénérer.
