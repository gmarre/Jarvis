-- =============================================================================
-- 0013 : niveau de maitrise sur 5 et controles espaces (sprint 2, point 2)
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
-- Table validee par Gauthier le 20 octobre 2026 (CLAUDE.md, sprint 2) et
-- codee dans src/lib/maitrise.ts :
--   0 a 2 : en apprentissage ; 3 : rouverte apres un controle rate ;
--   4 : acquise (deux exercices differents reussis, dont un de maitrise),
--       controlee a J+3, J+10, J+30 ; 5 : completement acquise.
-- La relecture des cartes mentales garde ses colonnes (next_review_at,
-- review_box) : elle ne repousse plus les controles de la competence.
-- =============================================================================

alter table skill_progress add column if not exists niveau smallint not null default 0;
alter table skill_progress add column if not exists exercices_reussis text[] not null default '{}';
alter table skill_progress add column if not exists controles_reussis smallint not null default 0;
alter table skill_progress add column if not exists prochain_controle timestamptz;
alter table skill_progress add column if not exists valide_par_test boolean not null default false;

do $$ begin
  alter table skill_progress add constraint skill_progress_niveau_borne check (niveau between 0 and 5);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table skill_progress add constraint skill_progress_controles_borne check (controles_reussis between 0 and 3);
exception when duplicate_object then null; end $$;

comment on column skill_progress.niveau is
  'Niveau de maitrise 0 a 5 (src/lib/maitrise.ts). 4 et 5 : competence acquise.';
comment on column skill_progress.prochain_controle is
  'Prochain controle de la competence acquise (niveau 4) ; null sinon.';

-- L'echeancier des controles se lit par eleve et par date.
create index if not exists skill_progress_controle_idx
  on skill_progress (user_id, prochain_controle) where prochain_controle is not null;

-- --- Reprise des progressions existantes --------------------------------------
-- Une seule fois : seulement les lignes encore au niveau 0 qui ont deja ete
-- travaillees. Une competence maitrisee passe au niveau 4 avec un premier
-- controle a J+3 ; une competence en cours retrouve ses exercices reussis dans
-- l'historique et passe a 1 ou 2.

update skill_progress sp
set exercices_reussis = coalesce((
      select array_agg(distinct a.exercise_id)
      from exercise_attempts a
      where a.user_id = sp.user_id and a.skill_id = sp.skill_id and a.is_correct
    ), '{}')
where sp.niveau = 0 and sp.attempts > 0;

update skill_progress
set niveau = 4,
    prochain_controle = date_trunc('day', now()) + interval '3 days 6 hours',
    controles_reussis = 0
where niveau = 0 and status = 'mastered';

update skill_progress
set niveau = least(2, cardinality(exercices_reussis))
where niveau = 0 and status <> 'mastered' and cardinality(exercices_reussis) > 0;
