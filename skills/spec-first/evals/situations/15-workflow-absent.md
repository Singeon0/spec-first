# 15 — Outil Workflow absent : repli sur l'outil Agent

Source : Cas générique (session sans l'outil Workflow)
Décisions en jeu : D1, D3, D4, D8, D10, R5 (voir decisions.md)

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
- [ ] A1 Repli sur l'outil Agent avec les mêmes rôles et les mêmes règles ; pas d'arrêt, pas de question à Arthur, aucun critique ni contrôle supprimé « parce que c'est le repli ».
- [ ] A2 Chaque appel Agent a un modèle Opus et un effort explicites (ou un profil opus-medium, opus-high, opus-xhigh) : développeurs medium puis high puis xhigh après chaque rejet ; critiques, fusion et contrôle léger en high ; contrôle strict en xhigh. Jamais sonnet, haiku, fable, max, ni un profil haiku-* ou general-purpose.
- [ ] A3 Trois critiques indépendants par critère (testeur, avocat du propriétaire, mainteneur), lancés dans un même message ; après un rejet, seuls ceux qui ont rejeté rejugent ; le développeur trie les rejets avant de recommencer.
- [ ] A4 Une copie par groupe dans .spec-first/copies (worktree git), jamais dans la copie de travail d'Arthur ; si l'isolation « worktree » de l'outil Agent est utilisée, la réponse dit où elle écrit et pourquoi c'est acceptable.
- [ ] A5 Vagues : le critère 1 (socle) d'abord, puis 2 à 5 en parallèle depuis la branche intégrée ; chaque groupe validé est fusionné par un agent Opus high dans une copie d'intégration.
- [ ] A6 Contrôle léger à la fin du run ; contrôle strict une fois pour la spec, juges xhigh, panel élargi (testeur, propriétaire, mainteneur, intégrateur, sécurité), suite complète une seule fois.
- [ ] A7 L'orchestrateur attend les notifications de fin des agents : pas de sleep en boucle, aucun agent qui attend un autre agent.
- [ ] A8 Une ligne de lancement à Arthur en termes de critères, sans détail technique.

## Erreurs typiques
- ⛔ L'orchestrateur qui écrit le code lui-même.
- Un agent sans modèle ni effort explicites, ou en Sonnet, Haiku, Fable, Opus max.
- Un seul agent pour les 5 critères, qui se juge lui-même.
- Un seul critique, ou pas de contrôle strict.
- Demander à Arthur d'installer ou d'activer l'outil Workflow.

## Repères dans le SKILL 1.7.0
L188, L196, L200-207, L209, L224-231, L291.
