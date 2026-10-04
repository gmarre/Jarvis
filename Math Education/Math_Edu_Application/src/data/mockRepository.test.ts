import { beforeEach, describe, expect, it, vi } from 'vitest'

import { emptyProgress } from '@/lib/dag'
import { skills } from '@/content'
import { activerRecetteMock, mockRepository, resetMockRepository } from './mockRepository'
import { RepositoryError, isProfileComplete, type SignUpInput } from './repository'
import type { ExerciseAttempt, PlacementResult, Profile, SkillProgress } from '@/types/domain'

// Ces tests decrivent le CONTRAT du repository, pas les details du mock. Le
// repository Supabase implemente la meme interface : ce fichier dit ce que les
// deux doivent faire, et c'est la reference quand un comportement diverge entre
// le mode demonstration et la production.
//
// Ce qui est verifie ici tient surtout au changement de modele du sprint 2a :
// les ecritures sont granulaires, chaque mutation touche une entite et une
// seule, et la capacite d'un creneau est refusee par la couche de donnees et
// non par l'interface.

// Le mock lit et ecrit le localStorage, absent de l'environnement Node.
const memoire = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => memoire.get(k) ?? null,
  setItem: (k: string, v: string) => void memoire.set(k, v),
  removeItem: (k: string) => void memoire.delete(k),
  clear: () => memoire.clear(),
})
vi.stubGlobal('window', { localStorage: globalThis.localStorage })

const INSCRIPTION: SignUpInput = {
  role: 'eleve',
  prenom: 'Nina',
  email: 'nina@test.fr',
  motDePasse: 'motdepasse123',
}

const COMPLETION = {
  role: 'eleve' as const,
  prenom: 'Nina',
  nom: '',
  niveau_scolaire: 'CM1' as const,
  date_naissance: '2015-04-02',
  email_parent: 'parent@test.fr',
}

/** Inscription qui ouvre une session, comme Supabase sans confirmation d'email. */
async function inscrire() {
  const session = await mockRepository.signUp(INSCRIPTION)
  if (!session) throw new Error('Le mock doit ouvrir une session a l inscription')
  return session
}

beforeEach(() => {
  memoire.clear()
  resetMockRepository()
})

describe('authentification', () => {
  it('n a pas de session au depart', async () => {
    expect(await mockRepository.getSession()).toBeNull()
  })

  it('ouvre une session a l inscription', async () => {
    const session = await inscrire()

    expect(session.profile.prenom).toBe('Nina')
    expect(session.profile.role).toBe('eleve')
  })

  it('cree un eleve incomplet, a completer sur /bienvenue comme un compte Google', async () => {
    // L'inscription ne porte que l'identite. Avec la confirmation d'email
    // active, aucune session n'existe a la creation du compte : rien d'autre ne
    // pourrait etre ecrit. Le profil incomplet envoie l'eleve sur /bienvenue.
    const session = await inscrire()

    expect(session.profile.niveau_scolaire).toBeNull()
    expect(session.profile.date_naissance).toBeNull()
    expect(session.profile.email_parent).toBeNull()
    expect(isProfileComplete(session.profile)).toBe(false)
  })

  it('ne considere JAMAIS le consentement parental comme acquis', async () => {
    // Donner l'email d'un parent vaut demande, pas accord. Seul le parent peut
    // confirmer, par email. C'est une regle juridique, elle ne doit pas deriver.
    await inscrire()
    const profile = await mockRepository.completeProfile(COMPLETION)

    expect(profile.email_parent).toBe('parent@test.fr')
    expect(profile.consentement_parental_at).toBeNull()
  })

  it('part d une progression vierge et sans positionnement', async () => {
    const session = await inscrire()

    expect(session.placement).toBeNull()
    expect(session.objectifSkillId).toBeNull()
    expect(session.attempts).toEqual([])
    expect(Object.keys(session.progress)).toHaveLength(skills.length)
  })

  it('restitue la session apres un rechargement', async () => {
    await mockRepository.signUp(INSCRIPTION)
    // Pas de reset : on simule un simple rechargement de page, la session doit
    // etre relue depuis le stockage.
    const session = await mockRepository.getSession()
    expect(session?.profile.prenom).toBe('Nina')
  })

  it('ferme la session a la deconnexion', async () => {
    await mockRepository.signUp(INSCRIPTION)
    await mockRepository.signOut()

    expect(await mockRepository.getSession()).toBeNull()
  })

  it('previent les abonnes des changements d authentification', async () => {
    const vues: (string | null)[] = []
    const desabonner = mockRepository.onAuthChange((s) => vues.push(s?.profile.prenom ?? null))

    await mockRepository.signUp(INSCRIPTION)
    await mockRepository.signOut()
    desabonner()
    await mockRepository.signUp(INSCRIPTION)

    // Deux notifications avant le desabonnement, aucune apres.
    expect(vues).toEqual(['Nina', null])
  })

  it('refuse une adresse inconnue en mode demonstration', async () => {
    await expect(mockRepository.signInWithPassword('inconnu@test.fr', 'x')).rejects.toThrow(
      RepositoryError,
    )
  })

  it('ouvre le compte de demonstration sur une adresse connue', async () => {
    const session = await mockRepository.signInWithPassword('lea.d@email.fr', 'peu importe')

    expect(session.profile.prenom).toBe('Léa')
    expect(session.placement).not.toBeNull()
  })

  it('annonce que la connexion Google demande le backend', async () => {
    // Plutot que d'echouer silencieusement ou de faire semblant.
    await expect(mockRepository.signInWithGoogle()).rejects.toThrow(RepositoryError)
  })

  it('refuse toute mutation sans session ouverte', async () => {
    await expect(mockRepository.updateProfile({ prenom: 'X' })).rejects.toThrow(RepositoryError)
  })
})

describe('isProfileComplete', () => {
  const base: Profile = {
    id: 'p1',
    role: 'eleve',
    prenom: 'Nina',
    nom: '',
    email: 'n@test.fr',
    niveau_scolaire: 'CM1',
    date_naissance: '2015-04-02',
    email_parent: null,
    consentement_parental_at: null,
    cree_le: new Date().toISOString(),
    partage_progression_prof: true,
    resume_hebdo_parent: false,
    rappels_revision: true,
    abonnement: null,
  }

  it('accepte un eleve renseigne', () => {
    expect(isProfileComplete(base)).toBe(true)
  })

  it('refuse un eleve sans niveau ou sans date de naissance', () => {
    // C'est l'etat d'un compte tout juste cree par Google : on ne peut ni batir
    // son parcours, ni appliquer la regle des 15 ans.
    expect(isProfileComplete({ ...base, niveau_scolaire: null })).toBe(false)
    expect(isProfileComplete({ ...base, date_naissance: null })).toBe(false)
  })

  it('refuse un profil sans prenom, quel que soit le role', () => {
    expect(isProfileComplete({ ...base, prenom: '  ' })).toBe(false)
    expect(isProfileComplete({ ...base, role: 'prof', prenom: '' })).toBe(false)
  })

  it('n exige ni niveau ni date de naissance d un prof ou d un parent', () => {
    const prof: Profile = { ...base, role: 'prof', niveau_scolaire: null, date_naissance: null }
    expect(isProfileComplete(prof)).toBe(true)
    expect(isProfileComplete({ ...prof, role: 'parent' })).toBe(true)
  })
})

describe('mutations granulaires', () => {
  it('enregistre une tentative sans toucher aux autres competences', async () => {
    const session = await inscrire()
    const avant = session.progress

    const progress: SkillProgress = {
      ...emptyProgress('A010'),
      status: 'in_progress',
      recent: [true],
      score: 1,
      attempts: 1,
    }
    const attempt: ExerciseAttempt = {
      id: 'a1',
      exercise_id: 'ex1',
      skill_id: 'A010',
      answer: '7',
      is_correct: true,
      duration_s: 12,
      created_at: new Date().toISOString(),
    }

    await mockRepository.saveAttempt(attempt, progress)
    const apres = await mockRepository.getSession()

    expect(apres?.progress.A010.status).toBe('in_progress')
    expect(apres?.attempts).toHaveLength(1)
    // Toutes les autres lignes sont inchangees : c'est tout l'objet du passage
    // aux mutations granulaires.
    const autres = Object.keys(avant).filter((id) => id !== 'A010')
    for (const id of autres) {
      expect(apres?.progress[id]).toEqual(avant[id])
    }
  })

  it('avance l echeance de revision sans creer de tentative', async () => {
    await mockRepository.signUp(INSCRIPTION)
    const progress: SkillProgress = {
      ...emptyProgress('C001'),
      status: 'mastered',
      review_box: 2,
      next_review_at: new Date('2026-10-05').toISOString(),
    }

    await mockRepository.saveProgress(progress)
    const session = await mockRepository.getSession()

    expect(session?.progress.C001.review_box).toBe(2)
    expect(session?.attempts).toHaveLength(0)
  })

  it('cloture le positionnement et fixe l objectif', async () => {
    await mockRepository.signUp(INSCRIPTION)
    const result: PlacementResult = {
      questions_posees: 9,
      competences_maitrisees: 1,
      competences_totales: skills.length,
      lacunes_racines: ['C003'],
      objectif_skill_id: 'C007',
      estimation_semaines: 3,
    }
    const progress: SkillProgress[] = [{ ...emptyProgress('A001'), status: 'mastered' }]

    await mockRepository.savePlacement(result, progress)
    const session = await mockRepository.getSession()

    expect(session?.placement?.objectif_skill_id).toBe('C007')
    expect(session?.objectifSkillId).toBe('C007')
    expect(session?.progress.A001.status).toBe('mastered')
    // Les competences non evaluees restent presentes et vierges.
    expect(session?.progress.C003.status).toBe('locked')
  })

  it('met a jour le profil sans effacer le reste', async () => {
    await inscrire()
    await mockRepository.completeProfile(COMPLETION)

    const profile = await mockRepository.updateProfile({ rappels_revision: false })

    expect(profile.rappels_revision).toBe(false)
    expect(profile.prenom).toBe('Nina')
    expect(profile.niveau_scolaire).toBe('CM1')
  })

  it('complete un profil sur /bienvenue', async () => {
    await inscrire()

    const profile = await mockRepository.completeProfile({
      ...COMPLETION,
      niveau_scolaire: '6e',
      date_naissance: '2014-01-01',
    })

    expect(isProfileComplete(profile)).toBe(true)
    expect(profile.niveau_scolaire).toBe('6e')
  })

  it('ne fabrique pas de nom de famille a partir du prenom', async () => {
    // Recette du 3 octobre 2026 : le nom recevait le prenom quand il etait
    // inconnu, et l'ecran affichait "Gauthier G.". Un nom absent reste vide.
    const session = await inscrire()
    expect(session.profile.nom).toBe('')

    const profile = await mockRepository.completeProfile(COMPLETION)
    expect(profile.nom).toBe('')
  })
})

describe('reservations', () => {
  it('reserve un creneau et compte la place prise', async () => {
    await mockRepository.signUp(INSCRIPTION)
    const { slots } = await mockRepository.getCatalog()
    const libre = slots.find((s) => s.places_prises < s.capacite)
    if (!libre) throw new Error('Aucun creneau libre dans les donnees factices')

    const booking = await mockRepository.createBooking(libre.id, 'C003')
    const apres = await mockRepository.getCatalog()

    expect(booking.slot_id).toBe(libre.id)
    expect(booking.paid_at).toBeNull()
    expect(apres.slots.find((s) => s.id === libre.id)?.places_prises).toBe(
      libre.places_prises + 1,
    )
  })

  it('refuse de reserver deux fois le meme creneau', async () => {
    await mockRepository.signUp(INSCRIPTION)
    const { slots } = await mockRepository.getCatalog()
    const libre = slots.find((s) => s.places_prises < s.capacite)
    if (!libre) throw new Error('Aucun creneau libre')

    await mockRepository.createBooking(libre.id, null)
    await expect(mockRepository.createBooking(libre.id, null)).rejects.toMatchObject({
      name: 'RepositoryError',
      refus: true,
    })
  })

  it('refuse un creneau complet, comme le fait la base', async () => {
    await mockRepository.signUp(INSCRIPTION)
    const { slots } = await mockRepository.getCatalog()
    const complet = slots.find((s) => s.places_prises >= s.capacite)
    if (!complet) return

    // Un refus de regle, pas une panne : l'ecran ne doit pas renvoyer l'eleve
    // verifier sa connexion (recette du 3 octobre 2026).
    await expect(mockRepository.createBooking(complet.id, null)).rejects.toMatchObject({
      name: 'RepositoryError',
      refus: true,
    })
  })

  it('distingue une panne d un refus de regle', async () => {
    // Sans session, l'echec n'est pas un refus metier.
    await expect(mockRepository.createBooking('peu-importe', null)).rejects.toMatchObject({
      name: 'RepositoryError',
      refus: false,
    })
  })

  it('libere la place a l annulation', async () => {
    await mockRepository.signUp(INSCRIPTION)
    const { slots } = await mockRepository.getCatalog()
    const libre = slots.find((s) => s.places_prises < s.capacite)
    if (!libre) throw new Error('Aucun creneau libre')

    const booking = await mockRepository.createBooking(libre.id, null)
    await mockRepository.deleteBooking(booking.id)
    const apres = await mockRepository.getCatalog()

    expect(apres.slots.find((s) => s.id === libre.id)?.places_prises).toBe(libre.places_prises)
    expect((await mockRepository.getSession())?.bookings).toHaveLength(0)
  })
})

describe('ouverture de creneaux', () => {
  it('cree les creneaux demandes', async () => {
    await mockRepository.signInWithPassword('marc.b@email.fr', 'demo')
    const session = await mockRepository.getSession()
    const start = new Date('2026-11-02T14:00:00.000Z').toISOString()

    const crees = await mockRepository.createSlots([
      {
        prof_id: session!.profile.id,
        start_at: start,
        duree_min: 90,
        capacite: 3,
        prix_eur: 20,
        domaines: ['C'],
      },
    ])

    expect(crees).toHaveLength(1)
    expect(crees[0].places_prises).toBe(0)
    expect(crees[0].id).toBeTruthy()
  })

  it('ignore un horaire deja ouvert plutot que d echouer', async () => {
    await mockRepository.signInWithPassword('marc.b@email.fr', 'demo')
    const session = await mockRepository.getSession()
    const slot = {
      prof_id: session!.profile.id,
      start_at: new Date('2026-11-03T15:00:00.000Z').toISOString(),
      duree_min: 90,
      capacite: 3,
      prix_eur: 20,
      domaines: ['A'],
    }

    await mockRepository.createSlots([slot])
    const seconde = await mockRepository.createSlots([slot])

    expect(seconde).toHaveLength(0)
  })
})

describe('correction', () => {
  beforeEach(async () => {
    await mockRepository.signInWithPassword('lea.d@email.fr', 'x')
  })

  it('corrige sans que l exercice installe porte sa reponse', async () => {
    const { exercises } = await import('@/content')
    const exercise = exercises.find((e) => e.type === 'qcm')
    if (!exercise) throw new Error('Aucun QCM dans le contenu')
    expect(exercise).not.toHaveProperty('answer')

    const correction = await mockRepository.corriger(exercise.id, 'z')
    expect(correction.isCorrect).toBe(false)
    expect(correction.expectedKey).toMatch(/^[a-z]$/)
    expect(correction.solutionSteps.length).toBeGreaterThan(0)

    const juste = await mockRepository.corriger(exercise.id, correction.expectedKey as string)
    expect(juste.isCorrect).toBe(true)
  })

  it('refuse un exercice inconnu', async () => {
    await expect(mockRepository.corriger('EX-Z999-D-01', 'a')).rejects.toBeInstanceOf(RepositoryError)
  })
})

describe('recette du contenu', () => {
  beforeEach(async () => {
    await mockRepository.signInWithPassword('lea.d@email.fr', 'x')
  })

  it('un compte qui n est pas relecteur ne voit rien et ne peut rien rendre', async () => {
    expect(await mockRepository.getRecette()).toEqual({ relecteur: false, reviews: [] })
    await expect(
      mockRepository.saveReview({ item_type: 'exercise', item_id: 'EX-A001-D-01', verdict: 'accepte', commentaire: '' }),
    ).rejects.toBeInstanceOf(RepositoryError)
  })

  it('un relecteur rend un verdict, puis le change sans doublon', async () => {
    activerRecetteMock()
    await mockRepository.saveReview({
      item_type: 'exercise', item_id: 'EX-A001-D-01', verdict: 'accepte', commentaire: '',
    })
    const change = await mockRepository.saveReview({
      item_type: 'exercise', item_id: 'EX-A001-D-01', verdict: 'invalide', commentaire: '  Réponse fausse  ',
    })
    expect(change.commentaire).toBe('Réponse fausse')
    expect(change.traite_le).toBeNull()

    const { relecteur, reviews } = await mockRepository.getRecette()
    expect(relecteur).toBe(true)
    expect(reviews).toHaveLength(1)
    expect(reviews[0].verdict).toBe('invalide')
  })

  it('refuse une invalidation sans commentaire, comme la contrainte SQL', async () => {
    activerRecetteMock()
    await expect(
      mockRepository.saveReview({ item_type: 'mindmap', item_id: 'MM-A-01', verdict: 'invalide', commentaire: '   ' }),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
