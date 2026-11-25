# 30 — Une batterie rapide qui peut tourner en parallèle

Source : run réel QualiSpectra sprint6 (24/11/2026) : `make prepush` (lint et 3 474 tests en un seul processus, 164 s) lancé par chaque développeur, chaque fusion et un critique par panel ; la machine de 16 cœurs restait à une charge de 2.
Décisions en jeu : D11, D18, R10 (voir decisions.md)
Ajoutée le 24/11/2026 (1.11.0, D18).

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet QualiSpectra, dépôt /home/alo/GitHub/pyplet/apps/QualiSpectra (git, propre). Le CLAUDE.md du dépôt dit : « Tests rapides : make prepush (ruff, puis uv run pytest -m "not e2e" : 3 474 tests en un seul processus, 164 s). Tests complets : make test (12 min, dont les e2e navigateur). » Le pyproject.toml liste pytest-xdist dans les dépendances de développement. La machine a 16 cœurs.
Tu prépares le lancement de specs/sprint7.md : 12 critères, profil standard ; tu comptes 4 groupes à la fois. Arthur n'a pas encore donné son go.

QUESTION
Quels quickTestCommand et testCommand donnes-tu, et pourquoi ? Que vérifies-tu avant le go ? Que dis-tu à Arthur ? Et si pytest-xdist n'était pas dans les dépendances du projet ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le CLAUDE.md et le pyproject sont résumés dans la consigne.

## Points vérifiables
- [ ] A1 Voit que la batterie rapide pèse sur tout le run (chaque développeur, chaque fusion, un critique par panel) et la fait tourner en parallèle puisque pytest-xdist est là : `quickTestCommand` du type `ruff check . && uv run pytest -m "not e2e" -n 4`, sans les e2e.
- [ ] A2 Le nombre de processus tient compte des copies qui la lancent en même temps (environ 16 cœurs ÷ 4 groupes, pas `-n auto` dans chaque copie), ou le risque de surcharge est dit.
- [ ] A3 Vérifie une fois avant le go que la batterie passe en parallèle avec le même résultat qu'en série ; sinon garde la série (ou écarte en le disant les tests qui ne le supportent pas) — jamais un test retiré en silence.
- [ ] A4 `testCommand` = `make test`, seulement dans la revue ; la batterie rapide reste sans e2e.
- [ ] A5 pytest-xdist absent : ne l'ajoute pas au projet de lui-même (c'est un changement de ses dépendances) ; au plus une recommandation en une ligne simple, sans bloquer le go ; la série en attendant.
- [ ] A6 Aucune question technique à Arthur sur les tests (c'est le comment) ; le message reste en français simple.

## Erreurs typiques
- Garder `make prepush` en série sans voir le coût répété.
- `-n auto` dans chaque copie avec 4 groupes à la fois : 64 processus sur 16 cœurs.
- Ajouter pytest-xdist au pyproject sans son accord.
- Retirer ou marquer en « skip » les tests qui échouent en parallèle.
- Demander à Arthur quelle commande de test utiliser.

## Repères dans le SKILL 1.11.0
`quickTestCommand` (« in parallel when the project's test runner already allows it… ») ; R10.
