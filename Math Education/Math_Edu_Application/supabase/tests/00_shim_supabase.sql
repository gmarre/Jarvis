-- Substitut minimal de l'environnement Supabase, pour valider la migration
-- hors de Supabase. N'est PAS livre : sert uniquement au controle de syntaxe.
create schema if not exists auth;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

create or replace function auth.uid() returns uuid
language sql stable as $$ select current_setting('request.jwt.claim.sub', true)::uuid $$;

-- auth.role() rend le claim 'role' du JWT : 'authenticated' pour un utilisateur
-- connecte, 'service_role' pour un appel serveur. Les tests se placent par
-- defaut en 'authenticated', c'est le cas a verrouiller.
create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(current_setting('request.jwt.claim.role', true), 'authenticated')
$$;

do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
-- Role des appels serveur (cle service_role) : seul autorise a publier le contenu.
do $$ begin create role service_role; exception when duplicate_object then null; end $$;
