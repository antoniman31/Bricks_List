# Relais Brickset (dates de sortie)

Un Cloudflare Worker minuscule (`worker.js`, un seul fichier) qui donne à l'application la date de sortie
d'un set. Il existe parce que l'API de Brickset n'envoie pas d'en-têtes CORS : un navigateur ne peut pas
l'appeler directement. Le relais l'appelle à sa place, avec ta clé Brickset gardée **en secret chez Cloudflare**
(jamais dans l'application, jamais dans ce dépôt, jamais dans une conversation).

```
GET /sortie?numero=75192-1
-> { "numero": "75192-1", "trouve": true, "lancement": "2017-10-01", "retrait": "2023-12-31", "disponibilite": "Retired", "prixDE": 849.99, "sousTheme": "Ultimate Collector Series" }
```

`prixDE` est le prix public allemand en euros (`LEGOCom.DE.retailPrice` chez Brickset), `null` s'il manque ; la France n'a pas de prix chez Brickset.

`sousTheme` : le sous-thème de Brickset ; `""` s'il n'en a pas (à ne pas redemander), `null` si le champ manque.

`lancement` vaut `null` quand Brickset n'a pas de date : l'application affichera alors « date inconnue ».

```
GET /notices?numero=75192-1
-> { "numero": "75192-1", "trouve": true, "notices": [{ "url": "https://www.lego.com/…pdf", "description": "…" }] }
```

Les notices PDF de Brickset (`getInstructions2`, un appel par demande, comptés dans la limite de 100 par jour). Seules les adresses https chez
`lego.com` ou `brickset.com` sont gardées, 12 au plus. **Les noms de champs de la réponse suivent la documentation et n'ont jamais été vus dans une
vraie réponse** : si la réponse réelle diffère, la fiche affiche « Aucune notice chez Brickset » ; ouvrir `/notices?numero=75192-1` dans le navigateur
(sans clé à saisir, elle est côté Cloudflare) montre ce que le relais renvoie.

```
GET /galerie?numero=75192-1
-> { "numero": "75192-1", "trouve": true, "images": [{ "url": "https://…jpg", "miniature": "https://…jpg" }] }
```

Les images supplémentaires de Brickset (`getSets` pour l'identifiant interne, puis `getAdditionalImages` : **deux appels Brickset** dans la limite de 100 par jour). L'application l'appelle sur appui (« Chercher les images Brickset » sur la fiche d'un set). Vue en vrai le 14 novembre 2026 : 28 images pour le Faucon, `images.brickset.com`, noms `imageURL` et `thumbnailURL`. Mêmes adresses autorisées que pour les notices.

Quatrième route, sans lien avec Brickset (elle marche même sans `BRICKSET_KEY`) :

```
GET /image?url=https://cdn.rebrickable.com/media/sets/75192-1.jpg   ->  l'image (jpeg, png ou webp, 6 Mo au plus)
   (aussi : https://images.brickset.com/sets/AdditionalImages/<set>/<nom>.jpg, la galerie de Brickset)
```

Elle sert à copier les rendus Rebrickable sur l'appareil, dont le CDN n'a pas de CORS. Elle n'accepte que cet hôte et
le dossier `/media/sets/` : ce n'est pas un proxy ouvert.

## Sauvegarde en ligne (R2)

Trois routes, qui exigent **toutes** le secret `JETON` (la collection entière passe par là) : sans `JETON` défini côté relais, elles répondent 403.

```
PUT /sauvegarde            corps : le fichier d'export JSON (en-tête Content-Type: application/json, 100 Mo au plus)
-> { "cle": "sauvegardes/2026-11-14T143005Z.json", "octets": 4210345 }
GET /sauvegardes           -> { "versions": [{ "cle": "…", "octets": 4210345, "date": "2026-11-14T14:30:05.000Z" }] }   (5 au plus, la plus récente d'abord)
GET /sauvegarde[?v=<cle>]  -> le fichier JSON de cette copie (par défaut la plus récente)
```

Chaque envoi ajoute une copie et supprime les plus anciennes au-delà de 5 : une mauvaise copie n'écrase pas les bonnes.

**À faire une fois, avant de déployer cette version** (sans le bucket, le déploiement du relais échoue) :

1. Cloudflare > **R2 Object Storage** > **Create bucket**, nom exact `bricks-sauvegardes` (l'offre gratuite suffit : 10 Go ; Cloudflare peut demander un moyen de paiement pour activer R2, sans rien facturer sous le quota).
2. Définir le secret `JETON` s'il ne l'est pas (Settings > Variables and Secrets, type **Secret**), puis saisir **le même jeton** dans l'appli (Réglages > Brickset > Jeton).
3. Déployer. Le fichier `wrangler.toml` déclare la liaison `SAUVEGARDES` vers ce bucket. Si tu colles le code à la main dans le tableau de bord, ajoute-la à la main : Settings > Bindings > Add > **R2 bucket**, nom de variable `SAUVEGARDES`.

Erreurs possibles : `{"erreur":"protection"}` (pas de `JETON` défini), `{"erreur":"jeton"}` (jeton absent ou faux), `{"erreur":"stockage"}` (liaison R2 absente ou R2 en panne), `{"erreur":"gros"}` (plus de 100 Mo), `{"erreur":"vide"}` (aucune copie). Les aperçus de pull request n'ont pas de bucket : ils répondent `stockage`, et les copies de production ne sont jamais touchées par un aperçu.

## Ce qu'il te faut

1. **Une clé Brickset.** Compte sur brickset.com, puis le formulaire de demande de clé :
   https://brickset.com/tools/webservices/requestkey . Vérifie sur cette page qu'elle est gratuite et lis la limite
   d'appels par jour : elle n'est pas confirmée ici.
2. **Un compte Cloudflare** (l'offre gratuite suffit : 100 000 appels par jour).

## Déployer, sans rien installer (depuis un navigateur)

1. Cloudflare > **Workers & Pages** > **Create** > **Create Worker**, nom `bricks-relais`, **Deploy**.
2. **Edit code** : efface tout, colle le contenu de `relais/worker.js`, **Deploy**.
3. **Settings** > **Variables and Secrets** > **Add** :
   - type **Secret**, nom `BRICKSET_KEY`, valeur : ta clé Brickset (colle-la uniquement ici) ;
   - facultatif, type **Secret**, nom `JETON`, valeur : un mot de passe de ton choix. S'il est défini, seuls les
     appels qui portent cet en-tête passent. À activer si tu veux que l'adresse du relais ne suffise pas à l'utiliser ;
   - la variable `ORIGINE` vaut déjà `https://antoniman31.github.io` dans le code ; ne l'ajoute que pour autoriser
     d'autres sites (par exemple `http://localhost:5173` pour développer).

## Déployer en ligne de commande (équivalent)

```
cd relais
npx wrangler login
npx wrangler secret put BRICKSET_KEY    # la clé se saisit à l'invite, elle n'est écrite nulle part
npx wrangler deploy
```

## Vérifier

Ouvre dans un navigateur (remplace par ton adresse, affichée à la fin du déploiement) :

```
https://bricks-relais.<ton-compte>.workers.dev/sortie?numero=75192-1
```

Tu dois voir un JSON avec `"trouve": true` et `"lancement": "2017-10-01"` pour le Faucon Millenium. Essaie ensuite
un set de ta wishlist pas encore sorti, par exemple `72051-1` (Donkey Kong Arcade). **Ce JSON ne contient aucun
secret** : tu peux me le coller pour que je vérifie le résultat.

Si tu vois `{"erreur":"configuration","proches":["…"]}`, ces noms sont ceux de réglages qui ressemblent à la clé attendue : l'un d'eux est probablement mal nommé (le secret doit s'appeler exactement `BRICKSET_KEY`).

Erreurs possibles : `{"erreur":"cle"}` (clé refusée ou mal collée), `{"erreur":"limite"}` (limite quotidienne de
Brickset atteinte), `{"erreur":"configuration"}` (le secret `BRICKSET_KEY` n'est pas défini), `{"erreur":"jeton"}`
(le jeton est exigé et absent).

## Sécurité

- La clé n'est jamais renvoyée ni écrite dans une adresse : elle part dans le corps de la requête vers Brickset.
- L'autorisation CORS n'est donnée qu'aux sites de `ORIGINE` : un autre site ne peut pas lire la réponse depuis un
  navigateur. Ce n'est pas une barrière contre un outil en ligne de commande : pour cela, utilise `JETON`.
- Seuls les champs utiles sont renvoyés (dates et disponibilité), rien d'autre de Brickset.
