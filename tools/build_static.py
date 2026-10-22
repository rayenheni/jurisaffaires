#!/usr/bin/env python3
"""Generate pages and stage only public files for static hosting."""
from pathlib import Path
import shutil

from build_pages import main as build_pages

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public"


def main():
    build_pages()
    # Recreate the output so removed pages/assets cannot survive a rebuild.
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()
    for page in ROOT.glob("*.html"):
        shutil.copy2(page, OUTPUT / page.name)
    for directory in ("assets", "admin"):
        shutil.copytree(ROOT / directory, OUTPUT / directory)
    print(f"Static deployment ready: {OUTPUT}")


if __name__ == "__main__":
    main()
