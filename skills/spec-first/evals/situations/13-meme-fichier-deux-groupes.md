# 13 — Deux groupes qui touchent le même fichier

Source : Cas générique (application React, quatre critères dans src/ui/Toolbar.tsx)
Décisions en jeu : D5, D6, D11, R3 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Spec specs/barre-outils.md d'une application React, 4 critères :
1. La barre d'outils a un bouton « Exporter CSV ».
2. La barre d'outils a un bouton « Exporter PDF ».
3. Le raccourci Ctrl+E ouvre le menu d'export.
4. La barre affiche le nombre d'annotations sélectionnées.
Les quatre touchent le même fichier src/ui/Toolbar.tsx. Arthur écrit : « Go. »

QUESTION
Que fais-tu ici, étape par étape : quels groups, quel dependsOn, quels arguments ? Que se passe-t-il si la fusion du groupe 2 entre en conflit avec le groupe 1 dans Toolbar.tsx ? Et si une fusion échoue (critère « Non intégré ») ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. La spec et le go d'Arthur sont dans la consigne.

## Points vérifiables
- [ ] A1 Un groupe par critère (4 groupes) : un fichier partagé n'est pas une raison de regrouper ; deux critères ne partagent un groupe que si l'un ne peut pas être vérifié sans l'autre.
- [ ] A2 `dependsOn` seulement là où un critère s'appuie vraiment sur un autre (par exemple le raccourci Ctrl+E qui ouvre un menu créé par 1 et 2), jamais à cause du fichier partagé.
- [ ] A3 Un seul run ; `maxGroups` laissé par défaut ou justifié ; `baseCommit` relevé juste avant l'appel ; `quickTestCommand` pour les tests rapides.
- [ ] A4 Conflit du groupe 2 avec le groupe 1 : l'agent de fusion (Opus high) le résout en gardant les deux intentions ; le contrôle léger ajoute un intégrateur parce que des groupes ont été combinés ; ni arrêt ni question.
- [ ] A5 Les groupes qui démarrent après une fusion partent de la branche intégrée.
- [ ] A6 Fusion échouée (« Non intégré ») : la branche du groupe est gardée ; jamais de question ni d'options ; le reste continue ; ensuite, soit relance du critère depuis la branche intégrée (nouveau run avec `integrationBranch`, `recheck` = les critères intégrés), soit arrêt technique dit une fois avec sa cause et la seule action — sans demander à Arthur de fusionner à la main.
- [ ] A7 Message de lancement court, sans technique.

## Erreurs typiques
- Un seul groupe pour les 4 critères « parce qu'ils touchent le même fichier » (tout devient séquentiel).
- `dependsOn` en chaîne 1 → 2 → 3 → 4 pour éviter les conflits.
- Arrêter le run ou interroger Arthur sur un conflit de fusion.
- Supprimer la branche d'un groupe non intégré.
- Demander à Arthur de résoudre un conflit git.

## Repères dans le SKILL 1.7.0
L153, L228, L236, L243, L286 ; run.js : prompt de fusion (étape 3 : conflits résolus en gardant les deux intentions).
