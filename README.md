# Bricks-List

Collection personnelle de sets LEGO : catalogue, wishlist et statistiques.
Application React + Vite installable en PWA, sans backend ; les données vivent
dans le `localStorage` du navigateur et s'exportent en JSON.

## Feuille de route

1. **Socle** (fait) : ajout par numéro de set (Rebrickable), liste, recherche,
   filtres, fiche, wishlist, export/import JSON.
2. **Statistiques** (fait) : sets, pièces, répartition par thème, année et état,
   fiches à compléter ; chaque barre ouvre la liste filtrée correspondante.
3. **Scan de code-barres** (Chrome Android, `BarcodeDetector` + Brickset).

## Développement

```
npm install
npm run dev
npm run lint && npm test
npm run verif:ui    # accessibilité, cibles tactiles, débordements, 2 thèmes × 3 largeurs
```

Le site se déploie sur GitHub Pages à chaque fusion sur `main`.
