-- =============================================================================
-- 0020 : relation de suivi professeur, eleve et parent (sprint 5)
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
--   1. Suivi : l'eleve le demande a un professeur verifie, le professeur
--      l'accepte ou le refuse ; chacun (et le parent) peut y mettre fin. Un
--      suivi actif donne au professeur l'acces au graphe de l'eleve, si
--      celui-ci partage sa progression (est_prof_de etendue).
--   2. Messagerie du suivi : lue et ecrite par le professeur, l'eleve et son
--      parent rattache. Le parent voit tous les echanges et peut ecrire au
--      professeur : jamais d'echange prive entre un adulte et un mineur hors de
--      sa vue (avis critique du CLAUDE.md, sprint 5). Pas de piece jointe ;
--      signalement d'un message ; un suivi termine garde son fil, en archive.
--   3. Cours reserves : un creneau peut n'etre visible et reservable que par
--      les eleves suivis par son professeur.
-- =============================================================================

-- --- 1. Suivi ------------------------------------------------------------------

create table if not exists suivis (
  id          uuid        primary key default gen_random_uuid(),
  prof_id     uuid        not null references profiles (id) on delete cascade,
  eleve_id    uuid        not null references profiles (id) on delete cascade,
  etat        text        not null default 'demande',
  demande_le  timestamptz not null default now(),
  accepte_le  timestamptz,
  termine_le  timestamptz,
  unique (prof_id, eleve_id)
);

alter table suivis drop constraint if exists suivis_etat_valide;
alter table suivis add constraint suivis_etat_valide check (etat in ('demande', 'actif', 'refuse', 'termine'));

create index if not exists suivis_eleve_idx on suivis (eleve_id);

-- Professeur, eleve, ou parent rattache de l'eleve.
create or replace function participe_au_suivi(suivi uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from suivis s
    where s.id = suivi
      and (s.prof_id = auth.uid() or s.eleve_id = auth.uid() or est_parent_de(s.eleve_id))
  );
$$;

revoke execute on function participe_au_suivi(uuid) from public, anon;
grant execute on function participe_au_suivi(uuid) to authenticated;

alter table suivis enable row level security;

drop policy if exists suivis_select_participants on suivis;
create policy suivis_select_participants on suivis
  for select to authenticated
  using (participe_au_suivi(id));

revoke all on suivis from anon;
revoke insert, update, delete on suivis from authenticated;

-- Demande de l'eleve, a un professeur verifie. Une demande refusee ou un
-- suivi termine peut etre redemande.
create or replace function demander_suivi(prof uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  id_suivi uuid;
begin
  if role_actuel() is distinct from 'eleve' then
    raise exception 'Seul un eleve demande un suivi' using errcode = 'insufficient_privilege';
  end if;
  if not prof_verifie(prof) then
    raise exception 'Professeur inconnu' using errcode = 'insufficient_privilege';
  end if;
  insert into suivis (prof_id, eleve_id) values (prof, auth.uid())
  on conflict (prof_id, eleve_id) do update
    set etat = 'demande', demande_le = now(), accepte_le = null, termine_le = null
    where suivis.etat in ('refuse', 'termine')
  returning id into id_suivi;
  if id_suivi is null then
    select id into id_suivi from suivis where prof_id = prof and eleve_id = auth.uid();
  end if;
  return id_suivi;
end;
$$;

revoke execute on function demander_suivi(uuid) from public, anon;
grant execute on function demander_suivi(uuid) to authenticated;

-- Reponse du professeur a une demande.
create or replace function repondre_suivi(suivi uuid, accepte boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  nouvel_etat text := case when accepte then 'actif' else 'refuse' end;
begin
  update suivis
     set etat = nouvel_etat, accepte_le = case when accepte then now() else null end
   where id = suivi and prof_id = auth.uid() and etat = 'demande';
  if not found then
    raise exception 'Demande introuvable' using errcode = 'insufficient_privilege';
  end if;
  return nouvel_etat;
end;
$$;

revoke execute on function repondre_suivi(uuid, boolean) from public, anon;
grant execute on function repondre_suivi(uuid, boolean) to authenticated;

-- Fin du suivi, par le professeur, l'eleve ou son parent.
create or replace function terminer_suivi(suivi uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update suivis set etat = 'termine', termine_le = now()
   where id = suivi and etat in ('demande', 'actif') and participe_au_suivi(suivi);
  return found;
end;
$$;

revoke execute on function terminer_suivi(uuid) from public, anon;
grant execute on function terminer_suivi(uuid) to authenticated;

-- Un suivi actif vaut une inscription a un cours : le professeur voit la
-- progression de l'eleve, toujours sous reserve du partage.
create or replace function est_prof_de(eleve uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = eleve and p.partage_progression_prof
      and (
        exists (
          select 1 from bookings b join availability_slots s on s.id = b.slot_id
          where b.eleve_id = eleve and s.prof_id = auth.uid()
        )
        or exists (
          select 1 from suivis su
          where su.eleve_id = eleve and su.prof_id = auth.uid() and su.etat = 'actif'
        )
      )
  );
$$;

revoke execute on function est_prof_de(uuid) from public, anon, authenticated;

-- Le professeur nomme ses eleves suivis et ses demandes (le profil de l'eleve
-- n'est lisible que s'il partage sa progression).
create or replace function mes_suivis_prof()
returns table (suivi_id uuid, eleve_id uuid, prenom text, niveau_scolaire text, etat text, partage boolean, demande_le timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, p.id, p.prenom, p.niveau_scolaire::text, s.etat, p.partage_progression_prof, s.demande_le
  from suivis s join profiles p on p.id = s.eleve_id
  where s.prof_id = auth.uid()
  order by s.etat, p.prenom;
$$;

revoke execute on function mes_suivis_prof() from public, anon;
grant execute on function mes_suivis_prof() to authenticated;

-- --- 2. Messagerie ---------------------------------------------------------------

create table if not exists messages_suivi (
  id         uuid        primary key default gen_random_uuid(),
  suivi_id   uuid        not null references suivis (id) on delete cascade,
  auteur_id  uuid        references profiles (id) on delete set null,
  texte      text        not null,
  cree_le    timestamptz not null default now(),
  signale_le timestamptz
);

alter table messages_suivi drop constraint if exists messages_suivi_texte_borne;
alter table messages_suivi add constraint messages_suivi_texte_borne
  check (char_length(btrim(texte)) between 1 and 2000);

create index if not exists messages_suivi_fil_idx on messages_suivi (suivi_id, cree_le);

alter table messages_suivi enable row level security;

drop policy if exists messages_suivi_select on messages_suivi;
create policy messages_suivi_select on messages_suivi
  for select to authenticated
  using (participe_au_suivi(suivi_id));

-- Ecrire : un participant, sous son nom, dans un suivi actif.
drop policy if exists messages_suivi_insert on messages_suivi;
create policy messages_suivi_insert on messages_suivi
  for insert to authenticated
  with check (
    auteur_id = auth.uid()
    and signale_le is null
    and participe_au_suivi(suivi_id)
    and exists (select 1 from suivis s where s.id = suivi_id and s.etat = 'actif')
  );

revoke all on messages_suivi from anon;
revoke update, delete on messages_suivi from authenticated;

-- Signaler un message (a l'administrateur, qui lit messages_suivi dans le
-- SQL Editor : where signale_le is not null).
create or replace function signaler_message(message uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update messages_suivi set signale_le = coalesce(signale_le, now())
   where id = message and participe_au_suivi(suivi_id);
  return found;
end;
$$;

revoke execute on function signaler_message(uuid) from public, anon;
grant execute on function signaler_message(uuid) to authenticated;

-- --- 3. Cours reserves aux eleves suivis -------------------------------------------

alter table availability_slots add column if not exists reserve_suivi boolean not null default false;

create or replace function peut_voir_creneau(creneau uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from availability_slots s
    where s.id = creneau
      and (
        s.prof_id = auth.uid()
        or (prof_verifie(s.prof_id)
            and (not s.reserve_suivi
                 or exists (select 1 from suivis su
                            where su.prof_id = s.prof_id and su.eleve_id = auth.uid() and su.etat = 'actif')))
      )
  );
$$;

revoke execute on function peut_voir_creneau(uuid) from public, anon;
grant execute on function peut_voir_creneau(uuid) to authenticated;

drop policy if exists availability_slots_select_verifies on availability_slots;
create policy availability_slots_select_verifies on availability_slots
  for select to authenticated
  using (peut_voir_creneau(id));

-- Reserver : seulement un creneau que l'eleve a le droit de voir.
drop policy if exists bookings_insert_eleve on bookings;
create policy bookings_insert_eleve on bookings
  for insert to authenticated
  with check (eleve_id = auth.uid() and peut_voir_creneau(slot_id));
