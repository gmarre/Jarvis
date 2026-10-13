-- =============================================================================
-- 0009 : ouverture du domaine P « Grandeurs et mesures »
--
-- Etape 4a du plan de contenu (octobre 2026). Le v1 du DAG reservait les lettres
-- A a O (Numeration a Espace et vecteurs) et n'avait pas de domaine des
-- grandeurs : longueurs, masses, contenances, durees, monnaie, conversions,
-- perimetres et aires simples. Il devient le domaine P.
--
-- Les contraintes de la 0005 (identifiants de competences, d'exercices, de
-- cartes) et de la 0008 (element juge en recette) n'acceptaient que A a O :
-- elles passent a A a P. Rien d'autre ne change.
--
-- Les noms de contraintes sont ceux que Postgres donne aux check de colonne
-- (<table>_<colonne>_check). Rejouable : drop constraint if exists, puis add.
-- =============================================================================

alter table content_skills drop constraint if exists content_skills_id_check;
alter table content_skills add constraint content_skills_id_check
  check (id ~ '^[A-P][0-9]{3}$');

alter table content_skills drop constraint if exists content_skills_domain_check;
alter table content_skills add constraint content_skills_domain_check
  check (domain ~ '^[A-P]$');

alter table content_exercises drop constraint if exists content_exercises_id_check;
alter table content_exercises add constraint content_exercises_id_check
  check (id ~ '^EX-[A-P][0-9]{3}-[DEM]-[0-9]{2}$');

alter table content_mindmaps drop constraint if exists content_mindmaps_id_check;
alter table content_mindmaps add constraint content_mindmaps_id_check
  check (id ~ '^MM-[A-P]-[0-9]{2}$');

alter table content_reviews drop constraint if exists content_reviews_item_id_check;
alter table content_reviews add constraint content_reviews_item_id_check
  check (item_id ~ '^(EX-[A-P][0-9]{3}-[DEM]-[0-9]{2}|MM-[A-P]-[0-9]{2})$');
