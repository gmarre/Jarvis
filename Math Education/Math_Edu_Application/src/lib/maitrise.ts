// La regle de maitrise vit dans supabase/functions/_shared/maitrise.ts : la
// fonction serveur `corriger` l'applique a chaque reponse (sprint 6,
// progression cote serveur), l'application l'emploie en demonstration et dans
// ses tests. Un seul fichier, pour que les deux ne divergent jamais.
export * from '../../supabase/functions/_shared/maitrise'
