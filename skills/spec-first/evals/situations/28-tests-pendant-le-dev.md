# 28 — Tests pendant le développement

Source : Run QualiSpectra sprint 6 sur kipp (wf_7fd7a879, 11/2026) : le développeur du groupe 7 a lancé `make test-unit` (≈ 1 min) 47 fois pendant 38 min, et des attentes `sleep N && …` refusées par l'outil ont coûté des tours
Décisions en jeu : R5, R10 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet QualiSpectra, dépôt /home/alo/GitHub/pyplet/apps/QualiSpectra (git, propre). Le CLAUDE.md du dépôt dit : « Tests : make test (6 min, unitaires + e2e navigateur), tests rapides : make test-unit (40 s). Les e2e se lancent avec make test-e2e (5 min). »
Spec specs/curseurs.md, 8 critères ; les critères 3 et 6 touchent l'interface et ont des tests e2e. Profil standard. Arthur écrit : « Go. »

QUESTION
Quels arguments de tests donnes-tu aux workflows (quickTestCommand au développement, testCommand à la revue), et pourquoi ? Pendant le run, quand un développeur lance-t-il des tests, lesquels, et comment attend-il un test e2e de 5 min ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le CLAUDE.md du dépôt est cité dans la consigne.

## Points vérifiables
- [ ] A1 `quickTestCommand` = `make test-unit` (le sous-ensemble rapide, sans e2e) pour le développement ; `testCommand` = `make test` (la suite complète) pour la revue.
- [ ] A2 Pendant qu'il travaille, un développeur ne lance que les tests de ce qu'il touche (un fichier, un test).
- [ ] A3 `quickTestCommand` une seule fois, juste avant son commit — jamais en boucle après chaque modification.
- [ ] A4 La suite complète ne tourne pas pendant le développement : seulement dans la revue de toute la spec ; le contrôle de fin passe `quickTestCommand`.
- [ ] A5 Un e2e de 5 min : en arrière-plan, sortie dans un fichier, attente par `timeout 300 bash -c 'until …; do sleep 10; done'` répétée au besoin ; jamais `sleep N && …`, jamais `pgrep -f`.
- [ ] A6 Aucune question à Arthur (c'est le comment).

## Erreurs typiques
- `make test-unit` relancé après chaque modification (le cas réel : 47 fois en 38 min).
- `quickTestCommand` = `make test` (les e2e dans le contrôle rapide).
- `sleep 60 && tail log` : refusé par l'outil, le tour est perdu.
- Lancer `make test` « pour être sûr » avant chaque commit.

## Repères dans le SKILL 1.10.0
Les lignes « a long command of your own » et « `quickTestCommand` » de la liste des arguments.
