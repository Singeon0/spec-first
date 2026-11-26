# 03 — Reprise après /compact, identifiant de run perdu

Source : Inspirée des reprises impossibles d'un run arrêté (QualiSpectra)
Décisions en jeu : D11, D21, D23, R1, R9 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : A6 : `specBaseCommit` remplacé par le `baseCommit` 7a7b7c7 de la revue ; `testCommand` va à la revue.
Modifié le 26/11/2026 (1.13.0, D20–D26) : réécrite en partie : un run interrompu se relance avec les mêmes args et le même `baseCommit`, jamais par `resumeFromRunId` ; l'inventaire du run lit dans git, par identifiant de critère, ce qui est intégré (D23). A3, A4 inversés ; A1, A5, A6, A9 reformulés.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
La session vient d'être compactée (/compact). Le résumé dit : « Run spec-first:run lancé à 14:02 en arrière-plan pour specs/import-v2.md (projectRoot /home/alo/GitHub/pyplet, baseCommit 7a7b7c7, 8 critères d'ids 1, 2, 2.1, 2.2, 3, 4, 5, 6 ; groups non fournis ; dependsOn {"2.1": ["2"], "2.2": ["2"]} ; quickTestCommand "uv run pytest -m 'not e2e' -q" ; testCommand "uv run pytest" ; setupCommand "uv sync"). » Le runId n'apparaît pas dans le résumé.
Il est 16:30. Aucune notification de fin de workflow n'est arrivée. Le panneau des tâches ne montre plus de workflow en cours (la session a été relancée entre-temps).
Tu sais (sans l'avoir encore vérifié) que :
- la branche spec-first-import-v2--integration existe ;
- son journal contiendrait trois fusions : « Merge branch 'spec-first-import-v2--g1-Qx81Lm' », « Merge branch 'spec-first-import-v2--g2-Pp02Aa' », « Merge branch 'spec-first-import-v2--g5-Tt55Rr' », dont les messages finissent par « Spec-First-Validated: 1 », « Spec-First-Validated: 2 » et « Spec-First-Validated: 3 » ;
- il reste des copies dans .spec-first/copies/ (import-v2--g3-…, import-v2--g4-…), avec des commits jamais fusionnés.
Arthur écrit : « Où en est le run ? »

QUESTION
Que fais-tu ici, étape par étape : ce que tu réponds à Arthur, quel workflow tu lances, avec quels arguments (lesquels changent par rapport au premier lancement, et pourquoi), dans quel ordre ? Et si l'appel revient avec {error} ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Ce que montreraient git et le dossier des copies est donné dans la consigne.

## Points vérifiables
- [ ] A1 Première ligne à Arthur : ce qui est acquis et ce qui reste, en critères (sur 8) — 3 critères développés et intégrés (1, 2, 3, lus dans git, ou « à vérifier dans git » avant de le dire), les autres repris.
- [ ] A2 Vérifie qu'aucun run ne tourne encore avant d'en relancer un (jamais deux runs sur le même dépôt).
- [ ] A3 Ne cherche pas l'identifiant du run pour `resumeFromRunId` : un run interrompu ne se reprend jamais ainsi ; il est relancé tout de suite avec les mêmes args et le même `baseCommit` 7a7b7c7, sans `integrationBranch` (le run retrouve spec-first-import-v2--integration tout seul), sans commit « étape N » ni squash avant.
- [ ] A4 `criteria` = les 8 critères, comme au premier lancement, même `dependsOn` ; pas de `recheck` : l'inventaire du run lit dans git les critères intégrés (1, 2, 3) et les saute. S'il cite lui-même ce qui est intégré, il le lit par identifiant de critère (les lignes Spec-First-Validated), jamais d'après les noms de groupes (g5 n'est pas le critère 5).
- [ ] A5 Les critères 1, 2, 3 ne sont pas présentés comme validés : « non vérifié » (vérifiés par leur développeur seulement) ; la revue jugera les 8.
- [ ] A6 Mêmes autres args (`quickTestCommand`, `testCommand`, `setupCommand`, `dependsOn`) ; la revue qui suit reçoit `baseCommit` 7a7b7c7.
- [ ] A7 Aucune question ; relance dans le même tour.
- [ ] A8 `{error}` → corrige l'argument nommé et relance dans le même tour, sans question.
- [ ] A9 Les copies orphelines g3/g4 ne sont pas supprimées maintenant (la relance refait le travail jamais fusionné ; le nettoyage de fin s'en charge).

## Erreurs typiques
- Demander à Arthur s'il faut relancer, ou repartir de zéro (nouveau `baseCommit` : le travail fusionné est refait).
- `resumeFromRunId` pour reprendre le run, avec un runId retrouvé ou inventé.
- Construire `criteria` et `recheck` à la main d'après les noms de groupes (g5 → critère 5).
- Supprimer la branche d'intégration ou les copies.

## Repères dans le SKILL 1.13.0
L28, L156, L161, L164, L267, L281, L295, L299, L305, L327, L338, L340, L347-348.
