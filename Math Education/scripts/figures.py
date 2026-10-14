r"""
Figures des exercices : une description JSON en entree, un SVG en sortie.

Pourquoi des descriptions et pas des dessins. Une figure dessinee a la main (ou
par un agent, ligne par ligne) peut contredire l'enonce sans que personne ne le
voie : graduation decalee, aiguille mal placee. Ici, l'auteur decrit la figure
(« demi-droite de 0 a 10, pas de 1, point A en 7 ») et ce script la dessine. Le
rendu est donc toujours exact et homogene, et le validateur peut confronter la
description a la reponse.

Ou vivent les figures :
  - en Git : `Specifications DAG, Exos, Mindcards/content/figures/<nom>.json`,
    une description par fichier ; un exercice y renvoie par
    `"image": "figures/<nom>"` ;
  - a la publication et dans l'application : le SVG est calcule et place dans
    le champ `image` de l'exercice (contenu.exporter_app, publier.py).
    L'application l'affiche comme une image (<img>), ce qui empeche tout script
    de s'executer.

Format d'une description :
    {"type": "demi_droite", "params": {...}, "alt": "texte alternatif"}

Types disponibles et parametres : voir GENERATEURS plus bas, et la docstring de
chaque fonction `_<type>`.

Usage :
    python scripts/figures.py rendre <description.json> [-o sortie.svg]
    python scripts/figures.py apercu <dossier de descriptions> <dossier de sortie>
        (rend toutes les descriptions d'un dossier en SVG, pour les relire)
"""

from __future__ import annotations

import json
import math
import re
import sys
from fractions import Fraction
from pathlib import Path

# ---------------------------------------------------------------------------
#  Charte graphique (alignee sur l'application, theme clair)
# ---------------------------------------------------------------------------

TRAIT = "#334155"
DOUX = "#94a3b8"
ACCENT = "#2563eb"
REMPLI = "#bfdbfe"
REMPLI_FORT = "#93c5fd"
POLICE = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

NOM_FIGURE = re.compile(r"^[A-Za-z0-9_-]+$")


class FigureInvalide(ValueError):
    """Une description qui ne peut pas etre dessinee : le message dit pourquoi."""


# ---------------------------------------------------------------------------
#  Outils
# ---------------------------------------------------------------------------

def _nombre(v, champ: str) -> Fraction:
    """Lit un nombre exact : entier, decimal ou fraction ecrite "3/4" ou "2,5"."""
    if isinstance(v, bool):
        raise FigureInvalide(f"{champ} : nombre attendu, pas un booleen")
    if isinstance(v, int):
        return Fraction(v)
    if isinstance(v, float):
        return Fraction(str(v))
    if isinstance(v, str):
        t = v.strip().replace(",", ".")
        try:
            return Fraction(t)
        except ValueError as exc:
            raise FigureInvalide(f"{champ} : « {v} » n'est pas un nombre") from exc
    raise FigureInvalide(f"{champ} : nombre attendu")


def _texte_nombre(x: Fraction, style: str = "auto") -> str:
    """Ecriture francaise : 2,5 ; 3/4 si demande ou si non decimal."""
    if x.denominator == 1:
        return str(x.numerator)
    if style == "fraction":
        return f"{x.numerator}/{x.denominator}"
    d = x.denominator
    while d % 2 == 0:
        d //= 2
    while d % 5 == 0:
        d //= 5
    if d != 1:
        return f"{x.numerator}/{x.denominator}"
    s = f"{float(x):.6f}".rstrip("0").rstrip(".")
    return s.replace(".", ",")


def _echapper(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _svg(largeur: float, hauteur: float, corps: list[str], titre: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largeur:g} {hauteur:g}" '
        f'width="{largeur:g}" height="{hauteur:g}" font-family="{POLICE}" role="img">'
        f"<title>{_echapper(titre)}</title>"
        f'<rect width="100%" height="100%" fill="#ffffff"/>'
        + "".join(corps)
        + "</svg>"
    )


def _texte(x: float, y: float, t: str, taille: int = 14, ancre: str = "middle",
           couleur: str = TRAIT, gras: bool = False) -> str:
    poids = ' font-weight="600"' if gras else ""
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-size="{taille}" text-anchor="{ancre}" '
            f'fill="{couleur}"{poids}>{_echapper(t)}</text>')


def _ligne(x1, y1, x2, y2, couleur=TRAIT, epaisseur=1.5) -> str:
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{couleur}" stroke-width="{epaisseur}" stroke-linecap="round"/>')


def _entier(p: dict, champ: str, mini: int, maxi: int, defaut=None) -> int:
    v = p.get(champ, defaut)
    if not isinstance(v, int) or isinstance(v, bool) or not (mini <= v <= maxi):
        raise FigureInvalide(f"{champ} : entier entre {mini} et {maxi} attendu (recu {v!r})")
    return v


# ---------------------------------------------------------------------------
#  Generateurs
# ---------------------------------------------------------------------------

def _demi_droite(p: dict) -> tuple[str, str]:
    """Demi-droite graduee.

    params :
      debut          nombre a l'origine de la graduation (defaut 0)
      pas            ecart entre deux graduations principales (defaut 1)
      graduations    nombre d'intervalles principaux affiches (2 a 20)
      sous_graduations  intervalles entre deux graduations principales (1 = aucun, max 10)
      etiquettes     "toutes", "aucune", "extremites", ou liste de valeurs a ecrire
      format         "auto" (defaut) ou "fraction" pour l'ecriture des etiquettes
      points         [{"valeur": x, "nom": "A"}] : points marques au-dessus de la droite ;
                     chaque valeur doit tomber sur une graduation (principale ou secondaire)
    """
    debut = _nombre(p.get("debut", 0), "debut")
    pas = _nombre(p.get("pas", 1), "pas")
    if pas <= 0:
        raise FigureInvalide("pas : doit etre strictement positif")
    n = _entier(p, "graduations", 2, 20)
    sous = _entier(p, "sous_graduations", 1, 10, 1)
    fmt = p.get("format", "auto")
    fin = debut + pas * n

    L, m, h = 380, 28, 96
    utile = L - 2 * m - 14
    y = 54

    def x(v: Fraction) -> float:
        return m + float((v - debut) / (fin - debut)) * utile

    corps = [_ligne(m, y, L - m, y, epaisseur=2),
             f'<path d="M{L - m:.1f},{y:.1f} l-9,-5 v10 z" fill="{TRAIT}"/>']
    for i in range(n * sous + 1):
        v = debut + pas * Fraction(i, sous)
        principal = i % sous == 0
        t = 9 if principal else 5
        corps.append(_ligne(x(v), y - t, x(v), y + t, epaisseur=1.8 if principal else 1.2))

    etiq = p.get("etiquettes", "toutes")
    if etiq == "toutes":
        valeurs = [debut + pas * k for k in range(n + 1)]
    elif etiq == "aucune":
        valeurs = []
    elif etiq == "extremites":
        valeurs = [debut, fin]
    elif isinstance(etiq, list):
        valeurs = [_nombre(v, "etiquettes") for v in etiq]
    else:
        raise FigureInvalide("etiquettes : \"toutes\", \"aucune\", \"extremites\" ou liste de valeurs")
    for v in valeurs:
        if not (debut <= v <= fin):
            raise FigureInvalide(f"etiquettes : {v} hors de la demi-droite")
        corps.append(_texte(x(v), y + 28, _texte_nombre(v, fmt), 13))

    grain = pas / sous
    noms = []
    for pt in p.get("points", []):
        v = _nombre(pt.get("valeur"), "points.valeur")
        nom = str(pt.get("nom", ""))[:3]
        if not (debut <= v <= fin):
            raise FigureInvalide(f"point {nom} : {v} hors de la demi-droite")
        if (v - debut) % grain != 0:
            raise FigureInvalide(f"point {nom} : {v} ne tombe pas sur une graduation (grain {grain})")
        corps.append(f'<circle cx="{x(v):.1f}" cy="{y:.1f}" r="4.5" fill="{ACCENT}"/>')
        corps.append(_texte(x(v), y - 16, nom, 15, couleur=ACCENT, gras=True))
        noms.append(nom)
    alt = f"Demi-droite graduée de {_texte_nombre(debut, fmt)} à {_texte_nombre(fin, fmt)}"
    if noms:
        alt += ", avec les points " + ", ".join(noms)
    return _svg(L, h, corps, alt), alt


def _regle(p: dict) -> tuple[str, str]:
    """Segment pose sur une regle graduee en centimetres (et millimetres).

    params :
      longueur_cm   longueur de la regle (5 a 15)
      segment       [debut, fin] en cm, au millimetre pres (ex. [0, 7.5])
      nom           nom du segment (ex. "AB") ; les extremites portent ses lettres
      mm            true pour les graduations en millimetres (defaut true)
    """
    L_cm = _entier(p, "longueur_cm", 5, 15)
    seg = p.get("segment")
    if not (isinstance(seg, list) and len(seg) == 2):
        raise FigureInvalide("segment : [debut, fin] en cm attendu")
    a, b = (_nombre(seg[0], "segment"), _nombre(seg[1], "segment"))
    if not (0 <= a < b <= L_cm):
        raise FigureInvalide(f"segment : doit tenir sur la regle, entre 0 et {L_cm} cm")
    if (a * 10).denominator != 1 or (b * 10).denominator != 1:
        raise FigureInvalide("segment : extremites au millimetre pres")
    mm = p.get("mm", True)
    nom = str(p.get("nom", "AB"))[:2]

    m, cm = 20, 30
    L = 2 * m + L_cm * cm
    y_seg, y_regle = 34, 54
    corps = [f'<rect x="{m - 8}" y="{y_regle}" width="{L_cm * cm + 16}" height="46" rx="4" '
             f'fill="#fef9c3" stroke="{TRAIT}" stroke-width="1.2"/>']
    for k in range(L_cm * 10 + 1):
        xk = m + k * cm / 10
        if k % 10 == 0:
            corps.append(_ligne(xk, y_regle, xk, y_regle + 16, epaisseur=1.4))
            corps.append(_texte(xk, y_regle + 31, str(k // 10), 12))
        elif mm:
            t = 10 if k % 5 == 0 else 6
            corps.append(_ligne(xk, y_regle, xk, y_regle + t, couleur=TRAIT, epaisseur=0.8))
    xa, xb = m + float(a) * cm, m + float(b) * cm
    corps.append(_ligne(xa, y_seg, xb, y_seg, couleur=ACCENT, epaisseur=3))
    for xx, lettre in ((xa, nom[0]), (xb, nom[-1])):
        corps.append(_ligne(xx, y_seg - 7, xx, y_seg + 7, couleur=ACCENT, epaisseur=2))
        corps.append(_texte(xx, y_seg - 12, lettre, 14, couleur=ACCENT, gras=True))
    alt = f"Segment {nom} posé sur une règle graduée de 0 à {L_cm} cm"
    return _svg(L, 112, corps, alt), alt


def _horloge(p: dict) -> tuple[str, str]:
    """Horloge a aiguilles.

    params :
      heures       0 a 23 (affichee modulo 12)
      minutes      0 a 59
      chiffres     "tous" (defaut), "quarts" (12, 3, 6, 9) ou "aucun"
      minutes_graduees  true pour les 60 petites graduations (defaut true)
    """
    hh = _entier(p, "heures", 0, 23)
    mn = _entier(p, "minutes", 0, 59)
    chiffres = p.get("chiffres", "tous")
    if chiffres not in ("tous", "quarts", "aucun"):
        raise FigureInvalide("chiffres : \"tous\", \"quarts\" ou \"aucun\"")
    c, r = 100, 84
    corps = [f'<circle cx="{c}" cy="{c}" r="{r}" fill="#ffffff" stroke="{TRAIT}" stroke-width="3"/>']
    for k in range(60):
        ang = math.radians(k * 6)
        grand = k % 5 == 0
        if not grand and not p.get("minutes_graduees", True):
            continue
        r1 = r - (10 if grand else 5)
        corps.append(_ligne(c + r1 * math.sin(ang), c - r1 * math.cos(ang),
                            c + (r - 2) * math.sin(ang), c - (r - 2) * math.cos(ang),
                            epaisseur=2 if grand else 1))
    for h in range(1, 13):
        if chiffres == "aucun" or (chiffres == "quarts" and h % 3):
            continue
        ang = math.radians(h * 30)
        corps.append(_texte(c + (r - 24) * math.sin(ang), c - (r - 24) * math.cos(ang) + 5, str(h), 15))
    a_h = math.radians(((hh % 12) + mn / 60) * 30)
    a_m = math.radians(mn * 6)
    corps.append(_ligne(c, c, c + 44 * math.sin(a_h), c - 44 * math.cos(a_h), epaisseur=6))
    corps.append(_ligne(c, c, c + 68 * math.sin(a_m), c - 68 * math.cos(a_m), couleur=ACCENT, epaisseur=3.5))
    corps.append(f'<circle cx="{c}" cy="{c}" r="5" fill="{TRAIT}"/>')
    alt = "Horloge à aiguilles"
    return _svg(200, 200, corps, alt), alt


def _quadrillage(p: dict) -> tuple[str, str]:
    """Quadrillage avec des surfaces coloriees.

    params :
      colonnes, lignes   taille du quadrillage (2 a 16, 2 a 12)
      formes   [{"rectangle": [colonne, ligne, largeur, hauteur], "nom": "A"}
                ou {"cases": [[colonne, ligne], ...], "nom": "B"}]
               (colonne et ligne partent de 0, en haut a gauche)
      legende  texte court sous le quadrillage (ex. "1 carreau = 1 cm²")
    """
    nc = _entier(p, "colonnes", 2, 16)
    nl = _entier(p, "lignes", 2, 12)
    s, m = 22, 14
    L, H = 2 * m + nc * s, 2 * m + nl * s
    legende = str(p.get("legende", ""))[:60]
    H_tot = H + (24 if legende else 0)
    corps = []
    couleurs = [REMPLI_FORT, "#fde68a", "#bbf7d0", "#fecaca"]
    occupees: set[tuple[int, int]] = set()
    for i, f in enumerate(p.get("formes", [])):
        cases: list[tuple[int, int]] = []
        if "rectangle" in f:
            cx, cy, w, h = f["rectangle"]
            cases = [(cx + a, cy + b) for a in range(w) for b in range(h)]
        else:
            cases = [tuple(cc) for cc in f.get("cases", [])]
        if not cases:
            raise FigureInvalide(f"forme {i + 1} : aucune case")
        for cx, cy in cases:
            if not (0 <= cx < nc and 0 <= cy < nl):
                raise FigureInvalide(f"forme {i + 1} : case ({cx}, {cy}) hors du quadrillage")
            if (cx, cy) in occupees:
                raise FigureInvalide(f"forme {i + 1} : case ({cx}, {cy}) deja coloriee")
            occupees.add((cx, cy))
            corps.append(f'<rect x="{m + cx * s}" y="{m + cy * s}" width="{s}" height="{s}" '
                         f'fill="{couleurs[i % len(couleurs)]}"/>')
        if f.get("nom"):
            mx = sum(c[0] for c in cases) / len(cases)
            my = sum(c[1] for c in cases) / len(cases)
            corps.append(_texte(m + (mx + 0.5) * s, m + (my + 0.5) * s + 5, str(f["nom"])[:3], 14, gras=True))
    for k in range(nc + 1):
        corps.append(_ligne(m + k * s, m, m + k * s, m + nl * s, couleur=DOUX, epaisseur=1))
    for k in range(nl + 1):
        corps.append(_ligne(m, m + k * s, m + nc * s, m + k * s, couleur=DOUX, epaisseur=1))
    if legende:
        corps.append(_texte(L / 2, H + 14, legende, 13))
    alt = f"Quadrillage de {nc} carreaux sur {nl}, avec des surfaces coloriées"
    return _svg(L, H_tot, corps, alt), alt


def _partage(p: dict) -> tuple[str, str]:
    """Une unite partagee en parts egales, dont certaines sont coloriees.

    params :
      forme      "rectangle" (defaut), "disque" ou "bande" (rectangle allonge)
      parts      nombre de parts egales (2 a 12)
      coloriees  nombre de parts coloriees (0 a parts), ou liste de leurs rangs (0 = premiere)
    """
    forme = p.get("forme", "rectangle")
    n = _entier(p, "parts", 2, 12)
    col = p.get("coloriees", 0)
    if isinstance(col, int) and not isinstance(col, bool):
        if not 0 <= col <= n:
            raise FigureInvalide("coloriees : entre 0 et le nombre de parts")
        rangs = set(range(col))
    elif isinstance(col, list) and all(isinstance(k, int) and 0 <= k < n for k in col):
        rangs = set(col)
    else:
        raise FigureInvalide("coloriees : nombre de parts, ou liste de rangs")
    corps = []
    if forme in ("rectangle", "bande"):
        W, H = (320, 60) if forme == "bande" else (240, 120)
        m = 16
        for k in range(n):
            corps.append(f'<rect x="{m + k * W / n:.1f}" y="{m}" width="{W / n:.1f}" height="{H}" '
                         f'fill="{REMPLI_FORT if k in rangs else "#ffffff"}" stroke="{TRAIT}" stroke-width="1.6"/>')
        L, Ht = W + 2 * m, H + 2 * m
    elif forme == "disque":
        c, r = 90, 74
        if n == 1:
            raise FigureInvalide("parts : au moins 2")
        for k in range(n):
            a1, a2 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            x1, y1 = c + r * math.sin(a1), c - r * math.cos(a1)
            x2, y2 = c + r * math.sin(a2), c - r * math.cos(a2)
            grand = 1 if (a2 - a1) > math.pi else 0
            corps.append(f'<path d="M{c},{c} L{x1:.2f},{y1:.2f} A{r},{r} 0 {grand} 1 {x2:.2f},{y2:.2f} Z" '
                         f'fill="{REMPLI_FORT if k in rangs else "#ffffff"}" stroke="{TRAIT}" stroke-width="1.6"/>')
        L = Ht = 180
    else:
        raise FigureInvalide("forme : \"rectangle\", \"bande\" ou \"disque\"")
    alt = f"{'Disque' if forme == 'disque' else 'Rectangle'} partagé en {n} parts égales, {len(rangs)} coloriée(s)"
    return _svg(L, Ht, corps, alt), alt


def _monnaie(p: dict) -> tuple[str, str]:
    """Pieces et billets en euros, dessin schematique (pas une reproduction).

    params :
      elements   liste de valeurs en euros (nombres) ; les valeurs inferieures a
                 5 sont des pieces, a partir de 5 des billets. Valeurs admises :
                 0.01 0.02 0.05 0.1 0.2 0.5 1 2 5 10 20 50 100 200.
    """
    admis = {Fraction(v) for v in ("0.01", "0.02", "0.05", "0.1", "0.2", "0.5", "1", "2",
                                   "5", "10", "20", "50", "100", "200")}
    elts = p.get("elements")
    if not isinstance(elts, list) or not 1 <= len(elts) <= 12:
        raise FigureInvalide("elements : liste de 1 a 12 valeurs")
    valeurs = [_nombre(v, "elements") for v in elts]
    for v in valeurs:
        if v not in admis:
            raise FigureInvalide(f"elements : {v} n'est pas une piece ni un billet en euros")
    billets = sorted([v for v in valeurs if v >= 5], reverse=True)
    pieces = sorted([v for v in valeurs if v < 5], reverse=True)
    corps, x, y = [], 12, 12
    for v in billets:
        corps.append(f'<rect x="{x}" y="{y}" width="86" height="46" rx="5" fill="#dcfce7" stroke="{TRAIT}" stroke-width="1.4"/>')
        corps.append(_texte(x + 43, y + 29, f"{v.numerator} €", 16, gras=True))
        x += 96
    if billets:
        x, y = 12, y + 58
    for v in pieces:
        r = 22 if v >= 1 else 18
        libelle = f"{v.numerator} €" if v >= 1 else f"{int(v * 100)} c"
        corps.append(f'<circle cx="{x + 24}" cy="{y + 24}" r="{r}" fill="{"#fde68a" if v >= 1 else "#fed7aa"}" '
                     f'stroke="{TRAIT}" stroke-width="1.4"/>')
        corps.append(_texte(x + 24, y + 29, libelle, 13, gras=True))
        x += 54
    L = max(12 + 96 * max(len(billets), 1), 12 + 54 * max(len(pieces), 1)) + 8
    H = y + 56
    alt = "Pièces et billets en euros"
    return _svg(L, H, corps, alt), alt


GENERATEURS = {
    "demi_droite": _demi_droite,
    "regle": _regle,
    "horloge": _horloge,
    "quadrillage": _quadrillage,
    "partage": _partage,
    "monnaie": _monnaie,
}


# ---------------------------------------------------------------------------
#  API
# ---------------------------------------------------------------------------

def rendre(spec: dict) -> str:
    """SVG d'une description. Leve FigureInvalide si elle ne peut pas etre dessinee."""
    if not isinstance(spec, dict):
        raise FigureInvalide("description : objet JSON attendu")
    t = spec.get("type")
    if t not in GENERATEURS:
        raise FigureInvalide(f"type « {t} » inconnu ; types : {', '.join(GENERATEURS)}")
    params = spec.get("params", {})
    if not isinstance(params, dict):
        raise FigureInvalide("params : objet attendu")
    svg, alt_auto = GENERATEURS[t](params)
    alt = spec.get("alt")
    if alt:
        svg = re.sub(r"<title>.*?</title>", f"<title>{_echapper(str(alt))}</title>", svg, count=1)
    return svg


def dossiers_figures(racine_contenu: Path) -> list[Path]:
    """Dossiers ou chercher les descriptions : celui du contenu, plus ceux de
    MATH_EDU_FIGURES_EXTRA (separes par os.pathsep), pour valider un lot."""
    import os
    dossiers = [Path(racine_contenu) / "figures"]
    for d in os.environ.get("MATH_EDU_FIGURES_EXTRA", "").split(os.pathsep):
        if d:
            dossiers.append(Path(d))
    return dossiers


def trouver(ref: str, dossiers: list[Path]) -> Path:
    """Fichier de description d'une reference "figures/<nom>"."""
    if not isinstance(ref, str) or not ref.startswith("figures/"):
        raise FigureInvalide(f"image « {ref} » : la reference doit etre \"figures/<nom>\"")
    nom = ref[len("figures/"):]
    if not NOM_FIGURE.match(nom):
        raise FigureInvalide(f"image « {ref} » : nom de figure invalide (lettres, chiffres, - et _)")
    for d in dossiers:
        f = d / f"{nom}.json"
        if f.is_file():
            return f
    raise FigureInvalide(f"image « {ref} » : description introuvable ({nom}.json)")


def svg_de_reference(ref: str, dossiers: list[Path]) -> str:
    spec = json.loads(trouver(ref, dossiers).read_text(encoding="utf-8"))
    return rendre(spec)


def main() -> int:
    if len(sys.argv) >= 3 and sys.argv[1] == "rendre":
        spec = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
        svg = rendre(spec)
        if "-o" in sys.argv:
            Path(sys.argv[sys.argv.index("-o") + 1]).write_text(svg, encoding="utf-8")
        else:
            print(svg)
        return 0
    if len(sys.argv) == 4 and sys.argv[1] == "apercu":
        src, dst = Path(sys.argv[2]), Path(sys.argv[3])
        dst.mkdir(parents=True, exist_ok=True)
        erreurs = 0
        for f in sorted(src.glob("*.json")):
            try:
                (dst / f"{f.stem}.svg").write_text(rendre(json.loads(f.read_text(encoding="utf-8"))), encoding="utf-8")
            except (FigureInvalide, json.JSONDecodeError) as exc:
                erreurs += 1
                print(f"{f.name} : {exc}")
        print(f"{len(list(src.glob('*.json'))) - erreurs} figure(s) rendue(s) dans {dst}, {erreurs} erreur(s)")
        return 1 if erreurs else 0
    print(__doc__)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
