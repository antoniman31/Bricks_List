# Bricks-List

Collection personnelle de sets LEGO : catalogue, wishlist et statistiques.
Application React + Vite installable en PWA, sans backend. Les données restent
dans le navigateur et s'exportent en JSON.

**En ligne** : https://antoniman31.github.io/Bricks_List/ (Chrome sur Android et sur Windows).

## Ce que fait l'app

- **Deux onglets** : *Collection* (sets possédés) et *Wishlist* (sets souhaités), plus les *Stats*.
- **Ajout rapide** : un champ pour le numéro ou le nom (« 75192 », « falcon »), le rangement et
  l'état repris du dernier ajout. *Plus d'options* ouvre le formulaire complet ; *Plusieurs* ajoute
  une liste de numéros d'un coup.
- **Photos de boîte** : affichées partout, déduites du numéro (BrickLink). Chaque boîte vue est gardée sur
  l'appareil (hors export) : une panne de BrickLink ne la fait plus disparaître. Réglages > Photos de boîte les
  sauvegarde toutes. Repli sur le rendu Rebrickable puis sur le numéro.
- **Ma photo** : sur la fiche, un sélecteur « Boîte | Rendu | Ma photo » ; photo de l'appareil ou de la galerie,
  recadrée en 4:3 et gardée sur l'appareil (hors export). Un bouton choisit l'image du set dans la liste ;
  une règle dans Réglages décide pour les autres (boîte, ma photo quand elle existe, rendu).
- **Dates de sortie** : à saisir sur la fiche, ou à récupérer automatiquement de Brickset par un petit relais à toi
  (`relais/`, étapes dans son README). Un set pas encore sorti dit quand (« Sort dans 57 jours ») ; tri et filtre
  « À venir ».
- **Fiche** : bandeau jaune avec le numéro et le nom, puis pièces, année et état en gros. Emplacement,
  boîte, notice, dates d'achat et de montage, étiquettes se modifient sur place, d'un appui.
  Un « ×2 » signale un set possédé en plusieurs exemplaires.
- **Retrouver un set** : recherche, filtres (thème, état, année, taille, emplacement, étiquette, boîte,
  notice, priorité, fiches à compléter), tri, vue liste ou grille, regroupement par emplacement
  (« Salon » et « salon » sont le même). Collection et wishlist gardent chacune leurs filtres et leur tri,
  même après un rechargement.
- **Modifier plusieurs sets** : sélection, changement en masse (rangement, état, boîte, notice,
  étiquettes à ajouter ou retirer), suppression, avec annulation juste après.
- **Wishlist** : priorité (forte, un jour, pas pressé), « Acheté » qui bascule le set dans la collection (et
  « Remettre en wishlist » pour l'inverse, avec confirmation, choix de la priorité et annulation),
  copie de la liste en texte.
- **Statistiques** : chiffres clés, état en anneau, thèmes en blocs, années en courbe, avancement du
  montage et pile à monter, activité sur 12 mois, taille des sets, étiquettes, records, wishlist.
  Les formes qui mènent à une liste sont cliquables.
- **Thème** automatique, clair ou sombre ; boutons de 48 px, accessibilité vérifiée.

### États d'un set possédé

`scellé`, `neuf`, `en cours`, `monté`. L'état n'existe pas pour un set souhaité (il a une priorité à la place).

### Rebrickable

Le numéro ou le nom d'un set remplit nom, thème, année, pièces et image depuis [Rebrickable](https://rebrickable.com/api/).
La clé API se saisit dans **Réglages** : elle reste dans le stockage de l'appareil, n'est jamais exportée
ni envoyée ailleurs qu'à Rebrickable. Sans clé, tout fonctionne à la main (le nom devient facultatif).

### Sauvegarde

- **Exporter** la collection en JSON (sans la clé), **partager** la sauvegarde (avec repli en `.txt`).
- **Importer** : fusion avec l'existant ou remplacement (avec export proposé avant).
- Un rappel s'affiche après 30 jours sans sauvegarde ; Réglages indique si le stockage est protégé.
- Les données lues du stockage ou d'un fichier sont validées comme entrées non fiables ; ce qui est corrigé
  ou ignoré est annoncé.

### Installation et mises à jour

« Installer l'application » depuis Chrome. Une nouvelle version s'applique en rechargeant la page ; un
bandeau le propose si l'app est restée ouverte, et Réglages a un bouton *Vérifier les mises à jour*.
La version affichée en bas des Réglages est le commit déployé.

## Données locales

Tout est dans le `localStorage`. Seule la collection est exportée.

| Clé | Contenu |
| --- | --- |
| `bl_v1` | la collection |
| base IndexedDB `bl_photos` | les photos personnelles et les photos de boîte gardées (hors export) |
| `bl_rebrickable` | la clé Rebrickable (jamais exportée) |
| `bl_relais` | adresse du relais Brickset et jeton facultatif (jamais exportés) |
| `bl_themes`, `bl_derniere_sauvegarde`, `bl_partage_texte`, `bl_theme`, `bl_vue`, `bl_dernier_ajout`, `bl_filtres` | cache de thèmes Rebrickable, date de sauvegarde, repli de partage, thème, liste/grille, dernier rangement, onglet et filtres par onglet |

## Développement

```
npm install
npm run dev          # serveur de développement
npm run lint         # oxlint
npm test             # tests unitaires (node --test)
CHROMIUM=/opt/pw-browsers/chromium npm run verif:ui
CHROMIUM=/opt/pw-browsers/chromium npm run icones   # régénère les icônes PNG depuis public/favicon.svg
```

`verif:ui` construit l'app puis parcourt chaque écran en 2 thèmes × 4 largeurs (360, 412, 900, 1280 px) :
accessibilité (axe-core), cibles de 48 px, débordements, navigation, et quelques parcours qui vérifient un
comportement (filtres conservés, import, repli des images). Lint, tests et `verif:ui` tournent
dans le CI avant chaque déploiement. Adapter `CHROMIUM` au chemin du navigateur local.

### Organisation

- `src/lib/` : logique pure (modèle, filtres, stats, import/export, dates…), chaque module avec son
  `*.test.mjs`. Ce qui touche au réseau reste mince (`api.js`).
- `src/components/` : écrans et feuilles ; `src/App.jsx` : état et navigation.
- `src/index.css` : couleurs et tailles par jetons, avec leur contraste mesuré, en thème sombre et clair.
- `scripts/` : vérification d'interface et génération des icônes.

Conventions et façon de travailler : [`CLAUDE.md`](CLAUDE.md). État d'avancement, décisions de cadrage
(pas d'APK, de minifigs, de pièces détachées ni de prix) et idées à venir : [`docs/SUITE.md`](docs/SUITE.md).

## Déploiement

GitHub Pages, à chaque fusion sur `main` si le CI est vert. L'app est servie sous `/Bricks_List/`.

## Licences

Police [Fredoka](https://fonts.google.com/specimen/Fredoka) (SIL OFL), icônes
[Material Symbols](https://github.com/google/material-design-icons) (Apache-2.0), données de sets de Rebrickable.
