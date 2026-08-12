/**
 * Concatene des classes Tailwind en ignorant les valeurs vides.
 * Volontairement minimal : pas de fusion de classes contradictoires, on prefere
 * ecrire des variantes explicites plutot que d'empiler des surcharges.
 */
export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ')
}
