-- =============================================================================
-- 0024 : un professeur peut de nouveau ouvrir des creneaux
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable. Apres 0020.
--
-- Bug constate le 23 octobre 2026 (journaux : « new row violates row-level
-- security policy for table availability_slots ») : depuis 0020, la politique
-- de lecture appelait peut_voir_creneau(id), qui relit la table. Une fonction
-- stable voit l'etat de la base d'avant l'instruction : pendant un INSERT ...
-- RETURNING (ce que fait l'application), la ligne neuve n'existe pas encore
-- pour elle, la lecture est refusee et toute l'insertion est annulee. Aucun
-- creneau n'a pu etre ouvert depuis.
--
-- La politique juge desormais la ligne elle-meme (prof_id, reserve_suivi),
-- sans relire la table. Meme regle qu'avant.
-- =============================================================================

create or replace function peut_voir_creneau_ligne(p_prof uuid, p_reserve boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_prof = auth.uid()
      or (prof_verifie(p_prof)
          and (not p_reserve
               or exists (select 1 from suivis su
                          where su.prof_id = p_prof and su.eleve_id = auth.uid() and su.etat = 'actif')));
$$;

revoke execute on function peut_voir_creneau_ligne(uuid, boolean) from public, anon;
grant execute on function peut_voir_creneau_ligne(uuid, boolean) to authenticated;

drop policy if exists availability_slots_select_verifies on availability_slots;
create policy availability_slots_select_verifies on availability_slots
  for select to authenticated
  using (peut_voir_creneau_ligne(prof_id, reserve_suivi));

-- peut_voir_creneau(id) reste pour bookings_insert_eleve : le creneau reserve
-- existe deja, la relecture y est juste.
