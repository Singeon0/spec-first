# 06 — Monorepo, projet dans un sous-dossier

Source : Cas générique (pnpm workspaces, tests avec Postgres sur un port fixe, hooks husky)
Décisions en jeu : D8, D12, R1, R3 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Monorepo /Users/dev/acme (pnpm workspaces) : apps/web (Next.js), packages/api (Fastify), packages/shared. Le haut du dépôt git est /Users/dev/acme. La spec concerne seulement packages/api : /Users/dev/acme/packages/api/specs/rate-limit.md, 4 critères.
- Tests complets : `pnpm --filter api test` (3 min ; ils démarrent un Postgres par docker compose sur le port 5432).
- Tests rapides : `pnpm --filter api test:unit` (20 s).
- packages/api/.env existe, ignoré par git.
- Hooks de commit : husky + lint-staged, installés par `pnpm install` à la racine.
- git status est vide.
Arthur écrit : « Go sur la spec rate-limit. »

QUESTION
Que fais-tu ici, étape par étape : quel workflow, avec quels arguments (projectRoot, subdir, setupCommand, tests, exclusive…), dans quel ordre, ce que tu dis à Arthur ? Et si les copies n'arrivent pas à lancer les tests (node_modules absent) ou si le hook husky échoue dans une copie ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. La structure du dépôt et les commandes de test sont dans la consigne.

## Points vérifiables
- [ ] A1 `projectRoot` = /Users/dev/acme (haut du dépôt git), `subdir` = packages/api, `specPath` absolu.
- [ ] A2 `setupCommand` rend une copie neuve utilisable : `pnpm install` à la racine de la copie (dépendances du workspace, husky et lint-staged) alors qu'il s'exécute depuis `subdir`, et copie `packages/api/.env` ; jamais de lien vers les `node_modules` du projet.
- [ ] A3 `quickTestCommand` = `pnpm --filter api test:unit` ; `testCommand` = `pnpm --filter api test`, seulement au contrôle strict.
- [ ] A4 Le Postgres sur le port 5432 est une ressource partagée : `exclusive`, ou une instance par agent sur ses propres ports — jamais deux agents sur le même conteneur.
- [ ] A5 Rien ne sort de la machine : pas de `publish`.
- [ ] A6 Copies qui ne lancent pas les tests : la cause est la préparation (`setupCommand`) → corriger l'argument et relancer, sans question.
- [ ] A7 Hook husky : jamais `--no-verify` ; cause dans les changements → le développeur corrige ; hook non installé → `setupCommand` ; règle cassée hors des changements → blocage technique dit une fois (cause et action), sans question.
- [ ] A8 `baseCommit` relevé juste avant l'appel ; message de lancement court, sans technique.

## Erreurs typiques
- `projectRoot` = packages/api.
- `setupCommand` qui oublie la racine du workspace ou le `.env`.
- Lien symbolique vers `node_modules`.
- ⛔ `--no-verify`.
- La suite complète (3 min, Postgres) lancée par chaque critique.

## Repères dans le SKILL 1.7.0
L99, L236-241, L244, L240, L337.
