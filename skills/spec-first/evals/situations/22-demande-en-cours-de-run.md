# 22 — Demande d'Arthur en cours de run

Source : Inspirée du run QualiSpectra (critiques qui relançaient toute la suite e2e)
Décisions en jeu : D11, D21, D22, D23, D26, R1 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : la consigne ne passe plus `testCommand` au run (ce n'est plus un argument du run) et dit que les critiques lancent la suite complète ; A3 et une erreur typique : la suite complète tourne dans la revue.
Modifié le 26/11/2026 (1.13.0, D20–D26) : réécrite en partie : plus de critiques pendant le run, la suite trop longue est la batterie de fin de run (D21, D22) ; A4 : arrêt annoncé en une ligne, relance avec les mêmes args et le même `baseCommit`, plus de `resumeFromRunId` (D23, D26) ; A1, A3 reformulés.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Un run spec-first:run tourne en arrière-plan depuis 40 min (runId wf_3d4e5f) pour specs/plugins-cdn.md, 5 critères, lancé avec quickTestCommand "uv run pytest" : toute la suite du projet, suite de bout en bout de 20 min comprise ; elle tournera en fin de run, et de nouveau après chaque réparation si elle est rouge. 2 critères sont développés et intégrés, 3 groupes travaillent.
Arthur écrit : « Où on en est ? Au passage, ajoute aussi un mode hors-ligne pour le CDN. Et ne lance pas toute la suite e2e à la fin du développement, c'est trop long : la revue s'en charge. »

QUESTION
Que réponds-tu (mot pour mot) et que fais-tu, étape par étape (outils, workflow, arguments) ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. L'état du run et le message d'Arthur sont dans la consigne.

## Points vérifiables
- [ ] A1 Répond à « où on en est » en une ligne, en termes de critères (2 sur 5 développés et intégrés, le reste en cours).
- [ ] A2 Le mode hors-ligne sort de la spec : pas ajouté au run en cours ; brouillon de deuxième spec (« Brouillon — pas encore de go »), ou nouveau critère seulement après son oui explicite sur le texte ; dit en une ligne, sans options.
- [ ] A3 Les tests : choix technique, demande claire → aucune question ; l'orchestrateur choisit lui-même le sous-ensemble rapide (sans la suite e2e, repérée dans le projet) comme `quickTestCommand` ; la suite complète reste pour la revue, une fois (`testCommand` = `uv run pytest`).
- [ ] A4 L'applique au run en cours, puisqu'il lancerait les mauvais tests : une ligne qui dit ce qui sera refait (les 2 critères intégrés gardés, le travail en cours repris), `TaskStop`, puis relance avec les mêmes args et le même `baseCommit`, `quickTestCommand` changé (le run saute les 2 intégrés) ; jamais `resumeFromRunId`, jamais deux runs à la fois.
- [ ] A5 Réponse courte, en français simple, sans jargon (ni `quickTestCommand`, ni `TaskStop`).
- [ ] A6 Rien d'autre ne change dans le run (périmètre, critères).

## Erreurs typiques
- Ajouter le mode hors-ligne au run ou à la spec sans son oui.
- Demander quels tests sont rapides.
- Lancer un deuxième run à côté du premier.
- Arrêter le run sans dire ce qui sera refait, ou le reprendre par `resumeFromRunId`.
- Retirer des tests, ou sauter la suite complète dans la revue.
- Longue explication technique à Arthur.

## Repères dans le SKILL 1.13.0
L69, L156, L203, L224, L274, L278, L284, L290, L327, L340, L387-388.
