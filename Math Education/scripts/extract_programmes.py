r"""
Extrait le texte des programmes officiels Eduscol (PDF) vers des fichiers .txt.

Ces textes servent a croiser le DAG avec les programmes de l'Education nationale,
domaine par domaine (roadmap MATH EDUCATION, Jalon 1, section 1.1).

Plusieurs PDF du dossier sont physiquement identiques (le programme du cycle 3
est le meme fichier sous les noms CM1, CM2 et 6eme). Le script les detecte par
empreinte et n'extrait qu'une fois, en listant les niveaux concernes.

Usage :
    . .\tools\activate.ps1
    python .\scripts\extract_programmes.py
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

from pypdf import PdfReader

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PDF_ROOT = PROJECT_ROOT / "Programme mathématiques"
OUT_DIR = PROJECT_ROOT / "_travail" / "programmes"


def file_hash(path: Path) -> str:
    h = hashlib.md5()
    h.update(path.read_bytes())
    return h.hexdigest()


def level_from_name(name: str) -> str:
    """Deduit le niveau scolaire du nom de fichier Eduscol.

    Le nom porte le niveau puis, au lycee, la voie et l'enseignement :
    EDUSCOL_1ere_General_Specialitee_... -> "1ere_General_Specialitee".
    On garde tous ces segments, sinon Integree et Specialitee produisent le
    meme nom de sortie et le second ecrase le premier.
    """
    m = re.match(r"EDUSCOL_(.+?)_[Pp]rogramme", name)
    return m.group(1) if m else Path(name).stem


def clean(text: str) -> str:
    text = text.replace(" ", " ")
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def main() -> int:
    if not PDF_ROOT.is_dir():
        print(f"Dossier introuvable : {PDF_ROOT}", file=sys.stderr)
        return 1

    pdfs = sorted(PDF_ROOT.rglob("*.pdf"))
    if not pdfs:
        print(f"Aucun PDF trouve dans {PDF_ROOT}", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Regroupe les fichiers identiques (meme contenu, noms differents).
    groups: dict[str, list[Path]] = {}
    for pdf in pdfs:
        groups.setdefault(file_hash(pdf), []).append(pdf)

    print(f"{len(pdfs)} PDF, {len(groups)} documents distincts.\n")

    for paths in sorted(groups.values(), key=lambda p: p[0].name):
        levels = sorted({level_from_name(p.name) for p in paths})
        source = paths[0]
        slug = re.sub(r"[^A-Za-z0-9]+", "-", "-".join(levels)).strip("-").lower()
        out = OUT_DIR / f"{slug}.txt"

        reader = PdfReader(str(source))
        pages = [clean(page.extract_text() or "") for page in reader.pages]

        header = [
            f"# Programme officiel Eduscol — niveaux : {', '.join(levels)}",
            f"# Source : {source.relative_to(PROJECT_ROOT)}",
            f"# {len(reader.pages)} pages",
            "",
        ]
        body = []
        for i, page_text in enumerate(pages, start=1):
            body.append(f"\n----- PAGE {i} -----\n")
            body.append(page_text)

        out.write_text("\n".join(header) + "".join(body), encoding="utf-8")

        chars = sum(len(p) for p in pages)
        status = "OK" if chars > 500 else "VIDE (PDF probablement en image)"
        print(f"{status:<32} {out.name:<28} {len(reader.pages):>3} pages, {chars:>7} caracteres")
        if len(paths) > 1:
            for p in paths[1:]:
                print(f"{'':<32}   (identique a {p.name})")

    print(f"\nSortie : {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
