# Bricks-List : où on en est, et la suite

État au 4 novembre 2026. Site : https://antoniman31.github.io/Bricks_List/ (la version se lit en bas des Réglages).
Ce fichier sert à reprendre le travail sans relire la conversation qui l'a produit. Pour savoir **par quoi
commencer**, lire d'abord `docs/TODO.md`.

## Ce qui est fait et en ligne

PWA React + Vite sur GitHub Pages, données dans le `localStorage` du navigateur, export et
import JSON. Utilisée par Antoni sur un Galaxy S26 Ultra et un PC Windows (Chrome) : il a
testé avec sa vraie collection, tout fonctionne.

- **Collection et wishlist** : un set est une fiche (numéro, nom, thème, année, pièces, image,
  statut possédé ou souhaité, état scellé/neuf/en cours/monté, notes). Deux exemplaires
  d'un même set sont deux fiches.
- **Recherche, filtres, tri** : insensible aux accents, filtres thème, état, année (par
  décennie au-delà de 15 ans d'étalement) et « À compléter » (sans thème, année, pièces, état).
- **Ajout** : manuel, ou par numéro via l'API Rebrickable (nom, thème racine, année, pièces,
  image). Bouton « Chercher » aussi dans la modification d'une fiche.
- **Ajout par lot** : on colle des numéros, vérification avant écriture (trouvés, introuvables,
  doublons), une seule écriture. Sans clé Rebrickable, seuls les numéros sont ajoutés.
- **Stats** (design « D », novembre 2026) : cartes de chiffres clés, état en anneau, thèmes en blocs
  proportionnels (`src/lib/treemap.js`, les petits dans « Autres »), années en courbe, avancement du
  montage et pile à monter, activité sur 12 mois (achats, montages, ajouts, délai achat → montage), taille
  des sets (filtre « Taille »), emplacements, boîte et notice, étiquettes, records et repères, wishlist.
  Chaque forme qui mène à une liste est cliquable, et un test vérifie que chiffre et liste coïncident. La
  courbe et les colonnes par mois ne le sont pas (des dizaines de cibles de 48 px ne tiendraient pas). Les
  couleurs de données (`--serie-*`, `--echelle-*`) ont leurs contrastes mesurés dans `src/index.css`.
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
  existantes, filtre, recherche texte, ajout et retrait en masse (un set qui dépasserait 8 reste inchangé et
  l'aperçu le dit).
- **États** : scellé, neuf, en cours, monté. « Démonté » et « incomplet » ont été supprimés : un set qui
  les porte (collection ou import) passe à « non précisé » et un message le dit à l'ouverture.
- **Emplacements** : casse, accents et espaces ignorés (« Salon » = « salon »), affichés avec l'écriture la
  plus fréquente ; chaque set garde la sienne.
- **Badge ×2** sur les sets possédés en plusieurs exemplaires (liste et grille).
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
- **Feuilles refondues** (série en 5 PR) : toutes passent par `Sheet.jsx`, avec poignée, croix à la place de
  « Fermer », glissé vers le bas (limité à l'en-tête, le contenu garde son défilement) et actions toujours
  visibles (`pied`). Toutes les voies de fermeture (croix, fond, Échap, glissé) passent par une seule règle :
  si `modifie` est vrai, « Abandonner les changements ? » (formulaire, ajout rapide). Réglages en sections
  repliables.
  - *Emplacements par puces* (`ChoixEmplacement`) avec décompte, « Nouveau » pour un nom inédit, dans le
    formulaire, l'ajout rapide et la modification en masse ; « Ranger dans… » devient la ligne Emplacement de la
    fiche (`RangerSheet` : recherche au-delà de 8 emplacements, dernier utilisé en tête).
  - *Fiche « étiquette de boîte »* : bandeau jaune (numéro en badge, nom, thème), pièces, année et état en
    gros ; l'état (ou la priorité d'un set souhaité), l'emplacement, la boîte, la notice, les dates et les
    étiquettes se modifient sur place, un chevron marque les valeurs modifiables (`changerSet` dans
    `App.jsx`) ; un refus du modèle ou un dépassement s'affiche. « Plus d'options » ouvre le formulaire complet.
  - *Ajout rapide* (`AjoutRapide`) : le + ouvre numéro, emplacement et état ; « Ajouter » grisé tant que le
    numéro est invalide. Avec clé Rebrickable le nom est cherché ; sans clé (ou échec) il est facultatif et le set
    s'appelle « Set 75192 », comme l'ajout par lot. Un seul champ accepte un numéro ou un nom (la recherche par
    nom part après une pause de frappe) ; le rangement et l'état du dernier ajout sont repris (`bl_dernier_ajout`,
    hors export). « Plus d'options » ouvre le formulaire complet, en plein
    écran, avec les valeurs déjà saisies ; en modification, « Enregistrer » est grisé tant que rien n'a changé.
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
- **Photos de boîte** (novembre 2026) : les vignettes (liste, grille, fiche, aperçus) affichent la photo de la
  boîte chez BrickLink, `img.bricklink.com/ItemImage/ON/0/<numéro>.png` (`src/lib/boite.js`, `Vignette.jsx`).
  Rien n'est stocké : l'adresse se déduit du numéro. Si elle répond 404, repli sur le rendu Rebrickable puis sur
  le numéro. Vérifié sur 7 sets (200, `access-control-allow-origin: *`) ; ce n'est pas une API officielle, ses
  adresses peuvent changer. Les images pèsent 400 à 750 Ko : cache hors ligne séparé (`boites-sets`, 150
  entrées) et requête CORS pour que la taille réelle soit comptée. Dans la grille, la pastille d'état est sous
  l'image (le bas de la boîte porte numéro et pièces) et le nom prend deux lignes.
- **Photo personnelle d'un set** (novembre 2026, version 1) : sur la fiche, un sélecteur « Boîte | Ma photo »
  (la boîte reste l'affichage par défaut, les listes ne changent pas). « Prendre une photo » ouvre l'appareil
  photo (champ fichier avec `capture`, sans autorisation caméra), « Choisir dans la galerie » le sélecteur ;
  puis une feuille de recadrage 4:3 (glissé au doigt, curseurs de zoom et de position pour le clavier).
  Le JPEG est rendu en 1 024 × 768, qualité 0,8 (~100 Ko ; une photo source de 1,6 Mo donne 113 Ko). Stockage :
  IndexedDB (`bl_photos`, une entrée par fiche, clé = identifiant du set), hors de `bl_v1` mais dans l'export complet : `bl_v1` ne les
  contient pas. Calcul du recadrage et validation dans `src/lib/photos.js` (testés), canvas dans
  `photoNavigateur.js`, IndexedDB dans `photosDB.js`. Lecture validée (JPEG, 1 Mo au plus). Photos des sets
  disparus retirées **au démarrage seulement** (une suppression en masse s'annule juste après), et jamais si
  la collection est illisible. Tous les sets peuvent avoir une photo, wishlist comprise. *Limite* : si le
  navigateur vide ses données, les photos sont perdues (le set garde sa boîte BrickLink) sauf si on a exporté : l'export complet les contient ; un identifiant de
  set réattribué à l'import orpheline sa photo.
- **Boîtes gardées sur l'appareil** (novembre 2026, après une maintenance de BrickLink qui a fait disparaître les
  boîtes) : chaque photo de boîte affichée depuis BrickLink est recadrée en JPEG de 1 024 px au plus (une soixantaine
  de Ko) et enregistrée dans IndexedDB (base `bl_photos`, magasin `boites`, clé = numéro du set, version 2 de la base,
  la mise à jour garde les photos personnelles). L'affichage la prend **en premier** (`Vignette`, `useBoite`, contexte
  `ImagesContext`), puis BrickLink, puis le rendu Rebrickable, puis le numéro. Réglages > Images sur l'appareil : le nombre de
  boîtes et de rendus gardés et « Sauvegarder toutes les images » (boîtes d'abord, une par une, wishlist comprise ; s'arrête après trois échecs de suite
  sans réussite : BrickLink en maintenance). Hors export. Les boîtes dont le numéro n'est plus dans la collection sont
  retirées au démarrage. Les sets sans photo chez BrickLink sont **nommés** dans le message (« 2 sans photo chez BrickLink (Titanic (10294-1), …) », cinq au plus). Ne marche que pour les boîtes **déjà vues ou sauvegardées** : si BrickLink est en panne
  avant la première fois, il n'y a rien à garder. Ce n'est pas lié à l'export des photos personnelles (version 2).
- **Rendus Rebrickable gardés aussi** (novembre 2026) : le CDN de Rebrickable n'envoie pas d'en-tête CORS, un canvas ne
  peut donc pas les copier. La copie passe par le relais : `GET /image?url=<rendu>` (`relais/worker.js`), route volontairement
  étroite (hôte `cdn.rebrickable.com`, chemin `/media/sets/…`, jpg/png/webp, pas de redirection, 6 Mo au plus (2 Mo au départ, relevé le 13 novembre 2026 après un refus « trop grosse »), type
  `image/*` vérifié, même jeton, CORS limité à l'origine ; elle marche sans `BRICKSET_KEY`). Côté appli : magasin `rendus`
  d'IndexedDB (base `bl_photos` en version 3, clé = numéro), servi avant le rendu réseau ; « Sauvegarder toutes les
  images » les copie après les boîtes, et **exige l'adresse du relais dans Réglages** (sinon le message le dit). Une image
  refusée (trop grosse, illisible, absente) est comptée et **nommée** dans le message sans arrêter les suivantes ; seules les vraies pannes
  du relais (jeton refusé, relais injoignable, trois délais dépassés de suite) l'arrêtent (`arretRelais`). Aucune
  copie automatique à l'affichage : seulement par ce bouton. Hors export, purgés au démarrage comme les boîtes.
- **Réglages réorganisés et wishlist allégée** (novembre 2026, demandé par Antoni : « c'est le foutoir »). Les sept sections à plat
  deviennent quatre groupes : **Affichage** (Apparence), **Connexions** (Rebrickable, Relais « dates et prix »), **Données** (Sauvegarde,
  Importer un fichier, Images sur l'appareil), **À propos** (Mise à jour, version). Chaque section fermée affiche son état en une ligne
  (`resumeCle`, `resumeRelais`, `resumeSauvegarde`, `resumeImages` dans `src/lib/reglages.js`, testés) ; **une seule section s'ouvre à la
  fois** (Apparence est ouverte au départ). Aucune fonction ne change ; « Dates de sortie » devient « Relais (dates et prix) » car il sert
  aussi aux rendus. Sur la wishlist, les deux gros boutons sont retirés : « Mettre à jour dates et prix » vit dans Réglages > Relais,
  « Copier la liste » devient un bouton-icône à côté de la ligne « Total ». Parcours `verif:ui` : groupes, états, une seule section ouverte.
- **Notice LEGO** (novembre 2026) : sur la fiche d'un set **possédé**, une ligne « Notice LEGO » avec un lien « Ouvrir sur lego.com » (nouvel onglet,
  `noopener noreferrer`). L'adresse se déduit du numéro, sans suffixe de version : `https://www.lego.com/fr-fr/service/building-instructions/<numéro>`
  (`src/lib/notice.js`, testé ; format constaté sur des dizaines de pages indexées, **jamais ouvert depuis l'environnement de développement** : LEGO.com
  répond 403 aux clients automatiques). Rien n'est stocké ni exporté. Si LEGO change ses adresses, le lien mène à une page vide sans rien casser ; repli
  possible : l'appel `getInstructions` de l'API Brickset (URL de PDF), via le relais.
- **Prix officiel** (novembre 2026, demandé par Antoni ; exception au cadrage « pas de prix ») : wishlist seulement, en
  euros. Champs `prix` (0,01 à 10 000, arrondi au centime) et `prixSource` (`manuelle` ou `brickset-de`), validés dans le modèle
  comme la date de sortie (sans prix pas de source, un prix sans source est réputé manuel), pour les deux statuts mais affichés
  seulement en wishlist (le prix survit à « Acheté » et revient en cas de remise en wishlist). Logique pure et tests dans
  `src/lib/prix.js`. **Pas de source française** : Rebrickable n'a pas de prix, Brickset donne US, UK, CA et DE (pas FR), LEGO.fr n'a pas
  d'API publique et BrickLink/Brickfact donnent des prix du marché (non retenus). D'où : saisie à la main (fiche, ligne « Prix »,
  jamais écrasée) et pré-remplissage du **prix allemand** par le relais (`prixDE` dans la réponse de `/sortie`, lu depuis
  `LEGOCom.DE.retailPrice` d'après la documentation de Brickset, **jamais vu dans une vraie réponse**), marqué « DE » (pastille
  sur la carte, « prix DE » sur la fiche). Affichage : carte et tuile, fiche, **total** de la liste affichée (« 308,99 € · 1 sans
  prix », filtres pris en compte), tri « Prix croissant/décroissant » (sets sans prix en dernier), filtre par tranche (moins de 50 €,
  50 à 100, 100 à 200, 200 et plus, sans prix). Le bouton devient « Mettre à jour dates et prix » : un seul appel au relais par set,
  qui remplit les prix vides et rafraîchit les prix DE, **jamais un prix saisi à la main** (l'effacer rend la main à la mise à jour).
  Parcours `verif:ui` : total, pastille, saisie (valide et invalide), filtre, tri, pré-remplissage ; contrôle de non-vacuité fait
  (protection du prix manuel cassée exprès : le parcours échoue).
- **Sauvegarde complète avec les images** (novembre 2026) : « Exporter la collection » et « Partager la sauvegarde »
  mettent dans le même fichier JSON les sets **et toutes les images** (photos personnelles, boîtes gardées, rendus gardés),
  en base64, bloc `images: { photos: {<id du set>: …}, boites: {<numéro>: …}, rendus: {<numéro>: …} }` (`src/lib/imagesExport.js`,
  testé ; lecture/écriture dans `photosDB.js`). Un fichier sans `images` (ancienne version) s'importe comme avant, une ancienne
  version ignore le bloc. Poids : des dizaines de Mo pour 100 sets, même une sauvegarde rapide (choix d'Antoni : un seul fichier ;
  un bouton « sans les images » reste possible si ça gêne). À l'import : limite de 5 Mo gardée **sans** images, 200 Mo avec ;
  chaque image est une entrée non fiable (clé rattachée à un set du fichier, base64 strict, ≤ 1 Mo, début JPEG, puis décodage par
  le navigateur) ; une image **remplace** celle de l'appareil (choix d'Antoni) ; la collection est appliquée d'abord, puis les
  images, avec un décompte (« N images restaurées, M refusées »). Si les images ne se lisent pas à l'export, les sets partent quand
  même et le message le dit. Parcours `verif:ui` : semer une image par magasin, exporter, vider IndexedDB, réimporter, comparer.
- **Collection vers wishlist** (novembre 2026) : le sens inverse de « Acheté ». Sur la fiche d'un set possédé, un
  bouton « Remettre en wishlist » (sa propre ligne) ouvre une confirmation qui dit ce qui sera perdu pour ce set
  (« état « monté », emplacement « Salon », date d'achat… ») et laisse choisir la priorité (aucune par défaut) ; en
  sélection multiple, l'action « Wishlist » de la barre ouvre un aperçu chiffré (« état (2 sets), emplacement (1 set) »)
  avec la même priorité pour tous. L'état, l'emplacement, la boîte, la notice et les dates d'achat et de montage sont
  **effacés** (le modèle les efface déjà pour tout set souhaité) ; les étiquettes, notes, image, choix de l'image de la
  liste, date de sortie et la photo personnelle sont gardés. Annulation juste après par le bandeau existant (les
  modifications en masse), qui rend tout, état et dates compris. Un set en deux exemplaires n'en transfère qu'un. Logique
  dans `src/lib/collection.js` (`champsPerdus`, `remettreEnWishlist`, `apercuRemiseEnWishlist`), testée. Écarté : garder
  l'état et l'emplacement cachés pour les rendre à l'achat suivant (bien plus de code, risque de données périmées).
- **Dates de sortie** (novembre 2026) : champ `dateSortie` (AAAA-MM-JJ, l'avenir est permis jusqu'à dix ans) et
  `sortieSource` (`manuelle` ou `brickset`) dans la fiche, donc dans l'export. Saisie à la main sur la fiche (ligne
  « Sortie », « Inconnue » sans date) : une date manuelle n'est **jamais écrasée** par une mise à jour ; l'effacer
  rend la main à Brickset. La carte d'un set pas encore sorti dit « Sort le 1 janv. 2027 · dans 57 jours » (« Sort
  dans 57 jours » en grille). Tri « Date de sortie » (prochaine sortie, puis déjà sortis du plus récent, puis sans
  date) et filtre « Sortie » (à venir, déjà sorti, date inconnue). `src/lib/sortie.js` et `relais.js`, testés.
  **Mise à jour automatique** : bouton « Mettre à jour dates et prix » (Réglages > Relais ; il n'est plus sur la wishlist) qui interroge, un set après l'autre, ceux sans date ou pas encore sortis, wishlist et collection, par le
  relais Brickset ; arrêt à la première panne (clé refusée, limite quotidienne, relais injoignable) ; une seule
  écriture à la fin ; « n dates enregistrées, n inconnues chez Brickset ». L'adresse du relais et son jeton
  facultatif sont dans Réglages (`bl_relais`, hors export). Le relais est dans `relais/` (Cloudflare Worker, clé
  Brickset en secret, CORS limité au site, voir `relais/README.md`).
  **État au 5 novembre 2026 : Antoni a reçu sa clé Brickset ; le relais n'est pas encore déployé et la vraie réponse
  de Brickset n'a jamais été vue** (format exact des dates, limite quotidienne, gratuité de la clé à confirmer). À
  faire : déployer le Worker (étapes dans `relais/README.md`), tester `/sortie?numero=72051-1`, saisir l'adresse dans
  Réglages, appuyer sur « Mettre à jour les dates » ; si la réponse diffère de ce qui est attendu, ajuster
  `lireBrickset` dans `relais/worker.js`. Tout le reste est vérifié avec un relais simulé (`verif:ui`).
- **Image de la liste** (novembre 2026) : trois images possibles par set (boîte BrickLink, rendu Rebrickable,
  ma photo) et un choix de celle qui le représente dans la liste et la grille. Sur la fiche, trois onglets
  (Rendu seulement si le set en a un) et un bouton « Utiliser dans la liste » sous l'image affichée ; une étoile
  marque l'onglet choisi, un second appui revient à « automatique ». Le choix est un champ de la fiche
  (`imageListe` : `boite`, `rendu`, `photo` ou null), donc dans la collection et dans l'export ; une valeur
  inconnue devient null et est comptée à la validation. Pour les sets sans choix, une **règle** dans Réglages >
  Apparence (`bl_image_liste`, hors export) : « Boîte, sinon rendu » (défaut, comportement d'avant), « Ma photo
  quand elle existe » ou « Rendu Rebrickable ». `src/lib/imageListe.js` décide (`choisirImage`, testé) ; les cartes
  lisent les identifiants des sets qui ont une photo une seule fois (`idsPhotos`, `ImagesContext`) et ne lisent le
  JPEG que des sets dont la photo s'affiche. Une photo voulue mais absente retombe sur la boîte ; retirer la photo
  remet le set en automatique. Écartés pour l'instant : choix en sélection multiple, plusieurs photos par set.
- **Filtres et tri retenus, par onglet** : collection et wishlist ont chacune leurs filtres et leur tri, gardés
  au rechargement (`bl_filtres`, hors export, `src/lib/filtresMemo.js`, entrée validée ; l'ancien format à un
  seul jeu est lu). La recherche texte n'est pas retenue et se vide au changement d'onglet. Un raccourci des
  Stats remplace les filtres de la collection.
- **Qualité** : `npm run lint`, `npm test` (425 tests, dont ceux du relais), `npm run verif:ui` (axe-core, cibles de
  48 px, débordements, navigation, recherche visible clavier ouvert, et quatre parcours qui vérifient un
  comportement : filtres conservés au rechargement, onglets indépendants, import d'un `.txt`, repli des
  boîtes, photo personnelle (enregistrée, relue, retirée), image de la liste (fiche et règle), dates de sortie (affichage, filtre, saisie, relais), remise en wishlist (fiche et sélection, avec annulation), boîtes gardées (sauvegarde, service hors BrickLink, arrêt en maintenance), rendus gardés par le relais, sauvegarde complète avec images (export, vidage, restauration) ; 72 écrans × 2 thèmes × 4
  largeurs : 360, 412, 900, 1280). Les trois tournent dans le CI avant le déploiement.

## Décisions de cadrage (ne pas rouvrir sans raison)

Pas de minifigs, de pièces détachées, de prix du marché ni payé, ni d'APK (seul le prix officiel de la wishlist existe, voir « Prix officiel »). Sauvegarde par export manuel (la
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
- **Idées écartées** : photos personnelles de boîtes comme source des boîtes (BrickLink les
  fournit ; la photo personnelle sert au set monté, voir plus haut), synchronisation serveur, valorisation et mode vente.

### Reste à décider ou à faire

0. **Idées retenues, pas encore faites** (ordre à choisir par Antoni) :
   - **Export CSV** en plus du JSON : séparateur point-virgule, BOM UTF-8 pour l'Excel français ; une copie à
     lire, pas ré-importable, sans la clé Rebrickable.
   - **Tirage au sort** « quoi monter ce week-end » parmi scellés, neufs et en cours.
   - **Export des photos** : fait (novembre 2026), dans le fichier d'export lui-même et pour toutes les images (voir
     « Sauvegarde complète avec les images »). Les photos ne tiennent ni dans un lien ni dans un QR.
   - **Transfert entre téléphone et PC** (Antoni transfère « parfois », collection sous 100 sets) : essayer
     d'abord ce qui existe, **Partager** (Partage rapide Android vers Windows) puis **Importer un fichier**,
     sans code. Si le geste pèse : **lien** (collection compressée dans la partie après le `#`, que GitHub
     Pages ne reçoit pas ; aperçu puis Fusionner à l'ouverture ; entrée validée ; « lien incomplet » si une
     messagerie le coupe) et **QR allégé** (sans identifiants ni images, mesuré ~0,9 Ko pour 40 sets
     fictifs, à confirmer sur la vraie collection ; un QR contient au plus ~2,9 Ko). Le QR ne sert que du PC
     vers le téléphone (l'appareil photo lit l'écran) : Chrome sur Windows n'a pas de lecteur de QR. Dépendance
     ajoutée : un petit générateur de QR. Écartés : WebRTC (fragile), serveur à nous (contraire au cadrage).
   - **Synchronisation entre téléphone et PC** (plus lourde, seulement si le transfert devient fréquent) : à faire en
     deux temps. D'abord une date de modification par fiche et une trace des suppressions, avec une
     fonction de fusion pure (la plus récente gagne ; suppressions jamais propagées sans
     confirmation, choix d'Antoni) ; ensuite la synchro via l'API Google Drive (dossier réservé à
     l'app, projet Google Cloud à créer par Antoni, identifiant client saisi dans les Réglages,
     jamais dans le dépôt). Manuelle, avec résumé avant écriture, annulation et export préalable.
   - Rappel : fusion **automatique après CI verte** (choix d'Antoni), sauf si une donnée peut être perdue :
     alors on demande, et on rappelle d'exporter d'abord.

1. **Photographier une boîte (Brickognize)** : Antoni a répondu « je ne sais pas » sur l'envoi
   des photos. Si on la fait : option **désactivée par défaut** dans les Réglages avec
   l'avertissement ci-dessus, envoi seulement après un geste explicite, liste de candidats avec
   score à confirmer avant tout ajout. **Avant de coder, tester sur quelques vraies boîtes** :
   si la bonne n'est pas dans les trois premières dans la plupart des cas, abandonner.
2. **Vraies images de boîtes** : faites, via BrickLink (voir « Photos de boîte »). Brickset, qui donnait
   le même rendu que Rebrickable et n'a pas de CORS, n'est plus nécessaire.
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
- Les photos de boîte viennent de BrickLink, sans accord ni API officielle : si leurs adresses changent,
  l'app retombe sur le rendu Rebrickable puis sur le numéro, sans erreur visible (à surveiller à la main).
- Pas de couleurs dynamiques Material You : à ma connaissance une page web n'y a pas accès (non vérifié
  sur une source officielle). La palette est fixe, sombre par défaut et claire au choix.
- Pas de bouton flottant « étendu » (avec le mot « Ajouter ») sur téléphone : l'icône seule suffit, avec
  le nom accessible « Ajouter un set ». Sur grand écran, le mot est affiché.
- Les images (boîtes comme rendus) ont un fond blanc intégré : elles restent sur un panneau blanc, même en thème sombre.
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
