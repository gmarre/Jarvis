-- =============================================================================
-- 0018 : professeur v1 (sprint 3)
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
--   1. Profil public du professeur (experience, methode, niveaux) et
--      verification par l'administrateur (verifie_le) : un professeur non
--      verifie ne se voit pas des eleves (CLAUDE.md, sprint 3, point 6).
--   2. Offres de cours : titre, competences, niveau, 30 min a 2 h, 3 places au
--      plus, prix affiche (non encaisse) ; un creneau ouvert depuis une offre
--      en reprend la duree, les places et le prix (point 1).
--   3. Lien de visioconference Jitsi par seance, lisible du seul professeur et
--      des inscrits (point 5, version 1 sans temps reel).
--   4. Les inscrits d'un creneau, nommes pour son professeur, meme sans partage
--      de progression : il doit savoir qui vient (point 2).
--
-- Verifier un professeur (administrateur, SQL Editor) :
--   update teachers set verifie_le = now() where id = (select id from profiles where email = '...');
-- =============================================================================

-- --- 1. Profil public et verification -------------------------------------------

alter table teachers add column if not exists experience text not null default '';
alter table teachers add column if not exists methode text not null default '';
alter table teachers add column if not exists niveaux text[] not null default '{}';
alter table teachers add column if not exists verifie_le timestamptz;

alter table teachers drop constraint if exists teachers_textes_bornes;
alter table teachers add constraint teachers_textes_bornes
  check (char_length(experience) <= 600 and char_length(methode) <= 600 and char_length(titre) <= 80);

-- La verification, la note et le nombre de cours ne s'ecrivent que par le
-- serveur (SQL Editor, fonctions) : un professeur ne se verifie pas lui-meme.
create or replace function proteger_colonnes_prof()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verifie_le := null;
    new.note := null;
    new.nb_cours := 0;
  else
    new.verifie_le := old.verifie_le;
    new.note := old.note;
    new.nb_cours := old.nb_cours;
  end if;
  return new;
end;
$$;

revoke execute on function proteger_colonnes_prof() from public, anon, authenticated;

drop trigger if exists teachers_colonnes_protegees on teachers;
create trigger teachers_colonnes_protegees
  before insert or update on teachers
  for each row execute function proteger_colonnes_prof();

-- security definer : lue dans les politiques d'autres tables, sans recursion.
create or replace function prof_verifie(prof uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from teachers t where t.id = prof and t.verifie_le is not null);
$$;

revoke execute on function prof_verifie(uuid) from public, anon;
grant execute on function prof_verifie(uuid) to authenticated;

drop policy if exists teachers_select_tous on teachers;
drop policy if exists teachers_select_verifies on teachers;
create policy teachers_select_verifies on teachers
  for select to authenticated
  using (id = auth.uid() or verifie_le is not null);

drop policy if exists availability_slots_select_tous on availability_slots;
drop policy if exists availability_slots_select_verifies on availability_slots;
create policy availability_slots_select_verifies on availability_slots
  for select to authenticated
  using (prof_id = auth.uid() or prof_verifie(prof_id));

-- --- 2. Offres de cours ------------------------------------------------------------

create table if not exists course_offers (
  id          uuid        primary key default gen_random_uuid(),
  prof_id     uuid        not null references profiles (id) on delete cascade,
  titre       text        not null,
  description text        not null default '',
  skill_ids   text[]      not null,
  niveau      text        not null,
  duree_min   integer     not null,
  places      integer     not null default 3,
  prix_eur    integer     not null,
  active      boolean     not null default true,
  cree_le     timestamptz not null default now()
);

alter table course_offers drop constraint if exists course_offers_valides;
alter table course_offers add constraint course_offers_valides check (
  char_length(titre) between 3 and 80
  and char_length(description) <= 600
  and cardinality(skill_ids) between 1 and 10
  and niveau in ('CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e')
  and duree_min between 30 and 120
  and places between 1 and 3
  and prix_eur between 0 and 200
);

create index if not exists course_offers_prof_idx on course_offers (prof_id);

alter table course_offers enable row level security;

drop policy if exists course_offers_select on course_offers;
create policy course_offers_select on course_offers
  for select to authenticated
  using (prof_id = auth.uid() or prof_verifie(prof_id));

drop policy if exists course_offers_insert_prof on course_offers;
create policy course_offers_insert_prof on course_offers
  for insert to authenticated
  with check (prof_id = auth.uid() and role_actuel() = 'prof');

drop policy if exists course_offers_update_prof on course_offers;
create policy course_offers_update_prof on course_offers
  for update to authenticated
  using (prof_id = auth.uid())
  with check (prof_id = auth.uid());

drop policy if exists course_offers_delete_prof on course_offers;
create policy course_offers_delete_prof on course_offers
  for delete to authenticated
  using (prof_id = auth.uid());

revoke all on course_offers from anon;

alter table availability_slots add column if not exists offer_id uuid references course_offers (id) on delete set null;

-- Un creneau ouvert depuis une offre en reprend la duree, les places, le prix
-- et les domaines (premiere lettre des competences) : le professeur ne peut pas
-- annoncer 3 places et en ouvrir 10. L'offre doit etre la sienne.
create or replace function creneau_depuis_offre()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  o course_offers%rowtype;
begin
  if new.offer_id is null then
    return new;
  end if;
  select * into o from course_offers where id = new.offer_id;
  if not found or o.prof_id <> new.prof_id then
    raise exception 'Offre inconnue pour ce professeur' using errcode = 'insufficient_privilege';
  end if;
  new.duree_min := o.duree_min;
  new.capacite := o.places;
  new.prix_eur := o.prix_eur;
  new.domaines := array(select distinct left(s, 1) from unnest(o.skill_ids) as s order by 1);
  return new;
end;
$$;

revoke execute on function creneau_depuis_offre() from public, anon, authenticated;

drop trigger if exists availability_slots_depuis_offre on availability_slots;
create trigger availability_slots_depuis_offre
  before insert or update of offer_id on availability_slots
  for each row execute function creneau_depuis_offre();

-- La vue slots_disponibles ne change pas : 0001 et 0004 la redefinissent et
-- doivent rester rejouables. L'application lit offer_id dans availability_slots.

-- --- 3. Lien de visioconference par seance ------------------------------------------

create table if not exists seances_visio (
  slot_id uuid primary key references availability_slots (id) on delete cascade,
  lien    text not null
);

-- Le professeur du creneau ou un eleve inscrit. security definer : lit
-- bookings et availability_slots sans repasser par leurs politiques.
create or replace function participe_au_creneau(creneau uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from availability_slots s where s.id = creneau and s.prof_id = auth.uid())
      or exists (select 1 from bookings b where b.slot_id = creneau and b.eleve_id = auth.uid());
$$;

revoke execute on function participe_au_creneau(uuid) from public, anon;
grant execute on function participe_au_creneau(uuid) to authenticated;

-- Lien Jitsi imprevisible (128 bits), cree avec le creneau.
create or replace function creer_lien_visio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into seances_visio (slot_id, lien)
  values (new.id, 'https://meet.jit.si/Racine-' || replace(gen_random_uuid()::text, '-', ''))
  on conflict (slot_id) do nothing;
  return new;
end;
$$;

revoke execute on function creer_lien_visio() from public, anon, authenticated;

drop trigger if exists availability_slots_lien_visio on availability_slots;
create trigger availability_slots_lien_visio
  after insert on availability_slots
  for each row execute function creer_lien_visio();

insert into seances_visio (slot_id, lien)
select s.id, 'https://meet.jit.si/Racine-' || replace(gen_random_uuid()::text, '-', '')
from availability_slots s
on conflict (slot_id) do nothing;

alter table seances_visio enable row level security;

drop policy if exists seances_visio_select_participants on seances_visio;
create policy seances_visio_select_participants on seances_visio
  for select to authenticated
  using (participe_au_creneau(slot_id));

revoke all on seances_visio from anon;
revoke insert, update, delete on seances_visio from authenticated;

-- --- 4. Les inscrits d'un creneau, pour son professeur -------------------------------

-- Prenom et partage seulement : la progression reste soumise a l'accord de
-- l'eleve (est_prof_de).
create or replace function inscrits_du_creneau(creneau uuid)
returns table (eleve_id uuid, prenom text, partage boolean, skill_id text)
language sql
stable
security definer
set search_path = public
as $$
  select b.eleve_id, p.prenom, p.partage_progression_prof, b.skill_id
  from bookings b
  join availability_slots s on s.id = b.slot_id
  join profiles p on p.id = b.eleve_id
  where b.slot_id = creneau and s.prof_id = auth.uid()
  order by b.cree_le;
$$;

revoke execute on function inscrits_du_creneau(uuid) from public, anon;
grant execute on function inscrits_du_creneau(uuid) to authenticated;
