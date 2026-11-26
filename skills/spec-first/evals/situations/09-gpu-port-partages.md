# 09 — Carte graphique et port partagés

Source : Inspirée de helodrone et du DGX (entraînement, serveur sur un port imposé)
Décisions en jeu : D5, D21, D22, D24, R5 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : A3 : la suite complète tourne dans la revue.
Modifié le 26/11/2026 (1.13.0, D20–D26) : consigne et A4 : plus de critique pendant le run ; la carte est demandée par un autre développeur, le testeur du socle ou un testeur de la revue (D21, D24) ; A3 : la batterie rapide une fois en fin de run, la suite complète seulement dans la revue (D22).

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet d'apprentissage automatique sur un DGX : /home/alo/GitHub/helodrone-training (git, propre). Spec specs/augmentations.md, 6 critères :
1. Une augmentation « brouillard » existe dans le pipeline.
2. Une augmentation « pluie » existe dans le pipeline.
3. Un entraînement avec ces augmentations atteint mAP ≥ 0,61 sur le jeu de test figé (entraînement : 40 min sur l'unique carte graphique).
4. Le serveur d'inférence répond en moins de 80 ms (il écoute sur le port 8080, imposé par le tableau de bord).
5. Le tableau de bord affiche l'augmentation utilisée (il faut le serveur sur le port 8080).
6. Le rapport d'entraînement liste les augmentations.
Tests complets : `uv run pytest` (25 min, dont des tests sur carte graphique et des tests de bout en bout). Tests rapides : `uv run pytest -m "not gpu and not e2e"` (40 s).
Arthur écrit : « Go. »

QUESTION
Que fais-tu ici, étape par étape : quel workflow, avec quels arguments (groups, dependsOn, exclusive, maxGroups, tests), dans quel ordre ? Que se passe-t-il quand un autre agent (un développeur, le testeur du socle, un testeur de la revue) a besoin de la carte graphique pendant qu'un développeur l'utilise ? Et si l'entraînement prend 3 h au lieu de 40 min ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Les durées des tests et de l'entraînement sont dans la consigne.

## Points vérifiables
- [ ] A1 Un groupe par critère ; `dependsOn` plausible (3 dépend de 1 et 2 ; 5 dépend de 4 ; 6 dépend de ce qu'il liste) ; un seul run, en vagues.
- [ ] A2 `exclusive` : la carte graphique pour les critères qui l'utilisent (au moins 3), le port 8080 pour 4 et 5.
- [ ] A3 `quickTestCommand` = les tests rapides, une fois en fin de run ; `testCommand` (25 min) seulement dans la revue (le run l'enregistre seulement) ; un développeur ne lance que les tests de ce qu'il touche.
- [ ] A4 Un agent qui a besoin de la carte pendant qu'un autre l'utilise : le run (ou la revue) la prête à un seul agent à la fois ; aucun agent n'attend dans un shell ; ce n'est ni un échec ni une question.
- [ ] A5 Entraînement de 3 h : pas une attente externe ; le développeur le lance en arrière-plan avec des attentes bornées ; le chien de garde ne tue pas un agent dont le journal d'entraînement avance.
- [ ] A6 Le testeur mesure le modèle produit et vérifie sa provenance au lieu de réentraîner (sauf preuve douteuse).
- [ ] A7 Messages en critères, sur 6 ; une durée annoncée est étiquetée « estimé » ou « mesuré ».

## Erreurs typiques
- `maxGroups: 1` pour tout le run (le parallélisme disparaît alors que `exclusive` suffit).
- Pas d'`exclusive` : deux entraînements ou deux serveurs en même temps.
- La suite de 25 min lancée par les développeurs, à une fusion ou en fin de run.
- `TaskStop` sur un entraînement long qui avance.
- Le testeur qui réentraîne par défaut (le coût de chaque tour double).

## Repères dans le SKILL 1.13.0
L162-163, L204, L259, L262, L277, L284, L289, L291-292, L307.
