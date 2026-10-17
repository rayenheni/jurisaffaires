# Audit UX / UI — JurisAffaires

Audit réalisé en exécutant de vrais navigateurs sur les **41 pages** (desktop 1440, 1280, 1060 et mobile 390 / 360).
Chaque point ci-dessous est une mesure, pas une impression.

---

## Synthèse

| Domaine | Verdict |
|---|---|
| Structure & navigation | **Solide** — hiérarchie cohérente, 0 lien mort, 0 page orpheline |
| Accessibilité (contraste, focus, mouvement) | **Solide** — 0 défaut bloquant |
| **Formulaire de contact** | **Critique** — aucun retour visuel, ni à l'erreur ni à l'envoi |
| **22 pages « domaine »** | **Critique** — 95 à 99 % identiques entre elles |
| SEO technique | **À corriger** — 41 URLs canoniques identiques |
| Mobile | **À corriger** — éléments clippés, cibles tactiles trop petites |

---

## P0 — Bloque la conversion

### 1. Le formulaire ne dit rien quand il est mal rempli

> **Statut : RÉSOLU.**

**Constat mesuré :** clic sur « Envoyer la demande » avec le formulaire vide →

```
focusChamp      : nom          (le champ est focalisé)
bordureRouge     : var(--accent)
aucunMessage     : True        (aucun .form__error, [role=alert] dans le formulaire)
aideVisible      : []
```

Le seul retour est un changement de couleur de bordure sur le premier champ vide.
**Aucun message, aucun résumé, aucun `aria-invalid`, aucun `aria-describedby`.**

Conséquences :
- Un visiteur voit presque (il doit deviner la bordure bronze = erreur) ;
- un utilisateur de lecteur d'écran **ne reçoit strictement rien** ;
- la bordure est posée en `style` inline et **n'est jamais remise à zéro** quand le visiteur corrige — l'erreur reste affichée sur un champ valide.

### 2. Le formulaire ne confirme rien quand l'envoi réussit

> **Statut : RÉSOLU.**

**Constat mesuré :** formulaire valide + clic →

```
URL après envoi  : inchangée
message de confirmation : False
bouton désactivé        : False
```

Le gestionnaire fait `window.location.href = 'mailto:…'`. Sur un poste où aucune
messagerie n'est configurée — cas très fréquent — **il ne se passe visiblement rien** :
pas de confirmation, pas de changement d'état, le bouton reste actif.

C'est l'action de conversion principale du site : elle peut sembler cassée.

---

## P1 — Défauts introduits par l'ajout des 22 pages « domaine »

### 3. Les 22 pages « domaine » sont presque la même page

> **Statut : RÉSOLU.**

Similarité de Jaccard sur le contenu de `<main>` :

```
0.99  reglement-des-litiges-sportifs  /  responsabilite-et-manquements-graves
0.99  conseil-aux-acteurs-du-sport    /  reglement-des-litiges-sportifs
0.97  conseil-aux-acteurs-du-sport    /  responsabilite-et-manquements-graves
0.95  operations-de-cession-d-entreprise / restructuration-et-levee-de-fonds
0.94  droit-civil                     /  droit-maritime
```

Chaque page fait ~130 mots. Le seul écart réel avec sa voisine : le titre et la
description d'une ligne. **Un client qui compare « Droit maritime » et « Droit
civil » voit rigoureusement la même page.**

C'est aussi un problème de contenu : 22 pages quasi identiques sont du *near-duplicate content*.

> À arbitrer : soit on les enrichit réellement (interdits sans source), soit on les
> supprime au profit d'une seule page par pôle. **C'est ma recommendation : les
> supprimer** — 5 pages pôles Wealthisent plus que 22 pages vides.

### 4. Les 41 pages déclarent la même URL canonique

> **Statut : RÉSOLU.**

```
41 pages -> https://www.jurisaffaires.tn/
```

Chaque page affirme au moteur de recherche qu'elle est la page d'accueil.
Combiné au point 3, c'est le pire scénario possible pour une mise en ligne réelle.

---

## P2 — Mobile et accessibilité

### 5. Éléments clippés à 360 px

> **Statut : RÉSOLU.**

```
vw = 360
.contact-card  →  bord droit à 366 px   (6 px coupés)
.map-panel / .facts → bord droit à 366 px
```
Le document ne défile pas (`overflow-x: clip`) : le débordement est **caché, pas corrigé**.
Les bordures droites de ces blocs sont amputées sur les petits téléphones.

### 6. Cibles tactiles trop petites

> **Statut : RÉSOLU.**

Sur contact.html à 390 px, la quasi-totalité des liens de navigation mesurent **17 à 18 px de haut** :

```
(+216) 71 256 751        h=17
avocats-conseils@…       h=17
Accueil / Le Cabinet / Expertises / Équipe / Publications / Références / Contact   h=17-18
fil d'Ariances, sous-navigation expertises   h=17
```

Seuil WCAG 2.2 (2.5.8) : 24 px. Recommandation tactile iOS : 44 px.
Sur un téléphone, ces cibles sontemmaçinées à la ligne précédente.

### 7. Images sans dimensions → décalage de mise en page

> **Statut : RÉSOLU.**

```
index.html      : 12 images sans width/height
references.html : 24 images sans width/height
```
Les logos clients vont provoquer un saut (CLS) au chargement.

---

## P3 — SEO et lisibilité des résultats

| Cas | Pages concernées |
|---|---|
| `title` > 60 caractères | 16 pages domaine |
| `meta description` < 70 caractères | 22 pages domaine |
| Images sans `alt` | **0** ✔ |
| Plusieurs `<h1>` ou `<h1>` manquant | **0** ✔ |
| Liens au libellé générique (« en savoir plus ») | **0** ✔ |
| Champs de formulaire sans `<label>` | **0** ✔ |

---

## P4 — Ce qui peut|prêter à confusion

### 8. Deux bandeaux parlent de la maquette, pas du cabinet

> **Statut : RÉSOLU.**

Sur **contact.html**, sous le formulaire :

> « **Démonstration — concept.** Aucun back-end : la soumission ouvre votre messagerie pré-remplie… »

Sur **publications.html** :

> « **Démonstration.** Le cabinet ne publie pas d'article depuis 2018. Cette page montre
> le format de la rubrique, tel qu'il pourrait évoluer. »

Honnête pour une revue interne, mais un client lit « cette page montre le format…
tel qu'il pourrait évoluer » et se demande ce qu'il a sous les yeux.

### 9. « Site actuel » dans le pied de page

> **Statut : RÉSOLU.**

Lien sortant vers `https://www.jurisaffaires.tn/`. À l_LAYOUT d'une maquette c'est
utile ; en production, un lien vers l'ancien site sous le nouveau est déroutant.

---

## Ce qui est solide (à conserver)

- **0 échec de contraste** sur les 41 pages (audit WCAG complet, sebelumnya 534).
- **0 indicateur de focus manquant** — les 28 éléments focusables testés ont un anneau visible.
- **`prefers-reduced-motion` respecté** — 64 éléments animés, **0 invisible** sans animation.
- **0 lien interne cassé**, **0 page orpheline**, **0 doublon** de `title` ou de description.
- **1 seul `<h1>` par page**, landmarks `header`/`nav`/`main`/`footer` corrects partout.
- Navigation bureau sans débordement à 1060, 1280 et 1366 px malgré les 6 entrées.
- Assets versionnés (`?v=hash`) : plus de risque de feuille de style périmée.
- 28 SVG portent `width`/`height` : une feuille de style en échec ne peut plus faire exploser la mise en page.

---

## Ordre de traitement recommandé

1. **Formulaire** — message d'erreur explicite + confirmation d'envoi + `aria-invalid`. *(P0)*
2. **Pages domaine** — supprimer ou enrichir. *(P1, arbitrage à faire)*
3. **Canonique unique par page.** *(P1, une ligne dans le générateur)*
4. **Cibles tactiles** — hauteur minimale 44 px sur les liens de navigation. *(P2)*
5. **Débordement 360 px** et `width`/`height` sur les images. *(P2)*
6. **Titres / descriptions** des pages domaine. *(P3)*
7. **Reformuler les deux bandeaux « Démonstration ».** *(P4)*

---

# addendum — Où en est le chantier

*Ajouté après la livraison. Les constats ci-dessus sont conservés tels
qu'ils ont été écrits : ils décrivent l'état avant correction.*

## Résolu

| # | Constat | Ce qui a été fait |
|---|---|---|
| 1 | Formulaire muet sur erreur | Message `role="status"` recalculé en direct (`4 champs…` → 3 → 2), `aria-invalid` sur chaque champ vide, focus déplacé au premier champ manquant |
| 2 | Formulaire muet au succès | Bouton `disabled` + `aria-busy`, confirmation nommant l'adresse de courriel |
| 3 | 22 pages « domaine » redondantes | **Correction de l'audit** : la similarité réelle est de 48 % en moyenne (pire paire : 93 %), pas 94–99 %. Les URL sont réelles, donc aucune suppression. La grille « Les autres pôles » — identique pour tous les domaines d'un même pôle — est remplacée par un lien texte. 5 sections → 4, 148 → 115 mots/page |
| 4 | Canonical unique | 41 URL distinctes ; `404.html` sans canonical |
| 5 | Clipping 360 px | 0 débordement en 360 / 390 / 768 / 1024 / 1440 px |
| 6 | Cibles tactiles | 169 → 0 sous 44 px, hors liens écrits dans un paragraphe (exception inline WCAG 2.5.8) |
| 7 | Images sans dimensions | 36 images complétées ; plus aucun `<img>` sans `width`/`height` |
| 8 | Bandeaux « démonstration » | Retirés ; reporté en mention discrète au pied de page |
| 9 | « Site actuel » | Renommé « Voir le site en ligne », ouverture en nouvel onglet |

## Constat non corrigé — volontairement

**Aucune image sur les 22 pages « domaine », les 5 pages d'expertise, les
publications et les pages légales.** Ces pages sont des pages de lecture :
y ajouter une photographie décorative alourdirait le rendu au lieu de le
renforcer. Le parti pris est la restraint institutionnelle, à valider.

## Constat en attente d'arbitrage

**Les pages « domaine » restent courtes** (115 mots de contenu propre). Les
enrichir supposerait d'écrire de la jurisprudence, des chiffres ou des
résultats — c'est-à-dire d'inventer, ce que la commande interdit. Elles
restent donc des pages d'orientation : dire de quoi le domaine relève, quel
pôle le porte, qui l'enseigne, et conduire vers le contact.

## État final mesuré

41 pages · 0 lien cassé · 0 erreur JS · 0 débordement sur 5 largeurs ·
41 canonical uniques · 574 mots sur l'accueil · 188 mots/page en moyenne.
