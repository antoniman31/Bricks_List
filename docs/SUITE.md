# Bricks-List : où on en est, et la suite

État au 3 novembre 2026. Site : https://antoniman31.github.io/Bricks_List/ (la version se lit en bas des Réglages).
Ce fichier sert à reprendre le travail sans relire la conversation qui l'a produit.

## Ce qui est fait et en ligne

PWA React + Vite sur GitHub Pages, données dans le `localStorage` du navigateur, export et
import JSON. Utilisée par Antoni sur un Galaxy S26 Ultra et un PC Windows (Chrome) : il a
testé avec sa vraie collection, tout fonctionne.

- **Collection et wishlist** : un set est une fiche (numéro, nom, thème, année, pièces, image,
  statut possédé ou souhaité, état scellé/monté/démonté/incomplet, notes). Deux exemplaires
  d'un même set sont deux fiches.
- **Recherche, filtres, tri** : insensible aux accents, filtres thème, état, année (par
  décennie au-delà de 15 ans d'étalement) et « À compléter » (sans thème, année, pièces, état).
- **Ajout** : manuel, ou par numéro via l'API Rebrickable (nom, thème racine, année, pièces,
  image). Bouton « Chercher » aussi dans la modification d'une fiche.
- **Ajout par lot** : on colle des numéros, vérification avant écriture (trouvés, introuvables,
  doublons), une seule écriture. Sans clé Rebrickable, seuls les numéros sont ajoutés.
- **Stats** : sets, pièces, répartition par thème, année et état, wishlist. Chaque barre ouvre
  la liste filtrée correspondante ; un test vérifie que chiffre et liste coïncident.
- **Thème** clair, sombre (noir pur) ou automatique, appliqué avant le premier rendu.
- **Navigation** : barre du bas sur téléphone, rail à gauche dès 600 px.
- **« Je l'ai déjà ? »** : la recherche montre aussi les résultats de l'autre onglet (section
  « Dans la wishlist (n) » sous la liste), sans changer d'onglet.
- **Rangement** : emplacement de rangement (texte libre, suggestions), boîte et notice présentes ou
  absentes, pour un set possédé ; sur la fiche, la carte, la recherche et trois filtres. Aucune
  migration : une fiche d'avant ces champs reste « non précisé ».
- **Recherche par nom** dans le formulaire d'ajout (API Rebrickable, 10 résultats par page, thème
  résolu seulement pour le résultat choisi). Les noms du catalogue sont en anglais.
- **Sélection multiple** : modifier ou supprimer plusieurs sets d'un coup, avec aperçu et annulation.
- **Liste groupée par emplacement** : tri « Emplacement » (collection), groupes repliables, « Non
  rangé » en dernier, « Choisir ce groupe » en sélection ; bloc Stats « Par emplacement » ; « Sans
  emplacement » dans « À compléter » seulement si la fonction sert.
- **Sauvegarde fiable** : demande de stockage protégé à Chrome (verdict réel affiché dans les
  Réglages), date de dernière sauvegarde (clé `bl_derniere_sauvegarde`, hors export), bandeau de
  rappel après 30 jours, bouton « Partager la sauvegarde » (partage Android, repli téléchargement).
  La clé Rebrickable n'est jamais dans une sauvegarde.
- **Priorité sur la wishlist** (envie forte, un jour, pas pressé) : tri, filtre, Stats, effacée à l'achat.
- **Copier la wishlist en texte** : liste affichée (filtres compris), classée par priorité, avec liens.
- **Dates d'achat et de montage** (AAAA-MM-JJ, validées), tri « Date d'achat », ligne « En 2026 : n
  achetés, n montés » dans les Stats ; « Acheté » note le jour.
- **Étiquettes libres** (8 au plus, 30 caractères) : saisie sur la fiche avec puces des étiquettes
  existantes, filtre, recherche texte. Pas encore d'édition en masse.
- **Refonte d'interface (novembre 2026), inspirée de Material 3 et des guides Android** :
  - *Noyau* : cibles tactiles de 48 px (norme Android, contrôlé par `verif:ui`), couches d'état au
    toucher et au survol, `prefers-reduced-motion`, jetons « conteneur » teintés (sélection, puces
    actives), cartes pleines sans contour, boutons en pilule, feuille à 28 px. Contrastes mesurés
    en commentaire dans `src/index.css`.
  - *En-tête permanent* : logo (brique rouge sur jaune), « Bricks-List » en Fredoka, section et
    nombre de sets (« Collection · 14 sets »), icônes Sélectionner, liste/grille et Réglages.
    Fredoka est embarquée (29 Ko, `src/fonts/`, licence SIL OFL) : hors ligne, aucun appel à Google.
  - *Barre du bas sur téléphone* : recherche, bouton Filtres et « Ajouter » (bouton flottant). Sur
    grand écran, les mêmes éléments sont en haut de la liste. Aucun fond ni fondu derrière eux : un fondu en aplat
    faisait une bande noire qui coupait les cartes (retiré). Pendant la saisie la navigation se
    range (`interactive-widget=resizes-content`) ; Filtres et Ajouter gardent le focus du champ,
    sinon le tap était perdu quand le clavier se refermait.
  - *Feuille « Filtres et tri »* : le tri y est rangé avec les filtres (plus de sélecteur dans la page).
  - *Liste ou grille* : un seul bouton dans l'en-tête, choix retenu (`bl_vue`, hors export).
  - *Icônes* : Material Symbols de Google (arrondies, graisse 400, licence Apache-2.0), tracés copiés dans
    `src/components/Icones.jsx` (pas de dépendance). Réglages = roue crantée (l'ancienne icône ressemblait
    à un soleil). Collection = boîte (`inventory_2`).
  - *Bouton de thème* dans l'en-tête : auto, clair, sombre, puis auto ; l'icône montre l'état actuel, pas
    de message visible (nom du bouton + zone `role=status` pour les lecteurs d'écran). Les puces des
    Réglages restent et suivent le même réglage. À 360 px le logo passe à 32 px et le nom à 18 px.
  - *840 px et plus, en liste* : liste à gauche, détail du set à droite (`FicheContenu`, `useLarge`).
    En grille et sous 840 px, le détail reste une feuille.
- **Mises à jour de l'app installée** (même principe que Chrono-MCU) : la page d'accueil passe par le
  réseau d'abord (4 s, cache hors ligne), les fichiers de code sont immuables (empreinte dans le nom), donc
  un rechargement en ligne suffit pour voir la dernière version. Un bandeau « Une nouvelle version est
  disponible » (Plus tard, Recharger) s'affiche si l'app est restée ouverte pendant une publication, et
  seulement si le serveur annonce un autre fichier de code que celui de la page. Au retour au premier plan,
  l'app cherche une mise à jour (au plus une fois par minute). `src/lib/miseAJour.js`.
  Dans les Réglages, « Vérifier les mises à jour » compare le fichier de code affiché à celui du serveur : il
  recharge seul s'il y en a un autre, dit « dernière version » sinon, et signale un échec (hors ligne) au lieu
  de répondre « à jour » par défaut (`verifierMiseAJour`).
  *Limite* : si on installe l'app puis qu'on coupe le réseau avant le deuxième lancement, la page d'accueil
  n'est pas encore en cache.
- **Qualité** : `npm run lint`, `npm test` (288 tests), `npm run verif:ui` (axe-core, cibles de
  48 px, débordements, navigation, recherche visible clavier ouvert ; 26 écrans × 2 thèmes × 4
  largeurs : 360, 412, 900, 1280). Les trois tournent dans le CI avant le déploiement.

## Décisions de cadrage (ne pas rouvrir sans raison)

Pas de minifigs, de pièces détachées, de prix ni d'APK. Sauvegarde par export manuel (la
synchronisation entre appareils est écartée pour l'instant). Moins de 100 sets prévus.

## La suite

### Veille GitHub (3 novembre 2026) : ce qu'on y a appris

Une quinzaine de projets proches ont été lus (surtout leurs README). Aucun n'est un standard :
ce sont de petits projets de loisir, récents, la plupart sur serveur.

- **Aucun n'utilise le code-barres (EAN) pour retrouver un set.** BrickSeeker lit par OCR le
  numéro imprimé sur la boîte (OCR natif iOS) ; lego-collector demande de le taper ; Nupplo
  identifie par photo avec l'API **Brickognize**. BrickSeeker (app iOS native) a été archivée au
  profit d'une PWA : le choix d'une PWA est cohérent avec ce que d'autres ont conclu.
- **Brickognize** (`https://api.brickognize.com`) : gratuite, sans clé, **CORS ouvert**, route
  `/predict/sets/`. Testée avec les rendus du Faucon (75192-1, score 0,76) et du Titanic (10294-1,
  0,83) : bon set en premier. **Réserves** : ces rendus sont probablement dans leur index, une vraie
  photo de boîte n'a pas été testée ; le service se dit « early beta » ; leurs conditions (site)
  donnent une licence mondiale, perpétuelle et irrévocable sur tout contenu envoyé, **entraînement
  de modèles compris** ; aucune condition spécifique à l'API trouvée.
- **Rebrickable publie un catalogue complet sans clé** (28 565 sets, 0,52 Mo compressé :
  `cdn.rebrickable.com/media/downloads/sets.csv.gz`, `themes.csv`), mais le serveur n'envoie pas
  d'en-tête CORS : l'app ne peut pas le télécharger directement. Il faudrait un relais ou copier
  les données dans le dépôt (conditions de redistribution non vérifiées). Écarté : avec moins de
  100 sets, la recherche par l'API suffit.
- **Idées reprises** : « je l'ai déjà ? » (lego-collector), recherche par nom (Nupplo, plinthos),
  emplacement de rangement, boîte et notice (plinthos, BrickHoard, lego-collector).
- **Idées écartées** : photos personnelles de boîtes (stockage sur l'appareil, export JSON
  difficile), synchronisation serveur, valorisation et mode vente.

### Reste à décider ou à faire

0. **Idées retenues, pas encore faites** (ordre à choisir par Antoni) :
   - **Stats rangement** : sets sans boîte, sans notice, avec lien vers la liste filtrée
     (« sans emplacement » existe déjà dans « À compléter »).
   - **Export CSV** en plus du JSON : séparateur point-virgule, BOM UTF-8 pour l'Excel français.
   - **Pile à monter** : sets scellés, nombre de pièces à monter, raccourci de filtre.
   - **Tirage au sort** « quoi monter ce week-end » parmi scellés et démontés.
   - **Badge ×2** pour les numéros en doublon.
   - **Étiquettes en masse** (ajouter ou retirer une étiquette à la sélection).
   - **Synchronisation entre téléphone et PC** (Antoni utilise les deux au quotidien) : à faire en
     deux temps. D'abord une date de modification par fiche et une trace des suppressions, avec une
     fonction de fusion pure (la plus récente gagne ; suppressions jamais propagées sans
     confirmation, choix d'Antoni) ; ensuite la synchro via l'API Google Drive (dossier réservé à
     l'app, projet Google Cloud à créer par Antoni, identifiant client saisi dans les Réglages,
     jamais dans le dépôt). Manuelle, avec résumé avant écriture, annulation et export préalable.
   - Rappel : fusion **demandée à Antoni à chaque PR**, sauf autorisation explicite par lot.

1. **Photographier une boîte (Brickognize)** : Antoni a répondu « je ne sais pas » sur l'envoi
   des photos. Si on la fait : option **désactivée par défaut** dans les Réglages avec
   l'avertissement ci-dessus, envoi seulement après un geste explicite, liste de candidats avec
   score à confirmer avant tout ajout. **Avant de coder, tester sur quelques vraies boîtes** :
   si la bonne n'est pas dans les trois premières dans la plupart des cas, abandonner.
2. **Vraies images de boîtes** (Brickset). Les images de Rebrickable, Brickset et BrickLink sont
   toutes le même rendu du modèle monté sur fond blanc : changer de source parmi elles n'apporte
   pas la boîte. Il faudrait l'API Brickset (images additionnelles), une clé et un relais
   Cloudflare (leur API n'envoie pas de CORS). Antoni : « je verrai plus tard ».
   - À mesurer avant de construire (impossible sans clé) : quelle image additionnelle est la
     boîte, et existe-t-elle pour tous les sets ?
   - Relais sur le modèle de celui de game-library (aucune clé dedans) ; champs « URL du relais »
     et « Clé Brickset » dans les Réglages, jamais exportés ; écran de diagnostic sans la clé.
   - À faire par Antoni, sans jamais donner de clé dans une conversation ni dans le dépôt :
     demander une clé Brickset, déployer le relais (`wrangler deploy`, ou secrets
     `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` du dépôt).
3. **Retrouver un set par code-barres** : seulement si l'API Brickset le permet, ce qui n'est pas
   établi. Sinon, le scan n'a pas de source : le dire plutôt que le bricoler.

## Noms français

Rebrickable et Brickset donnent les noms en anglais. Les noms français viennent de LEGO.com, qui
n'a pas d'API publique : s'y brancher passerait par du grattage de pages, fragile et douteux
vis-à-vis de leurs conditions. Aucune source propre n'est connue. Antoni voudrait des noms
français « quand c'est possible » ; en attendant, un nom se corrige à la main dans la fiche.
Piste simple, non faite : garder le nom d'origine (anglais) à côté du nom traduit pour que la
recherche trouve les deux (Nupplo fait l'inverse avec un dictionnaire allemand de ~1 400 mots).
Corollaire : la recherche par nom de Rebrickable ne trouve que de l'anglais (« falcon », pas
« faucon »), et l'écran le dit.

## Limites connues

- **Clavier Android à confirmer sur le S26** : la recherche en bas et le rangement de la navigation
  pendant la saisie sont testés en simulation (`verif:ui`, parcours navigateur), pas sur un vrai
  clavier. Si la barre est recouverte, le réglage à revoir est `interactive-widget` dans `index.html`.
- La grille montre les rendus du modèle monté (fond blanc), pas des boîtes : elle est plus
  uniforme avec de vraies images de boîte (voir « Vraies images de boîtes »).
- Pas de couleurs dynamiques Material You : à ma connaissance une page web n'y a pas accès (non vérifié
  sur une source officielle). La palette est fixe, sombre par défaut et claire au choix.
- Pas de bouton flottant « étendu » (avec le mot « Ajouter ») sur téléphone : l'icône seule suffit, avec
  le nom accessible « Ajouter un set ». Sur grand écran, le mot est affiché.
- Les images ont un fond blanc intégré : elles restent sur un panneau blanc, même en thème sombre.
- L'écran de démarrage de la PWA installée reste noir en thème clair (un manifeste n'a qu'une couleur).
- La durée réelle d'un lot dépend de la limite de débit de Rebrickable ; un 429 est retenté une fois.
- Un set dont le numéro contient des lettres (rares sets promotionnels) ne peut pas être rangé :
  l'application n'accepte que les numéros de la forme `75192-1`. La recherche par nom les écarte.
- La recherche par nom s'appuie sur le paramètre `search` de l'API Rebrickable. Antoni a confirmé
  que l'API réelle fonctionne dans l'ensemble.
- Sur le Galaxy S26 (Chrome Android), le partage d'un fichier JSON est refusé alors que `canShare()`
  répond oui (testé par Antoni le 3 novembre 2026). Le partage retombe sur un fichier `.txt`
  (`text/plain`, même contenu), choix retenu dans `bl_partage_texte` ; l'import accepte `.txt`.
  Le nom exact de l'erreur n'a pas été relevé.
- Les emplacements sont comparés au caractère près : « Salon » et « salon » font deux groupes.

## Particularités techniques utiles

- **Branche de travail unique** (`ccr-bf63eeba-887je4`). Après un squash, la branche distante a un
  historique différent de `main` ; un `force-with-lease` a été refusé par le système. La voie qui
  marche : repartir de `origin/main`, travailler, puis `git merge -s ours origin/<branche>` avant
  le push. Le contenu de la PR reste correct, seul le message du squash est plus bruyant.
- Rebrickable accepte les appels depuis un navigateur (CORS ouvert). Brickset non.
- La clé Rebrickable est dans `bl_rebrickable`, hors de la collection (`bl_v1`) et de l'export.
- Les contrastes sont mesurés et notés en commentaire dans `src/index.css` ; le jaune en texte
  (`--accent`) n'est pas le jaune en aplat (`--accent-fond`).
- Les tests de navigateur utilisent `CHROMIUM=/opt/pw-browsers/chromium` en environnement cloud.
- Un routage simulé d'images avec Playwright peut échouer sur deux requêtes simultanées de la même
  URL alors que le vrai CDN fonctionne : contrôler avec les vraies images avant de conclure à un bug.

## Façon de travailler

Proposer d'abord, attendre un « ok » explicite avant de modifier quoi que ce soit, PR en brouillon,
fusion par squash (voir `CLAUDE.md`).
