# 03 — Reprise après /compact, identifiant de run perdu

Source : Inspirée des reprises impossibles d'un run arrêté (QualiSpectra)
Décisions en jeu : D11, R1 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
La session vient d'être compactée (/compact). Le résumé dit : « Run spec-first:run lancé à 14:02 en arrière-plan pour specs/import-v2.md (projectRoot /home/alo/GitHub/pyplet, baseCommit 7a7b7c7, 8 critères d'ids 1, 2, 2.1, 2.2, 3, 4, 5, 6 ; groups non fournis ; dependsOn {"2.1": ["2"], "2.2": ["2"]} ; quickTestCommand "uv run pytest -m 'not e2e' -q" ; testCommand "uv run pytest" ; setupCommand "uv sync"). » Le runId n'apparaît pas dans le résumé.
Il est 16:30. Aucune notification de fin de workflow n'est arrivée. Le panneau des tâches ne montre plus de workflow en cours (la session a été relancée entre-temps).
Tu sais (sans l'avoir encore vérifié) que :
- git branch --list 'spec-first-import-v2--integration-*' montrerait spec-first-import-v2--integration-k3J9qa ;
- son journal contiendrait trois fusions : « Merge branch 'spec-first-import-v2--g1-Qx81Lm' », « Merge branch 'spec-first-import-v2--g2-Pp02Aa' », « Merge branch 'spec-first-import-v2--g5-Tt55Rr' » ;
- il reste des copies dans .spec-first/copies/ (import-v2--g3-…, import-v2--g4-…).
Arthur écrit : « Où en est le run ? »

QUESTION
Que fais-tu ici, étape par étape : ce que tu réponds à Arthur, quel workflow tu lances, avec quels arguments (lesquels vont dans criteria, lesquels dans recheck, et pourquoi), dans quel ordre ? Et si l'appel revient avec {error} ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Ce que montreraient git et le dossier des copies est donné dans la consigne.

## Points vérifiables
- [ ] A1 Première ligne à Arthur : ce qui est acquis et ce qui reste, en critères (sur 8).
- [ ] A2 Vérifie qu'aucun run ne tourne encore avant d'en relancer un (jamais deux runs sur le même dépôt).
- [ ] A3 Cherche d'abord l'identifiant du run (journal des workflows de la session) ; introuvable → nouveau run avec `integrationBranch` = `spec-first-import-v2--integration-k3J9qa`.
- [ ] A4 Retrouve les critères des groupes fusionnés : un groupe par critère dans l'ordre de la spec, réordonné par `dependsOn` → g1 → 1, g2 → 2, g5 → 3. `recheck` = 1, 2, 3 ; `criteria` = 2.1, 2.2, 4, 5, 6. (Lire g5 comme « critère 5 » est une erreur.)
- [ ] A5 En cas de doute sur cette correspondance : les critères douteux vont dans `recheck` avec `unverified: true` (jugés en entier), ou dans `criteria` — jamais validés « par non-régression » sans preuve.
- [ ] A6 Mêmes autres args (`testCommand`, `quickTestCommand`, `setupCommand`, `dependsOn`), `baseCommit` relevé juste avant l'appel, `specBaseCommit` 7a7b7c7.
- [ ] A7 Aucune question ; relance dans le même tour.
- [ ] A8 `{error}` → corrige l'argument nommé et relance dans le même tour, sans question.
- [ ] A9 Les copies orphelines g3/g4 ne sont pas supprimées maintenant (le nettoyage de fin s'en charge).

## Erreurs typiques
- Demander à Arthur s'il faut relancer, ou repartir de zéro (travail fusionné perdu).
- g5 → critère 5.
- Inventer un runId pour `resumeFromRunId`.
- Supprimer la branche d'intégration ou les copies.

## Repères dans le SKILL 1.7.0
L28, L142, L253, L262, L277.
