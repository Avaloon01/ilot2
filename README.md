# Baromètre Coopératif — Pages Functions + KV — Auth Email/Mot de passe

## Contenu
- `public/signup.html` : création de compte (email + mot de passe)
- `public/login.html` : connexion
- `public/index.html` : l’application (feu tricolore, îlots, étoiles, graph bruit local)
- `functions/api/auth/register.js` : inscription (hash PBKDF2 + enregistrement KV)
- `functions/api/auth/login.js` : connexion (vérif + cookie de session signé HMAC)
- `functions/api/auth/logout.js` : déconnexion (clear cookie)
- `functions/api/state.js` : lecture/écriture de l’état par utilisateur (protégé par session)

## Bindings à configurer (Pages → Settings → Functions → Bindings)
- **KV Namespace** : `BARO` (créez un namespace KV, ex. `barometre-users`)
- **Environment variable** : `SESSION_SECRET` (une longue valeur aléatoire, min 32 caractères)

## Stockage KV
- Utilisateurs : clé `user:<email>` → JSON `{"id": "<uuid>", "email":"...", "pwd":"pbkdf2$100000$<salt_b64>$<hash_b64>"}`
- État : clé `state:<userId>` → JSON `{groups, history, lastId, mode}`

## Sécurité
- Hash PBKDF2 (100k itérations, SHA-256) avec sel aléatoire via WebCrypto.
- Cookie HttpOnly, Secure, SameSite=Lax, signé HMAC-SHA256 (`SESSION_SECRET`).
- Aucune donnée son n’est envoyée côté serveur (graph local uniquement).

## Déploiement
1) Créez le projet Pages (upload ce dossier). Output dir: `public`.
2) Ajoutez le binding KV `BARO` et la variable `SESSION_SECRET`.
3) Déployez. Accédez à `/public/signup.html` puis `/public/login.html` → `/public/index.html`.
