# Bricks-List — règles du projet

Collection personnelle de sets LEGO (React 19 + Vite, PWA sur GitHub Pages).
Cibles : Chrome sur Android (Galaxy S26 Ultra) et sur Windows. Pas d'APK, pas de
minifigs, pas de pièces détachées, pas de prix du marché ni de prix payé (décisions de cadrage). Seule exception,
demandée par Antoni en novembre 2026 : le prix officiel (public, en euros) des sets de la wishlist.

Où on en est et ce qui reste à faire : `docs/SUITE.md` (état complet) et `docs/TODO.md` (reprise de session : par quoi
commencer).

## Commandes

- `npm run dev` : serveur de développement.
- `npm run lint` (oxlint) et `npm test` : à passer avant tout commit.
- `CHROMIUM=/opt/pw-browsers/chromium npm run verif:ui` : construit, puis parcourt chaque
  écran (2 thèmes × 4 largeurs) : accessibilité axe-core, cibles de 48 px, débordements,
  navigation. À passer pour tout changement d'interface ; il bloque aussi le CI.
- `CHROMIUM=/opt/pw-browsers/chromium npm run icones` : régénère les icônes PNG
  depuis `public/favicon.svg`.

## Conventions

- Commentaires en français qui expliquent le **pourquoi**, pas ce que la ligne fait.
- Un module de `src/lib/` a son `*.test.mjs` à côté. La logique pure vit dans
  `src/lib/`, ce qui touche au réseau reste mince (`api.js`).
- Couleurs et tailles par jetons CSS (`src/index.css`), jamais de valeur en dur. Chaque
  jeton existe dans le thème sombre (défaut) et dans `html[data-theme='light']`, avec son
  contraste mesuré en commentaire. Le jaune en texte (`--accent`) n'est pas le jaune en
  aplat (`--accent-fond`) : le premier doit rester lisible sur fond clair.
- De vrais `<button>`, jamais de `<div onClick>` ; cibles tactiles d'au moins 48 px.
- Textes de l'interface : une phrase, la plus courte possible, sans perdre l'action utile à corriger une erreur.
- Une écriture qui peut échouer (stockage, réseau) doit se voir à l'écran.
- Toute donnée venue d'un fichier ou du stockage est validée comme entrée non fiable.

## Façon de travailler

- Branche `claude/…`, commits descriptifs, PR en brouillon, fusion par squash.
- Proposer d'abord, attendre un « ok » explicite avant de modifier quoi que ce soit.
- Exporter la collection avant toute opération destructive.

## Limites de sécurité

- Jamais de clé dans la conversation ni dans le dépôt : la clé Rebrickable se saisit
  dans les réglages de l'app et reste dans le stockage de l'appareil.
- Ne jamais commiter un export de collection ou un `.env`.
