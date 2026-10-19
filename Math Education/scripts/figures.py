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


# Espace fine insecable (U+202F) entre les tranches de trois chiffres : « 4 000 »,
# comme dans les enonces. Ecrite par son code, invisible a la relecture.
ESPACE_MILLIERS = chr(0x202F)


def _milliers(entier: int) -> str:
    """12345 -> « 12 345 » (a partir de 10 000 ; 1 000 a 9 999 aussi, comme au primaire)."""
    signe = "-" if entier < 0 else ""
    chiffres = str(abs(entier))
    if len(chiffres) <= 3:
        return signe + chiffres
    tranches = []
    while chiffres:
        tranches.insert(0, chiffres[-3:])
        chiffres = chiffres[:-3]
    return signe + ESPACE_MILLIERS.join(tranches)


def _texte_nombre(x: Fraction, style: str = "auto") -> str:
    """Ecriture francaise : 4 000 ; 2,5 ; 3/4 si demande ou si non decimal."""
    if x.denominator == 1:
        return _milliers(x.numerator)
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
    entiere, _, decimale = s.partition(".")
    return _milliers(int(entiere)) + ("," + decimale if decimale else "")


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
      debut          nombre a l'origine de la graduation (defaut 0) ; s'il n'est pas
                     nul, un trait pointille a gauche montre qu'on ne voit qu'une
                     portion de la demi-droite
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
    # Portion de demi-droite (debut non nul) : l'origine n'est pas dessinee, un
    # trait pointille le signale au lieu de laisser croire que debut est l'origine
    # (relecture du lot figures F1).
    portion = 22 if debut != 0 else 0
    utile = L - 2 * m - 14 - portion
    y = 54

    def x(v: Fraction) -> float:
        return m + portion + float((v - debut) / (fin - debut)) * utile

    corps = [_ligne(m + portion, y, L - m, y, epaisseur=2),
             f'<path d="M{L - m:.1f},{y:.1f} l-9,-5 v10 z" fill="{TRAIT}"/>']
    if portion:
        corps.append(f'<line x1="{m - 8}" y1="{y}" x2="{m + portion}" y2="{y}" stroke="{TRAIT}" '
                     f'stroke-width="2" stroke-dasharray="4 4"/>')
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
    corps = [f'<rect x="{m - 14}" y="{y_regle}" width="{L_cm * cm + 28}" height="46" rx="4" '
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
    # Les aiguilles d'abord, les chiffres ensuite, par-dessus et cernes de
    # blanc : la grande aiguille peut aller jusqu'aux petits traits (lecture a
    # la minute) sans jamais cacher un chiffre. Version precedente : aiguille
    # raccourcie pour epargner les chiffres, illisible a la minute (relecture
    # du lot figures F4).
    a_h = math.radians(((hh % 12) + mn / 60) * 30)
    a_m = math.radians(mn * 6)
    corps.append(_ligne(c, c, c + 40 * math.sin(a_h), c - 40 * math.cos(a_h), epaisseur=6))
    corps.append(_ligne(c, c, c + (r - 4) * math.sin(a_m), c - (r - 4) * math.cos(a_m),
                        couleur=ACCENT, epaisseur=2.5))
    for h in range(1, 13):
        if chiffres == "aucun" or (chiffres == "quarts" and h % 3):
            continue
        ang = math.radians(h * 30)
        x, y = c + (r - 20) * math.sin(ang), c - (r - 20) * math.cos(ang) + 5
        corps.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="15" text-anchor="middle" fill="{TRAIT}" '
                     f'stroke="#ffffff" stroke-width="4" stroke-linejoin="round" paint-order="stroke">{h}</text>')
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
      axe      [[x1, y1], [x2, y2]] : axe de symetrie en tirets, d'un noeud a un
               autre (x, y comptes en carreaux depuis le coin haut gauche) ;
               vertical, horizontal ou en diagonale
      points   {"A": [x, y]} : points marques aux noeuds du quadrillage
      lettres  [{"case": [colonne, ligne], "texte": "B"}] : texte court dans une case
      robot    {"case": [colonne, ligne], "direction": "haut" | "bas" | "gauche" | "droite"}
      chemin   [[colonne, ligne], ...] : cases voisines parcourues, de la premiere
               a la derniere (fleche a l'arrivee)
      Le nom d'une forme peut aller jusqu'a 10 caracteres (plan d'une classe).
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
    noms_formes: list[str] = []
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
            # Nom ecrit apres les lignes, avec un liseré blanc : un trait au
            # milieu d'un mot gene l'eleve de CP qui dechiffre lettre a lettre
            # (relecture 4b L1). 14 px s'il tient dans la forme, 12 sinon.
            nom_forme = str(f["nom"])[:10]
            largeur_forme = (max(c[0] for c in cases) - min(c[0] for c in cases) + 1) * s
            taille = 14 if len(nom_forme) * 8.5 <= largeur_forme else 12
            noms_formes.append(_texte(m + (mx + 0.5) * s, m + (my + 0.5) * s + 5, nom_forme, taille, gras=True)
                               .replace("<text ", '<text stroke="#ffffff" stroke-width="3" paint-order="stroke" ', 1))
    for k in range(nc + 1):
        corps.append(_ligne(m + k * s, m, m + k * s, m + nl * s, couleur=DOUX, epaisseur=1))
    for k in range(nl + 1):
        corps.append(_ligne(m, m + k * s, m + nc * s, m + k * s, couleur=DOUX, epaisseur=1))
    corps += noms_formes

    def noeud(xy, champ):
        if not (isinstance(xy, list) and len(xy) == 2 and all(isinstance(v, int) for v in xy)):
            raise FigureInvalide(f"{champ} : [x, y] entiers attendus")
        if not (0 <= xy[0] <= nc and 0 <= xy[1] <= nl):
            raise FigureInvalide(f"{champ} : {xy} hors du quadrillage")
        return m + xy[0] * s, m + xy[1] * s

    def case(cl, champ):
        if not (isinstance(cl, list) and len(cl) == 2 and all(isinstance(v, int) for v in cl)):
            raise FigureInvalide(f"{champ} : [colonne, ligne] entiers attendus")
        if not (0 <= cl[0] < nc and 0 <= cl[1] < nl):
            raise FigureInvalide(f"{champ} : case {cl} hors du quadrillage")
        return m + (cl[0] + 0.5) * s, m + (cl[1] + 0.5) * s

    if "axe" in p:
        de, a = p["axe"]
        (x1, y1), (x2, y2) = noeud(de, "axe"), noeud(a, "axe")
        dx, dy = abs(de[0] - a[0]), abs(de[1] - a[1])
        if not (dx == 0 or dy == 0 or dx == dy) or (dx, dy) == (0, 0):
            raise FigureInvalide("axe : vertical, horizontal ou en diagonale")
        corps.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{ACCENT}" stroke-width="2.2"  stroke-dasharray="6 4"/>')
    chemin = p.get("chemin", [])
    if chemin:
        centres = [case(c, "chemin") for c in chemin]
        for c1, c2 in zip(chemin, chemin[1:]):
            if abs(c1[0] - c2[0]) + abs(c1[1] - c2[1]) != 1:
                raise FigureInvalide(f"chemin : {c1} et {c2} ne sont pas voisines")
        trace = " ".join(f"{x:.1f},{y:.1f}" for x, y in centres)
        corps.append(f'<polyline points="{trace}" fill="none" stroke="{ACCENT}" stroke-width="2.5"  stroke-linejoin="round" stroke-linecap="round"/>')
        if len(centres) > 1:
            (xa, ya), (xb, yb) = centres[-2], centres[-1]
            ux, uy = (xb - xa) / s, (yb - ya) / s
            corps.append(f'<path d="M{xb:.1f},{yb:.1f} l{-ux * 8 - uy * 5:.1f},{-uy * 8 + ux * 5:.1f}  l{uy * 10:.1f},{-ux * 10:.1f} z" fill="{ACCENT}"/>')
    for item in p.get("lettres", []):
        x, y = case(item.get("case"), "lettres")
        corps.append(_texte(x, y + 5, str(item.get("texte", ""))[:3], 13, gras=True))
    if "robot" in p:
        rb = p["robot"]
        x, y = case(rb.get("case"), "robot")
        sens = {"haut": (0, -1), "bas": (0, 1), "gauche": (-1, 0), "droite": (1, 0)}
        if rb.get("direction") not in sens:
            raise FigureInvalide("robot.direction : haut, bas, gauche ou droite")
        ux, uy = sens[rb["direction"]]
        k = s * 0.42
        pointe = (x + ux * k, y + uy * k)
        g = (x - ux * k * 0.7 - uy * k * 0.8, y - uy * k * 0.7 + ux * k * 0.8)
        d = (x - ux * k * 0.7 + uy * k * 0.8, y - uy * k * 0.7 - ux * k * 0.8)
        corps.append(f'<polygon points="{pointe[0]:.1f},{pointe[1]:.1f} {g[0]:.1f},{g[1]:.1f} {d[0]:.1f},{d[1]:.1f}"  fill="#f59e0b" stroke="{TRAIT}" stroke-width="1.2"/>')
    for nom, xy in p.get("points", {}).items():
        x, y = noeud(xy, f"points.{nom}")
        corps.append(_ligne(x - 4, y - 4, x + 4, y + 4, epaisseur=1.6))
        corps.append(_ligne(x - 4, y + 4, x + 4, y - 4, epaisseur=1.6))
        corps.append(_texte(min(x + 9, L - 6), max(y - 6, 12), str(nom)[:3], 13, gras=True))
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


def _bandes(p: dict) -> tuple[str, str]:
    """Plusieurs partages d'une meme unite : des bandes de meme longueur, superposees.

    Sert a comparer des fractions d'un meme tout (programme de CE1 : « deux
    partages distincts d'un meme tout »).

    params :
      bandes   liste de 2 a 4 bandes : {"parts": n (2 a 12),
               "coloriees": nombre ou liste de rangs, "nom": "A" (facultatif)}
    """
    bandes = p.get("bandes")
    if not isinstance(bandes, list) or not 2 <= len(bandes) <= 4:
        raise FigureInvalide("bandes : liste de 2 a 4 bandes")
    W, H, m, ecart, marge_nom = 300, 40, 14, 14, 26
    corps = []
    for i, b in enumerate(bandes):
        if not isinstance(b, dict):
            raise FigureInvalide(f"bande {i + 1} : objet attendu")
        n = _entier(b, "parts", 2, 12)
        col = b.get("coloriees", 0)
        if isinstance(col, int) and not isinstance(col, bool):
            if not 0 <= col <= n:
                raise FigureInvalide(f"bande {i + 1} : coloriees entre 0 et le nombre de parts")
            rangs = set(range(col))
        elif isinstance(col, list) and all(isinstance(k, int) and 0 <= k < n for k in col):
            rangs = set(col)
        else:
            raise FigureInvalide(f"bande {i + 1} : coloriees, nombre de parts ou liste de rangs")
        y = m + i * (H + ecart)
        x0 = m + marge_nom
        for k in range(n):
            corps.append(f'<rect x="{x0 + k * W / n:.1f}" y="{y}" width="{W / n:.1f}" height="{H}" '
                         f'fill="{REMPLI_FORT if k in rangs else "#ffffff"}" stroke="{TRAIT}" stroke-width="1.6"/>')
        if b.get("nom"):
            corps.append(_texte(m + 8, y + H / 2 + 5, str(b["nom"])[:2], 15, gras=True))
    L = 2 * m + marge_nom + W
    Ht = 2 * m + len(bandes) * H + (len(bandes) - 1) * ecart
    alt = f"{len(bandes)} bandes de même longueur, partagées en parts égales"
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
    # Au plus 3 billets ou 6 pieces par rangee : une figure plus large que 344 px
    # est reduite sur un telephone (colonne de 328 px), et la valeur ecrite sur
    # une piece, l'information a lire, tombait a 9 px (relecture du lot figures F2).
    corps, y = [], 12
    largeur = 0
    for i, v in enumerate(billets):
        if i and i % 3 == 0:
            y += 58
        x = 12 + (i % 3) * 96
        corps.append(f'<rect x="{x}" y="{y}" width="86" height="46" rx="5" fill="#dcfce7" stroke="{TRAIT}" stroke-width="1.4"/>')
        corps.append(_texte(x + 43, y + 29, f"{v.numerator} €", 16, gras=True))
        largeur = max(largeur, x + 96)
    if billets:
        y += 58
    for i, v in enumerate(pieces):
        if i and i % 6 == 0:
            y += 54
        x = 12 + (i % 6) * 54
        r = 22 if v >= 1 else 18
        libelle = f"{v.numerator} €" if v >= 1 else f"{int(v * 100)} c"
        corps.append(f'<circle cx="{x + 24}" cy="{y + 24}" r="{r}" fill="{"#fde68a" if v >= 1 else "#fed7aa"}" '
                     f'stroke="{TRAIT}" stroke-width="1.4"/>')
        corps.append(_texte(x + 24, y + 29, libelle, 13, gras=True))
        largeur = max(largeur, x + 54)
    L = largeur + 8
    H = y + (56 if pieces else 0)
    alt = "Pièces et billets en euros"
    return _svg(L, H, corps, alt), alt


def _geometrie(p: dict) -> tuple[str, str]:
    """Figure de geometrie plane : points, segments, droites, polygones, cercles,
    angles et codages, sur fond blanc, quadrille ou pointe.

    Les coordonnees sont en unites du fond (un carreau = une unite), origine en
    haut a gauche, x vers la droite, y vers le BAS (comme `quadrillage`). Elles
    peuvent etre fractionnaires ("2.5", "7/2").

    params :
      colonnes, lignes  taille du cadre en unites (2 a 12, 2 a 10)
      fond        "blanc" (defaut), "quadrille" ou "pointe"
      points      {"A": [x, y], ...} : chaque point nomme est marque d'une croix
                  et de son nom ; un nom commencant par "_" n'est ni marque ni
                  nomme (point de construction, par exemple l'autre bout d'un axe)
      etiquettes  {"A": "haut" | "bas" | "gauche" | "droite" | "haut_gauche" ...}
                  pour forcer la place d'un nom (sinon : a l'oppose du centre)
      elements    liste, dessinee dans l'ordre :
        {"segment": ["A", "B"]}
        {"droite": ["A", "B"], "nom": "(d)"}     droite prolongee jusqu'au cadre
        {"demi_droite": ["A", "B"]}              d'origine A, passant par B
        {"polygone": ["A", "B", "C", ...], "rempli": true}
        {"cercle": "O", "rayon": 3}  ou  {"cercle": "O", "passe_par": "A"}
        {"axe": ["A", "B"]}                      droite en tirets (axe de symetrie)
        {"angle": ["B", "A", "C"], "nom": "1"}   arc au sommet A (angle saillant)
        {"angle_droit": ["B", "A", "C"]}         petit carre au sommet A
        {"codage": [["A", "B"], ["C", "D"]], "marque": 1}
                                                 traits sur des segments de meme longueur
        {"longueur": ["A", "B"], "texte": "5 cm"} longueur ecrite le long de [AB],
                                                 du cote oppose au centre de la figure
        {"texte": "1", "position": [x, y]}       texte libre (numero de figure...)
      Options d'un angle : "arcs": 2 (double arc, angles egaux), "nom" jusqu'a
      5 caracteres ("65" suivi du symbole degre). Option d'un cercle :
      "rempli": true (disque).
      Options d'un element : "couleur": "accent" (bleu) ou "trait" (defaut),
      "style": "pointille".

    Controles (une figure exacte ne doit pas mentir) : un angle droit code doit
    etre droit, des segments codes egaux doivent etre egaux, tout point doit
    tenir dans le cadre. Et une figure ne doit pas tromper l'oeil : un angle
    marque ou un sommet de polygone entre 75 et 105 degres qui n'est pas droit, ou
    trois points presque alignes sans l'etre, sont refuses (etape 4b, point 9 du
    cartographe). "presque_droit_autorise": true leve le premier controle, pour
    un exercice qui ne porte pas sur l'angle droit (comparer deux angles).
    """
    nc = _entier(p, "colonnes", 2, 12)
    nl = _entier(p, "lignes", 2, 10)
    fond = p.get("fond", "blanc")
    if fond not in ("blanc", "quadrille", "pointe"):
        raise FigureInvalide("fond : \"blanc\", \"quadrille\" ou \"pointe\"")
    s, m = 26, 16
    L, H = 2 * m + nc * s, 2 * m + nl * s

    brut = p.get("points", {})
    if not isinstance(brut, dict) or not brut:
        raise FigureInvalide("points : objet {\"A\": [x, y]} attendu")
    pts: dict[str, tuple[Fraction, Fraction]] = {}
    for nom, xy in brut.items():
        if not (isinstance(nom, str) and 1 <= len(nom) <= 4):
            raise FigureInvalide(f"points : nom « {nom} » invalide (1 a 4 caracteres)")
        if not (isinstance(xy, list) and len(xy) == 2):
            raise FigureInvalide(f"point {nom} : [x, y] attendu")
        x, y = _nombre(xy[0], f"point {nom}"), _nombre(xy[1], f"point {nom}")
        if not (0 <= x <= nc and 0 <= y <= nl):
            raise FigureInvalide(f"point {nom} : hors du cadre ({nc} x {nl})")
        pts[nom] = (x, y)

    def P(nom) -> tuple[Fraction, Fraction]:
        if nom not in pts:
            raise FigureInvalide(f"point « {nom} » non defini dans points")
        return pts[nom]

    def px(pt) -> tuple[float, float]:
        return m + float(pt[0]) * s, m + float(pt[1]) * s

    def dist2(a, b) -> Fraction:
        return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

    def couleur(e) -> str:
        return ACCENT if e.get("couleur") == "accent" else TRAIT

    def tirets(e) -> str:
        return ' stroke-dasharray="5 4"' if e.get("style") == "pointille" else ""

    def trait(a, b, e, epaisseur=2.0, extra="") -> str:
        (x1, y1), (x2, y2) = a, b
        return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{couleur(e)}" '
                f'stroke-width="{epaisseur}" stroke-linecap="round"{tirets(e)}{extra}/>')

    def jusquau_cadre(a, b, deux_sens: bool) -> tuple[tuple[float, float], tuple[float, float]]:
        """Prolonge [ab] jusqu'aux bords du cadre (en pixels)."""
        (ax, ay), (bx, by) = px(a), px(b)
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            raise FigureInvalide("droite : deux points confondus")
        ts = []
        for bord, d, o in ((4, dx, ax), (L - 4, dx, ax), (4, dy, ay), (H - 4, dy, ay)):
            if d:
                ts.append((bord - o) / d)
        t_max = min(t for t in ts if t > 0)
        t_min = max(t for t in ts if t < 0) if deux_sens else 0.0
        return (ax + t_min * dx, ay + t_min * dy), (ax + t_max * dx, ay + t_max * dy)

    corps: list[str] = []
    angles_vus: list = []
    if fond == "quadrille":
        for k in range(nc + 1):
            corps.append(_ligne(m + k * s, m, m + k * s, m + nl * s, couleur="#cbd5e1", epaisseur=1))
        for k in range(nl + 1):
            corps.append(_ligne(m, m + k * s, m + nc * s, m + k * s, couleur="#cbd5e1", epaisseur=1))
    elif fond == "pointe":
        for i in range(nc + 1):
            for j in range(nl + 1):
                corps.append(f'<circle cx="{m + i * s}" cy="{m + j * s}" r="1.6" fill="{DOUX}"/>')

    for i, e in enumerate(p.get("elements", [])):
        if not isinstance(e, dict):
            raise FigureInvalide(f"element {i + 1} : objet attendu")
        if "segment" in e:
            a, b = e["segment"]
            corps.append(trait(px(P(a)), px(P(b)), e))
        elif "droite" in e or "axe" in e or "demi_droite" in e:
            cle = "droite" if "droite" in e else "axe" if "axe" in e else "demi_droite"
            a, b = e[cle]
            u, v = jusquau_cadre(P(a), P(b), deux_sens=cle != "demi_droite")
            if cle == "axe":
                e = {**e, "style": "pointille"}
            corps.append(trait(u, v, e, epaisseur=1.6 if cle == "axe" else 1.8))
            if e.get("nom"):
                # Nom de la droite pres de son extremite, decale perpendiculairement.
                dx, dy = v[0] - u[0], v[1] - u[1]
                n = math.hypot(dx, dy)
                ex, ey = v[0] - dx / n * 16 - dy / n * 12, v[1] - dy / n * 16 + dx / n * 12
                corps.append(_texte(min(max(ex, 12), L - 12), min(max(ey + 5, 14), H - 4),
                                    str(e["nom"])[:5], 14, couleur=couleur(e)))
        elif "polygone" in e:
            sommets = [px(P(n)) for n in e["polygone"]]
            if len(sommets) < 3:
                raise FigureInvalide(f"element {i + 1} : polygone de 3 sommets au moins")
            remp = REMPLI if e.get("rempli") else "none"
            chemin = " ".join(f"{x:.1f},{y:.1f}" for x, y in sommets)
            noms_poly = e["polygone"]
            for k in range(len(noms_poly)):
                A = P(noms_poly[k])
                B, C = P(noms_poly[k - 1]), P(noms_poly[(k + 1) % len(noms_poly)])
                angles_vus.append((f"{noms_poly[k - 1]}{noms_poly[k]}{noms_poly[(k + 1) % len(noms_poly)]}",
                                   (B[0] - A[0], B[1] - A[1]), (C[0] - A[0], C[1] - A[1])))
            corps.append(f'<polygon points="{chemin}" fill="{remp}" fill-opacity="0.6" stroke="{couleur(e)}" '
                         f'stroke-width="2" stroke-linejoin="round"{tirets(e)}/>')
        elif "cercle" in e:
            o = P(e["cercle"])
            if "passe_par" in e:
                r = math.sqrt(float(dist2(o, P(e["passe_par"]))))
            else:
                r = float(_nombre(e.get("rayon"), "cercle.rayon"))
            if r <= 0:
                raise FigureInvalide(f"element {i + 1} : rayon nul")
            if not (float(o[0]) - r >= -1e-9 and float(o[0]) + r <= nc + 1e-9
                    and float(o[1]) - r >= -1e-9 and float(o[1]) + r <= nl + 1e-9):
                raise FigureInvalide(f"element {i + 1} : le cercle sort du cadre")
            cx, cy = px(o)
            remp = REMPLI if e.get("rempli") else "none"
            corps.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r * s:.1f}" fill="{remp}" '
                         f'stroke="{couleur(e)}" stroke-width="2"{tirets(e)}/>')
        elif "angle" in e or "angle_droit" in e:
            droit = "angle_droit" in e
            b, a, c = e["angle_droit" if droit else "angle"]
            A, B, C = P(a), P(b), P(c)
            u = (B[0] - A[0], B[1] - A[1])
            v = (C[0] - A[0], C[1] - A[1])
            if u == (0, 0) or v == (0, 0):
                raise FigureInvalide(f"element {i + 1} : angle avec un cote nul")
            if droit and u[0] * v[0] + u[1] * v[1] != 0:
                raise FigureInvalide(f"element {i + 1} : l'angle {b}{a}{c} est code droit mais ne l'est pas")
            nu, nv = math.hypot(*map(float, u)), math.hypot(*map(float, v))
            ux, uy = float(u[0]) / nu, float(u[1]) / nu
            vx, vy = float(v[0]) / nv, float(v[1]) / nv
            ax, ay = px(A)
            if not droit:
                angles_vus.append((f"{b}{a}{c}", u, v))
            if droit:
                k = 11
                chemin = (f"M{ax + ux * k:.1f},{ay + uy * k:.1f} L{ax + (ux + vx) * k:.1f},{ay + (uy + vy) * k:.1f} "
                          f"L{ax + vx * k:.1f},{ay + vy * k:.1f}")
                corps.append(f'<path d="{chemin}" fill="none" stroke="{couleur(e)}" stroke-width="1.6"/>')
            else:
                r = float(e.get("rayon_arc", 20))
                balayage = 1 if ux * vy - uy * vx > 0 else 0
                chemin = (f"M{ax + ux * r:.1f},{ay + uy * r:.1f} "
                          f"A{r},{r} 0 0 {balayage} {ax + vx * r:.1f},{ay + vy * r:.1f}")
                arcs = e.get("arcs", 1)
                if arcs not in (1, 2):
                    raise FigureInvalide(f"element {i + 1} : arcs 1 ou 2")
                for k in range(1, arcs):
                    rr = r + 4 * k
                    chemin = (f"M{ax + ux * rr:.1f},{ay + uy * rr:.1f} "
                              f"A{rr},{rr} 0 0 {balayage} {ax + vx * rr:.1f},{ay + vy * rr:.1f}")
                    corps.append(f'<path d="{chemin}" fill="none" stroke="{ACCENT}" stroke-width="2"/>')
                corps.append(f'<path d="M{ax + ux * r:.1f},{ay + uy * r:.1f} A{r},{r} 0 0 {balayage} {ax + vx * r:.1f},{ay + vy * r:.1f}" fill="none" stroke="{ACCENT}" stroke-width="2"/>')
                if e.get("nom"):
                    bx, by = ux + vx, uy + vy
                    nb = math.hypot(bx, by) or 1.0
                    d = r + 4 * (arcs - 1) + 14
                    corps.append(_texte(ax + bx / nb * d, ay + by / nb * d + 5,
                                        str(e["nom"])[:5], 13, couleur=ACCENT, gras=True))
        elif "codage" in e:
            marque = e.get("marque", 1)
            if marque not in (1, 2, 3):
                raise FigureInvalide(f"element {i + 1} : marque 1, 2 ou 3")
            segs = e["codage"]
            # Egalite a 0,2 % pres : un triangle equilateral n'a pas de sommets
            # a coordonnees rationnelles (lot 4b L5) ; l'ecart reste invisible.
            longueurs = [dist2(P(a), P(b)) for a, b in segs]
            if max(longueurs) > min(longueurs) * Fraction(1004, 1000):
                raise FigureInvalide(f"element {i + 1} : segments codes egaux mais de longueurs differentes")
            for a, b in segs:
                (x1, y1), (x2, y2) = px(P(a)), px(P(b))
                dx, dy = x2 - x1, y2 - y1
                n = math.hypot(dx, dy)
                tx, ty, nx, ny = dx / n, dy / n, -dy / n, dx / n
                mx, my = (x1 + x2) / 2, (y1 + y2) / 2
                for k in range(marque):
                    d = (k - (marque - 1) / 2) * 5
                    cx, cy = mx + tx * d, my + ty * d
                    corps.append(_ligne(cx - nx * 6 + tx * 2, cy - ny * 6 + ty * 2,
                                        cx + nx * 6 - tx * 2, cy + ny * 6 - ty * 2,
                                        couleur=ACCENT, epaisseur=1.6))
        elif "longueur" in e:
            a, b = e["longueur"]
            (x1, y1), (x2, y2) = px(P(a)), px(P(b))
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            dx, dy = x2 - x1, y2 - y1
            n = math.hypot(dx, dy) or 1.0
            nx, ny = -dy / n, dx / n
            # Du cote oppose au centre des points nommes.
            vis = [q for q in pts if not q.startswith("_")] or list(pts)
            gx0 = m + sum(float(pts[q][0]) for q in vis) / len(vis) * s
            gy0 = m + sum(float(pts[q][1]) for q in vis) / len(vis) * s
            if (mx - gx0) * nx + (my - gy0) * ny < 0:
                nx, ny = -nx, -ny
            # Le texte part du trait vers l'exterieur : aligne a gauche ou a droite
            # le long d'un cote vertical ou penche, centre le long d'un cote
            # horizontal. Centre a 14 px, « 4 cm » chevauchait un cote vertical
            # (lot 4b L3).
            texte = str(e.get("texte", ""))[:8]
            if abs(nx) > 0.5:
                ancre = "start" if nx > 0 else "end"
                tx, ty = mx + nx * 8, my + ny * 8 + 5
                largeur = 7.5 * len(texte)
                tx = min(max(tx, 4 + (largeur if ancre == "end" else 0)), L - 4 - (largeur if ancre == "start" else 0))
            else:
                ancre = "middle"
                tx, ty = min(max(mx + nx * 14, 20), L - 20), my + ny * 13 + 5
            corps.append(_texte(tx, min(max(ty, 14), H - 3), texte, 13, ancre=ancre, couleur=couleur(e)))
        elif "texte" in e:
            xy = e.get("position")
            if not (isinstance(xy, list) and len(xy) == 2):
                raise FigureInvalide(f"element {i + 1} : texte sans position [x, y]")
            tx, ty = px((_nombre(xy[0], "position"), _nombre(xy[1], "position")))
            corps.append(_texte(tx, ty + 5, str(e["texte"])[:12], 15, couleur=couleur(e), gras=True))
        else:
            raise FigureInvalide(f"element {i + 1} : type inconnu ({', '.join(e)})")

    # Une figure qui trompe l'oeil : angle presque droit, points presque alignes.
    if not p.get("presque_droit_autorise"):
        for nom_angle, u, v in angles_vus:
            produit = u[0] * v[0] + u[1] * v[1]
            if produit == 0:
                continue
            cos = float(produit) / (math.hypot(*map(float, u)) * math.hypot(*map(float, v)))
            degres = math.degrees(math.acos(max(-1.0, min(1.0, cos))))
            if 75 < degres < 105:
                raise FigureInvalide(f"angle {nom_angle} : {degres:.0f} degres, presque droit sans l'etre "
                                     "(l'eleve ne peut pas trancher a l'oeil)")
    noms_vus = [q for q in pts if not q.startswith("_")]
    for a in noms_vus:
        for b in noms_vus:
            for c in noms_vus:
                if not (a < c and b not in (a, c)):
                    continue
                A, B, C = pts[a], pts[b], pts[c]
                ac = (C[0] - A[0], C[1] - A[1])
                ab = (B[0] - A[0], B[1] - A[1])
                l2 = ac[0] ** 2 + ac[1] ** 2
                if l2 == 0:
                    continue
                t = (ab[0] * ac[0] + ab[1] * ac[1]) / l2
                croix = ab[0] * ac[1] - ab[1] * ac[0]
                if 0 < t < 1 and croix != 0 and abs(float(croix)) / math.sqrt(float(l2)) < 0.35:
                    raise FigureInvalide(f"points {a}, {b}, {c} presque alignes sans l'etre")

    # Points : une croix et le nom, a l'oppose du centre de la figure.
    visibles = [n for n in pts if not n.startswith("_")]
    gx = sum(float(pts[n][0]) for n in visibles) / max(len(visibles), 1)
    gy = sum(float(pts[n][1]) for n in visibles) / max(len(visibles), 1)
    places = {"haut": (0, -1), "bas": (0, 1), "gauche": (-1, 0), "droite": (1, 0),
              "haut_gauche": (-0.7, -0.7), "haut_droite": (0.7, -0.7),
              "bas_gauche": (-0.7, 0.7), "bas_droite": (0.7, 0.7)}
    forcees = p.get("etiquettes", {})
    for nom in visibles:
        x, y = px(pts[nom])
        corps.append(_ligne(x - 4, y - 4, x + 4, y + 4, epaisseur=1.6))
        corps.append(_ligne(x - 4, y + 4, x + 4, y - 4, epaisseur=1.6))
        if nom in forcees:
            if forcees[nom] not in places:
                raise FigureInvalide(f"etiquettes.{nom} : {', '.join(places)}")
            dx, dy = places[forcees[nom]]
        else:
            dx, dy = float(pts[nom][0]) - gx, float(pts[nom][1]) - gy
            n = math.hypot(dx, dy)
            dx, dy = (dx / n, dy / n) if n > 1e-9 else (0.0, -1.0)
        tx = min(max(x + dx * 14, 8), L - 8)
        ty = min(max(y + dy * 14 + 5, 14), H - 3)
        corps.append(_texte(tx, ty, nom, 15, gras=True))

    alt = "Figure de géométrie"
    if visibles:
        alt += " avec les points " + ", ".join(visibles)
    return _svg(L, H, corps, alt), alt


def _rapporteur(p: dict) -> tuple[str, str]:
    """Un angle pose sur un rapporteur gradue de 0 a 180 degres.

    params :
      angle       mesure de l'angle en degres (5 a 175, multiple de 5)
      depart      "droite" (defaut : le premier cote passe par le 0 de droite)
                  ou "gauche" (il passe par le 0 de gauche : on lit l'autre echelle)
      echelles    "double" (defaut, deux graduations en sens contraire, comme un
                  vrai rapporteur) ou "simple"
      sommet, cotes  noms : "O" et ["A", "B"] par defaut (A sur le premier cote)
      erreur      "centre" (le sommet n'est pas au centre du rapporteur) ou "zero"
                  (le premier cote ne passe pas par un 0) : rapporteur mal pose,
                  pour faire reperer l'erreur
    """
    a = _entier(p, "angle", 5, 175)
    if a % 5:
        raise FigureInvalide("angle : multiple de 5 (graduations de 5 en 5)")
    depart = p.get("depart", "droite")
    if depart not in ("droite", "gauche"):
        raise FigureInvalide("depart : \"droite\" ou \"gauche\"")
    double = p.get("echelles", "double") == "double"
    erreur = p.get("erreur")
    if erreur not in (None, "centre", "zero"):
        raise FigureInvalide("erreur : centre ou zero")
    sommet = str(p.get("sommet", "O"))[:2]
    cotes = p.get("cotes", ["A", "B"])
    L, R = 344, 148
    cx, cy = L / 2, 172
    H = cy + 26

    def point(deg: float, r: float) -> tuple[float, float]:
        t = math.radians(deg)
        return cx + r * math.cos(t), cy - r * math.sin(t)

    corps = [f'<path d="M{cx - R},{cy} A{R},{R} 0 0 1 {cx + R},{cy} Z" fill="#fef9c3" '
             f'fill-opacity="0.85" stroke="{TRAIT}" stroke-width="1.2"/>']
    # Les nombres sont dessines apres les cotes de l'angle, avec un halo couleur
    # du rapporteur : un cote pose sur une dizaine rayait le nombre a lire
    # (relecture 4b L5).
    nombres: list[str] = []
    for d in range(0, 181, 5):
        long = 10 if d % 10 == 0 else 6
        x1, y1 = point(d, R)
        x2, y2 = point(d, R - long)
        corps.append(_ligne(x1, y1, x2, y2, epaisseur=1.2 if d % 10 == 0 else 0.8))
        if d % 10 == 0:
            # Aux deux bouts, les nombres remontent au-dessus de la base, que
            # couvre un cote de l'angle.
            haut = -8 if d in (0, 180) else 4
            x, y = point(d, R - 20)
            nombres.append(_texte(x, y + haut, str(d), 10))
            if double:
                x, y = point(d, R - 40)
                nombres.append(_texte(x, y + haut, str(180 - d), 9, couleur="#b91c1c"))
    corps.append(f'<circle cx="{cx}" cy="{cy}" r="2.5" fill="{TRAIT}"/>')
    # Les deux cotes de l'angle, qui depassent du rapporteur.
    d1 = 0 if depart == "droite" else 180
    d2 = a if depart == "droite" else 180 - a
    if erreur == "zero":
        # Rapporteur tourne de 10 degres : aucun cote ne passe par un 0.
        sens = 1 if depart == "droite" else -1
        d1, d2 = d1 + 10 * sens, d2 + 10 * sens
    sx = cx + (22 if erreur == "centre" else 0)
    for d, nom in ((d1, cotes[0]), (d2, cotes[1])):
        x, y = point(d, R + 12)
        x += sx - cx
        corps.append(_ligne(sx, cy, x, y, couleur=ACCENT, epaisseur=2.2))
        lx, ly = point(d, R + 4)
        decal = 12 if d < 90 else -12 if d > 90 else 0
        corps.append(_texte(min(max(lx + decal, 8), L - 8), max(ly - 6, 12), str(nom)[:2], 14,
                            couleur=ACCENT, gras=True))
    corps += [n.replace("<text ", '<text stroke="#fef9c3" stroke-width="3" paint-order="stroke" ', 1)
              for n in nombres]
    if erreur == "centre":
        corps.append(f'<circle cx="{sx}" cy="{cy}" r="3" fill="{ACCENT}"/>')
    corps.append(_texte(sx, cy + 20, sommet, 14, gras=True))
    alt = f"Angle de sommet {sommet} posé sur un rapporteur"
    return _svg(L, H, corps, alt), alt


def _cavaliere(w: float, h: float, d: float) -> tuple[float, float]:
    """Fuyante d'une perspective cavaliere : angle 45 degres, coefficient 0,5."""
    k = d * 0.5 / math.sqrt(2)
    return k, -k


def _dessin_solide(sorte: str, x0: float, y0: float, t: float, p: dict) -> list[str]:
    """Un solide dont la boite englobante a son coin bas gauche en (x0, y0) et
    une taille de reference t (pixels). Aretes cachees en pointilles."""
    corps: list[str] = []
    face_coloriee = p.get("face")
    lettres = p.get("sommets", False)

    def seg(a, b, cache=False):
        extra = ' stroke-dasharray="4 3"' if cache else ""
        corps.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" '
                     f'stroke="{TRAIT}" stroke-width="{1.2 if cache else 1.8}" stroke-linecap="round"{extra}/>')

    def poly(pts_, couleur):
        chemin = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts_)
        corps.append(f'<polygon points="{chemin}" fill="{couleur}" stroke="none"/>')

    def nommer(sommets, noms):
        cx = sum(q[0] for q in sommets) / len(sommets)
        cy = sum(q[1] for q in sommets) / len(sommets)
        for (x, y), nom in zip(sommets, noms):
            dx, dy = x - cx, y - cy
            n = math.hypot(dx, dy) or 1.0
            corps.append(_texte(x + dx / n * 11, y + dy / n * 11 + 4, nom, 12, gras=True))

    if sorte in ("cube", "pave"):
        if sorte == "cube":
            w = h = t * 0.62
            d = t * 0.62
        else:
            w, h, d = t * 0.8, t * 0.45, t * 0.6
        ox, oy = _cavaliere(w, h, d)
        A, B = (x0, y0), (x0 + w, y0)
        C, D = (x0 + w, y0 - h), (x0, y0 - h)
        E, F, G, H = [(q[0] + ox, q[1] + oy) for q in (A, B, C, D)]
        poly([A, B, C, D], REMPLI if face_coloriee == "avant" else "#ffffff")
        poly([D, C, G, H], REMPLI if face_coloriee == "dessus" else "#f1f5f9")
        poly([B, F, G, C], REMPLI if face_coloriee == "droite" else "#e2e8f0")
        for a, b in ((A, B), (B, C), (C, D), (D, A), (B, F), (C, G), (D, H), (F, G), (G, H)):
            seg(a, b)
        for a, b in ((A, E), (E, F), (E, H)):
            seg(a, b, cache=True)
        if lettres:
            # Chaque lettre du cote libre de son sommet, hors des aretes.
            places = {"A": (-0.7, 0.7), "B": (0.7, 0.7), "C": (1, 0.35), "D": (-1, 0),
                      "E": (-1, -0.35), "F": (1, 0.2), "G": (0.7, -0.7), "H": (-0.7, -0.7)}
            for (x, y), nom in zip([A, B, C, D, E, F, G, H], "ABCDEFGH"):
                dx, dy = places[nom]
                corps.append(_texte(x + dx * 12, y + dy * 12 + 4, nom, 12, gras=True))
    elif sorte == "pyramide":
        # Base carree en perspective cavaliere, sommet au-dessus du centre.
        w = t * 0.8
        ox, oy = _cavaliere(w, 0, w)
        A, B = (x0, y0), (x0 + w, y0)
        C, D = (B[0] + ox, B[1] + oy), (A[0] + ox, A[1] + oy)
        S = ((A[0] + C[0]) / 2, y0 - t * 0.85)
        poly([A, B, S], "#ffffff")
        poly([B, C, S], "#e2e8f0")
        for a, b in ((A, B), (B, C), (S, A), (S, B), (S, C)):
            seg(a, b)
        for a, b in ((C, D), (D, A), (S, D)):
            seg(a, b, cache=True)
        if lettres:
            nommer([A, B, C, D, S], list("ABCDS"))
    elif sorte == "pyramide_triangle":
        w = t * 0.85
        A, B = (x0, y0), (x0 + w, y0)
        C = (x0 + w * 0.6, y0 - t * 0.22)
        S = (x0 + w * 0.45, y0 - t * 0.9)
        poly([A, B, S], "#ffffff")
        for a, b in ((A, B), (S, A), (S, B)):
            seg(a, b)
        for a, b in ((C, A), (C, B), (C, S)):
            seg(a, b, cache=True)
        if lettres:
            nommer([A, B, C, S], list("ABCS"))
    elif sorte in ("prisme", "prisme_hexagone", "cylindre", "cone"):
        # Base horizontale vue en ellipse ; on voit le dessus (sauf le cone).
        R = t * 0.42
        r = R * 0.38
        cx, cyb = x0 + t * 0.45, y0 - r
        hauteur = t * 0.75
        if sorte in ("cylindre", "cone"):
            dessus = cyb - hauteur
            # Base : moitie avant pleine, moitie arriere en pointilles.
            corps.append(f'<path d="M{cx - R:.1f},{cyb:.1f} A{R:.1f},{r:.1f} 0 0 0 {cx + R:.1f},{cyb:.1f}" '
                         f'fill="none" stroke="{TRAIT}" stroke-width="1.8"/>')
            corps.append(f'<path d="M{cx - R:.1f},{cyb:.1f} A{R:.1f},{r:.1f} 0 0 1 {cx + R:.1f},{cyb:.1f}" '
                         f'fill="none" stroke="{TRAIT}" stroke-width="1.2" stroke-dasharray="4 3"/>')
            if sorte == "cylindre":
                corps.append(f'<ellipse cx="{cx:.1f}" cy="{dessus:.1f}" rx="{R:.1f}" ry="{r:.1f}" '
                             f'fill="#f1f5f9" stroke="{TRAIT}" stroke-width="1.8"/>')
                seg((cx - R, cyb), (cx - R, dessus))
                seg((cx + R, cyb), (cx + R, dessus))
            else:
                S = (cx, cyb - hauteur * 1.1)
                seg((cx - R, cyb), S)
                seg((cx + R, cyb), S)
        else:
            n = 3 if sorte == "prisme" else 6
            # Hexagone tourne de 15 degres : sinon chaque arete debout cachee tombe
            # sur une arete de devant et disparait (relecture 4b L2).
            decal = math.pi / 2 if n == 3 else math.pi / 12
            base = [(cx + R * math.cos(decal + 2 * math.pi * k / n), cyb + r * math.sin(decal + 2 * math.pi * k / n))
                    for k in range(n)]
            haut = [(x, y - hauteur) for x, y in base]
            xs = [q[0] for q in base]
            extremes = {xs.index(min(xs)), xs.index(max(xs))}
            arriere = [q[1] < cyb - 1e-6 for q in base]
            poly(haut, "#f1f5f9")
            for k in range(n):
                k2 = (k + 1) % n
                seg(haut[k], haut[k2])
                mi = (base[k][1] + base[k2][1]) / 2
                seg(base[k], base[k2], cache=mi < cyb - 1e-6)
                seg(base[k], haut[k], cache=arriere[k] and k not in extremes)
    elif sorte == "boule":
        R = t * 0.42
        cx, cy = x0 + t * 0.45, y0 - R
        corps.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{R:.1f}" fill="#f8fafc" stroke="{TRAIT}" stroke-width="1.8"/>')
        corps.append(f'<path d="M{cx - R:.1f},{cy:.1f} A{R:.1f},{R * 0.3:.1f} 0 0 0 {cx + R:.1f},{cy:.1f}" '
                     f'fill="none" stroke="{TRAIT}" stroke-width="1.2"/>')
        corps.append(f'<path d="M{cx - R:.1f},{cy:.1f} A{R:.1f},{R * 0.3:.1f} 0 0 1 {cx + R:.1f},{cy:.1f}" '
                     f'fill="none" stroke="{TRAIT}" stroke-width="1" stroke-dasharray="4 3"/>')
    else:
        raise FigureInvalide(f"solide « {sorte} » inconnu")
    return corps


SOLIDES = ("cube", "pave", "pyramide", "pyramide_triangle", "prisme", "prisme_hexagone",
           "cylindre", "cone", "boule")


def _solide(p: dict) -> tuple[str, str]:
    """Un ou plusieurs solides en perspective cavaliere, aretes cachees en pointilles.

    params :
      solides   liste de 1 a 4 solides : {"type": ..., "nom": "A", "sommets": true,
                "face": "avant" | "dessus" | "droite"}
                types : cube, pave, pyramide (base carree), pyramide_triangle,
                prisme (droit, base triangle), prisme_hexagone, cylindre, cone, boule
                "sommets" : lettres aux sommets (cube, pave, pyramides)
                "face" : une face coloriee (cube, pave)
                "nom" : nom ecrit sous le solide (pour un QCM)
    """
    liste = p.get("solides")
    if not (isinstance(liste, list) and 1 <= len(liste) <= 4):
        raise FigureInvalide("solides : liste de 1 a 4 solides")
    seul = len(liste) == 1
    t = 170 if seul else 72
    # Seul, le solide garde de la place a droite pour la fuyante et les lettres
    # des sommets (lettre C d une pyramide coupee, lot 4b L2).
    case = t + (100 if seul else 14)
    L = max(case * len(liste), 160)
    H = t + (60 if seul else 44)
    corps: list[str] = []
    for k, sol in enumerate(liste):
        if not isinstance(sol, dict) or sol.get("type") not in SOLIDES:
            raise FigureInvalide(f"solide {k + 1} : type parmi {', '.join(SOLIDES)}")
        x0 = case * k + (case - t) / 2 + (6 if seul else 0)
        y0 = H - (34 if not seul else 26)
        corps += _dessin_solide(sol["type"], x0, y0, t, sol)
        if sol.get("nom"):
            corps.append(_texte(case * k + case / 2, H - 8, str(sol["nom"])[:3], 15, gras=True))
    alt = "Solide en perspective" if seul else f"{len(liste)} solides en perspective"
    return _svg(L, H, corps, alt), alt


def _cubes(p: dict) -> tuple[str, str]:
    """Assemblage de cubes identiques en perspective cavaliere.

    params :
      hauteurs  tableau de rangees, de l'ARRIERE vers l'AVANT ; chaque rangee
                donne, de gauche a droite, le nombre de cubes empiles sur chaque
                case (0 a 5). Ex. [[2, 1], [1, 0]] : 2 rangees de 2 cases.
                Au plus 4 rangees et 6 colonnes.
      marque    [rangee, colonne, etage] d'un cube a colorier (etage 0 = en bas)
    Un cube cache par d'autres n'est pas visible, comme sur un vrai dessin : la
    description fait foi pour le nombre total (validateur, corrige).
    """
    hs = p.get("hauteurs")
    if not (isinstance(hs, list) and 1 <= len(hs) <= 4 and all(isinstance(r, list) for r in hs)):
        raise FigureInvalide("hauteurs : 1 a 4 rangees")
    nc = len(hs[0])
    if not 1 <= nc <= 6 or any(len(r) != nc for r in hs):
        raise FigureInvalide("hauteurs : rangees de meme longueur, 1 a 6 colonnes")
    for r in hs:
        for v in r:
            if not (isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= 5):
                raise FigureInvalide("hauteurs : entiers de 0 a 5")
    marque = p.get("marque")
    s = 34
    ox, oy = _cavaliere(s, s, s)
    nr = len(hs)
    hmax = max(max(r) for r in hs)
    L = 24 + nc * s + nr * ox
    H = 24 + hmax * s + nr * (-oy)
    L = max(L, 120)
    corps: list[str] = []
    for ri, rangee in enumerate(hs):           # de l'arriere vers l'avant
        recul = nr - 1 - ri                     # 0 pour la rangee de devant
        for ci, haut in enumerate(rangee):      # de gauche a droite
            for et in range(haut):              # de bas en haut
                x = 12 + ci * s + recul * ox
                y = H - 12 + recul * oy - et * s
                avant = [(x, y), (x + s, y), (x + s, y - s), (x, y - s)]
                dessus = [(x, y - s), (x + s, y - s), (x + s + ox, y - s + oy), (x + ox, y - s + oy)]
                cote = [(x + s, y), (x + s + ox, y + oy), (x + s + ox, y - s + oy), (x + s, y - s)]
                colorie = marque == [ri, ci, et]
                for face, couleur in ((avant, REMPLI_FORT if colorie else "#ffffff"),
                                      (dessus, REMPLI if colorie else "#f1f5f9"),
                                      (cote, REMPLI if colorie else "#cbd5e1")):
                    chemin = " ".join(f"{a:.1f},{b:.1f}" for a, b in face)
                    corps.append(f'<polygon points="{chemin}" fill="{couleur}" stroke="{TRAIT}" '
                                 f'stroke-width="1.4" stroke-linejoin="round"/>')
    alt = "Assemblage de cubes en perspective"
    return _svg(L, H, corps, alt), alt


# ---------------------------------------------------------------------------
#  Nombres relatifs (etape 5)
# ---------------------------------------------------------------------------

# Signe moins typographique (U+2212) : le trait d'union est trop court pour un
# eleve qui decouvre les negatifs, et c'est l'ecriture des manuels.
MOINS = chr(0x2212)


def _relatif(x: Fraction, fmt: str = "auto") -> str:
    """Ecriture d'un relatif : « −3 », « −0,5 », « 4 »."""
    if x < 0:
        return MOINS + _texte_nombre(-x, fmt)
    return _texte_nombre(x, fmt)


def _ecart_signe(x: Fraction, fmt: str = "auto") -> str:
    """Deplacement : « +7 », « −3 »."""
    return ("+" if x > 0 else "") + _relatif(x, fmt)


def _sur_la_grille(v: Fraction, origine: Fraction, grain: Fraction, quoi: str) -> None:
    if (v - origine) % grain != 0:
        raise FigureInvalide(f"{quoi} : {_relatif(v)} ne tombe pas sur une graduation (grain {grain})")


def _droite_graduee(p: dict) -> tuple[str, str]:
    """Droite graduee des relatifs, horizontale ou verticale (thermometre, altitude).

    A la difference de `demi_droite`, la droite n'a pas d'origine dessinee :
    elle se prolonge des deux cotes, et 0 est une graduation comme une autre,
    mise en evidence. Les negatifs s'ecrivent avec le signe moins « − ».

    params :
      min, max          bornes affichees ; min <= 0 <= max
      pas               ecart entre deux graduations principales (defaut 1) ;
                        (max - min) / pas entier, entre 2 et 24
      sous_graduations  intervalles entre deux graduations principales (1 a 10)
      etiquettes        "toutes" (defaut), "aucune", "zero" (0 seul) ou liste de
                        valeurs ; pour faire compter l'eleve, n'ecrire que 0 et une
                        autre valeur
      format            "auto" ou "fraction"
      orientation       "horizontale" (defaut) ou "verticale"
      unite             texte ecrit en bout d'axe (« °C », « m »), facultatif
      points            [{"valeur": x, "nom": "A"}] sur une graduation
      fleches           [{"de": a, "a": b, "etiquette": true | false | "texte"}] :
                        deplacement de a vers b ; true ecrit l'ecart signe (+7)
      ecarts            [{"de": a, "a": b, "etiquette": true | false | "texte"}] :
                        accolade entre deux valeurs ; true ecrit la distance (7)
    """
    mini = _nombre(p.get("min"), "min")
    maxi = _nombre(p.get("max"), "max")
    pas = _nombre(p.get("pas", 1), "pas")
    if pas <= 0:
        raise FigureInvalide("pas : doit etre strictement positif")
    if not (mini <= 0 <= maxi) or mini == maxi:
        raise FigureInvalide("min et max : la droite doit contenir 0 (min <= 0 <= max)")
    if (maxi - mini) % pas != 0:
        raise FigureInvalide("min, max, pas : (max - min) doit etre un multiple du pas")
    n = int((maxi - mini) / pas)
    if not 2 <= n <= 24:
        raise FigureInvalide(f"(max - min) / pas = {n} : entre 2 et 24 graduations attendues")
    if mini % pas != 0:
        raise FigureInvalide("min : doit etre un multiple du pas (0 tombe alors sur une graduation)")
    sous = _entier(p, "sous_graduations", 1, 10, 1)
    fmt = p.get("format", "auto")
    vertical = p.get("orientation", "horizontale") == "verticale"
    if p.get("orientation", "horizontale") not in ("horizontale", "verticale"):
        raise FigureInvalide("orientation : \"horizontale\" ou \"verticale\"")
    unite = str(p.get("unite", ""))[:6]
    grain = pas / sous

    def verifier(v: Fraction, quoi: str) -> Fraction:
        if not (mini <= v <= maxi):
            raise FigureInvalide(f"{quoi} : {_relatif(v)} hors de la droite ({_relatif(mini)} à {_relatif(maxi)})")
        _sur_la_grille(v, mini, grain, quoi)
        return v

    etiq = p.get("etiquettes", "toutes")
    if etiq == "toutes":
        etiquettes = [mini + pas * k for k in range(n + 1)]
    elif etiq == "aucune":
        etiquettes = []
    elif etiq == "zero":
        etiquettes = [Fraction(0)]
    elif isinstance(etiq, list):
        etiquettes = [verifier(_nombre(v, "etiquettes"), "etiquette") for v in etiq]
    else:
        raise FigureInvalide("etiquettes : \"toutes\", \"aucune\", \"zero\" ou liste de valeurs")

    points = []
    for pt in p.get("points", []):
        nom = str(pt.get("nom", ""))[:3]
        points.append((verifier(_nombre(pt.get("valeur"), "points.valeur"), f"point {nom}"), nom))
    fleches = []
    for f in p.get("fleches", []):
        de = verifier(_nombre(f.get("de"), "fleches.de"), "fleche (de)")
        a = verifier(_nombre(f.get("a"), "fleches.a"), "fleche (a)")
        if de == a:
            raise FigureInvalide("fleche : depart et arrivee confondus")
        e = f.get("etiquette", True)
        fleches.append((de, a, _ecart_signe(a - de, fmt) if e is True else (str(e) if e else "")))
    ecarts = []
    for f in p.get("ecarts", []):
        de = verifier(_nombre(f.get("de"), "ecarts.de"), "ecart (de)")
        a = verifier(_nombre(f.get("a"), "ecarts.a"), "ecart (a)")
        if de == a:
            raise FigureInvalide("ecart : extremites confondues")
        e = f.get("etiquette", True)
        ecarts.append((min(de, a), max(de, a), _texte_nombre(abs(a - de), fmt) if e is True else (str(e) if e else "")))

    corps: list[str] = []
    if not vertical:
        L, m = 420, 30
        # Chaque fleche supplementaire monte d'un etage (deplacements enchaines).
        y = 52 + (58 + 22 * (len(fleches) - 1) if fleches else 0)
        H = y + (72 if ecarts else 46)

        def x(v: Fraction) -> float:
            return m + 16 + float((v - mini) / (maxi - mini)) * (L - 2 * m - 32)

        # Prolongee des deux cotes : pointille a gauche, fleche a droite.
        corps.append(f'<line x1="{m - 10}" y1="{y}" x2="{m + 6}" y2="{y}" stroke="{TRAIT}" '
                     f'stroke-width="2" stroke-dasharray="4 4"/>')
        corps.append(_ligne(m + 6, y, L - m, y, epaisseur=2))
        corps.append(f'<path d="M{L - m + 6:.1f},{y:.1f} l-10,-5 v10 z" fill="{TRAIT}"/>')
        for i in range(n * sous + 1):
            v = mini + grain * i
            principal = i % sous == 0
            t = 12 if v == 0 else 9 if principal else 5
            corps.append(_ligne(x(v), y - t, x(v), y + t, epaisseur=2.4 if v == 0 else 1.8 if principal else 1.2))
        for v in etiquettes:
            corps.append(_texte(x(v), y + 28, _relatif(v, fmt), 13, gras=v == 0))
        if unite:
            corps.append(_texte(L - m + 4, y + 28, unite, 12, couleur=DOUX))
        for etage, (de, a, t) in enumerate(fleches):
            x1, x2 = x(de), x(a)
            # La courbe part au-dessus des noms de points (y - 16) pour ne pas
            # les barrer.
            base = y - 32 - 22 * etage
            h = min(38, 14 + abs(x2 - x1) * 0.12)
            sommet = base - h
            corps.append(f'<path d="M{x1:.1f},{base:.1f} Q{(x1 + x2) / 2:.1f},{sommet:.1f} {x2:.1f},{base:.1f}" '
                         f'fill="none" stroke="{ACCENT}" stroke-width="1.8"/>')
            # Pointe orientee selon la tangente en bout de courbe.
            ang = math.atan2(base - sommet, x2 - (x1 + x2) / 2)
            for d in (2.6, -2.6):
                corps.append(_ligne(x2, base, x2 - 9 * math.cos(ang + d / 6), base - 9 * math.sin(ang + d / 6),
                                    couleur=ACCENT, epaisseur=1.8))
            # La fleche part et arrive au-dessus de la droite : un pointille la
            # ramene sur ses graduations de depart et d'arrivee. Pas de pointille
            # la ou un point est dessine : son nom le cacherait, et le point
            # suffit a lire la valeur. A l'etage 0, seul le depart ou l'arrivee
            # sans point en a besoin ; au-dessus, l'arrivee toujours.
            valeurs_points = {v for v, _ in points}
            for extremite, xe in ((de, x1), (a, x2)):
                if extremite in valeurs_points and not (etage and extremite == a):
                    continue
                if etage and extremite == de:
                    continue
                corps.append(f'<line x1="{xe:.1f}" y1="{base + 2:.1f}" x2="{xe:.1f}" y2="{y - 8:.1f}" '
                             f'stroke="{ACCENT}" stroke-width="1.2" stroke-dasharray="3 3"/>')
            if t:
                corps.append(_texte((x1 + x2) / 2, (base + sommet) / 2 - 6, t, 14, couleur=ACCENT, gras=True))
        for v, nom in points:
            corps.append(f'<circle cx="{x(v):.1f}" cy="{y:.1f}" r="4.5" fill="{ACCENT}"/>')
            corps.append(_texte(x(v), y - 16, nom, 15, couleur=ACCENT, gras=True))
        for de, a, t in ecarts:
            yb = y + 40
            corps.append(f'<path d="M{x(de):.1f},{yb - 5:.1f} v5 H{x(a):.1f} v-5" fill="none" stroke="{TRAIT}" stroke-width="1.4"/>')
            if t:
                corps.append(_texte((x(de) + x(a)) / 2, yb + 18, t, 13))
    else:
        H, m = 400, 34
        xl = 92
        L = 300 if (fleches or ecarts) else 220

        def yv(v: Fraction) -> float:
            return H - m - 10 - float((v - mini) / (maxi - mini)) * (H - 2 * m - 30)

        corps.append(f'<line x1="{xl}" y1="{H - m + 6}" x2="{xl}" y2="{H - m - 8}" stroke="{TRAIT}" '
                     f'stroke-width="2" stroke-dasharray="4 4"/>')
        corps.append(_ligne(xl, H - m - 8, xl, m - 6, epaisseur=2))
        corps.append(f'<path d="M{xl:.1f},{m - 12:.1f} l-5,10 h10 z" fill="{TRAIT}"/>')
        if unite:
            corps.append(_texte(xl, m - 18, unite, 12, couleur=DOUX))
        for i in range(n * sous + 1):
            v = mini + grain * i
            principal = i % sous == 0
            t = 12 if v == 0 else 9 if principal else 5
            corps.append(_ligne(xl - t, yv(v), xl + t, yv(v), epaisseur=2.4 if v == 0 else 1.8 if principal else 1.2))
        for v in etiquettes:
            corps.append(_texte(xl - 18, yv(v) + 4.5, _relatif(v, fmt), 13, ancre="end", gras=v == 0))
        for v, nom in points:
            corps.append(f'<circle cx="{xl:.1f}" cy="{yv(v):.1f}" r="4.5" fill="{ACCENT}"/>')
            corps.append(_texte(xl + 16, yv(v) + 5, nom, 15, ancre="start", couleur=ACCENT, gras=True))
        for de, a, t in fleches:
            y1, y2 = yv(de), yv(a)
            larg = min(60, 18 + abs(y2 - y1) * 0.18)
            cx = xl + 36 + larg
            corps.append(f'<path d="M{xl + 34:.1f},{y1:.1f} Q{cx:.1f},{(y1 + y2) / 2:.1f} {xl + 34:.1f},{y2:.1f}" '
                         f'fill="none" stroke="{ACCENT}" stroke-width="1.8"/>')
            ang = math.atan2(y2 - (y1 + y2) / 2, (xl + 34) - cx)
            for d in (2.6, -2.6):
                corps.append(_ligne(xl + 34, y2, xl + 34 - 9 * math.cos(ang + d / 6), y2 - 9 * math.sin(ang + d / 6),
                                    couleur=ACCENT, epaisseur=1.8))
            if t:
                corps.append(_texte((xl + 34 + cx) / 2 + 8, (y1 + y2) / 2 + 5, t, 14, ancre="start",
                                    couleur=ACCENT, gras=True))
        for de, a, t in ecarts:
            xb = L - 60
            corps.append(f'<path d="M{xb - 5:.1f},{yv(de):.1f} h5 V{yv(a):.1f} h-5" fill="none" stroke="{TRAIT}" stroke-width="1.4"/>')
            if t:
                corps.append(_texte(xb + 8, (yv(de) + yv(a)) / 2 + 5, t, 13, ancre="start"))

    alt = (f"Droite graduée {'verticale ' if vertical else ''}de {_relatif(mini, fmt)} à {_relatif(maxi, fmt)}"
           + (f" ({unite})" if unite else ""))
    if points:
        alt += ", avec les points " + ", ".join(nom for _, nom in points)
    return _svg(L, H, corps, alt), alt


def _repere(p: dict) -> tuple[str, str]:
    """Repere orthogonal du plan, quatre quadrants, points lettres.

    params :
      xmin, xmax, ymin, ymax  bornes en graduations (defaut -6 a 6) ; chaque plage
                              contient 0, au plus 16 graduations par axe
      pas_x, pas_y            valeur d'une graduation sur chaque axe (defaut 1) :
                              meme unite par defaut, unites differentes possibles
      etiquettes              "toutes" (defaut), "une_sur_deux", "unite" (1 seul
                              sur chaque axe) ou "aucune"
      quadrillage             true (defaut) : quadrillage leger a chaque graduation
      points                  [{"x": a, "y": b, "nom": "A", "lecture": false,
                                "position": "ne"}] ; coordonnees multiples de la
                              demi-graduation ; « lecture » trace les pointilles
                              vers les axes (decouverte et corrige seulement) ;
                              position du nom : ne, no, se, so
    """
    bornes = {}
    for cle, defaut in (("xmin", -6), ("xmax", 6), ("ymin", -6), ("ymax", 6)):
        v = p.get(cle, defaut)
        if not isinstance(v, int) or isinstance(v, bool):
            raise FigureInvalide(f"{cle} : entier attendu (en graduations)")
        bornes[cle] = v
    for a in ("x", "y"):
        lo, hi = bornes[f"{a}min"], bornes[f"{a}max"]
        if not (lo <= 0 <= hi) or hi - lo < 2 or hi - lo > 16:
            raise FigureInvalide(f"{a}min, {a}max : l'axe doit contenir 0, entre 2 et 16 graduations")
    pas_x = _nombre(p.get("pas_x", 1), "pas_x")
    pas_y = _nombre(p.get("pas_y", 1), "pas_y")
    if pas_x <= 0 or pas_y <= 0:
        raise FigureInvalide("pas_x, pas_y : strictement positifs")
    etiq = p.get("etiquettes", "toutes")
    if etiq not in ("toutes", "une_sur_deux", "unite", "aucune"):
        raise FigureInvalide("etiquettes : \"toutes\", \"une_sur_deux\", \"unite\" ou \"aucune\"")

    nx, ny = bornes["xmax"] - bornes["xmin"], bornes["ymax"] - bornes["ymin"]
    c = min(26.0, 300 / nx, 300 / ny)
    m = 34
    L, H = nx * c + 2 * m, ny * c + 2 * m

    def X(gx: float) -> float:
        return m + (gx - bornes["xmin"]) * c

    def Y(gy: float) -> float:
        return H - m - (gy - bornes["ymin"]) * c

    corps: list[str] = []
    if p.get("quadrillage", True):
        for i in range(bornes["xmin"], bornes["xmax"] + 1):
            corps.append(_ligne(X(i), Y(bornes["ymin"]), X(i), Y(bornes["ymax"]), couleur="#e2e8f0", epaisseur=1))
        for j in range(bornes["ymin"], bornes["ymax"] + 1):
            corps.append(_ligne(X(bornes["xmin"]), Y(j), X(bornes["xmax"]), Y(j), couleur="#e2e8f0", epaisseur=1))
    # Axes, prolonges d'une demi-graduation et fleches.
    corps.append(_ligne(X(bornes["xmin"]) - c / 2, Y(0), X(bornes["xmax"]) + c / 2, Y(0), epaisseur=1.8))
    corps.append(f'<path d="M{X(bornes["xmax"]) + c / 2 + 6:.1f},{Y(0):.1f} l-10,-5 v10 z" fill="{TRAIT}"/>')
    corps.append(_ligne(X(0), Y(bornes["ymin"]) + c / 2, X(0), Y(bornes["ymax"]) - c / 2, epaisseur=1.8))
    corps.append(f'<path d="M{X(0):.1f},{Y(bornes["ymax"]) - c / 2 - 6:.1f} l-5,10 h10 z" fill="{TRAIT}"/>')

    def ecrire(k: int) -> bool:
        if k == 0 or etiq == "aucune":
            return False
        if etiq == "unite":
            return k == 1
        if etiq == "une_sur_deux":
            return k % 2 == 0
        return True

    for i in range(bornes["xmin"], bornes["xmax"] + 1):
        corps.append(_ligne(X(i), Y(0) - 4, X(i), Y(0) + 4, epaisseur=1.4))
        if ecrire(i):
            corps.append(_texte(X(i), Y(0) + 17, _relatif(pas_x * i), 11))
    for j in range(bornes["ymin"], bornes["ymax"] + 1):
        corps.append(_ligne(X(0) - 4, Y(j), X(0) + 4, Y(j), epaisseur=1.4))
        if ecrire(j):
            corps.append(_texte(X(0) - 7, Y(j) + 4, _relatif(pas_y * j), 11, ancre="end"))
    # « O » au-dessus et a gauche de l'origine : sur la ligne des etiquettes de
    # l'axe horizontal, il collait a « −1 » et se lisait « −10 » (relecture L2).
    corps.append(_texte(X(0) - 6, Y(0) - 6, "O", 12, ancre="end", gras=True))

    noms = []
    for pt in p.get("points", []):
        nom = str(pt.get("nom", ""))[:3]
        vx, vy = _nombre(pt.get("x"), "points.x"), _nombre(pt.get("y"), "points.y")
        gx, gy = vx / pas_x, vy / pas_y
        if (gx * 2).denominator != 1 or (gy * 2).denominator != 1:
            raise FigureInvalide(f"point {nom} : coordonnees hors de la demi-graduation")
        if not (bornes["xmin"] <= gx <= bornes["xmax"] and bornes["ymin"] <= gy <= bornes["ymax"]):
            raise FigureInvalide(f"point {nom} : ({_relatif(vx)} ; {_relatif(vy)}) hors du repere")
        px, py = X(float(gx)), Y(float(gy))
        if pt.get("lecture"):
            corps.append(f'<path d="M{px:.1f},{py:.1f} V{Y(0):.1f} M{px:.1f},{py:.1f} H{X(0):.1f}" fill="none" '
                         f'stroke="{ACCENT}" stroke-width="1.2" stroke-dasharray="3 3"/>')
        corps.append(_ligne(px - 5, py - 5, px + 5, py + 5, couleur=ACCENT, epaisseur=2))
        corps.append(_ligne(px - 5, py + 5, px + 5, py - 5, couleur=ACCENT, epaisseur=2))
        pos = pt.get("position", "ne")
        if pos not in ("ne", "no", "se", "so"):
            raise FigureInvalide(f"point {nom} : position ne, no, se ou so")
        dx = 8 if pos[1] == "e" else -8
        dy = -8 if pos[0] == "n" else 18
        corps.append(_texte(px + dx, py + dy, nom, 14, ancre="start" if dx > 0 else "end", couleur=ACCENT, gras=True))
        noms.append(nom)

    alt = "Repère du plan d'origine O"
    if noms:
        alt += ", avec les points " + ", ".join(noms)
    return _svg(L, H, corps, alt), alt


GENERATEURS = {
    "demi_droite": _demi_droite,
    "droite_graduee": _droite_graduee,
    "repere": _repere,
    "regle": _regle,
    "horloge": _horloge,
    "quadrillage": _quadrillage,
    "partage": _partage,
    "bandes": _bandes,
    "monnaie": _monnaie,
    "geometrie": _geometrie,
    "rapporteur": _rapporteur,
    "solide": _solide,
    "cubes": _cubes,
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
