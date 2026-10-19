-- =============================================================================
-- 0011 : accord parental par email (consentement, modifications du profil)
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
-- Deux obligations, un seul mecanisme :
--
--   1. Consentement avant 15 ans (RGPD, art. 8 ; loi Informatique et libertes,
--      art. 45). Le parent recoit un lien, valable 7 jours ; son clic confirme.
--   2. Un MINEUR (moins de 18 ans) ne change ni sa date de naissance ni son
--      email sans l'accord du parent rattache (decision de Gauthier, 19 octobre
--      2026). Un majeur les change librement.
--
-- Les liens partent de l'Edge Function `accord-parental`, qui seule ecrit ces
-- tables (cle service_role). Le jeton n'est jamais stocke en clair : seul son
-- empreinte SHA-256 l'est.
--
-- Ce que la base fait respecter ici, meme si le navigateur est trafique :
--   - un eleve ne fabrique plus lui-meme de lien de consentement ;
--   - un mineur ne modifie pas sa date de naissance depuis le client ;
--   - un mineur ne lance pas de changement d'email aupres de Supabase Auth ;
--   - une date de naissance qui passe sous 15 ans, ou un email de parent qui
--     change, remet le consentement a zero.
-- =============================================================================

-- --- 1. Plus aucun lien de consentement cree par le navigateur ---------------

-- 0001 laissait un eleve inserer sa propre ligne parent_links. Avec un jeton
-- qu'il aurait choisi, il pouvait ensuite confirmer son propre consentement par
-- la page publique. Seul le serveur cree desormais ces lignes.
drop policy if exists parent_links_insert_eleve on parent_links;

-- --- 2. Modifications du profil soumises au parent ----------------------------

create table if not exists modifications_profil (
  id              uuid primary key default gen_random_uuid(),
  eleve_id        uuid        not null references profiles (id) on delete cascade,
  champ           text        not null check (champ in ('date_naissance', 'email')),
  nouvelle_valeur text        not null,
  email_parent    text        not null,
  token_hash      text        not null,
  expire_le       timestamptz not null,
  -- Rempli quand le parent accepte ; la modification est alors appliquee par
  -- le serveur dans la meme operation.
  confirme_le     timestamptz,
  -- Rempli quand le parent refuse, ou quand une demande plus recente remplace
  -- celle-ci.
  annule_le       timestamptz,
  cree_le         timestamptz not null default now()
);

create index if not exists modifications_profil_eleve_idx on modifications_profil (eleve_id);
create unique index if not exists modifications_profil_token_idx on modifications_profil (token_hash);

alter table modifications_profil enable row level security;

-- L'eleve voit ses demandes en cours, pour que l'ecran puisse dire « en
-- attente de l'accord de ton parent ». Aucune ecriture depuis le client.
drop policy if exists modifications_profil_select_soi on modifications_profil;
create policy modifications_profil_select_soi on modifications_profil
  for select to authenticated
  using (eleve_id = auth.uid());

grant select on modifications_profil to authenticated;

-- --- 3. Age, calcule par la base ---------------------------------------------

create or replace function age_en_annees(naissance date)
returns integer
language sql
stable
set search_path = ''
as $$
  select extract(year from age(current_date, naissance))::integer;
$$;

revoke execute on function age_en_annees(date) from public, anon;
grant execute on function age_en_annees(date) to authenticated;

-- --- 4. Colonnes protegees, avec les regles des mineurs ----------------------
--
-- Reprend la fonction de 0010 a l'identique pour le role et ajoute les regles
-- de date de naissance et d'email parent.

create or replace function proteger_colonnes_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Les appels serveur (service_role) ne sont pas concernes : c'est par eux
  -- que passent les modifications acceptees par le parent.
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;

  -- Role : choisi une fois (0010).
  if new.role is distinct from old.role then
    if old.role_choisi_le is not null then
      raise exception 'Le role ne se modifie pas depuis le client'
        using errcode = 'insufficient_privilege';
    end if;
    new.role_choisi_le := now();
  elsif old.role_choisi_le is null
        and (new.role <> 'eleve' or new.niveau_scolaire is not null) then
    new.role_choisi_le := now();
  else
    new.role_choisi_le := old.role_choisi_le;
  end if;

  if new.consentement_parental_at is distinct from old.consentement_parental_at then
    raise exception 'Le consentement parental se confirme par le lien envoye au parent'
      using errcode = 'insufficient_privilege';
  end if;

  -- Date de naissance : la premiere saisie (/bienvenue) est libre ; ensuite un
  -- mineur passe par l'accord de son parent.
  if new.date_naissance is distinct from old.date_naissance
     and old.date_naissance is not null
     and age_en_annees(old.date_naissance) < 18 then
    raise exception 'La date de naissance d''un mineur se modifie avec l''accord du parent'
      using errcode = 'insufficient_privilege';
  end if;

  -- Consentement a refaire : nouvelle date sous 15 ans, ou parent different.
  -- Retirer un consentement ne donne aucun droit : la base peut le faire seule.
  if new.date_naissance is distinct from old.date_naissance
     and new.date_naissance is not null
     and age_en_annees(new.date_naissance) < 15
     and (old.date_naissance is null or age_en_annees(old.date_naissance) >= 15) then
    new.consentement_parental_at := null;
  end if;
  if new.email_parent is distinct from old.email_parent then
    new.consentement_parental_at := null;
  end if;

  -- Ces trois colonnes sont silencieusement remises a leur valeur : le client
  -- les renvoie parfois sans intention de les changer.
  new.email := old.email;
  new.cree_le := old.cree_le;
  new.abonnement := old.abonnement;

  return new;
end;
$$;

revoke execute on function proteger_colonnes_profil() from public, anon, authenticated;

-- --- 5. Email : synchronise depuis Supabase Auth, bloque pour un mineur ------

-- profiles.email etait recopie a l'inscription seulement : un changement
-- d'adresse confirme le laissait perime.
create or replace function synchroniser_email_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function synchroniser_email_profil();

-- Un mineur qui appellerait directement auth.updateUser({ email }) depuis la
-- console du navigateur : Supabase Auth ecrit la nouvelle adresse en attente
-- dans email_change. On refuse cette ecriture pour un mineur. Le changement
-- accepte par le parent passe par l'API d'administration, qui ecrit
-- directement `email` sans passer par email_change : il n'est pas bloque ici.
create or replace function bloquer_changement_email_mineur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  naissance date;
begin
  if coalesce(new.email_change, '') = '' or new.email_change is not distinct from old.email_change then
    return new;
  end if;

  select date_naissance into naissance from public.profiles where id = new.id;
  if naissance is not null and age_en_annees(naissance) < 18 then
    raise exception 'L''email d''un mineur se modifie avec l''accord du parent'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change_mineur on auth.users;
create trigger on_auth_user_email_change_mineur
  before update of email_change on auth.users
  for each row
  execute function bloquer_changement_email_mineur();

revoke execute on function synchroniser_email_profil() from public, anon, authenticated;
revoke execute on function bloquer_changement_email_mineur() from public, anon, authenticated;
