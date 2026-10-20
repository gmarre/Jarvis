-- =============================================================================
-- Cron des rappels de travail (sprint 2) et du rapport hebdomadaire (sprint 4). A coller APRES les
-- migrations 0017 et 0019, dans Supabase : SQL Editor -> New query -> Run. Rejouable.
--
-- Pas une migration : pg_cron n'existe pas dans les tests (PGlite), et
-- l'appel porte un secret qui ne doit pas etre dans le depot.
--
-- Avant de lancer ce fichier, une seule fois :
--   1. Inventer un secret (par exemple 40 caracteres au hasard) : CRON_SECRET.
--   2. Supabase > Edge Functions > Secrets : ajouter CRON_SECRET = ce secret.
--   3. Ici, remplacer UNIQUEMENT dans la ligne vault.create_secret ci-dessous
--      le texte COLLER_LE_SECRET_ICI par ce meme secret, executer, puis ne pas
--      enregistrer la requete avec le secret dedans.
--
-- Effet : toutes les 30 minutes, la base appelle la fonction rappel-revision
-- (action « envoyer ») ; c'est elle qui decide qui recoit un rappel
-- (supabase/functions/_shared/rappels.ts).
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Le secret vit dans le coffre de la base (Vault), jamais en clair dans le job.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'rappels_cron_secret') then
    perform vault.create_secret('COLLER_LE_SECRET_ICI', 'rappels_cron_secret');
  end if;
end $$;

-- Un seul job : on le remplace s'il existe deja.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'rappels-revision') then
    perform cron.unschedule('rappels-revision');
  end if;
end $$;

select cron.schedule(
  'rappels-revision',
  '*/30 * * * *',
  $job$
  select net.http_post(
    url := 'https://crazwnfjyzaxirbmwnkn.supabase.co/functions/v1/rappel-revision',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rappels_cron_secret')
    ),
    body := '{"action": "envoyer"}'::jsonb
  );
  $job$
);

-- -----------------------------------------------------------------------------
-- Rapport hebdomadaire au parent (migration 0019, fonction rapport-hebdo) :
-- le dimanche a 16 h UTC (17 h ou 18 h a Paris), meme secret.
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from cron.job where jobname = 'rapport-hebdo') then
    perform cron.unschedule('rapport-hebdo');
  end if;
end $$;

select cron.schedule(
  'rapport-hebdo',
  '0 16 * * 0',
  $job$
  select net.http_post(
    url := 'https://crazwnfjyzaxirbmwnkn.supabase.co/functions/v1/rapport-hebdo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rappels_cron_secret')
    ),
    body := '{"action": "envoyer"}'::jsonb
  );
  $job$
);
