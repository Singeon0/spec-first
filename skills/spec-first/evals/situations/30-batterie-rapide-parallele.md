# 30 — Une batterie rapide qui peut tourner en parallèle

Source : run réel QualiSpectra sprint6 (24/11/2026) : `make prepush` (lint et 3 474 tests en un seul processus, 164 s) lancé par chaque développeur, chaque fusion et un critique par panel ; la machine de 16 cœurs restait à une charge de 2.
Décisions en jeu : D11, D18, D22, D26, R10 (voir decisions.md)
Ajoutée le 24/11/2026 (1.11.0, D18).
Modifié le 26/11/2026 (1.13.0, D20–D26) : la batterie rapide tourne une fois, seule, en fin de run (D22) : A2 inversé (`-n auto` convient) ; A1 : chronométrée avant le go (D26) ; A5 inversé : sans xdist, un sous-ensemble plus petit, dit dans la demande de go (D26) ; A4 reformulé ; la consigne ne nomme plus de profil.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet QualiSpectra, dépôt /home/alo/GitHub/pyplet/apps/QualiSpectra (git, propre). Le CLAUDE.md du dépôt dit : « Tests rapides : make prepush (ruff, puis uv run pytest -m "not e2e" : 3 474 tests en un seul processus, 164 s). Tests complets : make test (12 min, dont les e2e navigateur). » Le pyproject.toml liste pytest-xdist dans les dépendances de développement. La machine a 16 cœurs.
Tu prépares le lancement de specs/sprint7.md : 12 critères ; tu comptes 4 groupes à la fois. Arthur n'a pas encore donné son go.

QUESTION
Quels quickTestCommand et testCommand donnes-tu, et pourquoi ? Que vérifies-tu avant le go ? Que dis-tu à Arthur ? Et si pytest-xdist n'était pas dans les dépendances du projet ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le CLAUDE.md et le pyproject sont résumés dans la consigne.

## Points vérifiables
- [ ] A1 Chronomètre la batterie rapide avant le go : 164 s, plus de deux à trois minutes → sa forme parallèle, puisque pytest-xdist est déjà là : `quickTestCommand` du type `ruff check . && uv run pytest -m "not e2e" -n auto`, sans les e2e.
- [ ] A2 Le nombre de processus : `-n auto` convient — la batterie tourne seule, une fois, en fin de run sur la branche intégrée, jamais dans chaque copie ni à chaque fusion ; les 4 groupes à la fois n'y changent rien.
- [ ] A3 Vérifie une fois avant le go que la batterie passe en parallèle avec le même résultat qu'en série ; sinon garde la série (ou écarte en le disant les tests qui ne le supportent pas) — jamais un test retiré en silence.
- [ ] A4 `testCommand` = `make test`, qui ne tourne que dans la revue (le run l'enregistre seulement) ; la batterie rapide reste sans e2e.
- [ ] A5 pytest-xdist absent : ne l'ajoute pas au projet de lui-même (c'est un changement de ses dépendances) ; un sous-ensemble plus petit qui tient en deux à trois minutes, dit en une ligne de la demande de go puisqu'il change ce qui est testé ; au plus une recommandation simple pour xdist, sans bloquer le go.
- [ ] A6 Aucune question technique à Arthur sur les tests (c'est le comment) ; le message reste en français simple.

## Erreurs typiques
- Garder `make prepush` en série (164 s) sans l'avoir chronométrée.
- Croire que la batterie tourne dans chaque copie ou à chaque fusion, et la régler pour cela (`-n 4` « pour laisser de la place aux copies »).
- Ajouter pytest-xdist au pyproject sans son accord.
- Retirer ou marquer en « skip » les tests qui échouent en parallèle.
- Demander à Arthur quelle commande de test utiliser.

## Repères dans le SKILL 1.13.0
L86, L244, L262, L272-274, L284, L307.
