# 28 — Tests pendant le développement

Source : Run QualiSpectra sprint 6 sur kipp (wf_7fd7a879, 11/2026) : le développeur du groupe 7 a lancé `make test-unit` (≈ 1 min) 47 fois pendant 38 min, et des attentes `sleep N && …` refusées par l'outil ont coûté des tours
Décisions en jeu : D22, R5, R10 (voir decisions.md)
Modifié le 26/11/2026 (1.13.0, D20–D26) : la batterie rapide ne tourne plus avant chaque commit d'un développeur mais une fois, en fin de run (A3 inversé) ; les e2e d'un critère passent par `heavy` et la commande suite (A5) (D22, R10 modifiée) ; A1, A4 reformulés ; la consigne ne nomme plus de profil.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet QualiSpectra, dépôt /home/alo/GitHub/pyplet/apps/QualiSpectra (git, propre). Le CLAUDE.md du dépôt dit : « Tests : make test (6 min, unitaires + e2e navigateur), tests rapides : make test-unit (40 s). Les e2e se lancent avec make test-e2e (5 min). »
Spec specs/curseurs.md, 8 critères ; les critères 3 et 6 touchent l'interface et ont des tests e2e. Arthur écrit : « Go. »

QUESTION
Quels arguments de tests donnes-tu aux workflows (quickTestCommand, testCommand, heavy), et pourquoi ? Pendant le run, quand un développeur lance-t-il des tests, lesquels, et comment attend-il un test e2e de 5 min ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le CLAUDE.md du dépôt est cité dans la consigne.

## Points vérifiables
- [ ] A1 `quickTestCommand` = `make test-unit` (le sous-ensemble rapide, sans e2e), une fois en fin de run ; `testCommand` = `make test` (la suite complète), au run qui l'enregistre et à la revue où elle tourne.
- [ ] A2 Pendant qu'il travaille, un développeur ne lance que les tests de ce qu'il touche (un fichier, un test).
- [ ] A3 Un développeur ne lance jamais `quickTestCommand` (ni en boucle, ni avant son commit) : elle tourne une fois, en fin de run, sur la branche intégrée, par la commande suite.
- [ ] A4 La suite complète ne tourne pas pendant le run : seulement dans la revue de toute la spec, par la commande suite.
- [ ] A5 Les e2e des critères 3 et 6 : `heavy` (par exemple `{"3": "make test-e2e", "6": "make test-e2e"}`, ou la partie qui les concerne), lancés une fois par leur développeur, à son dernier commit, par la commande suite ; attente bornée (l'attente de la commande suite, ou `timeout 300 bash -c 'until …; do sleep 10; done'` répétée) ; jamais `sleep N && …`, jamais `pgrep -f`.
- [ ] A6 Aucune question à Arthur (c'est le comment).

## Erreurs typiques
- `make test-unit` relancé après chaque modification (le cas réel : 47 fois en 38 min).
- `quickTestCommand` = `make test` (les e2e dans le contrôle rapide).
- `sleep 60 && tail log` : refusé par l'outil, le tour est perdu.
- Lancer `make test` ou `make test-unit` « pour être sûr » avant chaque commit.
- Les e2e mis dans `quickTestCommand`.

## Repères dans le SKILL 1.13.0
L162, L262, L266-268, L284-285, L307.
