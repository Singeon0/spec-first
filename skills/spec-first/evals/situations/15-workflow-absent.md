# 15 — Outil Workflow absent : repli sur l'outil Agent

Source : Cas générique (session sans l'outil Workflow)
Décisions en jeu : D1, D4, D8, D10, D20, D21, D22, D24, R5 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : A2, A6 et une erreur typique : la revue (six relecteurs, deux testeurs en conditions réelles) remplace le contrôle strict.
Modifié le 26/11/2026 (1.13.0, D20–D26) : A2 : tout en Opus, high au minimum (D20) ; A3 : plus de trois critiques par critère, l'auto-contrôle du développeur fait foi et seul le socle a un testeur (D21) ; A6 : la batterie rapide en fin de run au lieu du contrôle léger, les testeurs de la revue en même temps (D21, D22, D24) ; A1 reformulé.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Dans cette session, l'outil Workflow n'existe pas : ToolSearch ne le trouve pas, et spec-first:run ne peut donc pas être lancé. L'outil Agent existe (paramètres : description, prompt, subagent_type, model parmi sonnet/opus/haiku/fable, effort parmi low/medium/high/xhigh/max, isolation « worktree »). Les profils de sous-agents disponibles incluent haiku-medium, haiku-high, opus-medium, opus-high, opus-xhigh, opus-max, general-purpose.
Spec specs/notifications.md, 5 critères : 1. un modèle de notification commun (« socle ») ; 2 à 5 : quatre types de notifications qui l'utilisent. Arthur a donné son go ; le dépôt est propre.

QUESTION
Comment fais-tu tourner cette spec, étape par étape : quels agents, avec quel modèle et quel effort pour chaque rôle, combien de critiques et comment, où sont les copies de travail, comment se font la fusion et les contrôles, qui attend quoi ? Que dis-tu à Arthur ?
```

## Contexte fourni
- Le préambule, avec une exception dite dans la consigne : l'outil Workflow n'existe pas. Les paramètres de l'outil Agent et les profils de sous-agents disponibles sont dans la consigne.

## Points vérifiables
- [ ] A1 Repli sur l'outil Agent avec les mêmes rôles et les mêmes règles ; pas d'arrêt, pas de question à Arthur ; ni le testeur du socle, ni la batterie rapide, ni la revue supprimés « parce que c'est le repli ».
- [ ] A2 Chaque appel Agent a un modèle Opus et un effort explicites (ou un profil opus-high, opus-xhigh) : développeurs high, puis xhigh après un rejet ou une vérification ratée ; fusion, batterie rapide et testeur du socle en high ; relecteurs et testeurs de la revue en xhigh. Jamais sonnet, haiku, fable, max, ni un effort medium ou un profil opus-medium, haiku-* ou general-purpose.
- [ ] A3 Pas de critiques par critère : chaque développeur vérifie ses critères lui-même et cite la commande lancée et sa sortie ; seul le socle (le critère 1, dont 2 à 5 dépendent) passe un testeur distinct (Opus high) avant sa fusion ; rejeté → un tour de plus en xhigh, puis le testeur de nouveau ; le développeur trie les rejets avant de recommencer.
- [ ] A4 Une copie par groupe dans .spec-first/copies (worktree git), jamais dans la copie de travail d'Arthur ; si l'isolation « worktree » de l'outil Agent est utilisée, la réponse dit où elle écrit et pourquoi c'est acceptable.
- [ ] A5 Vagues : le critère 1 (socle) d'abord, puis 2 à 5 en parallèle depuis la branche intégrée ; chaque groupe validé est fusionné par un agent Opus high dans une copie d'intégration.
- [ ] A6 La batterie rapide une fois en fin de run, sur la branche intégrée, par la commande suite ; les critères restent « non vérifié » jusqu'à la revue ; la revue une fois pour la spec : six relecteurs (propriétaire, fiabilité, sécurité, performance, intégration et maintenance, usage) et deux testeurs en conditions réelles en même temps (jamais moins de deux), chacun sa fenêtre de navigateur, en xhigh ; doublons fusionnés, une réparation groupée rejugée par la source de chaque défaut ; la suite complète par la commande suite.
- [ ] A7 L'orchestrateur attend les notifications de fin des agents : pas de sleep en boucle, aucun agent qui attend un autre agent.
- [ ] A8 Une ligne de lancement à Arthur en termes de critères, sans détail technique.

## Erreurs typiques
- ⛔ L'orchestrateur qui écrit le code lui-même.
- Un agent sans modèle ni effort explicites, ou en Sonnet, Haiku, Fable, Opus max, ou en effort medium (opus-medium).
- Un seul agent pour les 5 critères, qui se juge lui-même.
- Trois critiques par critère (l'ancien panel), pas de testeur pour le socle, ou pas de revue.
- Demander à Arthur d'installer ou d'activer l'outil Workflow.

## Repères dans le SKILL 1.13.0
L156, L161, L210-211, L219, L226-230, L237-256, L259-260, L266-270, L361.
