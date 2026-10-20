-- Chemins choisis (migration 0012) : l'eleve ecrit sa liste, la base refuse
-- tout ce qui n'est pas une lettre de domaine.
--
-- Depend de 01 pour les comptes (Lea, 2222).

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

update profiles set chemins_choisis = array['C','G'] where id = '22222222-2222-2222-2222-222222222222';
select 'TEST 70 l eleve choisit ses chemins' as test,
       (chemins_choisis = array['C','G']) as ok
from profiles where id = '22222222-2222-2222-2222-222222222222';

\echo '--- Un texte libre dans la liste : refuse ---'
\set ON_ERROR_STOP off
update profiles set chemins_choisis = array['<script>'] where id = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP on
select 'TEST 71 seules des lettres de domaine sont acceptees' as test,
       (chemins_choisis = array['C','G']) as ok
from profiles where id = '22222222-2222-2222-2222-222222222222';

reset role;
select 'TEST FIN 07 le fichier est alle jusqu au bout' as test, true as ok;
