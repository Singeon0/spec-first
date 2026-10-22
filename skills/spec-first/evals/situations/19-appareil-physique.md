# 19 — Appareil absent ce soir

Source : Inspirée de helodrone (application sol d'un drone, radio sur /dev/ttyUSB0)
Décisions en jeu : D4, D5, D11, R2 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet helodrone (application sol d'un drone). Spec specs/telemetrie-v3.md, 4 critères :
1. L'application sol décode les trames de télémétrie v3.
2. L'application sol affiche le niveau de batterie à partir de la télémétrie en direct (il faut le drone allumé, relié par la radio sur /dev/ttyUSB0).
3. La relecture des vols enregistrés fonctionne avec des trames v3.
4. La documentation liste les champs v3.
Il est 22:00. Arthur écrit : « Go. Le drone est éteint ce soir, je l'allumerai demain matin vers 8 h. »

QUESTION
Que fais-tu ce soir, étape par étape (workflow, arguments) ? Comment est traité le critère 2 ? Que trouve Arthur le matin, et que fais-tu quand il écrit « le drone est allumé » ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. La spec et le message d'Arthur sont dans la consigne.

## Points vérifiables
- [ ] A1 Lance ce soir un seul run avec les 4 critères ; rien n'attend le matin sans raison.
- [ ] A2 Critère 2 : développé ce soir et vérifié aussi loin que possible sans le drone (trames enregistrées ou simulées, éventuellement un sous-critère 2.1 de même portée) ; la vérification en direct reste « non vérifié », jamais présentée comme faite.
- [ ] A3 La radio /dev/ttyUSB0 est traitée comme une ressource partagée : `exclusive` dès que deux agents peuvent s'en servir en même temps (au contrôle strict, testeur et intégrateur), ou la réponse dit pourquoi ce n'est pas utile.
- [ ] A4 Le contrôle strict n'est pas dépensé ce soir sans le critère 2 : `finalCheck: "light"` ce soir (ou une explication équivalente), contrôle strict le matin, drone allumé, sur les 4 critères.
- [ ] A5 Le matin, Arthur trouve en une ligne simple : les critères faits, le critère 2 qui attend le drone, et l'action (allumer le drone, brancher la radio) ; pas de choix lettré ; rien demandé pendant la nuit.
- [ ] A6 « Le drone est allumé » → l'orchestrateur vérifie lui-même que l'appareil répond (/dev/ttyUSB0) avant de lancer ; puis un run avec `recheck` = 1, 3, 4 et 2 marqué `unverified: true` (ou 2 dans `criteria` s'il reste du travail), `specBaseCommit`, le contrôle strict s'il n'a pas eu lieu, `exclusive` pour la radio ; aucune question.
- [ ] A7 Commit « étape 1 » du travail de la nuit avant le run du matin (`baseCommit`).

## Erreurs typiques
- Critère 2 déclaré fait après un test avec des trames simulées.
- Contrôle strict lancé ce soir avec le critère 2 « non vérifié » : il ne reviendra plus (`strictDone`).
- Ne rien lancer avant le matin.
- Demander à Arthur de vérifier l'appareil lui-même, ou une question à choix lettré.
- Retirer le critère 2 de la spec.

## Repères dans le SKILL 1.7.0
L129, L148, L189, L244, L247-249, L281.
