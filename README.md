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
- **Fiche** : numéro, nom, thème, année, pièces, image, état, emplacement, boîte, notice, dates
  d'achat et de montage, étiquettes, notes. Tout se modifie sur place, d'un appui.
- **Retrouver un set** : recherche, filtres (thème, état, année, emplacement, étiquette, boîte,
  notice, priorité, fiches à compléter), tri, vue liste ou grille, regroupement par emplacement.
- **Modifier plusieurs sets** : sélection, changement en masse, suppression, avec annulation juste après.
- **Wishlist** : priorité (forte, un jour, pas pressé), « Acheté » qui bascule le set dans la collection,
  copie de la liste en texte.
- **Statistiques** : sets, pièces, répartition par thème, année et état ; chaque barre ouvre la liste filtrée.
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
| `bl_rebrickable` | la clé Rebrickable (jamais exportée) |
| `bl_themes`, `bl_derniere_sauvegarde`, `bl_partage_texte`, `bl_theme`, `bl_vue`, `bl_dernier_ajout` | cache de thèmes Rebrickable, date de sauvegarde, repli de partage, thème, liste/grille, dernier rangement |

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
accessibilité (axe-core), cibles de 48 px, débordements, navigation. Lint, tests et `verif:ui` tournent
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
