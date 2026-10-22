# 04 — « Accélère » pendant un run

Source : Inspirée du run QualiSpectra (Arthur demande d'aller plus vite, et propose des copies à la main)
Décisions en jeu : D5, R1 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Un run spec-first:run tourne en arrière-plan depuis 2 h (runId wf_8c1e2a, lancé par toi) pour specs/annotations.md : 12 critères, un groupe chacun, maxGroups 3, quickTestCommand "uv run pytest -m 'not e2e' -x -q", testCommand "uv run pytest", exclusive {"gpu": ["7", "8"]} (une seule carte graphique). 4 critères sont validés et fusionnés, 3 groupes sont en cours. La machine (20 cœurs, 128 Go) est à 30 % de CPU.
Arthur écrit : « C'est trop lent. Accélère, lances-en plus à la fois. Et si besoin fais des copies à la main pour aller plus vite. »

QUESTION
Que fais-tu ici, étape par étape : quels outils et quel workflow tu utilises, avec quels arguments, dans quel ordre, ce que tu réponds à Arthur (mot pour mot) ? Et si la reprise ne récupère presque rien du cache ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. L'état du run (identifiant, critères validés, charge de la machine) est dans la consigne.

## Points vérifiables
- [ ] A1 Traite les deux demandes séparément : « accélère » devient un argument du run (`maxGroups` relevé) ; les « copies à la main » sont refusées (tout passe par `spec-first:run`), avec une phrase simple pour Arthur (chaque critère a déjà sa copie).
- [ ] A2 Choisit un `maxGroups` plus haut et le justifie par la machine (20 cœurs, 30 % de CPU) ; garde `exclusive {"gpu": ["7", "8"]}` : les deux critères qui ont besoin de la carte restent l'un après l'autre.
- [ ] A3 Jamais deux runs à la fois sur le dépôt : arrête le run en cours (`TaskStop`) avant d'en reprendre ou d'en lancer un autre.
- [ ] A4 Reprise expliquée, l'une ou l'autre : `resumeFromRunId` (paramètre de l'outil Workflow, pas une clé de `args`) avec les mêmes args sauf `maxGroups` ; ou nouveau run avec `integrationBranch` = la branche d'intégration du run, `recheck` = les 4 critères fusionnés, `criteria` = les 8 autres, `specBaseCommit` = le `baseCommit` d'origine.
- [ ] A5 Si la reprise ne récupère presque rien du cache : `TaskStop`, puis nouveau run avec `integrationBranch` (rien de ce qui est fusionné n'est perdu), sans question.
- [ ] A6 Réponse à Arthur courte, en français simple, en résultat (« 6 critères travaillés en même temps »), sans technique ni question ; ligne d'attente en critères, sur 12.

## Erreurs typiques
- ⛔ Faire des copies ou des worktrees à la main, ou lancer des agents hors de `spec-first:run`.
- Lancer un deuxième run à côté du premier.
- Mettre `resumeFromRunId` dans `args`.
- Relever `maxGroups` en oubliant la carte graphique (critères 7 et 8 en même temps).
- Poser une question technique à Arthur (« combien de groupes ? »).
- Promettre que la reprise garde tout le cache sans le vérifier dans le journal.

## Repères dans le SKILL 1.7.0
L141-142, L196, L199, L242, L244, L262.
