#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Minifie assets/css/style.css vers assets/css/style.min.css.

Le fichier produit est versionné : le build statique n'a aucune dépendance
externe (pas de postcss, pas de node_modules) et le site continue de
fonctionner en ouvrant simplement index.html.

Ce que le minifieur fait — et ne fait pas
-----------------------------------------
* Il supprime les commentaires.
* Il réduit toute suite d'espaces à un seul espace.
* Il supprime l'espace quand il est inutile autour de `{`, `}`, `;` et `,`.
* Il NE TOUCHE PAS aux chaînes de caractères (`content: "..."`, familles
  de polices) et ne modifie jamais l'espace autour de `:` — le supprimer
  transformerait un sélecteur descendant `a :hover` en pseudo-classe.

Gain constaté : 172 Ko → ~112 Ko (et ~20 Ko une fois gzippé), sans
changement de rendu.

    python3 tools/minify_css.py
"""

import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "assets", "css", "style.css")
TARGET = os.path.join(ROOT, "assets", "css", "style.min.css")

TIGHT = set("{};,")


def strip_comments(css):
    """Retire les commentaires sans casser `url(...)` ni les chaînes."""
    out = []
    i, n = 0, len(css)
    quote = None
    while i < n:
        ch = css[i]
        if quote:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(css[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "\"'":
            quote = ch
            out.append(ch)
            i += 1
            continue
        if css.startswith("/*", i):
            end = css.find("*/", i + 2)
            i = n if end == -1 else end + 2
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def collapse(css):
    """Réduit les espaces en préservant les chaînes de caractères."""
    out = []
    i, n = 0, len(css)
    quote = None
    pending_space = False
    while i < n:
        ch = css[i]
        if quote:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(css[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "\"'":
            if pending_space and out and out[-1] not in TIGHT:
                out.append(" ")
            pending_space = False
            quote = ch
            out.append(ch)
            i += 1
            continue
        if ch in " \t\r\n\f":
            pending_space = True
            i += 1
            continue
        if pending_space:
            if out and out[-1] not in TIGHT and ch not in TIGHT:
                out.append(" ")
            pending_space = False
        out.append(ch)
        i += 1
    return "".join(out)


def minify(css):
    css = strip_comments(css)
    css = collapse(css)
    # Un dernier `;` avant `}` est inutile.
    css = re.sub(r";+\}", "}", css)
    return css.strip() + "\n"


def main():
    with open(SOURCE, encoding="utf-8") as fh:
        source = fh.read()
    result = minify(source)
    with open(TARGET, "w", encoding="utf-8") as fh:
        fh.write(result)
    print(f"{os.path.relpath(TARGET, ROOT)} : "
          f"{len(source.encode())} → {len(result.encode())} octets")


if __name__ == "__main__":
    main()
