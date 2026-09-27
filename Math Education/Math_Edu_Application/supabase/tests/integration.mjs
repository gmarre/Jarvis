// Verification d'integration contre le VRAI projet Supabase.
//
//   npm run check:db
//
// A distinguer des deux autres controles :
//   npm run test:sql        rejoue les migrations dans un Postgres jetable (Docker)
//   npm run check:supabase  verifie la presence des tables, sans compte
//
// Ici on cree de vrais comptes, on joue les scenarios qui comptent, puis on
// supprime tout. Ce que ca valide et que rien d'autre ne peut valider :
//
//   - le trigger qui cree la ligne profiles a l'inscription. C'est LE piege
//     Supabase : un trigger sur auth.users peut echouer silencieusement si les
//     droits ne suivent pas, et on ne s'en apercoit qu'avec un vrai compte ;
//   - la ligne teachers creee automatiquement (migration 0002), sans laquelle les
//     creneaux d'un professeur sont invisibles cote eleve ;
//   - le cloisonnement RLS entre deux eleves, contre le vrai moteur ;
//   - l'impossibilite pour un eleve de se declarer prof (escalade de privilege) ;
//   - l'impossibilite pour un mineur de se confirmer le consentement parental ;
//   - le refus de surbooking par la base.
//
// POURQUOI fetch ET PAS supabase-js. La librairie initialise son client realtime
// des createClient() et exige un WebSocket natif, absent avant Node 22. Ce script
// parle donc directement aux API HTTP : aucune dependance, aucune contrainte de
// version de Node, et on teste le contrat reseau plutot que la librairie, dont le
// navigateur se charge de son cote.
//
// Necessite SUPABASE_SERVICE_ROLE_KEY dans .env.local (sans prefixe VITE_).

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))

// --- Lecture de .env.local, facon dotenv ------------------------------------

function lireEnv() {
  const chemin = resolve(ICI, '../../.env.local')
  const env = {}
  let contenu
  try {
    contenu = readFileSync(chemin, 'utf8')
  } catch {
    throw new Error(`Fichier introuvable : ${chemin}`)
  }
  for (const ligne of contenu.split('\n')) {
    const net = ligne.trim()
    if (!net || net.startsWith('#') || !net.includes('=')) continue
    const [cle, ...reste] = net.split('=')
    let valeur = reste.join('=').trim()
    if (valeur.length >= 2 && valeur[0] === valeur.at(-1) && ['"', "'"].includes(valeur[0])) {
      valeur = valeur.slice(1, -1)
    }
    env[cle.trim()] = valeur
  }
  return env
}

const env = lireEnv()
const URL_BASE = env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
const ANON = env.VITE_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_BASE || !ANON) {
  console.error('VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquante dans .env.local.')
  process.exit(1)
}
if (!SERVICE) {
  console.error(
    'SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local.\n' +
      'Supabase > Project Settings > API > service_role.\n' +
      'Sans prefixe VITE_ : elle ne doit jamais partir dans le navigateur.',
  )
  process.exit(1)
}
if (Object.entries(env).some(([cle, valeur]) => cle.startsWith('VITE_') && valeur === SERVICE)) {
  console.error('DANGER : la cle service_role est aussi dans une variable VITE_. A retirer.')
  process.exit(1)
}

const marqueur = Date.now().toString(36)
const MDP = `Test-${marqueur}-Ab1!`

// --- Acces HTTP -------------------------------------------------------------

/**
 * Appel PostgREST. `jeton` est le JWT de l'utilisateur, ou la cle service_role
 * pour agir cote serveur. Rend { data, error }, pour que les assertions se
 * lisent comme avec supabase-js.
 */
async function rest(jeton, chemin, options = {}) {
  let reponse
  try {
    reponse = await fetch(`${URL_BASE}/rest/v1/${chemin}`, {
      method: options.methode ?? 'GET',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${jeton}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: options.corps ? JSON.stringify(options.corps) : undefined,
    })
  } catch (cause) {
    return { data: null, error: { message: `reseau : ${cause.message}` } }
  }

  const texte = await reponse.text()
  let json = null
  try {
    json = texte ? JSON.parse(texte) : null
  } catch {
    json = { message: texte.slice(0, 200) }
  }

  if (!reponse.ok) {
    return {
      data: null,
      error: { message: json?.message ?? `HTTP ${reponse.status}`, status: reponse.status },
    }
  }
  return { data: json, error: null }
}

const admin = (chemin, options) => rest(SERVICE, chemin, options)

/** Cree un compte deja confirme. Aucun email reel n'est envoye. */
async function creerCompte(compte, metadata) {
  const reponse = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: compte.email,
      password: MDP,
      email_confirm: true,
      user_metadata: metadata,
    }),
  })
  const json = await reponse.json()
  if (!reponse.ok) {
    throw new Error(`Creation ${compte.email} : ${json.msg ?? json.message ?? reponse.status}`)
  }
  compte.id = json.id
  return json.id
}

/** Jeton d'acces d'un utilisateur, obtenu par mot de passe. */
async function connexion(email) {
  const reponse = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: MDP }),
  })
  const json = await reponse.json()
  if (!reponse.ok) {
    throw new Error(
      `Connexion ${email} : ${json.error_description ?? json.msg ?? reponse.status}`,
    )
  }
  return json.access_token
}

async function supprimerCompte(id) {
  const reponse = await fetch(`${URL_BASE}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  })
  return reponse.ok
}

// --- Harnais d'assertions ---------------------------------------------------

let reussis = 0
const rates = []

function verifier(titre, condition, detail = '') {
  if (condition) {
    reussis += 1
    console.log(`  ok    ${titre}`)
  } else {
    rates.push(titre)
    console.log(`  ECHEC ${titre}${detail ? ` -> ${detail}` : ''}`)
  }
}

/** L'operation doit etre refusee par la base. */
async function refuse(titre, operation) {
  const { error } = await operation()
  verifier(titre, Boolean(error), error ? '' : 'aucune erreur alors qu un refus etait attendu')
}

// --- Comptes de test --------------------------------------------------------

const comptes = {
  eleveA: { email: `racine-test-a-${marqueur}@example.com`, id: null },
  eleveB: { email: `racine-test-b-${marqueur}@example.com`, id: null },
  prof: { email: `racine-test-prof-${marqueur}@example.com`, id: null },
  // Cree plus tard, pour le test de capacite. Declare ici pour que le nettoyage
  // le connaisse quoi qu'il arrive.
  eleveC: null,
}

async function nettoyer() {
  for (const compte of Object.values(comptes)) {
    if (!compte?.id) continue
    const ok = await supprimerCompte(compte.id)
    console.log(ok ? `  supprime ${compte.email}` : `  ATTENTION : ${compte.email} non supprime`)
  }
}

// --- Scenarios --------------------------------------------------------------

async function main() {
  console.log(`Projet : ${URL_BASE}`)
  console.log(`Comptes de test suffixes : ${marqueur}\n`)

  console.log('== Trigger de creation de profil ==')
  await creerCompte(comptes.eleveA, { role: 'eleve', prenom: 'Alice' })
  await creerCompte(comptes.eleveB, { role: 'eleve', prenom: 'Bruno' })
  // Compte facon Google : aucune metadonnee de role, seulement given_name.
  await creerCompte(comptes.prof, { given_name: 'Marc', nom: 'Bernard' })

  const ids = [comptes.eleveA.id, comptes.eleveB.id, comptes.prof.id]
  const profils = await admin(
    `profiles?select=id,role,prenom,niveau_scolaire,consentement_parental_at&id=in.(${ids.join(',')})`,
  )
  verifier(
    'une ligne profiles creee pour chacun des 3 comptes',
    !profils.error && profils.data?.length === 3,
    profils.error?.message ?? `${profils.data?.length ?? 0} ligne(s)`,
  )

  const profilA = profils.data?.find((p) => p.id === comptes.eleveA.id)
  const profilGoogle = profils.data?.find((p) => p.id === comptes.prof.id)

  verifier(
    'role et prenom lus des metadonnees',
    profilA?.role === 'eleve' && profilA?.prenom === 'Alice',
    JSON.stringify(profilA),
  )
  verifier(
    'compte sans role : eleve par defaut, prenom depuis given_name',
    profilGoogle?.role === 'eleve' && profilGoogle?.prenom === 'Marc',
    JSON.stringify(profilGoogle),
  )
  verifier('profil cree incomplet (pas de niveau scolaire)', profilA?.niveau_scolaire === null)
  verifier('consentement parental non acquis a la creation', profilA?.consentement_parental_at === null)

  console.log('\n== Migration 0002 : ligne teachers automatique ==')
  await admin(`profiles?id=eq.${comptes.prof.id}`, { methode: 'PATCH', corps: { role: 'prof' } })

  const ligneProf = await admin(`teachers?select=id,nom_court&id=eq.${comptes.prof.id}`)
  verifier(
    'ligne teachers creee seule au passage a prof',
    !ligneProf.error && ligneProf.data?.length === 1,
    ligneProf.error?.message ?? 'aucune ligne : la migration 0002 n a pas ete appliquee',
  )
  verifier(
    'nom court derive du prenom et du nom',
    ligneProf.data?.[0]?.nom_court === 'Marc B.',
    ligneProf.data?.[0]?.nom_court,
  )

  await admin(`teachers?id=eq.${comptes.prof.id}`, {
    methode: 'PATCH',
    corps: { domaines: ['A', 'C'] },
  })

  const jA = await connexion(comptes.eleveA.email)
  const jB = await connexion(comptes.eleveB.email)
  const jProf = await connexion(comptes.prof.email)

  console.log('\n== Cloisonnement de la progression ==')
  await rest(jA, 'skill_progress', {
    methode: 'POST',
    corps: { user_id: comptes.eleveA.id, skill_id: 'A010', status: 'in_progress' },
  })
  await rest(jB, 'skill_progress', {
    methode: 'POST',
    corps: { user_id: comptes.eleveB.id, skill_id: 'C003', status: 'mastered' },
  })

  const vuParA = await rest(jA, 'skill_progress?select=skill_id')
  verifier(
    'Alice ne voit que sa propre ligne',
    !vuParA.error && vuParA.data?.length === 1 && vuParA.data[0].skill_id === 'A010',
    vuParA.error?.message ?? JSON.stringify(vuParA.data),
  )

  await refuse('Alice ne peut pas ecrire sur la progression de Bruno', () =>
    rest(jA, 'skill_progress', {
      methode: 'POST',
      corps: { user_id: comptes.eleveB.id, skill_id: 'B001', status: 'mastered' },
    }),
  )

  const tentative = await rest(jA, 'exercise_attempts', {
    methode: 'POST',
    corps: {
      user_id: comptes.eleveA.id,
      exercise_id: 'ex-test',
      skill_id: 'A010',
      answer: '7',
      is_correct: true,
      duration_s: 5,
    },
  })
  verifier('Alice enregistre sa tentative', !tentative.error, tentative.error?.message)

  const tentativesDeB = await rest(jB, 'exercise_attempts?select=id')
  verifier(
    'Bruno ne voit aucune tentative d Alice',
    !tentativesDeB.error && tentativesDeB.data?.length === 0,
    `${tentativesDeB.data?.length} ligne(s)`,
  )

  console.log('\n== Escalade de privilege et consentement ==')
  await refuse('un eleve ne peut pas se declarer prof', () =>
    rest(jA, `profiles?id=eq.${comptes.eleveA.id}`, { methode: 'PATCH', corps: { role: 'prof' } }),
  )
  const apresRole = await admin(`profiles?select=role&id=eq.${comptes.eleveA.id}`)
  verifier('le role est reste eleve', apresRole.data?.[0]?.role === 'eleve', apresRole.data?.[0]?.role)

  await refuse('un mineur ne peut pas se confirmer le consentement parental', () =>
    rest(jA, `profiles?id=eq.${comptes.eleveA.id}`, {
      methode: 'PATCH',
      corps: { consentement_parental_at: new Date().toISOString() },
    }),
  )
  const apresConsent = await admin(
    `profiles?select=consentement_parental_at&id=eq.${comptes.eleveA.id}`,
  )
  verifier(
    'le consentement est reste nul',
    apresConsent.data?.[0]?.consentement_parental_at === null,
  )

  const prefs = await rest(jA, `profiles?id=eq.${comptes.eleveA.id}`, {
    methode: 'PATCH',
    corps: { rappels_revision: false, niveau_scolaire: 'CM1', date_naissance: '2015-04-02' },
  })
  verifier(
    'en revanche il complete son profil et ses preferences',
    !prefs.error &&
      prefs.data?.[0]?.niveau_scolaire === 'CM1' &&
      prefs.data?.[0]?.rappels_revision === false,
    prefs.error?.message,
  )

  const parServeur = await admin(`profiles?id=eq.${comptes.eleveA.id}`, {
    methode: 'PATCH',
    corps: { consentement_parental_at: new Date().toISOString() },
  })
  verifier(
    'le serveur, lui, peut confirmer le consentement',
    !parServeur.error && parServeur.data?.[0]?.consentement_parental_at !== null,
    parServeur.error?.message,
  )

  console.log('\n== Creneaux, capacite et vue derivee ==')
  await refuse('un eleve ne peut pas ouvrir de creneau', () =>
    rest(jA, 'availability_slots', {
      methode: 'POST',
      corps: { prof_id: comptes.eleveA.id, start_at: new Date(Date.now() + 864e5).toISOString() },
    }),
  )

  const creneau = await rest(jProf, 'availability_slots', {
    methode: 'POST',
    corps: {
      prof_id: comptes.prof.id,
      start_at: new Date(Date.now() + 864e5).toISOString(),
      capacite: 2,
      domaines: ['C'],
    },
  })
  verifier('le professeur ouvre un creneau', !creneau.error, creneau.error?.message)

  const slotId = creneau.data?.[0]?.id
  if (!slotId) {
    console.log('  (suite du scenario impossible sans creneau)')
    return
  }

  const catalogueVuParEleve = await rest(jA, 'teachers?select=id,nom_court')
  verifier(
    'l eleve voit le professeur dans le catalogue',
    !catalogueVuParEleve.error && catalogueVuParEleve.data?.some((t) => t.id === comptes.prof.id),
    catalogueVuParEleve.error?.message ?? 'professeur absent du catalogue',
  )

  const r1 = await rest(jA, 'bookings', {
    methode: 'POST',
    corps: { slot_id: slotId, eleve_id: comptes.eleveA.id, skill_id: 'A010' },
  })
  const r2 = await rest(jB, 'bookings', {
    methode: 'POST',
    corps: { slot_id: slotId, eleve_id: comptes.eleveB.id },
  })
  verifier(
    'deux eleves reservent les deux places',
    !r1.error && !r2.error,
    r1.error?.message ?? r2.error?.message,
  )

  const vue = await rest(jA, `slots_disponibles?select=places_prises,complet&id=eq.${slotId}`)
  verifier(
    'places_prises calcule par la vue, creneau complet',
    vue.data?.[0]?.places_prises === 2 && vue.data?.[0]?.complet === true,
    JSON.stringify(vue.data),
  )

  // Troisieme eleve sur un creneau a 2 places : la base doit refuser.
  comptes.eleveC = { email: `racine-test-c-${marqueur}@example.com`, id: null }
  await creerCompte(comptes.eleveC, { role: 'eleve', prenom: 'Chloe' })
  const jC = await connexion(comptes.eleveC.email)

  await refuse('la base refuse la place au-dela de la capacite', () =>
    rest(jC, 'bookings', {
      methode: 'POST',
      corps: { slot_id: slotId, eleve_id: comptes.eleveC.id },
    }),
  )

  await refuse('un eleve ne peut pas reserver deux fois le meme creneau', () =>
    rest(jA, 'bookings', {
      methode: 'POST',
      corps: { slot_id: slotId, eleve_id: comptes.eleveA.id },
    }),
  )

  console.log('\n== Acces du professeur, sous double condition ==')
  const vuParProf = await rest(jProf, 'skill_progress?select=user_id,skill_id')
  verifier(
    'le prof voit la progression de ses deux eleves inscrits',
    !vuParProf.error && vuParProf.data?.length === 2,
    vuParProf.error?.message ?? `${vuParProf.data?.length} ligne(s)`,
  )

  await rest(jA, `profiles?id=eq.${comptes.eleveA.id}`, {
    methode: 'PATCH',
    corps: { partage_progression_prof: false },
  })
  const apresCoupure = await rest(jProf, 'skill_progress?select=user_id')
  verifier(
    'Alice coupe le partage : le prof ne voit plus que Bruno',
    !apresCoupure.error && apresCoupure.data?.length === 1,
    `${apresCoupure.data?.length} ligne(s)`,
  )
}

// --- Execution --------------------------------------------------------------

let codeSortie = 0
try {
  await main()
} catch (cause) {
  console.error(`\nERREUR : ${cause.message}`)
  codeSortie = 1
} finally {
  console.log('\n== Nettoyage ==')
  await nettoyer()
}

console.log(`\n${reussis} verification(s) reussie(s), ${rates.length} en echec.`)
if (rates.length > 0) {
  console.log('\nEn echec :')
  for (const titre of rates) console.log(`  - ${titre}`)
  codeSortie = 1
}
process.exit(codeSortie)
