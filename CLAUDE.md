# Bricks-List — règles du projet

## Règles communes (le même bloc dans tous les dépôts d'Antoni, existants et futurs : le modifier ici, c'est le modifier partout)

Décidées par Antoni le 16/11/2026, mises à jour le 21/11/2026. Les règles propres à ce dépôt suivent ce bloc ; en cas de conflit, ce bloc l'emporte.

- **Avec Antoni** : français, tutoiement, réponses courtes, franches, sans flatterie. Il est seul utilisateur (Galaxy S26 Ultra, PC Windows).
- **Proposer d'abord** : présenter un plan détaillé (étapes, fichiers touchés, approche) et ses propres suggestions d'amélioration, attendre un « ok » explicite avant de toucher quoi que ce soit, ne jamais régénérer un fichier de son propre chef. « Pose des questions » veut dire `AskUserQuestion`, avec des choix concrets et un recommandé. Pour une nouvelle fonctionnalité ou une modification de fonctionnalité ou de design : proposer sans coder, poser des questions si besoin et proposer des visuels (maquette HTML simple sans canvas, ou schéma ASCII).
- **Fusion** : PR en brouillon, fusion par squash **seulement sur le « go » d'Antoni**, CI verte. Jamais de fusion de sa propre initiative, même verte.
- **Une PR, un sujet** : une PR ne traite qu'un sujet ; une correction annexe repérée en route est signalée, pas glissée dedans.
- **Branche** : celle que la session impose. Aucun nom de branche n'est écrit dans ce dépôt : l'environnement le change à chaque session.
- **Identité de commit** : `AntoniMan31 <268696974+antoniman31@users.noreply.github.com>`. Jamais l'adresse personnelle d'Antoni : GitHub refuse le push qui l'expose.
- **Noms de modèle** : autorisés (ligne de co-auteur des commits comprise).
- **Secrets** : jamais de clé, de jeton ni de mot de passe dans le dépôt ou la conversation ; ils se saisissent dans l'application ou dans les secrets GitHub/Cloudflare. Jamais d'export de données personnelles ni de `.env` commité.
- **Rien de payant, rien qui piste** : aucun service payant sans l'accord d'Antoni ; ni traqueur, ni statistiques d'usage, ni script ou police chargés depuis un serveur tiers à l'exécution (les appels aux API dont l'appli a besoin restent permis).
- **Tests** : le lint et les tests du dépôt passent avant chaque commit. Un test ne compte qu'après l'avoir **vu échouer** sur le code d'avant. Jamais affaiblir un contrôle pour obtenir du vert (test sauté, seuil baissé, exception sans raison écrite).
- **CI, trois niveaux** : *rapide* (lint, tests unitaires, données) à chaque PR ; *lourd* (navigateur, e2e, Windows, compilation Android) seulement si la PR touche autre chose que des `.md`, sinon le job est marqué « sauté », jamais retiré ; *appareil réel* : une PR qui touche l'interface finit par une courte liste « à vérifier sur le S26 ou le PC ». Sur `main`, tout tourne toujours. Une seule CI par PR. Un test qui échoue au hasard a droit à une relance, puis on en cherche la cause.
- **Interface** : de vrais boutons (jamais un `div` cliquable) ; dans une appli utilisée au doigt, **zones tactiles d'au moins 48 px** (48 dp sous Android) ; contraste et focus vérifiés par l'outil du dépôt.
- **Design** : chaque projet garde son identité visuelle mais partage le même socle : couleurs, tailles et espacements par jetons, jamais en dur ; au moins deux thèmes, clair et sombre, qui suivent le réglage du système et se changent dans l'appli ; contraste du texte d'au moins 4,5:1 (AA), mesuré par l'outil du dépôt ; focus toujours visible ; animations coupées quand le système demande de les réduire ; un message d'erreur dit ce qui s'est passé et comment corriger, en une phrase. Une appli hors navigateur (Android, bureau) l'applique avec les moyens de sa plateforme.
- **Robustesse** : une écriture qui peut échouer (stockage, réseau) se voit à l'écran ; toute donnée venue d'un fichier, du stockage ou du réseau est une entrée non fiable. Exporter les données avant toute opération destructive.
- **Heure de Paris** : toute date ou heure affichée, écrite ou calculée l'est en heure de Paris (`Europe/Paris`) ; les changements d'heure sont testés.
- **Versions et API** : vérifier dans la doc officielle les versions à jour avant d'utiliser une librairie ou une API ; jamais de code déprécié sans le signaler.
- **Dépendances** : toute nouvelle librairie ou nouveau service se demande d'abord ; la bibliothèque standard et ce qui est déjà installé passent en premier.
- **Contradiction** : si une demande contredit une règle de ce fichier, le signaler avant d'appliquer.
- **Règles à jour** : avant chaque nouvelle tâche, `git fetch origin`, puis relire le bloc « Règles communes » de `CLAUDE.md` sur la branche par défaut (`git show origin/<branche par défaut>:CLAUDE.md`) ; s'il a changé, appliquer la nouvelle version et le dire en une phrase.
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
  écran en parallèle (4 copies, environ 6 min) : accessibilité axe-core, cibles de 48 px, débordements, navigation, dans les 2 thèmes à 360, 900 et 1280 px ; les parcours qui vérifient un comportement (`exiger`) ne passent qu'en 360 et 1280 px, dans les 2 thèmes. `verif:ui:serie` : une seule copie, plus lent, pour comprendre un échec. Le CI le découpe en 4 jobs, sautés sur une PR qui ne touche que des `.md`. En local, pour une modification d'interface, jouer au moins les parcours touchés (`VERIF_FILTRE=texte`) ; le contrôle complet est celui du CI, qui bloque la fusion : accessibilité axe-core, cibles de 48 px, débordements,
  navigation. À passer pour tout changement d'interface ; il bloque aussi le CI.
- `CHROMIUM=/opt/pw-browsers/chromium npm run icones` : régénère les icônes PNG
  depuis `public/favicon.svg`.

## Conventions

- Un module de `src/lib/` a son `*.test.mjs` à côté. La logique pure vit dans
  `src/lib/`, ce qui touche au réseau reste mince (`api.js`).
- La CSP est écrite à la construction par `src/lib/csp.js` (empreinte du script du thème recalculée à chaque build) ;
  `verif:ui` compte tout refus de la CSP comme un écart.
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
