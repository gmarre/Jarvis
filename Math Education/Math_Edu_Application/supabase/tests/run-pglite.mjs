// Tests SQL sans Docker : meme verification que run.sh, dans un Postgres
// compile en WebAssembly (PGlite), installe comme simple dependance npm.
//
//   npm run test:sql
//
// Pourquoi : Docker Desktop pese plusieurs Go et Gauthier ne veut pas
// l'installer. PGlite est un vrai Postgres 17 (roles, RLS, plpgsql, security
// definer) qui tourne dans Node, sans service ni droits administrateur.
//
// Ce qui est rejoue, comme dans run.sh :
//   1. le substitut du schema auth de Supabase (00_shim_supabase.sql) ;
//   2. toutes les migrations, deux fois (la seconde prouve qu'elles sont
//      rejouables) ;
//   3. chaque fichier de test : une ligne « TEST ...|f » est un echec, une
//      erreur qui n'est pas un refus attendu aussi, et l'absence de la ligne
//      « TEST FIN » signale un fichier interrompu.
//
// Les fichiers de test sont ecrits pour psql : ce lanceur comprend les seules
// commandes psql qu'ils utilisent (\echo, \set ON_ERROR_STOP on|off).
//
// Limite connue : PGlite n'a qu'une connexion. Les tests de concurrence (deux
// reservations simultanees) ne peuvent pas s'y jouer ; aucun n'existe a ce jour.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const ICI = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS = join(ICI, '..', 'migrations')

// Meme liste que run.sh : ces refus prouvent que les gardes fonctionnent.
const REFUS_ATTENDUS =
  /Creneau complet|violates row-level security|ne se modifie pas depuis le client|se confirme par le lien|duplicate key value|permission denied for function publier_contenu|Publication reservee au serveur|invalide_avec_commentaire|accord du parent|profiles_chemins_choisis_format|skill_progress_niveau_borne|flashcard_progress_box_check|super_attempts_score_borne|profiles_rythme_jours_borne|profiles_jours_travail_valides|rappels_heure_plage|permission denied for table rappels|course_offers_valides|permission denied for table seances_visio|Professeur inconnu|permission denied for table messages_suivi/

const FICHIERS_DE_TEST = [
  ['Triggers, capacite des creneaux, cascades', '01_triggers_et_capacite.sql'],
  ['Isolation RLS et escalade de privilege', '02_rls_isolation.sql'],
  ['Contenu pedagogique : publication et lecture', '03_contenu.sql'],
  ['Droits d execution des fonctions', '04_droits_fonctions.sql'],
  ['Recette du contenu', '05_recette.sql'],
  ['Accord parental et regles des mineurs', '06_accord_parental.sql'],
  ['Chemins choisis', '07_chemins.sql'],
  ['Niveau de maitrise', '08_niveau_maitrise.sql'],
  ['Cartes defi', '09_cartes_defi.sql'],
  ['Super exercices', '10_super_exercices.sql'],
  ['Rythme et rappels', '11_rythme_rappels.sql'],
  ['Professeur v1', '12_professeur.sql'],
  ['Espace parent', '13_espace_parent.sql'],
  ['Suivi', '14_suivi.sql'],
]

/**
 * Decoupe un fichier psql en instructions SQL et en commandes psql, en
 * respectant les chaines, les identifiants entre guillemets, les blocs
 * $tag$ ... $tag$ et les commentaires.
 */
function decouper(texte) {
  const morceaux = []
  let courant = ''
  let i = 0
  const n = texte.length
  const pousser = () => {
    if (courant.trim()) morceaux.push({ sql: courant.trim() })
    courant = ''
  }

  while (i < n) {
    const c = texte[i]
    const debutDeLigne = courant.trim() === '' && (i === 0 || texte[i - 1] === '\n')

    // Commande psql : une ligne entiere commencant par une barre oblique.
    if (c === '\\' && debutDeLigne) {
      const fin = texte.indexOf('\n', i)
      const ligne = texte.slice(i, fin === -1 ? n : fin).trim()
      morceaux.push({ psql: ligne })
      courant = ''
      i = fin === -1 ? n : fin + 1
      continue
    }
    if (c === '-' && texte[i + 1] === '-') {
      const fin = texte.indexOf('\n', i)
      i = fin === -1 ? n : fin + 1
      courant += '\n'
      continue
    }
    if (c === '/' && texte[i + 1] === '*') {
      const fin = texte.indexOf('*/', i + 2)
      i = fin === -1 ? n : fin + 2
      continue
    }
    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < n) {
        if (texte[j] === c && texte[j + 1] === c) j += 2
        else if (texte[j] === c) break
        else j++
      }
      courant += texte.slice(i, j + 1)
      i = j + 1
      continue
    }
    if (c === '$') {
      const etiquette = texte.slice(i).match(/^\$[A-Za-z_]*\$/)
      if (etiquette) {
        const fin = texte.indexOf(etiquette[0], i + etiquette[0].length)
        const stop = fin === -1 ? n : fin + etiquette[0].length
        courant += texte.slice(i, stop)
        i = stop
        continue
      }
    }
    if (c === ';') {
      courant += ';'
      pousser()
      i++
      continue
    }
    courant += c
    i++
  }
  pousser()
  return morceaux
}

/** Ecrit une valeur comme psql en mode -A : booleens en t/f, null vide. */
function enTexte(valeur) {
  if (valeur === true) return 't'
  if (valeur === false) return 'f'
  if (valeur === null || valeur === undefined) return ''
  if (valeur instanceof Date) return valeur.toISOString()
  if (typeof valeur === 'object') return JSON.stringify(valeur)
  return String(valeur)
}

/** Remplace :'nom' (litteral) et :nom (brut) par les variables psql connues. */
function substituer(sql, variables) {
  let resultat = sql
  for (const [nom, valeur] of Object.entries(variables)) {
    resultat = resultat
      .replace(new RegExp(`:'${nom}'`, 'g'), () => `'${valeur.replace(/'/g, "''")}'`)
      .replace(new RegExp(`(?<!:):${nom}(?![A-Za-z0-9_])`, 'g'), () => valeur)
  }
  return resultat
}

/** Joue un fichier ; rend les lignes de sortie, facon psql -A -F'|'. */
async function jouer(db, chemin, { arretSurErreur = false } = {}) {
  // psql ouvre une session neuve par fichier : role, JWT simule et reglages
  // poses par le fichier precedent ne doivent pas fuir dans le suivant.
  await db.exec('reset role; reset all;')
  const sortie = []
  const variables = {}
  let stop = arretSurErreur
  for (const morceau of decouper(readFileSync(chemin, 'utf8'))) {
    if (morceau.psql) {
      const m = morceau.psql.match(/^\\set\s+ON_ERROR_STOP\s+(on|off|1|0)/i)
      if (m) {
        stop = m[1] === 'on' || m[1] === '1'
        continue
      }
      const variable = morceau.psql.match(/^\\set\s+(\w+)\s+'([\s\S]*)'$/)
      if (variable) {
        variables[variable[1]] = variable[2].replace(/''/g, "'")
        continue
      }
      const echo = morceau.psql.match(/^\\echo\s+(.*)$/)
      if (echo) sortie.push(echo[1].replace(/^'|'$/g, ''))
      continue
    }
    try {
      const resultats = await db.exec(substituer(morceau.sql, variables))
      for (const r of resultats) {
        for (const ligne of r.rows ?? []) {
          sortie.push(r.fields.map((f) => enTexte(ligne[f.name])).join('|'))
        }
      }
    } catch (erreur) {
      sortie.push(`ERROR:  ${erreur.message}`)
      if (stop) break
    }
  }
  return sortie
}

async function principal() {
  const db = await PGlite.create({ extensions: { pgcrypto } })
  // Comme le conteneur de run.sh, la base appartient au superutilisateur.
  let echec = false

  console.log('== Substitut du schema auth de Supabase ==')
  const shim = await jouer(db, join(ICI, '00_shim_supabase.sql'), { arretSurErreur: true })
  if (shim.some((l) => l.startsWith('ERROR'))) {
    console.log('ECHEC du shim :', shim.filter((l) => l.startsWith('ERROR')).join('\n'))
    process.exit(1)
  }
  console.log('ok')

  const migrations = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()
  for (const passage of [1, 2]) {
    console.log(`\n== Migrations, passage ${passage} (le 2e doit etre rejouable) ==`)
    for (const m of migrations) {
      const erreurs = (await jouer(db, join(MIGRATIONS, m), { arretSurErreur: true })).filter((l) =>
        l.startsWith('ERROR'),
      )
      if (erreurs.length) {
        echec = true
        console.log(`  ${m} :\n    ${erreurs.join('\n    ')}`)
      } else console.log(`  ok ${m}`)
    }
  }

  for (const [titre, fichier] of FICHIERS_DE_TEST) {
    console.log(`\n== ${titre} ==`)
    const sortie = await jouer(db, join(ICI, fichier))
    for (const l of sortie.filter((l) => l.startsWith('TEST '))) console.log(l)

    const rates = sortie.filter((l) => /^TEST .*\|f$/.test(l))
    if (rates.length) {
      echec = true
      console.log('Tests en echec :\n' + rates.join('\n'))
    }
    const imprevues = sortie.filter((l) => l.startsWith('ERROR') && !REFUS_ATTENDUS.test(l))
    if (imprevues.length) {
      echec = true
      console.log('Erreurs imprevues :\n' + imprevues.join('\n'))
    }
    if (!sortie.some((l) => l.startsWith('TEST FIN'))) {
      echec = true
      console.log("INTERROMPU : le fichier ne s'est pas execute jusqu'au bout.")
    }
    const refus = sortie.filter((l) => l.startsWith('ERROR') && REFUS_ATTENDUS.test(l)).length
    console.log(`(${refus} refus attendus bien declenches)`)
  }

  await db.close()
  console.log(echec ? '\nECHEC.' : '\nTout est vert.')
  process.exit(echec ? 1 : 0)
}

await principal()
