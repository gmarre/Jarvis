// Types du contenu pedagogique. Ils sont le miroir exact des 3 schemas JSON
// figes avec Marius (`Specifications DAG, Exos, Mindcards/schemas/`).
// Regle : on ne change pas ces types sans changer le schema en face, sinon le
// contrat d'interface qui permet de travailler en parallele saute.

/** Niveaux scolaires, du CP a la Terminale, dans l'ordre du cursus. */
export const SCHOOL_LEVELS = [
  'CP',
  'CE1',
  'CE2',
  'CM1',
  'CM2',
  '6e',
  '5e',
  '4e',
  '3e',
  '2nde',
  '1ere',
  'Terminale',
] as const

export type SchoolLevel = (typeof SCHOOL_LEVELS)[number]

/** Les 3 paliers de difficulte imposes par la roadmap. */
export type ExerciseLevel = 'decouverte' | 'entrainement' | 'maitrise'

/** Determine le composant de saisie et la facon de corriger. */
export type ExerciseType = 'numerique' | 'qcm' | 'texte' | 'vrai_faux'

export type ReviewStatus = 'brouillon' | 'relu_agent' | 'relu_humain' | 'valide'

export interface ProgrammeRef {
  source: string
  quote: string
}

export interface MasteryThreshold {
  /** Nombre de reussites necessaires. */
  required: number
  /** Sur combien de tentatives recentes. */
  out_of: number
}

export interface Skill {
  id: string
  domain: string
  domain_name: string
  label: string
  description: string
  prerequisites: string[]
  difficulty: number
  school_level: SchoolLevel
  validation_test: string
  mastery_threshold: MasteryThreshold
  exercise_ids: string[]
  mindmap_id: string | null
  programme_ref?: ProgrammeRef[]
}

export interface SkillsDag {
  metadata: {
    title: string
    version: string
    scope: string
    updated_at: string
    total_skills: number
    domains: { id: string; name: string; count: number }[]
  }
  skills: Skill[]
}

export interface ExerciseChoice {
  key: string
  text: string
  /** Erreur de raisonnement revelee par ce distracteur. Sert au diagnostic. */
  misconception: string | null
}

export interface ExerciseAnswer {
  value: string | number | boolean
  /** Autres ecritures acceptees, ex. "3/4" et "0,75". */
  accepted?: (string | number)[]
  /** Ecart tolere pour une reponse numerique approchee. */
  tolerance?: number
  unit?: string | null
}

export interface Exercise {
  id: string
  skill_id: string
  level: ExerciseLevel
  type: ExerciseType
  /** Markdown leger autorise, formules LaTeX entre $...$. */
  statement: string
  image: string | null
  choices?: ExerciseChoice[]
  answer: ExerciseAnswer
  solution_steps: string[]
  hint: string | null
  estimated_duration_s: number
  review_status: ReviewStatus
  programme_ref: string | null
}

export interface ExercisesBank {
  metadata: {
    version: string
    scope: string
    updated_at: string
    total_exercises: number
    review_status: ReviewStatus
  }
  exercises: Exercise[]
}

export interface Mindmap {
  id: string
  title: string
  domain: string
  skill_ids: string[]
  school_levels: SchoolLevel[]
  review_status: ReviewStatus
  programme_ref: string | null
  /** Markdown hierarchique, rendu en carte mentale par l'application. */
  markdown: string
}

export interface MindmapsBank {
  metadata: {
    version: string
    scope: string
    updated_at: string
    total_mindmaps: number
  }
  mindmaps: Mindmap[]
}
