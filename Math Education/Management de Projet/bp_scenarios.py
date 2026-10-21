# Scenarios du business plan MATH EDUCATION, 24 mois apres le lancement.
# Toutes les hypotheses sont en tete ; le resultat sort en Markdown.

PRIX_MENSUEL = 9.99
PART_ANNUEL = 0.30          # part des abonnes qui prennent l'annuel
PRIX_ANNUEL = 79.0          # soit 6,58 EUR par mois
PRIX_SUIVI = 19.99          # offre Suivi (eleve + professeur qui suit)
PART_SUIVI = 0.10           # part des abonnes qui prennent Suivi
REVERSE_SUIVI = 10.0        # verse au professeur par eleve suivi et par mois
PRIX_COURS = 20.0           # par eleve, 1 h 30
COMMISSION = 0.20           # part de la plateforme sur un cours

def stripe(montant):        # cartes europeennes standard
    return 0.015 * montant + 0.25

def frais_fixes(mois, abonnes):
    supabase = 23.0                      # Pro, 25 USD
    domaine = 9.35 / 12                  # .fr, renouvellement TTC
    netlify = 0.0 if abonnes < 300 else 8.0
    resend = 0.0 if abonnes < 80 else 18.0   # 100 emails par jour au plus en gratuit
    return supabase + domaine + netlify + resend

SCENARIOS = {
    # nouveaux abonnes payants au mois m : a + b * m ; churn mensuel ;
    # part des abonnes qui prennent un cours dans le mois, cours par mois
    'prudent':   dict(a=2, b=0.5, churn=0.10, part_cours=0.08, cours=1.5, pub=0),
    'central':   dict(a=5, b=1.5, churn=0.07, part_cours=0.12, cours=2.0, pub=0),
    'ambitieux': dict(a=10, b=3.0, churn=0.05, part_cours=0.18, cours=2.0, pub=0),
}

# Juillet et aout : le churn double (annee scolaire). Lancement suppose en
# janvier : les mois 7, 8, 19 et 20 sont des etes.
ETE = {7, 8, 19, 20}

def simuler(p):
    abonnes = 0.0
    tresorerie = 0.0
    lignes = []
    point_mort = None
    for m in range(1, 25):
        churn = p['churn'] * (2 if m in ETE else 1)
        nouveaux = (p['a'] + p['b'] * m) * (0.4 if m in ETE else 1)
        abonnes = abonnes * (1 - churn) + nouveaux
        n = abonnes
        # revenu des abonnements (l'annuel est lisse sur 12 mois)
        n_suivi = n * PART_SUIVI
        n_mensuel = (n - n_suivi) * (1 - PART_ANNUEL)
        n_annuel = (n - n_suivi) * PART_ANNUEL
        brut_abo = n_mensuel * PRIX_MENSUEL + n_annuel * PRIX_ANNUEL / 12 + n_suivi * PRIX_SUIVI
        frais_stripe = n_mensuel * stripe(PRIX_MENSUEL) + n_annuel * stripe(PRIX_ANNUEL) / 12 + n_suivi * stripe(PRIX_SUIVI)
        reverse = n_suivi * REVERSE_SUIVI
        # cours : la plateforme garde sa commission, moins les frais Stripe
        cours = n * p['part_cours'] * p['cours']
        marge_cours = cours * (PRIX_COURS * COMMISSION - stripe(PRIX_COURS))
        fixes = frais_fixes(m, n)
        net = brut_abo - frais_stripe - reverse + marge_cours - fixes
        tresorerie += net
        if point_mort is None and net > 0:
            point_mort = m
        lignes.append((m, n, brut_abo + cours * PRIX_COURS * COMMISSION, fixes, net, tresorerie))
    return lignes, point_mort

for nom, p in SCENARIOS.items():
    lignes, pm = simuler(p)
    print(f'\n### {nom}')
    print('| Mois | Abonnés | Chiffre d affaires plateforme | Frais fixes | Résultat du mois | Cumul |')
    print('|---|---|---|---|---|---|')
    for m, n, ca, fixes, net, cumul in lignes:
        if m in (1, 3, 6, 9, 12, 18, 24):
            print(f'| {m} | {n:.0f} | {ca:.0f} € | {fixes:.0f} € | {net:.0f} € | {cumul:.0f} € |')
    print(f'point mort mensuel : mois {pm}')
    an1 = sum(l[4] for l in lignes[:12]); an2 = sum(l[4] for l in lignes[12:])
    print(f'resultat annee 1 : {an1:.0f} ; annee 2 : {an2:.0f}')

# Cout d'acquisition par la publicite payante
for cpc in (0.4, 0.8, 1.8):
    for inscription in (0.10, 0.20):
        for conversion in (0.03, 0.05):
            cac = cpc / (inscription * conversion)
            print(f'CPC {cpc} inscription {inscription} conversion {conversion} -> CAC {cac:.0f} EUR')
