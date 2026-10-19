-- =============================================================================
-- 0010 : choix du role une seule fois, pour les comptes Google
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
-- LE PROBLEME. Un compte Google arrive sans role : le trigger de 0001 le cree
-- 'eleve' par defaut. Sur /bienvenue, un professeur ou un parent choisit son
-- role, mais le trigger proteger_colonnes_profil refuse tout changement de role
-- venant du client. Un professeur inscrit par Google restait donc eleve.
--
-- LA REGLE. Le role se choisit UNE fois, a l'inscription :
--   - par email, il vient des metadonnees : il est fixe des la creation ;
--   - par Google, il reste ouvert jusqu'a la completion du profil (/bienvenue).
-- La colonne role_choisi_le enregistre ce choix. Une fois posee, le role ne
-- bouge plus depuis le client. Le passage par l'administrateur (service_role)
-- reste possible : c'est lui qui validera les professeurs (sprint 3).
--
-- Ce que ca n'ouvre pas : un eleve deja complet (niveau renseigne) ne peut pas
-- se declarer professeur. Le rattrapage plus bas fige le role de tous les
-- profils deja complets.
-- =============================================================================

alter table profiles add column if not exists role_choisi_le timestamptz;

comment on column profiles.role_choisi_le is
  'Moment ou le role a ete fixe (inscription par email, ou completion du profil Google). Null : le role peut encore etre choisi, une fois.';

-- Rattrapage : un profil deja complet a deja fait son choix. Un eleve est
-- complet avec son niveau ; un professeur ou un parent, des qu'il a ce role.
update profiles
set role_choisi_le = cree_le
where role_choisi_le is null
  and (role <> 'eleve' or niveau_scolaire is not null);

-- --- Creation du profil : le role des metadonnees est un choix ---------------

create or replace function creer_profil_pour_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, prenom, nom, role_choisi_le)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'eleve'),
    coalesce(
      new.raw_user_meta_data ->> 'prenom',
      -- Google renvoie given_name ou full_name selon les cas.
      new.raw_user_meta_data ->> 'given_name',
      split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1),
      ''
    ),
    coalesce(new.raw_user_meta_data ->> 'nom', ''),
    -- Inscription par email : le role a ete choisi sur le formulaire. Google ne
    -- transmet pas de role : le choix reste ouvert jusqu'a /bienvenue.
    case when new.raw_user_meta_data ? 'role' then now() end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- --- Colonnes protegees : le role devient modifiable une fois ----------------

create or replace function proteger_colonnes_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Les appels serveur (service_role) ne sont pas concernes.
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;

  if new.role is distinct from old.role then
    if old.role_choisi_le is not null then
      raise exception 'Le role ne se modifie pas depuis le client'
        using errcode = 'insufficient_privilege';
    end if;
    -- Premier et dernier choix.
    new.role_choisi_le := now();
  elsif old.role_choisi_le is null
        and (new.role <> 'eleve' or new.niveau_scolaire is not null) then
    -- Un compte Google qui complete son profil en restant eleve a fait son
    -- choix lui aussi : sans cela, il pourrait se declarer professeur plus tard.
    new.role_choisi_le := now();
  else
    new.role_choisi_le := old.role_choisi_le;
  end if;

  if new.consentement_parental_at is distinct from old.consentement_parental_at then
    raise exception 'Le consentement parental se confirme par le lien envoye au parent'
      using errcode = 'insufficient_privilege';
  end if;

  -- Ces trois colonnes sont silencieusement remises a leur valeur : le client
  -- les renvoie parfois sans intention de les changer.
  new.email := old.email;
  new.cree_le := old.cree_le;
  new.abonnement := old.abonnement;

  return new;
end;
$$;

-- create or replace conserve les droits poses par 0007 ; on les repose quand
-- meme, au cas ou la fonction aurait ete recreee autrement.
revoke execute on function creer_profil_pour_nouvel_utilisateur() from public, anon, authenticated;
revoke execute on function proteger_colonnes_profil() from public, anon, authenticated;
