# Baromètre Coopératif — Cloudflare Pages + KV (stockage en ligne)

Ce paquet fournit :
- `public/login.html` : page de connexion (choix de la classe + PIN).
- `public/index.html` : l'app complète (feu tricolore, îlots, étoiles, graph bruit).
- `functions/api/login.js` : vérifie le PIN de la classe.
- `functions/api/state.js` : lit/écrit l'état {groups, stars, mode, history} dans **Cloudflare KV**.

## Déploiement sur Cloudflare Pages (recommandé)

1. **Crée un nouveau projet Pages** et envoie ce dossier tel quel.
2. Dans les paramètres **Pages → Functions → KV Bindings**, ajoute une liaison :
   - Variable name: `BARO`
   - KV Namespace: crée/en choisis une, par ex. `barometre-coop`
3. **Ajoute tes classes et PINs** dans la KV (depuis le Dashboard → KV → `barometre-coop` → ajoute des paires clé/valeur) :
   - Clé : `auth:CLASSE_X`  Valeur : `1234`  (exemple)
   - Tu peux mettre autant de classes que tu veux : `auth:CM2A`, `auth:P4-2025`, etc.
4. Ouvre l’URL de Pages, va sur `/public/login.html`, saisis `CLASSE_X` et le PIN (ex. `1234`).

> Remarque : `GET /api/state?class=CLASSE_X` est public (lecture seule pour afficher aux élèves si tu veux).
> L’écriture nécessite l’en‑tête `X-Class-Pin` correct ; l’interface ajoute cet en‑tête automatiquement après connexion.

## Alternative : Wrangler (Worker)

Un `wrangler.toml` minimal serait :
```toml
name = "barometre-coop"
main = "./functions/api/state.js"

[[kv_namespaces]]
binding = "BARO"
id = "<KV_NAMESPACE_ID>"
```
Mais pour Pages, tu n’en as pas besoin.

## Sécurité simple
- Un **PIN par classe** stocké dans KV sous la clé `auth:<classe>`.
- Les opérations d’écriture vérifient `X-Class-Pin`. La **lecture** reste ouverte pour la praticité.
- Si tu veux verrouiller la lecture : modifie `state.js` (GET) pour valider le PIN.

## Données enregistrées en ligne
- `groups`, `history`, `lastId`, `mode` (dans la clé KV `state:<classe>`).  
**Le graphique du son reste local** (aucun envoi).

## Personnalisation
- La classe active est affichée en haut à droite, avec un bouton « Se déconnecter ».
- Le feu tricolore et l’interface restent identiques à ta version précédente.

Bon déploiement !
