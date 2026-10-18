# JurisAffaires — Espace Admin

Admin complet pour gérer **tout** le site (43 pages) — sans toucher au code.

## Démarrer en local

```bash
npm install
npm start
# Site public : http://localhost:3000
# Admin       : http://localhost:3000/admin
# Login       : admin@jurisaffaires.tn / Admin123!
```

> Changez `ADMIN_EMAIL` / `ADMIN_PASSWORD` dans `.env` puis `JWT_SECRET` en production.

## Architecture

```
data/
  cms.json         ← tout le contenu éditable (site, pôles, domaines, équipe, publications…)
  messages.json    ← boîte de réception du formulaire
  media.json       ← index des uploads
  users.json       ← comptes admin (hash bcrypt)

tools/build_pages.py  ← lit data/cms.json s'il existe, sinon valeurs codées en dur
assets/img/uploads/ ← fichiers uploadés via admin

server/
  index.js         ← Express + auth JWT + statiques
  routes/cms.js    ← GET/PUT /api/cms
  routes/messages.js ← POST public / GET protégé
  routes/media.js  ← upload multer
  routes/rebuild.js← POST /api/rebuild → python3 tools/build_pages.py
  routes/auth.js   ← login / me / password

admin/
  login.html
  index.html       ← SPA hash-router
  assets/admin.css ← charte #4F6C62 #AE9A63 #08110E
  assets/admin.js  ← dashboard, site, nav, pôles, domaines, équipe, publications, refs, messages, médias, sécu
```

**Principe :** l’admin édite `data/cms.json`. Le bouton **⟳ Reconstruire le site** lance `python3 tools/build_pages.py` qui régénère les 43 HTML à la racine. Le site reste 100% statique en production — l’admin n’est nécessaire qu’en édition (VPS).

## Ce que vous pouvez gérer

| Section | Fichier source | Pages impactées |
|---|---|---|
| Cabinet & coordonnées | `site` | header, footer, contact, mentions, 404, SEO, JSON-LD |
| Navigation | `nav` + `expertise_subnav` | tous headers |
| Pôles d’expertise | `pillars` + `sport` | expertises.html + 5 pages expertise |
| Domaines (22) | `practices` + `engagements` | domaine-*.html |
| Équipe (4) | `team` | equipe.html + avocat-*.html |
| Publications | `publications` | publications.html + publication-*.html |
| Références | `clients` | references.html |
| Messages | `messages.json` | boîte de réception, export CSV |
| Médias | `assets/img/uploads/` | logos, portraits, éditoriaux |

## Sécurité

- JWT 12h, `Authorization: Bearer`
- `helmet`, `cors`, `rate-limit` sur login
- Mots de passe bcryptjs (10 rounds)
- Upload : images uniquement, 12 Mo max
- `JWT_SECRET` obligatoire en prod

## Déploiement VPS

```bash
# Sur le VPS
git clone ... && cd jurisaffaires
cp .env.example .env  # renseigner JWT_SECRET + ADMIN_*
npm ci --omit=dev
pm2 start npm --name jurisaffaires -- start   # ou systemd
# Nginx reverse proxy → 3000, servir statiques via Express suffit
# Pour un hébergement purement statique, déployez seulement les HTML générés
```

## Formulaire de contact

`assets/js/main.js` fait désormais **double envoi** :
1. `fetch POST /api/messages` (si backend joignable) → stockage + admin
2. `mailto:` → client mail du visiteur (fallback statique, fonctionne sans backend)
