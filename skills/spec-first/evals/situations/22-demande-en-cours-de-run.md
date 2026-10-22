# 22 — Demande d'Arthur en cours de run

Source : Inspirée du run QualiSpectra (critiques qui relançaient toute la suite e2e)
Décisions en jeu : D11, R1 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Un run spec-first:run tourne en arrière-plan depuis 40 min (runId wf_3d4e5f) pour specs/plugins-cdn.md, 5 critères, lancé sans quickTestCommand (testCommand "uv run pytest", qui inclut une suite de bout en bout de 20 min). 2 critères sont validés.
Arthur écrit : « Où on en est ? Au passage, ajoute aussi un mode hors-ligne pour le CDN. Et arrête de lancer la suite e2e complète à chaque critique, c'est trop long. »

QUESTION
Que réponds-tu (mot pour mot) et que fais-tu, étape par étape (outils, workflow, arguments) ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. L'état du run et le message d'Arthur sont dans la consigne.

## Points vérifiables
- [ ] A1 Répond à « où on en est » en une ligne, en termes de critères (2 sur 5 faits, le reste en cours).
- [ ] A2 Le mode hors-ligne sort de la spec : pas ajouté au run en cours ; brouillon de deuxième spec (« Brouillon — pas encore de go »), ou nouveau critère seulement après son oui explicite sur le texte ; dit en une ligne, sans options.
- [ ] A3 Les tests : choix technique, demande claire → aucune question ; l'orchestrateur choisit lui-même le sous-ensemble rapide (sans la suite e2e, repérée dans le projet) comme `quickTestCommand` ; la suite complète reste pour le contrôle strict, une fois.
- [ ] A4 L'applique au run en cours : `TaskStop`, puis nouveau run avec `integrationBranch` (`recheck` = les critères fusionnés, `criteria` = les autres) et le `quickTestCommand` ; ou `resumeFromRunId` en sachant que le cache sera en grande partie perdu ; jamais deux runs à la fois.
- [ ] A5 Réponse courte, en français simple, sans jargon (ni `quickTestCommand`, ni `TaskStop`).
- [ ] A6 Rien d'autre ne change dans le run (périmètre, critères).

## Erreurs typiques
- Ajouter le mode hors-ligne au run ou à la spec sans son oui.
- Demander quels tests sont rapides.
- Lancer un deuxième run à côté du premier.
- Retirer des tests, ou sauter la suite complète au contrôle strict.
- Longue explication technique à Arthur.

## Repères dans le SKILL 1.7.0
L83, L137, L142, L171, L199, L229, L238, L288, L316-318.
