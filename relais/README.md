# Relais Brickset (dates de sortie)

Un Cloudflare Worker minuscule (`worker.js`, un seul fichier) qui donne à l'application la date de sortie
d'un set. Il existe parce que l'API de Brickset n'envoie pas d'en-têtes CORS : un navigateur ne peut pas
l'appeler directement. Le relais l'appelle à sa place, avec ta clé Brickset gardée **en secret chez Cloudflare**
(jamais dans l'application, jamais dans ce dépôt, jamais dans une conversation).

```
GET /sortie?numero=75192-1
-> { "numero": "75192-1", "trouve": true, "lancement": "2017-10-01", "retrait": "2023-12-31", "disponibilite": "Retired" }
```

`lancement` vaut `null` quand Brickset n'a pas de date : l'application affichera alors « date inconnue ».

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

Erreurs possibles : `{"erreur":"cle"}` (clé refusée ou mal collée), `{"erreur":"limite"}` (limite quotidienne de
Brickset atteinte), `{"erreur":"configuration"}` (le secret `BRICKSET_KEY` n'est pas défini), `{"erreur":"jeton"}`
(le jeton est exigé et absent).

## Sécurité

- La clé n'est jamais renvoyée ni écrite dans une adresse : elle part dans le corps de la requête vers Brickset.
- L'autorisation CORS n'est donnée qu'aux sites de `ORIGINE` : un autre site ne peut pas lire la réponse depuis un
  navigateur. Ce n'est pas une barrière contre un outil en ligne de commande : pour cela, utilise `JETON`.
- Seuls les champs utiles sont renvoyés (dates et disponibilité), rien d'autre de Brickset.
