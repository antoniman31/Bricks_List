# Bricks-List — règles du projet

## Règles communes (le même bloc dans les 8 dépôts d'Antoni : le modifier ici, c'est le modifier partout)

Décidées par Antoni le 16/11/2026. Les règles propres à ce dépôt suivent ce bloc ; en cas de conflit, ce bloc l'emporte.

- **Avec Antoni** : français, tutoiement, réponses courtes, franches, sans flatterie. Il est seul utilisateur (Galaxy S26 Ultra, PC Windows).
- **Proposer d'abord** : décrire le changement, attendre un « ok » explicite avant de toucher quoi que ce soit, ne jamais régénérer un fichier de son propre chef. « Pose des questions » veut dire `AskUserQuestion`, avec des choix concrets et un recommandé.
- **Fusion** : PR en brouillon, fusion par squash **seulement sur le « go » d'Antoni**, CI verte. Jamais de fusion de sa propre initiative, même verte.
- **Branche** : celle que la session impose. Aucun nom de branche n'est écrit dans ce dépôt : l'environnement le change à chaque session.
- **Identité de commit** : `AntoniMan31 <268696974+antoniman31@users.noreply.github.com>`. Jamais l'adresse personnelle d'Antoni : GitHub refuse le push qui l'expose.
- **Noms de modèle** : autorisés (ligne de co-auteur des commits comprise).
- **Secrets** : jamais de clé, de jeton ni de mot de passe dans le dépôt ou la conversation ; ils se saisissent dans l'application ou dans les secrets GitHub/Cloudflare. Jamais d'export de données personnelles ni de `.env` commité.
- **Tests** : le lint et les tests du dépôt passent avant chaque commit. Un test ne compte qu'après l'avoir **vu échouer** sur le code d'avant. Jamais affaiblir un contrôle pour obtenir du vert (test sauté, seuil baissé, exception sans raison écrite).
- **Interface** : de vrais boutons (jamais un `div` cliquable) ; dans une appli utilisée au doigt, **zones tactiles d'au moins 48 px** (48 dp sous Android) ; contraste et focus vérifiés par l'outil du dépôt.
- **Robustesse** : une écriture qui peut échouer (stockage, réseau) se voit à l'écran ; toute donnée venue d'un fichier, du stockage ou du réseau est une entrée non fiable. Exporter les données avant toute opération destructive.
- **Écrit** : commentaires en français qui disent **pourquoi** ; aucun chiffre écrit sans l'avoir mesuré ; ne jamais écrire « ça marche » pour ce qui n'a pas tourné sur l'appareil réel.
- **Suivi, trois fichiers à la racine** : `README.md` dit l'**état actuel** ; `JOURNAL.md` garde l'**histoire** (chaque lot s'y ajoute en fin de fichier, sous `### Titre — jj/mm/aaaa`) ; `RESTE-A-FAIRE.md` dit **ce qui reste**, mis à jour à chaque lot. Un fichier de suivi retiré part en entier dans `JOURNAL.md`, sous « Ancien X.md ».

## Règles propres à ce dépôt

Collection personnelle de sets LEGO (React 19 + Vite, PWA sur GitHub Pages).
Cibles : Chrome sur Android (Galaxy S26 Ultra) et sur Windows. Pas d'APK, pas de
minifigs, pas de pièces détachées, pas de prix du marché ni de prix payé (décisions de cadrage). Seule exception,
demandée par Antoni en novembre 2026 : le prix officiel (public, en euros) des sets de la wishlist.

Où on en est : `RESTE-A-FAIRE.md` (reprise de session : par quoi commencer) et `JOURNAL.md` (l'histoire et le détail
de chaque fonction, des décisions et des limites ; anciennement `docs/SUITE.md`).

## Commandes

- `npm run dev` : serveur de développement.
- `npm run lint` (oxlint) et `npm test` : à passer avant tout commit.
- `CHROMIUM=/opt/pw-browsers/chromium npm run verif:ui` : construit, puis parcourt chaque
  écran en parallèle (4 copies, environ 6 min) : accessibilité axe-core, cibles de 48 px, débordements, navigation, dans les 2 thèmes à 360, 900 et 1280 px ; les parcours qui vérifient un comportement (`exiger`) ne passent qu'en 360 et 1280 px, dans les 2 thèmes. `verif:ui:serie` : une seule copie, plus lent, pour comprendre un échec. Le CI le découpe en 4 jobs. En local, pour une modification d'interface, jouer au moins les parcours touchés (`VERIF_FILTRE=texte`) ; le contrôle complet est celui du CI, qui bloque la fusion : accessibilité axe-core, cibles de 48 px, débordements,
  navigation. À passer pour tout changement d'interface ; il bloque aussi le CI.
- `CHROMIUM=/opt/pw-browsers/chromium npm run icones` : régénère les icônes PNG
  depuis `public/favicon.svg`.

## Conventions

- Un module de `src/lib/` a son `*.test.mjs` à côté. La logique pure vit dans
  `src/lib/`, ce qui touche au réseau reste mince (`api.js`).
- Couleurs et tailles par jetons CSS (`src/index.css`), jamais de valeur en dur. Chaque
  jeton existe dans le thème sombre (défaut) et dans `html[data-theme='light']`, avec son
  contraste mesuré en commentaire. Le jaune en texte (`--accent`) n'est pas le jaune en
  aplat (`--accent-fond`) : le premier doit rester lisible sur fond clair.
- Textes de l'interface : une phrase, la plus courte possible, sans perdre l'action utile à corriger une erreur.

## Façon de travailler

- Commits descriptifs ; compter les tests et les écrans de `verif:ui` dans `JOURNAL.md` (ligne « Qualité ») à chaque PR.
- Un contrôle qui casse le code exprès (non-vacuité) ne doit jamais être commité : restaurer avant tout commit.

## Limites de sécurité

- La clé Rebrickable se saisit dans les réglages de l'app et reste dans le stockage de l'appareil ; celle de
  Brickset dans les secrets du Worker `bricks-relais`.
