# Bricks List : où on en est, et la suite

État au 3 novembre 2026. Site : https://antoniman31.github.io/Bricks_List/ (version `bb36475`).
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
- **Qualité** : `npm run lint`, `npm test` (143 tests), `npm run verif:ui` (axe-core, cibles de
  44 px, débordements, navigation ; 8 écrans × 2 thèmes × 3 largeurs). Les trois tournent dans
  le CI avant le déploiement.

## Décisions de cadrage (ne pas rouvrir sans raison)

Pas de minifigs, de pièces détachées, de prix ni d'APK. Sauvegarde par export manuel (la
synchronisation entre appareils est écartée pour l'instant). Moins de 100 sets prévus.

## La suite : Brickset (vraies images de boîtes et scan de code-barres)

Antoni est prêt à créer une clé Brickset et à déployer un relais Cloudflare. Les images de
Rebrickable, Brickset et BrickLink sont toutes le même rendu du modèle monté sur fond blanc :
changer de source parmi elles n'apporte pas la boîte.

**Ce qu'on ne sait pas, et qu'il faut mesurer avant de construire** (impossible sans clé) :

1. Quelle image additionnelle de Brickset est la boîte, et existe-t-elle pour tous ses sets ?
2. L'API Brickset permet-elle de retrouver un set par code-barres (EAN) ? Si non, le scan n'a
   pas de source et il faut le dire plutôt que le bricoler.

**Étapes prévues**

1. Relais CORS (`worker/`, sur le modèle de celui de game-library : aucune clé dedans, il ajoute
   seulement l'en-tête CORS que l'API Brickset n'envoie pas) ; champs « URL du relais » et
   « Clé Brickset » dans les Réglages, stockés sur l'appareil, jamais exportés ; un écran de
   diagnostic qui interroge Brickset pour un set (ex. 75192) et affiche les champs utiles, sans
   la clé. Antoni colle le résultat : on calibre sur du réel.
2. Images de boîtes, avec repli sur le rendu actuel quand il n'y a pas de boîte.
3. Scan de code-barres : `BarcodeDetector` de Chrome Android (absent sous Windows, où la saisie
   du numéro reste la voie), seulement si le point 2 ci-dessus est confirmé.

**À faire par Antoni (sans jamais donner de clé dans une conversation ni dans le dépôt)** :
demander une clé sur Brickset (une validation peut être nécessaire) ; déployer le relais, soit
avec `wrangler deploy` depuis son PC, soit en ajoutant `CLOUDFLARE_API_TOKEN` et
`CLOUDFLARE_ACCOUNT_ID` aux secrets du dépôt comme pour game-library.

## Noms français

Rebrickable et Brickset donnent les noms en anglais. Les noms français viennent de LEGO.com, qui
n'a pas d'API publique : s'y brancher passerait par du grattage de pages, fragile et douteux
vis-à-vis de leurs conditions. Aucune source propre n'est connue. Antoni voudrait des noms
français « quand c'est possible » ; en attendant, un nom se corrige à la main dans la fiche. À
décider : chercher d'abord s'il existe une source propre, ou rester sur la correction manuelle.

## Limites connues

- Les images ont un fond blanc intégré : elles restent sur un panneau blanc, même en thème sombre.
- L'écran de démarrage de la PWA installée reste noir en thème clair (un manifeste n'a qu'une couleur).
- La durée réelle d'un lot dépend de la limite de débit de Rebrickable ; un 429 est retenté une fois.

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
