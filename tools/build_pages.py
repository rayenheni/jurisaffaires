#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Static page generator for the JurisAffaires homepage concept demo.

The output is plain static HTML — the site runs by opening index.html and
never needs this script. It exists so the shared chrome (head, header,
mobile menu, footer, sticky contact bar, CTA band) lives in ONE place
instead of being copy-pasted into every file.

    python3 tools/build_pages.py

Content rules: every lawyer, biography, client logo, address, phone number,
publication title and legal area below is taken from jurisaffaires.tn or the
brief. Nothing is invented.
"""

import os
import io
import re
import hashlib
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------- constants

NAME       = "JurisAffaires"
LEGAL_NAME = "Juris Affaires Avocats &amp; Conseils"
SITE_URL   = "https://www.jurisaffaires.tn/"

ADDRESS_1  = "45, rue Ali Darghouth"
ADDRESS_2  = "1001 Tunis — Tunisie"
PHONE_MAIN = "(+216) 71 256 751"
PHONE_2    = "(+216) 71 256 752"
PHONE_3    = "(+216) 71 256 738"
FAX        = "(+216) 71 256 737"
EMAIL      = "avocats-conseils@jurisaffaires.net"
HOURS      = "Lundi au vendredi — 8h00 à 18h30"

# Lien cartographique unique : la requête reprend mot pour mot l'adresse
# postale du cabinet. Toute adresse affichée renvoie donc au même point.
MAP_URL = ("https://www.google.com/maps/search/?api=1&amp;query="
           "45+Rue+Ali+Darghouth+1001+Tunis+Tunisie")

NAV = [
    ("le-cabinet.html",    "Le Cabinet"),
    ("expertises.html",    "Expertises"),
    ("equipe.html",        "Équipe"),
    ("publications.html",  "Publications"),
    ("references.html",    "Références"),
    ("contact.html",       "Contact"),
]

# ── Chargement du CMS JSON (si présent, écrase les constantes ci-dessus) ──
# Permet à l'espace admin de piloter tout le contenu sans toucher au code.
_CMS_PATH = os.path.join(ROOT, "data", "cms.json")
try:
    import json as _json
    if os.path.exists(_CMS_PATH):
        _cms = _json.load(open(_CMS_PATH, encoding="utf-8"))
        _site = _cms.get("site", {})
        NAME       = _site.get("NAME", NAME)
        LEGAL_NAME = _site.get("LEGAL_NAME", LEGAL_NAME)
        SITE_URL   = _site.get("SITE_URL", SITE_URL)
        ADDRESS_1  = _site.get("ADDRESS_1", ADDRESS_1)
        ADDRESS_2  = _site.get("ADDRESS_2", ADDRESS_2)
        PHONE_MAIN = _site.get("PHONE_MAIN", PHONE_MAIN)
        PHONE_2    = _site.get("PHONE_2", PHONE_2)
        PHONE_3    = _site.get("PHONE_3", PHONE_3)
        FAX        = _site.get("FAX", FAX)
        EMAIL      = _site.get("EMAIL", EMAIL)
        HOURS      = _site.get("HOURS", HOURS)
        MAP_URL    = _site.get("MAP_URL", MAP_URL)
        if "nav" in _cms:
            NAV = [(x["href"], x["label"]) for x in _cms["nav"]]
        if "expertise_subnav" in _cms:
            EXPERTISE_SUBNAV = [(x["href"], x["label"]) for x in _cms["expertise_subnav"]]
        if "pillars" in _cms:
            PILLARS = _cms["pillars"]
        if "sport" in _cms:
            SPORT = _cms["sport"]
        if "pillars" in _cms and "sport" in _cms:
            ALL_EXPERTISES = PILLARS + [SPORT]
        if "team" in _cms:
            TEAM = _cms["team"]
        if "clients" in _cms:
            CLIENTS = [(x["file"], x["alt"]) for x in _cms["clients"]]
        if "publications" in _cms:
            PUBLICATIONS = _cms["publications"]
        if "stats_fixed" in _cms:
            STATS_FIXED = [(x["value"], x["label"]) for x in _cms["stats_fixed"]]
        if "practices" in _cms:
            PRACTICES = {int(k): [(p["title"], p["desc"], p["tag"]) for p in v] for k,v in _cms["practices"].items()}
        if "engagements" in _cms:
            ENGAGEMENTS = {int(k): [(e["title"], e["desc"]) for e in v] for k,v in _cms["engagements"].items()}
        if "all_domains" in _cms:
            ALL_DOMAINS = _cms["all_domains"]
except Exception as _e:
    # En cas de JSON corrompu on garde les valeurs codées en dur
    print(f"[cms] chargement ignoré: {_e}")

def slugify(text):
    text = text.replace("&amp;", " et ").replace("&", " et ")
    text = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


EXPERTISE_SUBNAV = [
    ("expertises.html",                              "Vue d'ensemble"),
    ("expertise-droit-des-affaires.html",            "Droit des affaires"),
    ("expertise-banque-finance-assurances.html",     "Banque &amp; assurances"),
    ("expertise-immobilier-social-maritime.html",    "Immobilier &amp; social"),
    ("expertise-contentieux-penal-libertes.html",    "Contentieux &amp; libertés"),
    ("expertise-droit-du-sport.html",                "Droit du sport"),
]

PILLARS = [
    dict(
        num="01", slug="expertise-droit-des-affaires.html",
        title="Droit des affaires",
        hero="Constituer, financer, céder, restructurer.",
        lede="De la start-up à la levée de fonds, chaque étape accompagnée.",
        card="Sociétés, opérations, restructuration, droit commercial.",
        items=["Droit des sociétés", "Opérations de cession d'entreprise",
               "Restructuration &amp; levée de fonds",
               "Arbitrage et contentieux des sociétés commerciales"],
    ),
    dict(
        num="02", slug="expertise-banque-finance-assurances.html",
        title="Banque, finance &amp; assurances",
        hero="Sécuriser le financement, couvrir le risque.",
        lede="Du financement à la saison des sinistres.",
        card="Droit bancaire, financement, fiscalité, assurances.",
        items=["Droit bancaire et financier",
               "Financement, conformité &amp; bancassurance",
               "Droit fiscal", "Droit des assurances"],
    ),
    dict(
        num="03", slug="expertise-immobilier-social-maritime.html",
        title="Immobilier, social &amp; maritime",
        hero="Le patrimoine, le travail, le transport maritime.",
        lede="Trois sujets où le conseil doit précéder le différend.",
        card="Transactions, litiges immobiliers, droit social, droit maritime.",
        items=["Transactions &amp; ventes aux enchères publiques",
               "Fiscalité immobilière",
               "Droit social et prud'hommes", "Droit maritime"],
    ),
    dict(
        num="04", slug="expertise-contentieux-penal-libertes.html",
        title="Contentieux, pénal &amp; libertés",
        hero="Défendre les intérêts, protéger les personnes.",
        lede="Litiges, pénal des affaires, affaires d'opinion, droits de l'Homme.",
        card="Contentieux, droit pénal des affaires, droits de l'Homme.",
        items=["Contentieux commercial et civil",
               "Droit pénal général et spécial",
               "Affaires politiques et d'opinion", "Droits de l'Homme"],
    ),
]

SPORT = dict(
    num="05", slug="expertise-droit-du-sport.html",
    title="Droit du sport",
    hero="Une spécialisation rare en Tunisie.",
    lede="Assister et représenter ses clients dans les litiges sportifs.",
    card="Litiges sportifs, responsabilité, manquements graves.",
    items=["Règlement des litiges sportifs",
           "Responsabilité et manquements graves",
           "Assistance et représentation",
           "Conseil aux acteurs du sport"],
)

ALL_EXPERTISES = PILLARS + [SPORT]

TEAM = [
    dict(
        slug="avocat-slim-bouderbala.html", num="01",
        first="Slim", last="BOUDERBALA",
        role="Avocat Associé · Gérant",
        img="slim-bouderbala.jpg",
        alt="Portrait de Maître Slim Bouderbala, avocat associé et gérant du cabinet.",
        bio="Co-fondateur et gérant de Juris Affaires Avocats &amp; Conseils. "
            "Avocat spécialisé en droit des affaires, en droit immobilier et en "
            "droit du sport, expert des opérations de restructuration, de cession "
            "et de levée de fonds.",
        facts=[("Spécialités", "Droit des affaires · Droit immobilier · Droit du sport"),
               ("Expertise", "Restructuration, cession et levée de fonds"),
               ("Fonction", "Co-fondateur et gérant du cabinet")],
        tags=["Droit des affaires", "Droit du sport", "Immobilier", "Restructuration"],
        expertises=[0, 4, 2],
    ),
    dict(
        slug="avocate-faten-guemri.html", num="02",
        first="Faten", last="GUEMRI",
        role="Avocate Associée · Co-gérante",
        img="faten-guemri.jpg",
        alt="Portrait de Maître Faten Guemri, avocate associée du cabinet.",
        bio="Co-fondatrice et co-gérante du cabinet Juris Affaires Avocats &amp; "
            "Conseils. Avocate associée, experte juriste dans les opérations de "
            "cession d'entreprise, spécialisée en arbitrage et en contentieux des "
            "sociétés commerciales.",
        facts=[("Spécialités", "Cession d'entreprise · Arbitrage · Sociétés commerciales"),
               ("Expertise", "Contentieux des sociétés commerciales"),
               ("Fonction", "Co-fondatrice et co-gérante du cabinet")],
        tags=["Cession d'entreprise", "Arbitrage", "Sociétés commerciales", "Contentieux"],
        expertises=[0, 3],
    ),
    dict(
        slug="avocat-sahbi-bouderbala.html", num="03",
        first="Med Sahbi", last="BOUDERBALA",
        role="Associé Senior",
        img="sahbi-bouderbala.jpg",
        alt="Portrait de Maître Med Sahbi Bouderbala, avocat senior associé.",
        bio="Avocat senior spécialisé en droit maritime, droit des assurances, "
            "droit bancaire, droit commercial et droit fiscal. Président de la "
            "Ligue des Droits de l'Homme de Nabeul et membre du Parlement Tunisien.",
        facts=[("Spécialités", "Droit maritime · Assurances · Banque · Fiscal"),
               ("Distinctions", "Membre du Parlement Tunisien — Président de la Ligue des Droits de l'Homme de Nabeul"),
               ("Fonction", "Associé senior du cabinet")],
        tags=["Droit maritime", "Assurances", "Droit bancaire", "Droits de l'Homme"],
        expertises=[1, 2, 3],
    ),
    dict(
        slug="avocat-taoufik-bouderbala.html", num="04",
        first="Taoufik", last="BOUDERBALA",
        role="Associé Senior",
        img="taoufik-bouderbala.jpg",
        alt="Portrait de Maître Taoufik Bouderbala, avocat senior associé.",
        bio="Avocat senior spécialisé en droit pénal général et spécial, affaires "
            "politiques et d'opinion, droit maritime, droit des assurances, droit "
            "bancaire, commercial et fiscal. Président honorifique de la LTDH.",
        facts=[("Spécialités", "Droit pénal · Affaires d'opinion · Maritime · Banque"),
               ("Distinctions", "Président honorifique de la Ligue Tunisienne des Droits de l'Homme"),
               ("Fonction", "Associé senior du cabinet")],
        tags=["Droit pénal", "Droit bancaire", "Affaires d'opinion", "Droit maritime"],
        expertises=[3, 1, 2],
    ),
]

CLIENTS = [
    ("bft-stb.png",     "BFT — STB Bank"),
    ("qnb.png",         "QNB Bank"),
    ("tsb.png",         "Tunisian Saudi Bank"),
    ("conect.png",      "CONECT — Confédération des Entreprises Citoyennes de Tunisie"),
    ("seabel.png",      "Seabel Hotels — Tunisie Groupe"),
    ("palm-beach.png",  "Palm Beach Hotels — Tunisie"),
    ("villa-didon.png", "Villa Didon Carthage"),
    ("finzi.png",       "Finzi — Usines Graphiques"),
    ("systra-studi.png","Groupe STUDI"),
    ("gamma-plast.png", "Gamma Plast"),
    ("mcm.png",         "MCM — Marketing Communication Media"),
    ("croissant-rouge.png", "Le Croissant-Rouge Tunisien"),
]

PUBLICATIONS = [
    dict(
        slug="publication-cession-du-fonds-de-commerce-exploite-en-franchise.html",
        title="La cession du fonds de commerce exploité en Franchise",
        short_title="Cession de fonds en Franchise",
        date="24 mai 2018",
        author="Me Slim Bouderbala",
        author_slug="avocat-slim-bouderbala.html",
        author_role="Avocat Associé · Gérant du cabinet",
        author_img="slim-bouderbala.jpg",
        category="Droit des affaires & Distribution",
        read_time="6 min de lecture",
        kicker="Fonds de commerce, franchise et transmission d'entreprise.",
        text="Le fonds de commerce exploité en franchise présente des particularités propres, tant dans sa valeur que dans les modalités de sa cession.",
        original_url="https://www.jurisaffaires.tn/droit/cession-du-fonds-de-commerce-exploite-en-franchise/",
        takeaways=[
            "Autonomie juridique du franchisé : titulaire d'une clientèle locale et d'un fonds propre distinct de l'enseigne.",
            "Clause d'agrément et droit de préemption : mécanismes contractuels déterminants du franchiseur à purger impérativement.",
            "Droit au bail commercial : transfert de plein droit protégé par le Code de commerce tunisien.",
            "Séquestre et oppositions : sécurisation impérative des fonds jusqu'à expiration des délais légaux du RNE."
        ],
        sections=[
            ("I. L'autonomie du fonds franchisé et la dualité de clientèle", [
                "L'exploitation d'une franchise pose une question fondamentale en droit commercial et en matière d'évaluation d'entreprise : à qui appartient véritablement la clientèle attachée au point de vente ?",
                "La jurisprudence tunisienne et comparée consacre aujourd'hui avec constance l'indépendance juridique du franchisé. Bien que soumis au respect des normes et du concept développés par le franchiseur, le commerçant franchisé supporte l'intégralité des risques financiers et des investissements d'exploitation.",
                "Dès lors, si la notoriété de l'enseigne et les signes distinctifs demeurent la propriété exclusive de la tête de réseau, la clientèle de proximité, fidélisée par les diligences propres de l'exploitant local, constitue l'élément constitutif central de son fonds de commerce.",
                "Cette distinction est capitale : lors de la négociation du prix de cession, l'expert évaluateur et le conseil juridique doivent dissocier la survaleur issue de la marque de la rentabilité intrinsèque générée par l'exploitant."
            ]),
            ("II. Les clauses contractuelles d'agrément et de préemption", [
                "La spécificité majeure de la cession d'un fonds exploité sous franchise réside dans la force de l'<em>intuitu personae</em> qui caractérise le contrat de franchise initial.",
                "Pratiquement tous les contrats de distribution et d'affiliation contiennent une <strong>clause d'agrément</strong>. En vertu de celle-ci, la cession du fonds au profit d'un acquéreur tiers est subordonnée à l'accord préalable exprès du franchiseur, qui vérifie les aptitudes professionnelles, l'honorabilité et la solvabilité du repreneur.",
                "Parallèlement, le contrat prévoit fréquemment un <strong>pacte de préférence ou droit de préemption</strong> au bénéfice du franchiseur. Celui-ci dispose d'un délai déterminé pour se substituer au cessionnaire envisagé, aux conditions et prix convenus dans le compromis.",
                "L'omission de ces formalités contractuelles entraîne l'inopposabilité de la cession à l'égard du réseau et la résiliation immédiate du contrat d'enseigne aux torts du cédant, privant instantanément le fonds cédé de son exploitation sous marque."
            ]),
            ("III. Le sort du bail commercial et les formalités légales", [
                "Conformément aux dispositions du Code de commerce régissant les baux commerciaux en Tunisie, la cession du fonds de commerce emporte de plein droit transmission du bail au successeur, nonobstant toute clause prohibitive ou restrictive contenue dans le bail d'origine.",
                "Cette cession du droit au bail demeure toutefois conditionnée à la poursuite dans les lieux loués de la même activité commerciale ou d'une activité connexe.",
                "Sur le plan formel, la vente doit faire l'objet d'un acte authentique ou sous seing privé rédigé avec rigueur, suivi des mesures de publicité légale obligatoires au Journal Officiel et au Registre National des Entreprises (RNE).",
                "Ces publications ouvrent un délai légal durant lequel les créanciers du cédant peuvent former opposition au paiement du prix. La désignation d'un séquestre juridique (le cabinet d'avocats rédacteur) constitue la garantie indispensable pour sécuriser tant l'acquéreur contre le passif antérieur que le vendeur dans le règlement définitif de ses droits."
            ]),
            ("Conseils pratiques pour sécuriser la transmission", [
                "1. <strong>Audit juridique préliminaire</strong> : examiner attentivement les durées résiduelles du contrat de franchise et du bail commercial avant toute offre ferme.",
                "2. <strong>Rédaction sous conditions suspensives</strong> : lier l'engagement d'achat à l'agrément définitif du repreneur par le franchiseur et à la purge des préemptions.",
                "3. <strong>Période de transition concertée</strong> : prévoir contractuellement une phase d'accompagnement du cédant auprès du repreneur pour assurer la continuité managériale.",
                "4. <strong>Séquestre des fonds</strong> : consigner le prix auprès d'un compte professionnel séquestre jusqu'à radiation des privilèges et expiration des délais d'opposition."
            ])
        ]
    ),
    dict(
        slug="publication-plaidoyer-consecration-droit-aux-loisirs-dans-dispositions-constitution-deuxieme-republique.html",
        title="Plaidoyer pour la consécration du droit aux loisirs dans les dispositions de la constitution",
        short_title="Droit aux loisirs & Constitution",
        date="24 janvier 2018",
        author="Me Taoufik Bouderbala",
        author_slug="avocat-taoufik-bouderbala.html",
        author_role="Avocat Associé Senior · Ancien Bâtonnier",
        author_img="taoufik-bouderbala.jpg",
        category="Droits fondamentaux & Libertés",
        read_time="7 min de lecture",
        kicker="Droits fondamentaux et protection constitutionnelle des libertés.",
        text="Un plaidoyer en faveur de l'inscription et de la garantie effective du droit aux loisirs dans l'ordonnancement constitutionnel de la République.",
        original_url="https://www.jurisaffaires.tn/droit/plaidoyer-consecration-droit-aux-loisirs-dans-dispositions-constitution-deuxieme-republique/",
        takeaways=[
            "Dignité et équilibre humain : le loisir n'est pas un luxe mais une composante vitale de la santé et de la citoyenneté.",
            "Ancrage universel : fondé sur l'article 24 de la DUDH et les pactes internationaux relatifs aux droits économiques et sociaux.",
            "Obligations concrètes de l'État : aménagement des espaces publics, accessibilité des infrastructures et préservation du littoral.",
            "Portée constitutionnelle : protection juridictionnelle contre la précarisation des rythmes de vie et les atteintes au domaine public."
        ],
        sections=[
            ("I. Le loisir comme composante indissociable de la dignité humaine", [
                "Dans la hiérarchie des droits et libertés, le droit aux loisirs et au repos a trop souvent été relégué au rang d'agrément secondaire ou de privilège réservé à certaines catégories socioprofessionnelles.",
                "Pourtant, une analyse approfondie de la condition humaine démontre que le temps libéré du travail est la condition <em>sine qua non</em> de l'épanouissement personnel, du développement culturel et de la participation active à la vie civique.",
                "Dans un monde moderne caractérisé par l'intensification des cadences productives et la porosité grandissante entre sphère professionnelle et vie privée, la consécration d'un temps de repos effectif participe directement de la sauvegarde de la santé physique et mentale des citoyens."
            ]),
            ("II. Les sources normatives internationales et comparées", [
                "L'affirmation de ce droit s'inscrit dans le prolongement direct des grands textes fondateurs du droit international des droits de l'Homme :",
                "• L'<strong>article 24 de la Déclaration Universelle des Droits de l'Homme (1948)</strong> dispose solennellement que : <em>« Toute personne a droit au repos et aux loisirs et notamment à une limitation raisonnable de la durée du travail et à des congés payés périodiques »</em>.",
                "• Le <strong>Pacte international relatif aux droits économiques, sociaux et culturels (PIDESC)</strong> reprend ces exigences en son article 7 en les qualifiant de conditions de travail justes et favorables.",
                "• De nombreuses constitutions modernes et déclarations régionales des droits intègrent désormais expressément la protection du temps libre, des activités sportives et de l'accès aux richesses culturelles comme des libertés publiques opposables."
            ]),
            ("III. Les obligations positives pesant sur les pouvoirs publics", [
                "L'inscription constitutionnelle du droit aux loisirs ne relève pas d'une pétition de principe abstraite : elle implique des obligations positives très concrètes à la charge de l'État et des municipalités.",
                "Ces obligations se déclinent notamment à travers :",
                "• <strong>L'aménagement urbain équitable</strong> : garantir dans chaque cité et quartier des espaces verts, des parcs publics sécurisés et des installations sportives de proximité ouvertes à tous.",
                "• <strong>La défense du domaine public maritime et naturel</strong> : préserver le littoral et les plages contre les empiétements illégaux et la privatisation sauvage, afin de maintenir un accès libre et gratuit de la population à la mer.",
                "• <strong>La politique culturelle et tarifaire</strong> : encourager l'accès aux théâtres, musées, bibliothèques et manifestations artistiques par des politiques tarifaires inclusives à l'intention des jeunes et des familles modestes."
            ]),
            ("Conclusion : un impératif de modernité constitutionnelle", [
                "Consacrer le droit aux loisirs au plus haut sommet de l'ordre juridique, c'est proclamer que la finalité ultime de l'organisation politique et sociale n'est pas uniquement la production économique, mais la plénitude de la vie humaine.",
                "C'est reconnaître que chaque citoyen a droit au repos, à la culture, au sport et à la contemplation dans un environnement sain et protecteur."
            ])
        ]
    ),
]


STATS_FIXED = [
    ("40+",  "Années d'expérience"),
    ("4",    "Avocats au Barreau de Tunis"),
    ("15",   "Domaines d'intervention"),
    ("5",    "Pôles d'expertise structurés"),
]

ALL_DOMAINS = [
    "Droit des sociétés", "Droit bancaire", "Droit fiscal", "Droit commercial",
    "Contentieux commercial", "Droit immobilier", "Droit social",
    "Droit du sport", "Droit pénal général", "Droit pénal spécial",
    "Affaires politiques et d'opinion", "Droit maritime", "Droit des assurances",
    "Droit civil", "Droits de l'Homme",
]

ARROW = ('<svg class="btn__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
         'stroke-width="1.4" aria-hidden="true"><path d="M2 8h12M9.5 3.5 14 8l-4.5 4.5"/></svg>')

# Same glyph, but carrying the index-row hover behaviour instead.
ARROW_IDX = ARROW.replace('class="btn__arrow"', 'class="hero-index__arrow"')

# ---------------------------------------------------------------- chrome

def asset_version(rel_path):
    """Empreinte courte du fichier, pour casser le cache du navigateur.

    Sans cela, un navigateur qui a déjà chargé une version antérieure de
    style.css peut conserver l'ancienne feuille de style tout en récupérant
    le nouveau HTML : la page s'affiche alors sans aucune mise en forme.
    """
    try:
        with open(os.path.join(ROOT, rel_path), "rb") as fh:
            return hashlib.md5(fh.read()).hexdigest()[:8]
    except OSError:
        return "0"


CSS_V = asset_version(os.path.join("assets", "css", "style.css"))
JS_V = asset_version(os.path.join("assets", "js", "main.js"))

# Sécurité de présentation : si style.css arrive en retard ou échoue, aucun
# SVG inline ne doit pouvoir s'étendre sur toute la page.
CRITICAL_CSS = """<style>
svg{width:1em;height:1em;flex:none}
.brand__logo{height:38px;width:auto;display:block}
</style>"""


def legal_ld(page_url, page_name):
    """Donnees structurees du cabinet.

    Tous les champs proviennent des constantes reelles du site actuel :
    aucune adresse, aucun telephone, aucun nom n'est invente ici.
    """
    import json as _json
    data = {
        "@context": "https://schema.org",
        "@type": "LegalService",
        "name": "JurisAffaires — Avocats & Conseils",
        "url": page_url,
        "email": EMAIL,
        "telephone": PHONE_MAIN,
        "description": (
            "Cabinet d'avocats et de conseil en droit des affaires, "
            "banque et finance, immobilier, contentieux et droit du sport, "
            "installe a Tunis."
        ),
        "address": {
            "@type": "PostalAddress",
            "streetAddress": ADDRESS_1,
            "addressLocality": "Tunis",
            "postalCode": "1001",
            "addressCountry": "TN",
        },
        "areaServed": {"@type": "Country", "name": "Tunisie"},
        "knowsLanguage": "fr",
    }
    data["telephone"] = [PHONE_MAIN, PHONE_2, PHONE_3]
    return _json.dumps(data, ensure_ascii=False, separators=(",", ":"))


LD_JSON = legal_ld(SITE_URL, "Accueil")


def head(title, desc, extra="", og_title=None, og_url=None):
    # Le titre de partage reprend le titre de l onglet en entier : le
    # tronquer sur le premier tiret coupait la page d'accueil a
    # « JurisAffaires », sans gain reel dans un apercu.
    og_title = og_title or title.strip()
    og_url = (og_url or SITE_URL).rstrip("/") + "/"
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#08110E">
<link rel="canonical" href="{SITE_URL}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'%3E%3Crect width='34' height='34' rx='7' fill='%234F6C62'/%3E%3Cg fill='none' stroke='%23AE9A63' stroke-width='1.5' stroke-linecap='round'%3E%3Cpath d='M11 7v16a3 3 0 0 0 3 3h3M6.5 13h9M8 13l-3 6h6zM24 8v13M19.5 12h9M21 12l-3 5h6zM24 8l3 4h-6z'/%3E%3C/g%3E%3C/svg%3E">
<meta property="og:type" content="website">
<meta property="og:site_name" content="JurisAffaires">
<meta property="og:locale" content="fr_TN">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{og_url}">
<meta property="og:image" content="{SITE_URL}assets/img/editorial-hero.jpg">
<meta property="og:image:width" content="1376">
<meta property="og:image:height" content="768">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{og_title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{SITE_URL}assets/img/editorial-hero.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,200..500;1,6..72,200..400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v={CSS_V}">
<script type="application/ld+json">{LD_JSON}</script>
<script>document.documentElement.className += " js";</script>
{CRITICAL_CSS}
{extra}</head>

<body>
<a class="skip-link" href="#main">Aller au contenu principal</a>
<div class="scroll-progress" id="progress" aria-hidden="true"></div>
"""


def header(active=""):
    def nav_link(href, label):
        cls = " is-active" if href == active else ""
        cur = ' aria-current="page"' if href == active else ""
        return f'        <a class="nav__link{cls}" href="{href}"{cur}>{label}</a>'

    links = "\n".join(nav_link(href, label) for href, label in NAV)

    def mobile_item(i, href, label):
        cur = ' aria-current="page"' if href == active else ""
        return (f'      <li class="mobile-menu__item"><a class="mobile-menu__link"'
                f' href="{href}" style="animation-delay:.{i * 6 + 6:02d}s"{cur}>'
                f'<span aria-hidden="true">{i + 1:02d}</span>{label}</a></li>')
    return f"""
<header class="header" id="header">
  <div class="container">
    <div class="header__bar">

      <a class="brand" href="index.html" aria-label="JurisAffaires — retour à l'accueil">
        <img src="assets/img/logo-jurisaffaires.png" alt="JurisAffaires — Avocats &amp; Conseils" class="brand__logo" width="230" height="38">
      </a>

      <nav class="nav" aria-label="Navigation principale">
{links}
      </nav>

      <div class="header__actions">
        <a class="header__phone" href="tel:+21671256751">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>
          </svg>
          {PHONE_MAIN}
        </a>

        <a class="btn btn--sm header__cta" href="contact.html">
          Prendre contact
          {ARROW}
        </a>

        <button class="burger" id="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="mobileMenu">
          <span class="burger__lines"><span></span><span></span><span></span></span>
        </button>
      </div>

    </div>
  </div>
</header>

<div class="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Menu de navigation" aria-hidden="true">
  <nav aria-label="Navigation mobile">
    <ul class="mobile-menu__list">
{chr(10).join(mobile_item(i, h, l) for i, (h, l) in enumerate(NAV))}
    </ul>
  </nav>

  <div class="mobile-menu__foot">
    <dl class="mobile-menu__contact">
      <dt>Adresse</dt>
      <dd><a href="{MAP_URL}" target="_blank" rel="noopener">{ADDRESS_1} — {ADDRESS_2.replace(' — Tunisie', '')}</a></dd>
      <dt>Téléphone</dt>
      <dd><a href="tel:+21671256751">{PHONE_MAIN}</a></dd>
      <dt>Courriel</dt>
      <dd><a href="mailto:{EMAIL}">{EMAIL}</a></dd>
    </dl>
    <div class="mobile-menu__actions">
      <a class="btn" href="tel:+21671256751">Appeler le cabinet</a>
      <a class="btn btn--ghost btn--ghost-light" href="contact.html">Prendre contact</a>
    </div>
  </div>
</div>
"""


def subnav(current):
    links = "\n".join(
        f'      <a class="subnav__link{" is-current" if h == current else ""}" href="{h}">{l}</a>'
        for h, l in EXPERTISE_SUBNAV)
    return f"""
<nav class="subnav" aria-label="Nos expertises">
  <div class="container">
    <div class="subnav__inner">
{links}
    </div>
  </div>
</nav>
"""


def footer():
    return f"""
<section class="mega" aria-labelledby="mega-title">
  <div class="container">
    <h2 class="mega__line" id="mega-title"><a href="contact.html">Parlons de votre dossier.</a></h2>
    <p class="mega__line mega__line--alt">
      <a href="mailto:{EMAIL}">avocats-conseils@jurisaffaires.net</a>
      <span class="mega__dot" aria-hidden="true"></span>
    </p>
    <ul class="mega__links">
      <li><a href="tel:+21671256751">(+216) 71 256 751</a></li>
      <li><a href="expertises.html">Expertises</a></li>
      <li><a href="equipe.html">Équipe</a></li>
    </ul>
  </div>
</section>

<footer class="footer">
  <div class="container">
    <div class="footer__grid">

      <div class="footer__brand">
        <a class="brand" href="index.html" aria-label="JurisAffaires — retour à l'accueil">
          <img src="assets/img/logo-jurisaffaires-light.png" alt="JurisAffaires — Avocats &amp; Conseils" class="brand__logo brand__logo--light" width="230" height="38">
        </a>
        <p>
          Société professionnelle d'avocats inscrite au Barreau de Tunis, au
          service de la sécurité juridique et de l'efficacité de vos relations
          contractuelles depuis plus de quarante années.
        </p>
        <p class="footer__motto">Servir — Conseiller — Défendre</p>
      </div>

      <div class="footer__col">
        <h3>Navigation</h3>
        <ul>
          <li><a href="le-cabinet.html">Le Cabinet</a></li>
          <li><a href="expertises.html">Expertises</a></li>
          <li><a href="equipe.html">Équipe</a></li>
          <li><a href="publications.html">Publications</a></li>
          <li><a href="references.html">Références</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>

      <div class="footer__col">
        <h3>Expertises</h3>
        <ul>
          <li><a href="{PILLARS[0]['slug']}">Droit des affaires</a></li>
          <li><a href="{PILLARS[1]['slug']}">Banque, finance &amp; assurances</a></li>
          <li><a href="{PILLARS[2]['slug']}">Immobilier, social &amp; maritime</a></li>
          <li><a href="{PILLARS[3]['slug']}">Contentieux, pénal &amp; libertés</a></li>
          <li><a href="{SPORT['slug']}">Droit du sport</a></li>
        </ul>
      </div>

      <div class="footer__col">
        <h3>Contact</h3>
        <ul>
          <li><a href="{MAP_URL}" target="_blank" rel="noopener">{ADDRESS_1}<br>{ADDRESS_2}</a></li>
          <li><a href="tel:+21671256751">{PHONE_MAIN}</a></li>
          <li><a href="tel:+21671256752">{PHONE_2}</a></li>
          <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
        </ul>
      </div>

    </div>

    <div class="footer__bottom">
      <p class="footer__copy">
        © <span id="year">2026</span> <b>{LEGAL_NAME}</b> — Tous droits réservés.
      </p>
      <nav class="footer__legal" aria-label="Liens légaux">
        <a href="mentions-legales.html">Mentions légales</a>
        <a href="politique-de-confidentialite.html">Politique de confidentialité</a>
      </nav>
    </div>
  </div>
</footer>

<nav class="sticky-bar" id="stickyBar" aria-label="Actions rapides" aria-hidden="true" inert>
  <a class="sticky-bar__btn" href="tel:+21671256751">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>
    </svg>
    Appeler
  </a>
  <a class="sticky-bar__btn sticky-bar__btn--accent" href="contact.html">Prendre contact</a>
</nav>

<script src="assets/js/main.js?v={JS_V}"></script>
</body>
</html>
"""


def page_h(*parts, title, desc, active="", extra_head="", body_class=""):
    """Assemble a full document from a shared chrome + page body."""
    return (head(title, desc, extra_head)
            + header(active)
            + f'\n<main id="main"{(" class=" + body_class) if body_class else ""}>\n'
            + "\n".join(parts)
            + "\n</main>\n"
            + footer())


def write(name, html):
    # Canonical propre a chaque page : on le resout ici, au seul endroit ou
    # l'on connait a la fois le nom du fichier et le document assemble.
    # Dimensions intrinsiques sur chaque <img> qui n'en a pas : le navigateur
    # reserve la place avant chargement, ce qui supprime le saut de mise en page.
    import re as _re
    from PIL import Image as _Image

    def _dims(tag):
        m = _re.search(r'src="([^"]+)"', tag)
        if not m:
            return tag
        fp = os.path.join(ROOT, m.group(1).split("?")[0])
        if not os.path.exists(fp):
            return tag
        try:
            with _Image.open(fp) as im:
                w, h = im.size
        except Exception:
            return tag
        return tag[:-1].rstrip() + ' width="%d" height="%d">' % (w, h)

    html = _re.sub(r"<img(?![^>]*\swidth=)[^>]*>", lambda _m: _dims(_m.group(0)), html)

    if name == "404.html":
        html = html.replace('<link rel="canonical" href="%s">' % SITE_URL, "", 1)
    else:
        url = SITE_URL if name == "index.html" else SITE_URL + name
        html = html.replace(
            '<link rel="canonical" href="%s">' % SITE_URL,
            '<link rel="canonical" href="%s">' % url, 1)
    path = os.path.join(ROOT, name)
    with io.open(path, "w", encoding="utf-8") as fh:
        fh.write(html)
    print("  +", name)


# ---------------------------------------------------------------- helpers

def crumb(*items):
    """items: list of (label, href|None). Last one is the current page."""
    out = ['<nav class="breadcrumb" aria-label="Fil d\'Ariane">',
           '  <a href="index.html">Accueil</a>']
    for i, (label, href) in enumerate(items):
        out.append('  <span aria-hidden="true">/</span>')
        if href:
            out.append(f'  <a href="{href}">{label}</a>')
        else:
            out.append(f'  <span aria-current="page">{label}</span>')
    out.append("</nav>")
    return "\n".join(out)


def stat_strip(dark=False, stats=None):
    stats = stats or STATS_FIXED
    items = "\n".join(
        f'    <div class="stat-strip__item"><p class="stat-strip__value">{v}</p>'
        f'<p class="stat-strip__label">{l}</p></div>' for v, l in stats)
    cls = "stat-strip" + (" on-dark" if dark else "")
    return f'<div class="{cls}">\n{items}\n</div>'


def logo_grid(dark=True):
    cells = "\n".join(
        f'    <div class="logo-cell"><img src="assets/img/clients/{f}" alt="{a}" loading="lazy"></div>'
        for f, a in CLIENTS)
    return f'<div class="logo-grid" data-reveal="fade">\n{cells}\n</div>'


def cta_band(title, text, points=None, primary="Prendre contact",
             primary_href="contact.html", secondary="Appeler le cabinet",
             secondary_href="tel:+21671256751"):
    pts = "".join(f'<li><b>{n}</b><span>{t}</span></li>' for n, t in (points or []))
    side = (f'<ul class="cta-band__points">{pts}</ul>' if pts else "")
    return f"""
<section class="cta-band grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="cta-band__inner">
      <div>
        <p class="eyebrow" data-reveal>Passons à l'action</p>
        <h2 class="cta-band__title" data-reveal>{title}</h2>
        <p class="cta-band__text" data-reveal style="--reveal-delay:80ms">{text}</p>
        <div class="btn-row" data-reveal style="--reveal-delay:140ms">
          <a class="btn" href="{primary_href}">{primary} {ARROW}</a>
          <a class="btn btn--ghost btn--ghost-light" href="{secondary_href}">{secondary}</a>
        </div>
      </div>
      <div data-reveal="right" style="--reveal-delay:100ms">
        {side}
      </div>
    </div>
  </div>
</section>
"""


MAX_VISIBLE_TAGS = 2


def tag_list(m, indent=10):
    """Liste de competences pour une carte d'équipe.

    Limite à 2 tags + '+1' pour que chaque carte ait strictement la
    même hauteur et le même nombre de lignes de badges.
    """
    tags = list(m["tags"])
    shown = tags[:MAX_VISIBLE_TAGS]
    pad = " " * indent
    rows = [f"{pad}<li>{t}</li>" for t in shown]
    rows.append(f'{pad}<li class="member__tags-more">+1</li>')
    return "\n".join(rows)


def member_card(m):
    tags = tag_list(m, 10)
    return f"""
        <article class="member" data-reveal="fade">
          <a class="member__photo" href="{m['slug']}">
            <span class="member__num">{m['num']}</span>
            <img src="assets/img/team/{m['img']}" alt="{m['alt']}" width="500" height="500" loading="lazy">
          </a>
          <h2 class="member__name"><span>Maître</span><a href="{m['slug']}">{m['first']} {m['last']}</a></h2>
          <p class="member__role">{m['role']}</p>
          <ul class="member__tags">
{tags}
          </ul>
          <a class="link-line member__cta" href="{m['slug']}">
            Voir le profil
            {ARROW}
          </a>
        </article>
"""


def pillar_card(p):
    items = "\n".join(f'          <li>{i}</li>' for i in p["items"])
    return f"""
        <a class="pillar" href="{p['slug']}" data-reveal="scale">
          <span class="pillar__num">{p['num']}</span>
          <h3 class="pillar__title">{p['title']}</h3>
          <p class="pillar__desc">{p['hero']}</p>
          <ul class="pillar__items">
{items}
          </ul>
          <span class="pillar__cta">Découvrir</span>
          <span class="pillar__go">{ARROW}</span>
        </a>
"""


def related_cards(slugs):
    out = []
    for idx in slugs:
        e = ALL_EXPERTISES[idx]
        out.append(f"""
        <a class="related__item" href="{e['slug']}" data-reveal="fade">
          <span class="related__num">{e['num']}</span>
          <span class="related__title">{e['title']}</span>
          <span class="related__meta">Consulter l'expertise {ARROW}</span>
        </a>""")
    return "\n".join(out)


# ================================================================ HOMEPAGE
# The homepage markup is carried over verbatim from the verified build; only
# the navigation now points at real pages instead of in-page anchors.

def build_home():
    html = (head(
        "JurisAffaires — Cabinet d'Avocats &amp; Conseils | Tunis",
        "JurisAffaires, cabinet d'avocats et de conseils à Tunis. Plus de 40 ans "
        "d'expérience au service des entreprises, des institutions et des "
        "dirigeants. Droit des affaires, banque et finances, immobilier, "
        "contentieux, pénal et droits de l'Homme, droit du sport.")
        + header("index.html")
        + '\n<main id="main">\n')

    with io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".home-section.html"), encoding="utf-8") as fh:
        html += fh.read()

    html += "\n</main>\n" + footer()
    write("index.html", html)


# ================================================================ LE CABINET

def build_cabinet():
    body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--split">

      <div>
        {crumb(("Le Cabinet", None))}
        <p class="eyebrow" data-reveal>Le cabinet</p>
        <h1 class="page-hero__title" data-reveal>Une histoire. Une <em>exigence</em>. Une vision.</h1>
        <p class="page-hero__text page-hero__text--short" data-reveal style="--reveal-delay:80ms">
          Quatre avocats du Barreau de Tunis. Une promesse&nbsp;: la sécurité
          juridique de vos projets.
        </p>
        <div class="btn-row" data-reveal style="--reveal-delay:140ms">
          <a class="btn" href="contact.html">Prendre contact {ARROW}</a>
          <a class="btn btn--ghost btn--ghost-light" href="equipe.html">Rencontrer l'équipe</a>
        </div>
      </div>

    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    {stat_strip(stats=STATS_FIXED)}
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="split split--wide-right">
      <div class="on-dark" style="background:var(--ink);padding:clamp(28px,3vw,40px)">
        <blockquote class="pull" style="margin:0;border:0;padding:0;color:#FBF8F2" data-reveal>
          « Servir — Conseiller — Défendre »
        </blockquote>
        <p data-reveal style="--reveal-delay:80ms;margin-top:26px;padding-top:20px;border-top:1px solid var(--line-dark);font-size:.875rem;line-height:1.7;color:rgba(244,240,232,.6);font-weight:300">
          L'engagement de chaque avocat du cabinet.
        </p>
      </div>

      <div class="prose">
        <figure class="editorial editorial--sm" data-reveal="fade" style="margin-bottom:30px">
          <img class="editorial__img" src="assets/img/editorial-office.jpg"
               alt="Salle de réunion du cabinet : grande table en bois, fenêtres hautes, lumière du jour."
               width="1408" height="768" loading="lazy">
          <figcaption>45, rue Ali Darghouth — Tunis</figcaption>
        </figure>
        <p class="eyebrow" data-reveal>Notre méthode</p>
        <h2 data-reveal>Comprendre avant d'agir.</h2>
        <p data-reveal style="--reveal-delay:60ms">
          Comprendre la problématique, proposer la stratégie qui optimise les
          chances de succès de vos affaires.
        </p>
        <p data-reveal style="--reveal-delay:100ms">
          <strong>Me Taoufik BOUDERBALA</strong> et <strong>Me Med Sahbi
          BOUDERBALA</strong> ont associé leurs compétences à celles de
          <strong>Me Slim BOUDERBALA</strong> et <strong>Me Faten GUEMRI</strong>&nbsp;:
          quatre profils, cinq pôles, un seul cabinet.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="section section--ivory">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>01</p>
        <p class="eyebrow" data-reveal>Nos exigences</p>
        <h2 class="d2 wipe" data-reveal><span><span>Trois valeurs qui engagent.</span></span></h2>
      </div>
      <p class="body-text" data-reveal style="--reveal-delay:100ms">
        Elles ne s'affichent pas&nbsp;: elles se pratiquent.
      </p>
    </div>

    <div class="features stagger stagger-3">
      <div class="feature" data-reveal="fade">
        <span class="feature__num">01</span>
        <h3 class="feature__title">Écoute</h3>
        <p class="feature__text">
          Une lecture attentive avant toute analyse.
        </p>
      </div>
      <div class="feature" data-reveal="fade">
        <span class="feature__num">02</span>
        <h3 class="feature__title">Rigueur</h3>
        <p class="feature__text">
          Un traitement exigeant, un accompagnement continu.
        </p>
      </div>
      <div class="feature" data-reveal="fade">
        <span class="feature__num">03</span>
        <h3 class="feature__title">Réactivité</h3>
        <p class="feature__text">
          L'efficacité au service de la défense.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="section section--ink cabinet grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="cabinet__grid">
      <figure class="cabinet__figure" data-reveal="left">
        <img src="assets/img/hero-architecture.jpg" alt="Détail d'une façade architecturale — lumière et ombre, Tunis." width="900" height="1125" loading="lazy">
        <figcaption>{ADDRESS_1} — Tunis</figcaption>
      </figure>
      <div class="cabinet__body">
        <p class="eyebrow" data-reveal>Identité</p>
        <h2 class="d2 wipe" data-reveal><span><span>Un cabinet à taille humaine.</span></span></h2>
        <span class="draw-x" data-reveal style="margin:28px 0 28px"></span>
        <p class="body-text" data-reveal style="--reveal-delay:80ms">
          Société professionnelle d'avocats, en plein centre-ville de Tunis.
        </p>
        <blockquote class="cabinet__quote" data-reveal="fade" style="--reveal-delay:140ms">
          « Créer, développer, financer, céder, restructurer : nous vous
          accompagnons. Difficultés avec vos prestataires : nous vous assistons
          et vous représentons. »
        </blockquote>
        <div data-reveal style="--reveal-delay:180ms;margin-top:34px">
          <a class="btn" href="equipe.html">Découvrir l'équipe {ARROW}</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>02</p>
        <p class="eyebrow" data-reveal>Domaines d'intervention</p>
        <h2 class="d2 wipe" data-reveal><span><span>Quinze domaines, une seule équipe.</span></span></h2>
      </div>
      <p class="body-text" data-reveal style="--reveal-delay:100ms">
        Conseil et contentieux, avec l'avocat spécialisé du sujet.
      </p>
    </div>
    <ul class="pillars-mini stagger stagger-3">
      <li class="pillars-mini__item"><span class="pillars-mini__num">01</span><span class="pillars-mini__name">Droit des sociétés</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">02</span><span class="pillars-mini__name">Droit bancaire</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">03</span><span class="pillars-mini__name">Droit fiscal</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">04</span><span class="pillars-mini__name">Droit commercial</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">05</span><span class="pillars-mini__name">Contentieux commercial</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">06</span><span class="pillars-mini__name">Droit immobilier</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">07</span><span class="pillars-mini__name">Droit social</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">08</span><span class="pillars-mini__name">Droit du sport</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">09</span><span class="pillars-mini__name">Droit pénal général</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">10</span><span class="pillars-mini__name">Droit pénal spécial</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">11</span><span class="pillars-mini__name">Affaires politiques et d'opinion</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">12</span><span class="pillars-mini__name">Droit maritime</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">13</span><span class="pillars-mini__name">Droit des assurances</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">14</span><span class="pillars-mini__name">Droit civil</span></li>
      <li class="pillars-mini__item"><span class="pillars-mini__num">15</span><span class="pillars-mini__name">Droits de l'Homme</span></li>
    </ul>
    <div data-reveal style="margin-top:36px">
      <a class="btn btn--ghost" href="expertises.html">Voir les cinq pôles d'expertise {ARROW}</a>
    </div>
  </div>
</section>
"""
    body += cta_band(
        "Parlons de votre dossier.",
        "Un premier échange confidentiel suffit à vérifier que nous sommes le "
        "bon interlocuteur.")
    write("le-cabinet.html", page_h(
        body, active="le-cabinet.html",
        title="Le Cabinet — JurisAffaires Avocats &amp; Conseils, Tunis",
        desc="Plus de 40 ans d'expérience, quatre avocats du Barreau de Tunis, "
             "quinze domaines d'intervention. Découvrez la méthode, les valeurs "
             "et l'identité du cabinet JurisAffaires."))


# ================================================================ EXPERTISES HUB

def build_expertise_hub():
    cards = "\n".join(pillar_card(p) for p in PILLARS)
    idx_items = "\n".join(f"""
            <li class="hero-index__item">
              <a class="hero-index__link" href="{e['slug']}">
                <span class="hero-index__num">{e['num']}</span>
                <span class="hero-index__label">{e['title']}</span>
                {ARROW_IDX}
              </a>
            </li>""" for e in ALL_EXPERTISES)

    body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--split">

      <div>
        {crumb(("Expertises", None))}
        <p class="eyebrow" data-reveal>Expertises</p>
        <h1 class="page-hero__title" data-reveal>Cinq pôles. <em>Une seule</em> exigence.</h1>
        <p class="page-hero__text" data-reveal style="--reveal-delay:80ms">
          Quinze domaines, cinq pôles. Chaque dossier est confié à l'avocat
          dont la spécialisation correspond au sujet traité.
        </p>
        <div class="btn-row" data-reveal style="--reveal-delay:140ms">
          <a class="btn" href="contact.html">Décrire votre projet {ARROW}</a>
          <a class="btn btn--ghost btn--ghost-light" href="equipe.html">Voir qui intervient</a>
        </div>
      </div>

    </div>
  </div>
</section>

{subnav("expertises.html")}

<section class="section section--paper">
  <div class="container">
    <figure class="editorial editorial--wide" data-reveal="fade" style="margin-bottom:clamp(30px,3.4vw,52px)">
      <img class="editorial__img" src="assets/img/editorial-city.jpg"
           alt="Vue de la ville de Tunis en fin de journée, brume marine à l'horizon."
           width="1408" height="768" loading="lazy">
      <figcaption>Tunis — la ville où le cabinet exerce</figcaption>
    </figure>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>01</p>
        <p class="eyebrow" data-reveal>Les quatre pôles</p>
        <h2 class="d2 wipe" data-reveal><span><span>Le droit des affaires, en quatre blocs.</span></span></h2>
      </div>
    </div>

    <div class="expertise-grid stagger stagger-4">
{cards}
    </div>

    <p class="expertise-note" data-reveal="fade">
      <strong>Conseil &amp; contentieux.</strong>
      <span>En assistance permanente comme en représentation.</span>
    </p>
  </div>
</section>

<section class="section section--paper-2">
  <div class="container">
    <div class="sport" id="sport" style="margin-top:0">
      <div class="sport__bg" aria-hidden="true"></div>
      <div class="container">
        <div class="sport__inner">
          <div>
            <span class="sport__flag" data-reveal="fade"><i></i> Expertise signature</span>
            <h2 class="sport__title wipe" data-reveal><span><span>Droit du sport</span></span></h2>
            <p class="sport__desc" data-reveal style="--reveal-delay:100ms">
              Une spécialisation rare dans le paysage juridique tunisien.
            </p>
            <a class="btn" href="{SPORT['slug']}" data-reveal style="--reveal-delay:160ms;margin-top:8px">
              Découvrir cette expertise {ARROW}
            </a>
          </div>
          <ul class="sport__list" data-reveal="right" style="--reveal-delay:140ms">
            <li><span>01</span>Règlement des litiges sportifs</li>
            <li><span>02</span>Responsabilité et manquements graves</li>
            <li><span>03</span>Assistance et représentation</li>
            <li><span>04</span>Conseil aux acteurs du sport</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--ink grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="split split--wide-left">
      <div class="prose on-dark">
        <p class="eyebrow" data-reveal>Conseil &amp; contentieux</p>
        <h2 data-reveal>Le même cabinet, avant et après le litige.</h2>
        <p data-reveal style="--reveal-delay:60ms">
          Nos dossiers commencent par une question de conseil&nbsp;: structurer
          une opération, sécuriser un contrat, évaluer un risque. Lorsqu'elle
          devient un litige, nous reprenons le dossier sans perdre la stratégie.
        </p>
      </div>
      <div class="sticky-side">
        <blockquote class="pull" data-reveal="right" style="margin-top:0">
          Conseil et contentieux, sur le même dossier.
        </blockquote>
      </div>
    </div>
  </div>
</section>
"""
    body += cta_band(
        "Quel est votre sujet&nbsp;?",
        "Quelques lignes suffisent pour une première analyse.")
    write("expertises.html", page_h(
        body, active="expertises.html",
        title="Expertises — JurisAffaires Avocats &amp; Conseils, Tunis",
        desc="Cinq pôles d'expertise&nbsp;: droit des affaires, banque et "
             "assurances, immobilier et social, contentieux et pénal, droit du "
             "sport. Quinze domaines d'intervention, conseil et contentieux."))


# ================================================================ EXPERTISE PAGES

PRACTICES = {
    0: [("Droit des sociétés", "Création, cession et restructuration de sociétés. Constitution, gouvernance et opérations sur le capital.", "Conseil"),
        ("Opérations de cession d'entreprise", "Transmission d'entreprise, structuration et négociation de l'opération.", "Conseil"),
        ("Restructuration &amp; levée de fonds", "Expertise des opérations de restructuration, de cession et de levée de fonds.", "Conseil"),
        ("Arbitrage &amp; contentieux des sociétés commerciales", "Règlement amiable ou contentieux des différends entre associés et entre sociétés.", "Contentieux"),
        ("Droit commercial", "Actes de commerce, contrats commerciaux et litiges afférents.", "Contentieux")],
    1: [("Droit bancaire et financier", "Le cabinet dispose d'une expertise reconnue dans le règlement de tous différends du domaine bancaire.", "Contentieux"),
        ("Projets de développement", "Assistance et représentation sur tout projet de développement et de financement.", "Conseil"),
        ("Conformité &amp; bancassurance", "Conformité bancaire et questions liées à la bancassurance.", "Conseil"),
        ("Droit fiscal", "Assistance et représentation en matière fiscale, en coordination avec vos conseils comptables.", "Conseil"),
        ("Droit des assurances", "Couverture, sinistres, recours et Contentieux d'assurance.", "Contentieux")],
    2: [("Transactions immobilières", "Achat, vente et fiscalité immobilières. Cabinet notamment spécialisé en droit des ventes immobilières aux enchères publiques.", "Conseil"),
        ("Droit social &amp; prud'hommes", "Expertise reconnue dans le traitement des litiges des prud'hommes. Une approche préventive est toujours conseillée, dans l'objectif de garantir un certain équilibre entre le patronat et le salariat.", "Contentieux"),
        ("Droit maritime", "Droit maritime, en conseil comme en contentieux.", "Conseil"),
        ("Droit civil", "Obligations, responsabilité et recours.", "Contentieux")],
    3: [("Contentieux commercial &amp; civil", "Défense de vos intérêts devant les tribunaux et les instances.", "Contentieux"),
        ("Droit pénal général &amp; spécial", "Contentieux, risque pénal et assistance.", "Contentieux"),
        ("Affaires politiques et d'opinion", "Accompagnement juridique dans un contexte politique ou d'opinion.", "Conseil"),
        ("Droits de l'Homme", "Le cabinet met à votre service son expérience de plus de 40 ans dans la défense des droits inaliénables de la personne.", "Contentieux")],
    4: [("Règlement des litiges sportifs", "Assistance et représentation pour le règlement des litiges sportifs.", "Contentieux"),
        ("Responsabilité &amp; manquements graves", "Responsabilité des acteurs du sport, manquements graves et discipline.", "Contentieux"),
        ("Assistance &amp; représentation", "Devant les instances sportives et juridictionnelles compétentes.", "Contentieux"),
        ("Conseil aux acteurs du sport", "Conseil juridique aux acteurs du sport.", "Conseil")],
}

ENGAGEMENTS = {
    0: [("Un interlocuteur identifié", "L'associé dont la spécialisation correspond au sujet."),
        ("Sécurisation avant exécution", "Avant la signature, non après."),
        ("Continuité conseil / contentieux", "Sans rupture de continuité.")],
    1: [("Réactivité bancaire", "Délais courts&nbsp;: l'équipe adaptée est mobilisée immédiatement."),
        ("Conseil et contentieux", "À l'amiable, puis en contentieux si nécessaire."),
        ("Coordination avec vos conseils", "En binôme avec vos directions.")],
    2: [("Approche préventive", "Avant que le litige ne naisse."),
        ("Enchères publiques", "Ventes immobilières aux enchères publiques."),
        ("Équilibre des intérêts", "Un accord qui préserve l'équilibre.")],
    3: [("Délits d'affaires", "Risque pénal des entreprises, affaires d'opinion."),
        ("Défense des libertés", "40 ans de défense des droits de la personne."),
        ("Coordination pénal / civil", "Défense pénale et ses suites civiles.")],
    4: [("Spécialisation assumée", "Un avocat spécialisé du cabinet."),
        ("Connaissance du milieu", "Litiges sportifs, responsabilité des acteurs."),
        ("Assistance &amp; représentation", "Assistance et représentation.")],
}


def build_expertise(e):
    idx = ALL_EXPERTISES.index(e)
    practices = PRACTICES[idx]
    eng = ENGAGEMENTS[idx]

    rows = "\n".join(f"""
        <div class="practice__row" data-reveal="fade">
          <span class="practice__num">{i + 1:02d}</span>
          <h3 class="practice__title"><a href="{domain_slug(t)}">{t}</a></h3>
          <span class="practice__tag">{tag}</span>
          <p class="practice__desc">{d}</p>
        </div>""" for i, (t, d, tag) in enumerate(practices))

    engs = "\n".join(f"""
        <div class="feature" data-reveal="fade">
          <h3 class="feature__title">{t}</h3>
          <p class="feature__text">{d}</p>
        </div>""" for t, d in eng)

    aside_items = "\n".join(
        f'          <li><b>{i + 1:02d}</b><span>{t}</span></li>'
        for i, (t, _, _) in enumerate(practices))

    # lawyers linked to this expertise
    lawyers = "\n".join(
        f"""        <a class="related__item" href="{TEAM[j]['slug']}" data-reveal="fade">
          <span class="related__num">Me</span>
          <span class="related__title">{TEAM[j]['first']} {TEAM[j]['last']}</span>
          <span class="related__meta">{TEAM[j]['role']}</span>
        </a>""" for j, m in enumerate(TEAM) if idx in m["expertises"])

    others = [i for i in range(5) if i != idx]

    body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <span class="page-hero__num" aria-hidden="true">{e['num']}</span>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--solo">

      <div>
        {crumb(("Expertises", "expertises.html"), (e["title"].replace("&amp;", "&"), None))}
        <p class="eyebrow" data-reveal>Expertise {e['num']}</p>
        <h1 class="page-hero__title" data-reveal>{e['title']}</h1>
        <p class="hero-lede-strong" data-reveal style="--reveal-delay:60ms;font-family:var(--font-display);font-size:clamp(1.25rem,2.1vw,1.7rem);font-weight:300;line-height:1.3;color:var(--slate);max-width:20ch;margin-bottom:22px">{e['hero']}</p>
        <p class="page-hero__text" data-reveal style="--reveal-delay:100ms">{e['lede']}</p>
        <div class="btn-row" data-reveal style="--reveal-delay:160ms">
          <a class="btn" href="contact.html">Parler de votre dossier {ARROW}</a>
          <a class="btn btn--ghost btn--ghost-light" href="tel:+21671256751">{PHONE_MAIN}</a>
        </div>
      </div>

    </div>
  </div>
</section>

{subnav(e['slug'])}

<section class="section section--paper">
  <div class="container">
    <div class="split split--wide-right">
      <div class="prose">
        <p class="eyebrow" data-reveal>Le périmètre</p>
        <h2 data-reveal>Ce que couvre cette expertise.</h2>
        <p data-reveal style="--reveal-delay:60ms">{e['card']} De la structuration à l'exécution.</p>
      </div>
      <div class="sticky-side">
        <div class="aside-panel on-dark" style="background:var(--ink)" data-reveal="right">
          <p class="aside-panel__title">En pratique</p>
          <ul>
            <li><b>01</b><span>Conseil et contentieux sur le même dossier</span></li>
            <li><b>02</b><span>Confidentiel dès le premier échange</span></li>
            <li><b>03</b><span>Cabinet au {ADDRESS_1}, Tunis</span></li>
          </ul>
          <a class="btn btn--sm" href="contact.html" style="margin-top:26px;width:100%">Prendre contact</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--ivory">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>01</p>
        <p class="eyebrow" data-reveal>Nos interventions</p>
        <h2 class="d2 wipe" data-reveal><span><span>Les matières, une par une.</span></span></h2>
      </div>
    </div>
    <div class="practice">
{rows}
    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>02</p>
        <p class="eyebrow" data-reveal>Nos engagements</p>
        <h2 class="d2 wipe" data-reveal><span><span>Comment nous intervenons.</span></span></h2>
      </div>
    </div>
    <div class="features stagger stagger-3">
{engs}
    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>03</p>
        <p class="eyebrow" data-reveal>L'équipe</p>
        <h2 class="d2 wipe" data-reveal><span><span>Qui intervient sur ce dossier.</span></span></h2>
      </div>
    </div>
    <div class="related stagger stagger-3">
{lawyers}
{related_cards(others[:3])}
    </div>
  </div>
</section>
"""
    body += cta_band(
        "Une question sur ce sujet&nbsp;?",
        "Échangez avec nos avocats avant de décider.")
    write(e["slug"], page_h(
        body, active="expertises.html",
        title=f"{e['title'].replace('&amp;', '&')} — JurisAffaires, Tunis",
        desc=f"{e['hero']} {e['lede']} Cabinet d'avocats à Tunis — "
             "conseil et contentieux."))


# ================================================================ TEAM HUB

def build_team():
    cards = "\n".join(member_card(m) for m in TEAM)
    body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--split">
      <div>
        {crumb(("L'équipe", None))}
        <p class="eyebrow" data-reveal>L'équipe</p>
        <h1 class="page-hero__title" data-reveal>Quatre avocats, <em>quatre</em> expertises.</h1>
        <p class="page-hero__text page-hero__text--short" data-reveal style="--reveal-delay:80ms">
          Un interlocuteur nommé pour chaque dossier.
        </p>
        <div class="btn-row" data-reveal style="--reveal-delay:140ms">
          <a class="btn" href="contact.html">Rencontrons-nous {ARROW}</a>
          <a class="btn btn--ghost btn--ghost-light" href="expertises.html">Voir les expertises</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="team-grid stagger stagger-4">
{cards}
    </div>

    <div class="team-footnote" data-reveal="fade">
      <p>
        Nos quatre avocats du Barreau de Tunis interviennent dans différents
        domaines du droit. Chacun dans son domaine de spécialisation.
      </p>
      <a class="link-line" href="contact.html">Rencontrons-nous {ARROW}</a>
    </div>
  </div>
</section>

<section class="section section--ink grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="split split--wide-left">
      <div class="prose on-dark">
        <p class="eyebrow" data-reveal>Notre engagement</p>
        <h2 data-reveal>Ce que vous obtenez de chaque avocat.</h2>
        <p data-reveal style="--reveal-delay:60ms">
          Indépendance, loyauté, probité, confidentialité&nbsp;: des
          engagements qui ne s'affichent pas, ils se pratiquent.
        </p>
      </div>
      <div class="sticky-side">
        <div class="features" style="grid-template-columns:1fr" data-reveal="right">
          <div class="feature">
            <span class="feature__num">01</span>
            <h3 class="feature__title">Indépendance</h3>
            <p class="feature__text">Sans conflit d'intérêts.</p>
          </div>
          <div class="feature">
            <span class="feature__num">02</span>
            <h3 class="feature__title">Probité</h3>
            <p class="feature__text">Conforme aux règles de l'art.</p>
          </div>
          <div class="feature">
            <span class="feature__num">03</span>
            <h3 class="feature__title">Secret professionnel</h3>
            <p class="feature__text">Toutes les informations échangées.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
"""
    body += cta_band(
        "Parlons de votre situation.",
        "Indiquez-nous le sujet&nbsp;: nous vous orientons vers l'avocat "
        "correspondant.")
    write("equipe.html", page_h(
        body, active="equipe.html",
        title="L'équipe — JurisAffaires Avocats &amp; Conseils, Tunis",
        desc="Les quatre avocats du Barreau de Tunis&nbsp;: Slim BOUDERBALA, "
             "Faten GUEMRI, Med Sahbi BOUDERBALA et Taoufik BOUDERBALA. "
             "Indépendance, loyauté, probité, confidentialité et secret "
             "professionnel."))


# ================================================================ LAWYER PAGES

def build_lawyer(m):
    facts = "\n".join(f"""
          <div class="facts__row">
            <span class="facts__label">{k}</span>
            <span class="facts__value">{v}</span>
          </div>""" for k, v in m["facts"])

    tags = "\n".join(f'          <li>{t}</li>' for t in m["tags"])

    pracs = []
    for ei in m["expertises"]:
        e = ALL_EXPERTISES[ei]
        pracs.append((e["title"], e["card"], e["slug"]))
    rows = "\n".join(f"""
        <div class="practice__row" data-reveal="fade">
          <span class="practice__num">{e['num']}</span>
          <h3 class="practice__title"><a href="{e['slug']}">{t}</a></h3>
          <span class="practice__tag">Expertise</span>
          <p class="practice__desc">{d}</p>
        </div>""" for e, (t, d, _) in zip([ALL_EXPERTISES[i] for i in m["expertises"]], pracs))

    colleagues = "\n".join(f"""
        <a class="related__item" href="{o['slug']}" data-reveal="fade">
          <span class="related__num">{o['num']}</span>
          <span class="related__title">{o['first']} {o['last']}</span>
          <span class="related__meta">{o['role']}</span>
        </a>""" for o in TEAM if o["slug"] != m["slug"])

    body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--plate">

      <div class="plate" data-reveal="left">
        <img src="assets/img/team/{m['img']}" alt="{m['alt']}" width="500" height="500">
      </div>

      <div>
        {crumb(("L'équipe", "equipe.html"), (f"Me {m['first']} {m['last']}", None))}
        <p class="profile-role" data-reveal>{m['role']}</p>
        <h1 class="profile-name" data-reveal><span>Maître</span>{m['first']} {m['last']}</h1>
        <p class="page-hero__text page-hero__text--short" data-reveal style="--reveal-delay:60ms">{m['bio']}</p>
        <div class="btn-row" data-reveal style="--reveal-delay:140ms;margin-top:30px">
          <a class="btn" href="contact.html">Contacter le cabinet {ARROW}</a>
          <a class="btn btn--ghost btn--ghost-light" href="tel:+21671256751">{PHONE_MAIN}</a>
        </div>
      </div>

    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="split split--wide-left">
      <div>
        <p class="eyebrow" data-reveal>Fiche du cabinet</p>
        <h2 class="d2 wipe" data-reveal><span><span>À propos</span></span></h2>
        <span class="draw-x" data-reveal style="margin:28px 0 28px"></span>
        <div class="facts" data-reveal="fade" style="border-top-color:var(--line-light)">
          <div class="facts__row"><span class="facts__label">Statut</span><span class="facts__value">{m['role']}</span></div>
{facts}
          <div class="facts__row">
            <span class="facts__label">Contact</span>
            <span class="facts__value">
              <a href="tel:+21671256751">{PHONE_MAIN}</a> · <a href="mailto:{EMAIL}">{EMAIL}</a>
            </span>
          </div>
        </div>
      </div>

      <div class="sticky-side">
        <div class="prose">
          <blockquote class="pull" data-reveal style="margin-top:0">
            « Servir — Conseiller — Défendre »
          </blockquote>
          <p data-reveal style="--reveal-delay:80ms">
            Indépendance, loyauté, probité, secret professionnel.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--ivory">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>01</p>
        <p class="eyebrow" data-reveal>Domaines d'intervention</p>
        <h2 class="d2 wipe" data-reveal><span><span>Où intervient Maître {m['last'].title()}.</span></span></h2>
      </div>
      <p class="body-text" data-reveal style="--reveal-delay:100ms">
        Les expertises traitées.
      </p>
    </div>
    <div class="practice">
{rows}
    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>02</p>
        <p class="eyebrow" data-reveal>L'équipe</p>
        <h2 class="d2 wipe" data-reveal><span><span>Les autres profils.</span></span></h2>
      </div>
    </div>
    <div class="related stagger stagger-3">
{colleagues}
    </div>
  </div>
</section>
"""
    body += cta_band(
        "Un dossier à discusser&nbsp;?",
        f"Échangez avec Maître {m['first']} {m['last']}.")
    write(m["slug"], page_h(
        body, active="equipe.html",
        title=f"Me {m['first']} {m['last']} — JurisAffaires, Tunis",
        desc=f"{m['role']} du cabinet JurisAffaires. {m['bio']}"))


# ================================================================ PUBLICATIONS

def build_publications():
    items = "\n".join(f"""
        <a class="archive__item" href="{p['slug']}" data-reveal="fade">
          <p class="archive__meta"><span>{p['category']}</span><i></i><span>{p['date']}</span><i></i><span>{p['author']}</span></p>
          <div>
            <h2 class="archive__title">{p['title']}</h2>
            <p class="archive__text">{p['kicker']}</p>
            <span class="link-line">Lire l'analyse complète {ARROW}</span>
          </div>
        </a>""" for p in PUBLICATIONS)

    body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <span class="page-hero__num" aria-hidden="true">R&amp;A</span>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--split">
      <div>
        {crumb(("Publications", None))}
        <p class="eyebrow" data-reveal>Regards &amp; analyses</p>
        <h1 class="page-hero__title" data-reveal>Le droit écrit avant <em>d'être</em> appliqué.</h1>
        <p class="page-hero__text page-hero__text--short" data-reveal style="--reveal-delay:80ms">
          Des analyses rédigées par les avocats du cabinet, sur les sujets qui
          touchent l'activité de ses clients.
        </p>
        <div class="btn-row" data-reveal style="--reveal-delay:140ms">
          <a class="btn" href="contact.html">Discuter d'un sujet {ARROW}</a>
          <a class="btn btn--ghost btn--ghost-light" href="https://www.jurisaffaires.tn/la-tribune/" target="_blank" rel="noopener">La Tribune</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>01</p>
        <p class="eyebrow" data-reveal>Archives</p>
        <h2 class="d2 wipe" data-reveal><span><span>Nos publications.</span></span></h2>
      </div>
      <p class="body-text" data-reveal style="--reveal-delay:100ms">
        Analyses et doctrines rédigées par les associés du cabinet Juris Affaires.
      </p>
    </div>

    <div class="archive">
{items}
    </div>

    <div class="notice" data-reveal style="margin-top:34px">
      <svg width="24" height="24" class="notice__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>
      </svg>
      <p><b>Démonstration.</b> Le cabinet ne publie pas d'article depuis 2018.
      Cette rubrique présente les analyses doctrinales majeures du cabinet JurisAffaires.</p>
    </div>
  </div>
</section>

<section class="section section--ink grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="split split--wide-right">
      <div class="prose on-dark">
        <p class="eyebrow" data-reveal>Pourquoi publier</p>
        <h2 data-reveal>Le droit comme actif, pas comme contrainte.</h2>
        <p data-reveal style="--reveal-delay:60ms">
          L'actualité juridique est un levier de performance, pour la sécurité
          juridique de vos opérations. Consultez-nous pour en discuter.
        </p>
      </div>
      <div class="sticky-side">
        <div class="aside-panel" data-reveal="right">
          <p class="aside-panel__title">Prendre la parole</p>
          <ul>
            <li><b>01</b><span>Une question d'interprétation à trancher</span></li>
            <li><b>02</b><span>Un projet de convention à sécuriser</span></li>
            <li><b>03</b><span>Un doute sur un risque pénal ou social</span></li>
          </ul>
          <a class="btn btn--sm" href="contact.html" style="margin-top:26px;width:100%">Poser la question</a>
        </div>
      </div>
    </div>
  </div>
</section>
"""
    body += cta_band(
        "Une question mérite un écrit.",
        "Écrivez-nous&nbsp;: la réponse est confidentielle.")
    write("publications.html", page_h(
        body, active="publications.html",
        title="Regards &amp; analyses — JurisAffaires Avocats &amp; Conseils, Tunis",
        desc="Les analyses juridiques du cabinet JurisAffaires&nbsp;: droit des "
             "affaires, fonds de commerce, franchise, droits fondamentaux et "
             "constitution."))


def build_publication_detail(pub):
    others = [p for p in PUBLICATIONS if p["slug"] != pub["slug"]]
    other_cards = "\n".join(f"""
      <article class="archive__item-wrap">
      <a class="archive__item" href="{p['slug']}">
        <p class="archive__meta"><span>{p['category']}</span><i></i><span>{p['date']}</span><i></i><span>{p['author']}</span></p>
        <div>
          <h3 class="archive__title" style="font-size:1.35rem">{p['title']}</h3>
          <p class="archive__text">{p['kicker']}</p>
          <span class="link-line">Lire l'article {ARROW}</span>
        </div>
      </a>
      </article>""" for p in others)

    takeaway_items = "\n".join(f"<li>{t}</li>" for t in pub["takeaways"])

    sections_html = []
    for sec_title, sec_paragraphs in pub["sections"]:
        p_html = "\n".join(f"<p>{p}</p>" for p in sec_paragraphs)
        sections_html.append(f"""
          <h2>{sec_title}</h2>
          {p_html}
        """)
    article_body = "\n".join(sections_html)

    body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <span class="page-hero__num" aria-hidden="true">R&amp;A</span>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--solo">
      <div>
        {crumb(("Publications", "publications.html"), (pub["short_title"], None))}
        <p class="eyebrow" data-reveal>{pub['category']}</p>
        <h1 class="page-hero__title" data-reveal>{pub['title']}</h1>
        <p class="page-hero__text" data-reveal style="--reveal-delay:60ms;font-size:1.15rem">
          {pub['kicker']}
        </p>

        <div class="article-meta" data-reveal style="--reveal-delay:100ms">
          <div class="article-meta__item">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 7h12M5 1v3M11 1v3"/></svg>
            <span>Publié le <strong>{pub['date']}</strong></span>
          </div>
          <div class="article-meta__item">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M13 14s1 0 1-1-1-4-6-4-6 3-6 4 1 1 1 1h10z"/><circle cx="8" cy="5" r="3"/></svg>
            <span>Par <a href="{pub['author_slug']}"><strong>{pub['author']}</strong></a> ({pub['author_role']})</span>
          </div>
          <div class="article-meta__item">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="7"/><path d="M8 4v4l2.5 2.5"/></svg>
            <span>{pub['read_time']}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="split split--wide-right">

      <!-- Colonne principale de lecture -->
      <article class="prose">
        <p class="article-lead">
          {pub['text']}
        </p>

        <div class="article-takeaways">
          <p class="article-takeaways__title">En synthèse — points clés retenus</p>
          <ul>
            {takeaway_items}
          </ul>
        </div>

        {article_body}

        <!-- Encadré Auteur -->
        <div class="article__author-box">
          <img src="assets/img/team/{pub['author_img']}" alt="{pub['author']}" width="76" height="76">
          <div>
            <h3>Auteur de l'analyse</h3>
            <p><strong>{pub['author']}</strong> — {pub['author_role']}. Avocat inscrit au Barreau de Tunis, intervenant au sein du cabinet JurisAffaires.</p>
            <a class="link-line" href="{pub['author_slug']}">Consulter son profil &amp; expertises {ARROW}</a>
          </div>
        </div>

        <p class="article-source">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 9v4H2V3h4M9 2h5v5M7 9l7-7"/></svg>
          <span>Article archivé d'après la publication originale sur <a href="{pub['original_url']}" target="_blank" rel="noopener">jurisaffaires.tn</a>.</span>
        </p>
      </article>

      <!-- Sidebar d'actions & contact -->
      <aside class="sticky-side">
        <div class="aside-panel" data-reveal="right">
          <p class="aside-panel__title">Conseil juridique</p>
          <p style="font-size:.9rem;line-height:1.55;color:var(--slate);margin-bottom:18px">
            Une question relative à ce sujet ou un dossier connexe à sécuriser en Tunisie ?
          </p>
          <a class="btn btn--sm" href="contact.html" style="width:100%;justify-content:center">
            Consulter l'auteur {ARROW}
          </a>
          <a class="btn btn--ghost btn--sm" href="tel:+21671256751" style="width:100%;margin-top:10px;justify-content:center">
            Appeler (+216) 71 256 751
          </a>

          <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--line-light)">
            <p style="font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--stone);margin-bottom:10px;font-weight:600">
              Cabinet JurisAffaires
            </p>
            <p style="font-size:.82rem;line-height:1.5;color:var(--slate);margin:0">
              45, rue Ali Darghouth · 1001 Tunis<br>
              Tél. : +216 71 256 751
            </p>
          </div>
        </div>
      </aside>

    </div>
  </div>
</section>

<!-- Autres publications -->
<section class="section section--ivory">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="eyebrow" data-reveal>À découvrir également</p>
        <h2 class="d2 wipe" data-reveal><span><span>Autres publications du cabinet.</span></span></h2>
      </div>
      <p class="body-text" data-reveal style="--reveal-delay:100ms">
        <a class="link-line" href="publications.html">Toutes les publications {ARROW}</a>
      </p>
    </div>

    <div class="archive" style="margin-top:28px">
      {other_cards}
    </div>
  </div>
</section>
"""
    body += cta_band(
        "Un dossier à faire analyser ?",
        f"Consultez les avocats du cabinet JurisAffaires pour un accompagnement sur mesure.")

    write(pub["slug"], page_h(
        body, active="publications.html",
        title=f"{pub['title']} — JurisAffaires Tunis",
        desc=pub["kicker"]))



# ================================================================ CONTACT

def build_contact():
    body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--split">
      <div>
        {crumb(("Contact", None))}
        <p class="eyebrow" data-reveal>Contact</p>
        <h1 class="page-hero__title" data-reveal>Parlons de votre <em>problématique</em> juridique.</h1>
        <p class="page-hero__text page-hero__text--short" data-reveal style="--reveal-delay:80ms">
          À taille humaine, à votre écoute.
        </p>
        <div class="btn-row" data-reveal style="--reveal-delay:140ms">
          <a class="btn" href="tel:+21671256751">Appeler le cabinet {ARROW}</a>
          <a class="btn btn--ghost btn--ghost-light" href="mailto:{EMAIL}">Écrire par courriel</a>
        </div>
      </div>
      <div class="aside-panel aside-panel--tight" data-reveal="right" style="--reveal-delay:120ms">
        <p class="aside-panel__title">Bureau de Tunis</p>
        <ul>
          <li><span>{ADDRESS_1}<br>{ADDRESS_2}</span></li>
          <li><span><a href="tel:+21671256751">{PHONE_MAIN}</a></span></li>
          <li><span>{HOURS}</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <figure class="editorial editorial--wide" data-reveal="fade" style="margin-bottom:clamp(30px,3.4vw,52px)">
      <img class="editorial__img" src="assets/img/editorial-tunis.jpg"
           alt="Détail de mauresque : l'ombre géométrique d'un écran sculpté sur un mur de plâtre blanc."
           width="1408" height="768" loading="lazy">
      <figcaption>45, rue Ali Darghouth — Tunis</figcaption>
    </figure>

    <div class="split split--wide-left">
      <div>
        <p class="eyebrow" data-reveal>Écrire au cabinet</p>
        <h2 class="d2 wipe" data-reveal><span><span>Décrivez votre situation.</span></span></h2>
        <span class="draw-x" data-reveal style="margin:26px 0 26px"></span>
        <p class="body-text" data-reveal style="--reveal-delay:60ms;margin-bottom:30px">
          Décrivez l'opération, l'échéance et l'enjeu&nbsp;: nous revenons vers
          vous avec une orientation.
        </p>

        <form class="form" id="contactForm" novalidate data-reveal style="--reveal-delay:100ms">
          <p class="form__hint">Les champs marqués d'un astérisque (*) sont obligatoires.</p>
          <div class="form__feedback" id="formFeedback" role="alert" aria-live="assertive" hidden></div>
          <div class="form__success" id="formSuccess" role="status" aria-live="polite" tabindex="-1" hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.6 2.5L16 9.5"/></svg>
            <div>
              <b>Votre demande est prête à être envoyée.</b>
              Votre messagerie s'ouvre avec le message pré-rempli. Si rien ne s'ouvre,
              écrivez à <a href="mailto:{EMAIL}">{EMAIL}</a> ou appelez le
              <a href="tel:+21671256751">{PHONE_MAIN}</a>.
            </div>
          </div>
          <div class="form__row form__row--2">
            <div class="field">
              <label for="f-nom">Nom et prénom <span aria-hidden="true">*</span><span class="sr-only"> (obligatoire)</span></label>
              <input id="f-nom" name="nom" type="text" autocomplete="name" placeholder="Votre nom"
                     required minlength="2" aria-describedby="err-nom">
              <p class="field__error" id="err-nom" hidden></p>
            </div>
            <div class="field">
              <label for="f-societe">Société</label>
              <input id="f-societe" name="societe" type="text" autocomplete="organization" placeholder="Nom de la société">
            </div>
          </div>
          <div class="form__row form__row--2">
            <div class="field">
              <label for="f-email">Adresse e-mail <span aria-hidden="true">*</span><span class="sr-only"> (obligatoire)</span></label>
              <input id="f-email" name="email" type="email" autocomplete="email" inputmode="email"
                     placeholder="vous@societe.tn" required aria-describedby="err-email">
              <p class="field__error" id="err-email" hidden></p>
            </div>
            <div class="field">
              <label for="f-tel">Téléphone</label>
              <input id="f-tel" name="tel" type="tel" autocomplete="tel" inputmode="tel"
                     placeholder="+216 71 256 751" pattern="[\\d\\s+\\(\\)\\.\\/\\-]{{8,25}}" aria-describedby="err-tel">
              <p class="field__error" id="err-tel" hidden></p>
            </div>
          </div>
          <div class="field">
            <label for="f-sujet">Sujet du dossier <span aria-hidden="true">*</span><span class="sr-only"> (obligatoire)</span></label>
            <select id="f-sujet" name="sujet" required aria-describedby="err-sujet">
              <option value="">Sélectionnez une expertise</option>
              <option>Droit des affaires</option>
              <option>Banque, finance &amp; assurances</option>
              <option>Immobilier, social &amp; maritime</option>
              <option>Contentieux, pénal &amp; libertés</option>
              <option>Droit du sport</option>
              <option>Autre sujet</option>
            </select>
            <p class="field__error" id="err-sujet" hidden></p>
          </div>
          <div class="field">
            <label for="f-message">Votre message <span aria-hidden="true">*</span><span class="sr-only"> (obligatoire)</span></label>
            <textarea id="f-message" name="message" placeholder="Décrivez brièvement votre cas."
                      required minlength="10" aria-describedby="err-message"></textarea>
            <p class="field__error" id="err-message" hidden></p>
          </div>
          <div class="form__foot">
            <button class="btn" type="submit">Envoyer la demande {ARROW}</button>
            <p class="form__legal" id="formLegal">
              Vos informations restent couvertes par le secret professionnel
              et ne sont transmises à aucun tiers.
            </p>
          </div>
        </form>

        <div class="notice" data-reveal style="margin-top:26px">
          <svg width="24" height="24" class="notice__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>
          </svg>
          <p><b>Comment ça marche&nbsp;?</b> La soumission ouvre votre
          messagerie avec un e-mail pré-rempli vers {EMAIL}. Aucune donnée
          n'est enregistrée sur ce site.</p>
        </div>
      </div>

      <aside class="sticky-side" aria-label="Coordonnées du cabinet">
        <div data-reveal="right">
          <div class="map-panel">
            <iframe title="Plan d'accès — 45, rue Ali Darghouth, Tunis"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=10.1734%2C36.7946%2C10.1906%2C36.8044&amp;layer=mapnik&amp;marker=36.7995%2C10.1820"
                    loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            <p class="map-panel__fallback">
              <strong>{ADDRESS_1}<br>{ADDRESS_2}</strong>
              <span>Centre-ville de Tunis, à proximité de la Avenue de la Liberté.</span>
            </p>
          </div>

          <div class="facts" style="margin-top:32px">
            <div class="facts__row"><span class="facts__label">Adresse</span><span class="facts__value">{ADDRESS_1}<br>{ADDRESS_2}</span></div>
            <div class="facts__row"><span class="facts__label">Téléphone</span><span class="facts__value"><a href="tel:+21671256751">{PHONE_MAIN}</a></span></div>
            <div class="facts__row"><span class="facts__label">Télécopieur</span><span class="facts__value">{FAX}</span></div>
            <div class="facts__row facts__row--stack"><span class="facts__label">Courriel</span><span class="facts__value"><a href="mailto:{EMAIL}">{EMAIL}</a></span></div>
            <div class="facts__row"><span class="facts__label">Horaires</span><span class="facts__value">{HOURS}</span></div>
          </div>

          <a class="btn btn--ghost" style="margin-top:26px;width:100%" target="_blank" rel="noopener"
             href="{MAP_URL}">
            Ouvrir l'itinéraire {ARROW}
          </a>
        </div>
      </aside>
    </div>
  </div>
</section>

<section class="section section--ivory">
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>01</p>
        <p class="eyebrow" data-reveal>Avant de nous écrire</p>
        <h2 class="d2 wipe" data-reveal><span><span>Trois réponses fréquentes.</span></span></h2>
      </div>
    </div>
    <div class="features stagger stagger-3">
      <div class="feature" data-reveal="fade">
        <span class="feature__num">01</span>
        <h3 class="feature__title">Le premier échange est-il confidentiel&nbsp;?</h3>
        <p class="feature__text">
          Oui, dès le premier courriel ou le premier appel.
        </p>
      </div>
      <div class="feature" data-reveal="fade">
        <span class="feature__num">02</span>
        <h3 class="feature__title">Quel avocat va traiter mon dossier&nbsp;?</h3>
        <p class="feature__text">
          L'avocat dont la spécialisation correspond au sujet.
        </p>
      </div>
      <div class="feature" data-reveal="fade">
        <span class="feature__num">03</span>
        <h3 class="feature__title">Intervenez-vous hors de Tunis&nbsp;?</h3>
        <p class="feature__text">
          Centre-ville de Tunis, avec déplacements selon le dossier.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="section section--ink grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="section-head">
      <div>
        <p class="section-index" data-reveal>02</p>
        <p class="eyebrow" data-reveal>Avant tout</p>
        <h2 class="d2 wipe" data-reveal><span><span>Identifiez votre sujet.</span></span></h2>
      </div>
    </div>
    <div class="related stagger stagger-4">
{related_cards([0, 1, 2, 3, 4][:4])}
    </div>
  </div>
</section>
"""
    write("contact.html", page_h(
        body, active="contact.html",
        title="Contact — JurisAffaires Avocats &amp; Conseils, Tunis",
        desc=f"45, rue Ali Darghouth, 1001 Tunis. {PHONE_MAIN}. "
             f"Courriel&nbsp;: {EMAIL}. Du lundi au vendredi, 8h00 à 18h30."))


# ================================================================ PAGES LÉGALES
# Ces deux pages n'avaient jamais été reprises dans le nouveau gabarit :
# elles partageaient l'ancien header, un pied de page réduit et pas de hero.
# Elles sont désormais bâties avec le même chrome que les 15 autres pages.

def legal_page(filename, eyebrow, title_txt, lede_txt, blocks, active=""):
    body = f"""
<section class="page-hero page-hero--legal grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--solo">

      <div>
        {crumb((eyebrow, None))}
        <p class="eyebrow" data-reveal>{eyebrow}</p>
        <h1 class="page-hero__title" data-reveal>{title_txt}</h1>
        <p class="page-hero__text page-hero__text--short" data-reveal style="--reveal-delay:80ms">
          {lede_txt}
        </p>
      </div>

    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="split split--wide-left">
      <div class="legal-body" data-reveal="fade">
{blocks}
      </div>

      <div class="sticky-side">
        <div class="aside-panel aside-panel--tight on-dark" data-reveal="right" style="background:var(--ink)">
          <p class="aside-panel__title">Le cabinet</p>
          <ul>
            <li><span>{ADDRESS_1}<br>{ADDRESS_2}</span></li>
            <li><span><a href="tel:+21671256751">{PHONE_MAIN}</a></span></li>
            <li><span><a href="mailto:{EMAIL}">{EMAIL}</a></span></li>
            <li><span>{HOURS}</span></li>
          </ul>
          <a class="btn btn--sm" href="contact.html" style="margin-top:26px;width:100%">Prendre contact {ARROW}</a>
        </div>

        <nav class="legal-nav" data-reveal="right" style="--reveal-delay:120ms" aria-label="Autres pages">
          <a href="mentions-legales.html" aria-current="page">Mentions légales</a>
          <a href="politique-de-confidentialite.html">Politique de confidentialité</a>
          <a href="index.html">Retour à l'accueil</a>
        </nav>
      </div>
    </div>
  </div>
</section>
"""
    write(filename, page_h(body, active=active,
                           title=f"{title_txt} — JurisAffaires Avocats &amp; Conseils, Tunis",
                           desc=lede_txt))


def build_mentions():
    blocks = """
        <h2>Éditeur du site</h2>
        <p>
          <strong>Juris Affaires Avocats &amp; Conseils</strong><br>
          Société professionnelle d'avocats inscrite au Barreau de Tunis<br>
          45, rue Ali Darghouth — 1001 Tunis, Tunisie<br>
          Téléphone : <a href="tel:+21671256751">(+216) 71 256 751</a><br>
          Télécopieur : (+216) 71 256 737<br>
          Courriel : <a href="mailto:avocats-conseils@jurisaffaires.net">avocats-conseils@jurisaffaires.net</a>
        </p>

        <h2>Directeur de la publication</h2>
        <p>Le gérant de Juris Affaires Avocats &amp; Conseils.</p>

        <h2>Hébergement</h2>
        <p>
          Le site est hébergé sur une infrastructure distante à laquelle le
          cabinet n'est pas partie prenante. Les coordonnées complètes de
          l'hébergeur sont communiquées sur simple demande écrite adressée au
          cabinet.
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          L'ensemble des contenus présents sur ce site — textes, photographies,
          logos et éléments graphiques — est protégé par le droit d'auteur.
          Toute reproduction, même partielle, est interdite sans autorisation
          écrite préalable du cabinet.
        </p>

        <h2>Les logos et références clients</h2>
        <p>
          Les marques et logos de tiers reproduits sur ce site demeurent la
          propriété de leurs titulaires respectifs et sont utilisés à des fins
          d'illustration.
        </p>

        <h2>Responsabilité</h2>
        <p>
          Les contenus publiés sur ce site ont une vocation documentaire et
          informative. Ils ne constituent pas une consultation juridique
          personnalisée et ne peuvent se substituer à l'analyse d'un avocat sur
          une situation déterminée.
        </p>

        <h2>Droit applicable</h2>
        <p>Les présentes mentions légales sont soumises au droit tunisien.</p>
    """
    legal_page("mentions-legales.html", "Informations légales",
               "Mentions légales.",
               "Éditeur, hébergement, propriété intellectuelle et droit applicable.",
               blocks, active="mentions-legales.html")


def build_privacy():
    blocks = """
        <h2>Principe général</h2>
        <p>
          Le cabinet collecte uniquement les informations que vous lui transmettez
          volontairement, et uniquement pour traiter votre demande. Aucune donnée
          n'est vendue, louée ou cédée à un tiers.
        </p>

        <h2>Données collectées</h2>
        <p>Via le formulaire de contact du site&nbsp;:</p>
        <ul>
          <li>Nom et prénom</li>
          <li>Société</li>
          <li>Adresse électronique</li>
          <li>Téléphone (facultatif)</li>
          <li>Sujet du dossier et message</li>
        </ul>

        <h2>Finalité et conservation</h2>
        <p>
          Ces informations servent uniquement à répondre à votre demande et à
          assurer la continuité des échanges. Elles sont conservées le temps
          nécessaire au traitement, puis supprimées, sauf obligation légale de
          conservation.
        </p>

        <h2>Secret professionnel</h2>
        <p>
          L'ensemble des échanges avec le cabinet est couvert par le secret
          professionnel, y compris lorsqu'il s'agit d'un premier courriel ou d'un
          premier appel.
        </p>

        <h2>Témoins de connexion</h2>
        <p>
          Le site ne dépose aucun témoin de connexion à des fins publicitaires. Seuls
          des fichiers strictement techniques peuvent être utilisés afin d'afficher
          correctement les pages.
        </p>

        <h2>Vos droits</h2>
        <p>
          Vous pouvez demander l'accès, la rectification ou la suppression de vos
          données en écrivant au cabinet. Le secret professionnel peut faire
          obstacle à la communication d'éléments issus des échanges professionnels&nbsp;;
          le cabinet vous en indiquera les limites.
        </p>

        <h2>Cookies et mesure d'audience</h2>
        <p>
          Cette maquette de démonstration ne comporte ni traçage publicitaire, ni
          mesure d'audience tierce.
        </p>
    """
    legal_page("politique-de-confidentialite.html", "Données personnelles",
               "Politique de confidentialité.",
               "Quelles données le cabinet collecte, pourquoi, et combien de temps.",
               blocks, active="politique-de-confidentialite.html")


# ================================================================ DOMAINES
# Les 22 entrées réelles de PRACTICES (titre + description + nature) sont
# aujourd'hui de simples lignes de liste. Chacune devient une page à part
# entière, sans aucun texte juridique inventé : on ne réutilise que ce que
# le cabinet publie déjà.

def domain_slug(title):
    return "domaine-" + slugify(title) + ".html"


def build_domains():
    for idx in sorted(PRACTICES):
        pole = ALL_EXPERTISES[idx]
        practices = PRACTICES[idx]
        lawyers = [m for j, m in enumerate(TEAM) if idx in m["expertises"]]

        for title, desc, tag in practices:
            slug = domain_slug(title)
            brothers = [t for (t, _, _) in practices if t != title]

            chips = "\n".join(
                f'          <li><a class="pill" href="{domain_slug(t)}">{t}</a></li>'
                for t in brothers)

            team = "\n".join(f"""
                <a class="related__item" href="{m['slug']}" data-reveal="fade">
                  <span class="related__num">Me</span>
                  <span class="related__title">{m['first']} {m['last']}</span>
                  <span class="related__meta">{m['role']}</span>
                </a>""" for m in lawyers) or f"""
                <a class="related__item" href="equipe.html" data-reveal="fade">
                  <span class="related__num">\u2014</span>
                  <span class="related__title">L'équipe du cabinet</span>
                  <span class="related__meta">Quatre avocats du Barreau de Tunis</span>
                </a>"""

            plain = title.replace("&amp;", "&")

            body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--solo">

      <div>
        {crumb((pole["title"].replace("&amp;", "&"), pole["slug"]), (plain, None))}
        <p class="eyebrow" data-reveal>{tag}</p>
        <h1 class="page-hero__title" data-reveal>{title}</h1>
        <p class="hero-lede-strong" data-reveal style="--reveal-delay:60ms;font-family:var(--font-display);font-size:clamp(1.25rem,2.1vw,1.7rem);font-weight:300;line-height:1.3;color:var(--slate);max-width:22ch;margin-bottom:22px">{desc}</p>
        <div class="btn-row" data-reveal style="--reveal-delay:140ms">
          <a class="btn" href="contact.html">Décrire votre situation {ARROW}</a>
          <a class="btn btn--ghost btn--ghost-light" href="{pole['slug']}">Le pôle {pole['title'].replace('&amp;', '&')}</a>
        </div>
      </div>

    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="split split--wide-left">
      <div>
        <p class="eyebrow" data-reveal>Le cabinet</p>
        <h2 data-reveal>{pole['title'].replace('&amp;', '&amp;')}</h2>
        <p class="body-text" data-reveal style="--reveal-delay:60ms">{pole['lede']}</p>
      </div>
      <div class="sticky-side">
        <ul class="pill-list" data-reveal="fade">
{chips}
        </ul>
        <p class="split__aside-link" data-reveal="fade">
          <a class="link-line" href="expertises.html">Tous les pôles {ARROW}</a>
        </p>
      </div>
    </div>
  </div>
</section>

<section class="section section--paper-2">
  <div class="container">
    <div class="section-head">
      <div>
        <span class="eyebrow" data-reveal>Qui traiter votre dossier</span>
        <h2 class="d2 wipe" data-reveal><span><span>Les avocats de ce pôle.</span></span></h2>
      </div>
      <p data-reveal="fade">Un interlocuteur nommé du premier échange aux actes de conclusion.</p>
    </div>
    <div class="related related--cards">
{team}
    </div>
  </div>
</section>


{cta_band("Parlons de votre dossier.",
           "Décrivez l'opération et l'échéance : le cabinet vous répond avec une orientation.",
           primary="Prendre contact", primary_href="contact.html",
           secondary="Appeler le cabinet", secondary_href="tel:+21671256751")}
"""
            write(slug, page_h(body,
                title=f"{plain} — Juris Affaires Avocats & Conseils",
                desc=desc,
                active="expertises.html"))

        print(f"  + {len(practices)} pages domaine pour « {pole['title']} »")


# ================================================================ 404

def build_notfound():
    body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--solo">
      <div>
        <p class="eyebrow" data-reveal>Erreur 404</p>
        <h1 class="page-hero__title" data-reveal>Cette page n'existe pas.</h1>
        <p class="page-hero__text page-hero__text--short" data-reveal style="--reveal-delay:80ms">
          Le lien est peut-être ancien. Voici les pages principales du cabinet.
        </p>
        <div class="btn-row" data-reveal style="--reveal-delay:140ms">
          <a class="btn" href="index.html">Retour à l'accueil {ARROW}</a>
          <a class="btn btn--ghost btn--ghost-light" href="contact.html">Nous écrire</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--paper">
  <div class="container">
    <div class="section-head">
      <div>
        <span class="eyebrow" data-reveal>Repères</span>
        <h2 class="d2 wipe" data-reveal><span><span>Où aller.</span></span></h2>
      </div>
      <p data-reveal="fade">Le cabinet couvre cinq pôles et vingt-deux domaines d'intervention.</p>
    </div>
    {related_cards([0, 1, 2, 3, 4])}
  </div>
</section>
"""
    write("404.html", page_h(body,
        title="Page introuvable — Juris Affaires Avocats & Conseils",
        desc="La page demandée est introuvable.",
        active=""))

# ================================================================ REFERENCES

def build_references():
    banks = CLIENTS[:3]
    industry = CLIENTS[3:8]
    media = CLIENTS[8:11]
    institution = CLIENTS[11:]

    def block(title, note, items):
        cells = "\n".join(
            f'          <div class="logo-cell"><img src="assets/img/clients/{f}" alt="{a}" loading="lazy"></div>'
            for f, a in items)
        return f"""
    <div class="ref-block" data-reveal="fade">
      <div class="ref-block__head">
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      <div class="logo-grid logo-grid--light">
{cells}
      </div>
    </div>"""

    body = f"""
<section class="page-hero grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="page-hero__inner page-hero__inner--solo">
      <div>
        {crumb(("Références", None))}
        <p class="eyebrow" data-reveal>Références</p>
        <h1 class="page-hero__title" data-reveal>Ils nous font confiance.</h1>
        <p class="page-hero__text page-hero__text--short" data-reveal style="--reveal-delay:80ms">
          Les marques que le cabinet cite aujourd'hui. Établissements financiers,
          groupes industriels, médias et institutions.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="section section--ink grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="section-head">
      <div>
        <span class="eyebrow" data-reveal>Références</span>
        <h2 class="d2 wipe" data-reveal><span><span>Qui fait confiance au cabinet.</span></span></h2>
      </div>
      <p data-reveal="fade">Taxonomie descriptive. Aucune mission n'est revendiquée.</p>
    </div>
{block("Banques &amp; établissements financiers",
       "Accompagnement juridique et contentieux bancaire.", banks)}
{block("Groupes industriels &amp; services", "Structures, opérations et litiges.", industry)}
{block("Médias &amp; communication", "Droit des affaires et propriété intellectuelle.", media)}
{block("Institutions", "Mandats institutionnels et Pharos civiques.", institution)}
  </div>
</section>

<section class="section section--ink grain">
  <div class="rule-grid" aria-hidden="true"></div>
  <div class="container">
    <div class="section-head">
      <div>
        <span class="eyebrow" data-reveal>Références communiquées</span>
        <h2 class="d2 wipe" data-reveal><span><span>Logos affichés par le cabinet sur son site actuel.</span></span></h2>
      </div>
      <p data-reveal="fade">Taxonomie descriptive uniquement — aucune mission n'est revendiquée.</p>
    </div>
    {logo_grid()}
    <p class="archive__text" style="margin-top:26px" data-reveal="fade">
      Ces références sont celles publications par le cabinet. Elles ne constituent
      pas une recommandation et n'établissent aucun lien contractuel.
    </p>
  </div>
</section>

{cta_band("Un dossier à traiter ?",
           "Établissements financiers, groupes industriels et institutions : décrivez le contexte, le cabinet vous répond.",
           primary="Prendre contact", primary_href="contact.html",
           secondary="Appeler le cabinet", secondary_href="tel:+21671256751")}
"""
    write("references.html", page_h(body,
        title="Références — Juris Affaires Avocats &amp; Conseils",
        desc="Les références communiquées par le cabinet : banques, groupes industriels, médias et institutions.",
        active="references.html"))


# ================================================================ BUILD ALL

def main():
    os.chdir(ROOT)
    print("Building static pages...")
    build_home()
    build_cabinet()
    build_expertise_hub()
    for e in ALL_EXPERTISES:
        build_expertise(e)
    build_team()
    for m in TEAM:
        build_lawyer(m)
    build_publications()
    for pub in PUBLICATIONS:
        build_publication_detail(pub)
    build_contact()
    build_mentions()
    build_privacy()
    build_domains()
    build_references()
    build_notfound()
    print("Done.")


if __name__ == "__main__":
    main()