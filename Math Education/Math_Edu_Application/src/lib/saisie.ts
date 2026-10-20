// Aides a la saisie d'une reponse numerique sur telephone.
//
// Un champ numerique ouvre le pave decimal (inputMode="decimal") : chiffres et
// virgule, pratique pour un enfant. Mais sur iPhone ce pave n'a pas de signe
// moins : sans aide, un eleve de 5e ne pouvait pas repondre « −3 » aux
// exercices de nombres relatifs (releve en relecture du complement pilote,
// 20 octobre 2026). On garde le pave, et l'ecran ajoute un bouton « ± ».

import { getSkill, levelRank } from '@/content'

/** Les relatifs arrivent en 5e : avant, un bouton « ± » n'a pas de sens. */
export function proposeLeSigne(skillId: string): boolean {
  const skill = getSkill(skillId)
  return skill !== undefined && levelRank(skill.school_level) >= levelRank('5e')
}

/** Ajoute ou retire le signe moins en tete de la saisie. */
export function basculerSigne(valeur: string): string {
  const v = valeur.trimStart()
  if (/^[-−–]/.test(v)) return v.slice(1).trimStart()
  return `-${v}`
}
