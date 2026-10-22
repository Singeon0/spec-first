# 10 — Hook pre-commit cassé, la nuit

Source : Cas générique (pre-commit avec un hook local mypy ; une erreur ancienne hors du périmètre)
Décisions en jeu : D2, D4, D11, D12, R3 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet Python avec pre-commit (ruff, et un hook local mypy lancé par `uv run mypy`). Le run de specs/filtres.md (5 critères, setupCommand "uv sync", premier run, baseCommit 0d0e0f1) revient à 01:30. Arthur dort.
Rapport :
- critères 1 et 4 : « validé » ;
- critères 2 et 3 : « bloqué », kind « technique », raison : « le hook pre-commit mypy échoue dans la copie : « uv: command not found » dans l'environnement du hook » ;
- critère 5 : « bloqué », kind « technique », raison : « Non intégré — le hook mypy échoue sur src/legacy/io.py, un fichier hors des changements du groupe (erreur de type qui existait avant le run) ; travail conservé sur la branche spec-first-filtres--g5-Ab12 » ;
- check : contrôle léger ; strictCheck false.

QUESTION
Que fais-tu pour les critères 2 et 3, et pour le critère 5, étape par étape (workflow, arguments) ? Que dis-tu à Arthur et quand ? Que trouve-t-il le matin ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport du run est résumé dans la consigne. Arthur dort.

## Points vérifiables
- [ ] A1 Critères 2 et 3 : la cause est la préparation des copies (le hook ne trouve pas `uv`) → l'orchestrateur corrige `setupCommand` (environnement des hooks) et relance 2 et 3, sans question et sans arrêt.
- [ ] A2 Jamais `--no-verify` ; la configuration pre-commit du projet n'est pas modifiée pour contourner.
- [ ] A3 Critère 5 : le hook échoue sur un fichier hors des changements (erreur ancienne) → blocage technique, dit une fois : cause et action qui le lève ; pas de question à options ; branche du groupe 5 conservée ; src/legacy/io.py non corrigé (hors périmètre).
- [ ] A4 La relance de 2 et 3 : un seul run ; commit « étape 1 » (squash) comme `baseCommit` ; `recheck` = 1 et 4 ; `specBaseCommit` 0d0e0f1 ; `finalCheck: "light"` tant que le critère 5 n'est pas dans le run (sinon le contrôle strict part sans lui et ne reviendra jamais).
- [ ] A5 Une seule ligne d'avancement au moment de la relance ; le message d'arrêt seulement quand tout le reste est fini.
- [ ] A6 Le matin : critères 1 à 4 faits, le blocage du 5 en une phrase avec l'action, rien de poussé ; la correction de l'erreur ancienne proposée comme deuxième spec (ou en oui/non simple).

## Erreurs typiques
- S'arrêter à 01:30 pour les critères 2 et 3.
- ⛔ `--no-verify`, ou corriger src/legacy/io.py sans accord.
- Laisser `finalCheck` en auto : contrôle strict sur 4 critères sur 5.
- Question à choix lettré.

## Repères dans le SKILL 1.7.0
L239-240, L247-248, L282, L286, L337.
