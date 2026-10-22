#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère les déclinaisons responsives WebP des images du site.

Pourquoi ce script
------------------
Les JPEG d'origine mesurent jusqu'à 1408 px de large et pèsent 100–330 Ko.
Sur un mobile en 4G, la photo de héros était téléchargée en pleine résolution
(elle devenait l'élément LCP le plus lourd). Les pages ne servent donc plus
que des variantes WebP dimensionnées à l'affichage réel, déclarées en
`srcset`/`sizes` dans le générateur (`tools/build_pages.py`).

Les fichiers produits sont versionnés dans le dépôt : le build statique
(`npm run build`) n'a besoin ni d'ImageMagick ni de réseau.

    python3 tools/build_images.py

Prérequis : ImageMagick (`convert`, `identify`) avec le support libwebp.
Relancer le script après tout remplacement d'une image source.
"""

import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")

# (source, [largeurs], qualité WebP)
LANDSCAPE = [
    ("editorial-library.jpg", [640, 960, 1024, 1200, 1408], 72),
    ("editorial-city.jpg", [640, 960, 1024, 1408], 72),
    ("editorial-office.jpg", [640, 960, 1024, 1408], 72),
    ("editorial-tunis.jpg", [640, 960, 1024, 1408], 72),
    ("hero-architecture.jpg", [480, 720, 960], 72),
]

PORTRAITS = [
    ("team/faten-guemri.jpg", [96, 160, 260, 400, 500], 78),
    ("team/sahbi-bouderbala.jpg", [96, 160, 260, 400, 500], 78),
    ("team/slim-bouderbala.jpg", [96, 160, 260, 400, 500], 78),
    ("team/taoufik-bouderbala.jpg", [96, 160, 260, 400, 500], 78),
]

LOGOS = [
    ("clients/bft-stb.png", [120], 86),
    ("clients/conect.png", [120], 86),
    ("clients/croissant-rouge.png", [120], 86),
    ("clients/finzi.png", [120], 86),
    ("clients/gamma-plast.png", [120], 86),
    ("clients/mcm.png", [120], 86),
    ("clients/palm-beach.png", [120], 86),
    ("clients/qnb.png", [120], 86),
    ("clients/seabel.png", [120], 86),
    ("clients/systra-studi.png", [120], 86),
    ("clients/tsb.png", [120], 86),
    ("clients/villa-didon.png", [120], 86),
]

# Logos du cabinet : affichés à 230×38 (header) et 230×38 (footer).
BRAND = [
    ("logo-jurisaffaires.png", [230, 460], 90),
    ("logo-jurisaffaires-light.png", [230, 460], 90),
]


def run(cmd):
    subprocess.run(cmd, check=True)


def variant(source, width, quality):
    src = os.path.join(IMG, source)
    base, _ = os.path.splitext(src)
    out = f"{base}-{width}.webp"
    # `-strip` supprime les métadonnées : quelques Ko gagnés sans perte
    # visuelle. `-resize WIDTHx` conserve les proportions.
    run(["convert", src, "-strip", "-resize", f"{width}x", "-quality", str(quality), out])
    return out


def main():
    for group in (LANDSCAPE, PORTRAITS, LOGOS):
        for source, widths, quality in group:
            for width in widths:
                out = variant(source, width, quality)
                src_size = os.path.getsize(os.path.join(IMG, source))
                print(f"{os.path.relpath(out, ROOT):52s} {os.path.getsize(out):>7d} o "
                      f"(source {src_size} o)")

    for source, widths, quality in BRAND:
        src = os.path.join(IMG, source)
        base, _ = os.path.splitext(src)
        for width in widths:
            out = f"{base}-{width}.webp"
            run(["convert", src, "-strip", "-resize", f"{width}x",
                 "-quality", str(quality), out])
            print(f"{os.path.relpath(out, ROOT):52s} {os.path.getsize(out):>7d} o")


if __name__ == "__main__":
    main()
