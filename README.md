# JurisAffaires — Maquette de refonte du site

Démonstration statique du nouveau site **JurisAffaires Avocats & Conseils — Tunis**.
17 pages, HTML + CSS + JavaScript natif, **aucune étape de build** : le site fonctionne
en ouvrant directement `index.html`.

---

## 1. Démarrer

| Besoin | Action |
| --- | --- |
| Ouvrir localement | Double-cliquer sur `index.html` |
| Prévisualiser sur mobile | Ouvrir `index.html` puis passer en simulation mobile (375–414 px) |
| Servir en local | `python3 -m http.server 8080` puis `http://localhost:8080` |

Le dossier `tools/` est facultatif : il ne sert qu'à régénérer les pages statiques
(voir § 6). Vous pouvez supprimer le dossier complet et le site continue de fonctionner.

---

## 2. Les 41 pages

**Accueil**
- `index.html` — page d'accueil : hero, positionnement « 40+ », 4 piliers + Droit du Sport,
  histoire, équipe, références, publications, contact.

**Le cabinet**
- `le-cabinet.html` — positioning, histoire, engagements, chiffres clés, mapequipe.

**Expertises** (5 pôles structurés à partir des 15 domaines réels)
- `expertises.html` — vue d'ensemble + index des cinq pôles
- `expertise-droit-des-affaires.html` — 01
- `expertise-banque-finance-assurances.html` — 02
- `expertise-immobilier-social-maritime.html` — 03
- `expertise-contentieux-penal-libertes.html` — 04
- `expertise-droit-du-sport.html` — 05

**Équipe**
- `equipe.html`
- `avocat-slim-bouderbala.html` — Me Slim BOUDERBALA, associé gérant
- `avocate-faten-guemri.html` — Me Faten GUEMRI, associée, co-gérante
- `avocat-sahbi-bouderbala.html` — Me Med Sahbi BOUDERBALA, associé senior
- `avocat-taoufik-bouderbala.html` — Me Taoufik BOUDERBALA, associé senior

**Contenus**
- `publications.html` — les deux seules publications existantes
- `contact.html` — formulaire, plan, coordonnées, réponses fréquentes

**Mentions**
- `mentions-legales.html`
- `politique-de-confidentialite.html`

---

## 3. Architecture des fichiers

```
jurisaffaires-demo/
├── index.html                     ← point d'entrée
├── le-cabinet.html
├── expertises.html
├── expertise-*.html               (5)
├── equipe.html
├── avocat-*.html / avocate-*.html (4)
├── publications.html
├── contact.html
├── mentions-legales.html
├── politique-de-confidentialite.html
│
├── assets/
│   ├── css/style.css              ← toute la identité visuelle (≈ 2 790 lignes)
│   ├── js/main.js                 ← interactions légères (≈ 235 lignes)
│   ├── img/
│   │   ├── hero-architecture.jpg  ← texture sombre des heroes
│   │   ├── logo.svg  logo-mark.png
│   │   ├── team/                   ← 4 portraits authentiques
│   │   └── clients/               ← 12 logos de clients réels
│
├── tools/
│   ├── build_pages.py             ← générateur des pages intérieures
│   └── .home-section.html         ← corps de la page d'accueil
│
└── README.md
```

---

## 4. Ce qui a changé par rapport au site actuel

| Site actuel | Nouvelle maquette |
| --- | --- |
| Bannière slider avec messages qui se chevauchent | **Un seul hero**, un seul message, une seule action principale |
| 15 domaines listés à plat, sans hiérarchie | **5 pôles structurés**, chacun avec sa page, ses matières et son CTA |
| Navigation incohérente d'une page à l'autre | **Navigation identique sur les 17 pages**, plus un sous-menu contextuel |
| Page contact sans action forte | **Formulaire structuré**, plan, coordonnées, « Ouvrir l'itinéraire », réponses fréquentes |
| « Copyright 2018 / Copyright 2023 » contradictoires | Mention unique et cohérente : `© 2026 JurisAffaires` |
| Équipe sans fiche détaillée | **4 fiches de profil** complètes, liées depuis toutes les pages |
| Aucun espace pour démontrer l'ancienneté | **« 40+ ans »** en section dédiée et rappelée dans chaque hero |

---

## 5. Parti pris visuel

**Institutionnel, premium, sobre.** Comparable à un cabinet de conseil international
plutôt qu'à un modèle de site d'avocat local.

- **Palette** — encre bleu nuit presque noire `#0B1620`, ivoire chaud `#FBF8F2`,
  gris pierre `#8A8579`, un seul accent bronze `#A2754A`. Rien d'autre.
- **Typographie** — une serif de titrage (Playfair Display) pour les titres,
  une sans-serif grotesque (Inter) pour le texte courant. Deux familles, jamais plus.
- **Composition** — beaucoup de vide, une idée par écran, des filets fins plutôt que
  des encadrés, aucune ombre portée molle, aucun dégradé décoratif.
- **Images** — une seule photographie d'architecture sombre, désaturée à 16 %,
  sert de texture aux heroes. Aucun stock photo de palais de justice, de balance
  ou de marteau.
- **Animations** — fondus et translations courtes au défilement, révélations de texte,
  élévations d'un cheveu sur les cartes. Le site reste premium quand les animations
  sont désactivées (`prefers-reduced-motion` respecté, 0 contenu masqué).

**Interdits respectés** : pas de balance de la justice, pas de marteau, pas de doré
excessif, pas de dégradés flashy, pas d'icônes en quantité, pas d'animation au
chargement.

### 5 bis. Habillage « maquette » (référence Wolfpixel / Law Firm)

Une couche de mise en forme a été ajoutée par-dessus le système ci-dessus, sans
changer ni la palette ni les contenus. Elle est écrite dans les blocs **30 à 35**
de `assets/css/style.css`, à la fin du fichier, et peut être retirée d'un bloc.

| Élément | Avant | Après |
|---|---|---|
| En-tête | barre pleine largeur, sombre au scroll | **pastille blanche fixe**, flottante, arrondie, floue ; reste claire au scroll |
| Fond de page | blanc | ivoire chaud, alternance ivoire / blanc |
| Titres de section | serif | **grotesque légère** (`font-weight: 300`, interlettrage négatif) ; le serif reste réservé aux `h1` et aux citations |
| Liseré doré | filet avant chaque titre | **pastille d'intitulé** (`— EXPERTISES`, `04 — L'ÉQUIPE`) |
| Boutons | rectangles à angles vifs | **pilules** ; bouton principal en encre, flèche dans un disque ivoire |
| Cartes expertise | tableau réglé 1 px | **cartes blanches arrondies**, pastille de numéro, disque de flèche en bas à droite, élévation au survol |
| Cartes « feature » / portraits | rectangles | angles arrondis, filet discret |
| Hero d'accueil | plein fond sombre | **deux colonnes** : titre + fil d'adresse en pastille à gauche, photographie à droite |
| Heroes de page | fond encre | **clair**, même langue que l'accueil, chiffre fantôme en encre |
| Bandeau CTA | encre | encre, mais bouton principal **ivoire** |

**Cache navigateur** : `style.css` et `main.js` sont référencés avec une
empreinte (`?v=dcb58206`). Sans elle, un navigateur peut conserver une ancienne
feuille de style tout en récupérant le nouveau HTML, et la page s'affiche alors
sans mise en forme. Tous les SVG inline portent aussi `width`/`height` : si la
feuille de style arrive en retard ou échoue, aucun ne peut s'étendre sur l'écran.

**Contraintes de spécificité à connaître** : la règle
`.btn:not(.btn--ghost):not(.btn--ghost-light)` pèse (0,3,0). Toute inversion de
bouton sur fond encre doit être écrite au même poids
(`.on-dark .btn:not(.btn--ghost) { … }`), sinon elle est ignorée.

**Témoignages clients** : la maquette de référence en comporte ; ils ont été
**volontairement omis** ici, les écrire reviendrait à inventer des citations
clients.

---

## 5 ter. Les 24 pages ajoutées


**22 pages « domaine »** (`domaine-*.html`) — les 22 entrées réelles de la table
`PRACTICES` du générateur (titre, description, nature conseil/contentieux)
étaient de simples lignes de liste sans page propre. Chacune est désormais une
page à part entière : titre, description d'origine, pôle de rattachement, domaines
voisins en pastilles, les avocats du pôle et un appel à l'action. **Aucun texte
juridique n'a été écrit** : tout est réutilisé depuis les données déjà publiées.
Les listes des piliers et des pages d'expertise sont devenues des liens.

**`references.html`** — le bloc « Références » était une ancre sur l'accueil ; le
menu mobile et le pied de page l'annonçaient déjà. La page range les 12 logos par
nature (banques, industriels, médias, institutions). Elle est posée sur l'encre :
**les logos du cabinet sont des fichiers blancs**, invisibles sur fond clair.

**`404.html`** — page d'erreur avec les cinq pôles en repères.

Au passage, la navigation a été réalignée : le menu mobile annonçait six entrées
(dont Références) quand le bureau n'en montrait que cinq.


Le site compte **5 821 mots sur 17 pages**, soit environ 340 mots par page.
C'est délibéré : sur ce type de site, tout ce qui n'est pas une information
utile devient du bruit.

Quatre règles ont guidé la réécriture :

1. **Aucun doublon.** Si une information existe déjà dans la section du dessous
   ou dans une autre page, elle est retirée. Les 15 pastilles de spécialités
   figuraient sur l'accueil *et* sur chaque fiche de profil : une seule
   occurrence.
2. **Un paragraphe, jamais deux.** Chaque bloc narratif tient en un paragraphe.
3. **Pas de texte qui parle du site.** « Une liste lisible : vous identifiez
   votre sujet… », « Chaque page décrit les matières traitées… » ont été
   supprimés : ce sont des instructions de navigation, pas de l'information.
4. **Les listes restent, les paragraphes partent.** Les 15 domaines
   d'intervention, les matières par pôle, les coordonnées : ce sont des
   données, pas de la prose. Elles restent intégralement.

Ce qui a été retiré en volume : les 4 biographies de l'accueil (elles
répitaient les pastilles), les 3 puces de chaque bandeau « Passons à l'action »
(identiques sur 8 pages), les 15 cartes d'engagements, les panneaux latéraux
des heroes, les résumés d'articles.

---

## 6. Le générateur (`tools/`)

`tools/build_pages.py` écrit les **16 pages intérieures** — les 14 pages de contenu,
les 2 pages légales — **et** réécrit `index.html` à partir de
`tools/.home-section.html`. Le site n'en a pas besoin pour fonctionner : c'est un
confort de maintenance.

```bash
python3 tools/build_pages.py
```

Toutes les pages sortent du même chrome (`head`, `header`, `subnav`, `footer`,
`page_h`) : une seule source de vérité pour la navigation, le pied de page et les
métadonnées.

---

## 7. Provenance des contenus

**Aucune information inventée.** Toutes les données viennent du site en ligne :

| Élément | Source |
| --- | --- |
| Les 4 avocats, leurs titres et leurs biographies | `jurisaffaires.tn/notre-equipe-avocats/` |
| Histoire et positionnement du cabinet | `jurisaffaires.tn/notre-cabinet/` |
| Domaines de compétences et valeurs | `jurisaffaires.tn/nos-domaines-competences/` |
| Adresse, téléphones, courriel, horaires | `jurisaffaires.tn/contactez-nous/` |
| Les 2 publications (24/05/2018, 24/01/2018) | `jurisaffaires.tn/la-tribune/` et `jurisaffaires.tn/feed/` |
| Les 12 logos de clients | galerie de référence du site actuel |
| Les 4 portraits | `jurisaffaires.tn/notre-equipe-avocats/` |

**Ce qui n'a pas été inventé, volontairement :**
- aucun certificat, aucune distinction, aucun classement, aucune statistique
  qui ne figure pas sur le site actuel ;
- aucun témoignage client, aucune étude de cas chiffrée ;
- **aucune page d'article.** Les deux publications existantes renvoient vers le
  site en ligne : leur texte intégral n'est pas accessible et l'écrire reviendrait
  à inventer du contenu juridique.

Les seules formulations non sourcées sont les **arguments commerciaux** (promesse
de service, ton, accroches) : elles ne citent aucun fait, elles(expriment une
manière de travailler.

---

## 8. Limites de la maquette (à savoir avant mise en ligne)

1. **Le formulaire n'a pas de back-end.** À la soumission, il ouvre le logiciel de
   messagerie du visiteur avec un courriel pré-rempli vers
   `avocats-conseils@jurisaffaires.net`. Un envoi réel demande un formulaire
   côté serveur ou un service tiers (Formspree, Netlify Forms…).
2. **Le plan est une iframe OpenStreetMap** avec une adresse en clair en repli.
   En production, Embassy ou Google Maps sont habituels.
3. **L'URL canonique** est la même sur toutes les pages (démo). Chaque page
   devra avoir sa propre URL et son propre `sitemap.xml`.
4. **Le header `Content-Security-Policy` / les métadonnées Open Graph** restent à
   poser pour le référencement et le partage social.
5. **Les images** sont servies telles quelles ; une version `WebP` et un
   `srcset` seraient utiles sur mobile.