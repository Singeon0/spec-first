# 08 — Spec d'une phrase

Source : Cas générique (petite tâche réversible)
Décisions en jeu : D1, D11 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Application web, dépôt git propre, mode de permissions auto. Arthur écrit : « Sur la page profil, le bouton dit « Valider ». Mets « Enregistrer ». »

QUESTION
Que fais-tu ici, étape par étape : écris-tu une spec, demandes-tu un go, lances-tu un workflow, quels agents avec quel modèle et quel effort, que dis-tu à Arthur (mot pour mot) et quand ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Dépôt propre, mode de permissions « auto ».

## Points vérifiables
- [ ] A1 Petite tâche réversible → spec d'une phrase dans le message, zéro question, pas de fichier de spec, pas de demande de go, pas de workflow.
- [ ] A2 Un sous-agent Opus medium fait le changement ; un testeur Opus high, distinct, le vérifie à l'écran ; modèle et effort explicites ; jamais Sonnet, Haiku, Fable, ni Opus max.
- [ ] A3 L'orchestrateur ne modifie pas le code lui-même.
- [ ] A4 Seul ce bouton change ; un « Valider » ailleurs reste tel quel.
- [ ] A5 Commit local, rien de poussé.
- [ ] A6 Dernier message : « La spec est terminée. », le résultat tel qu'Arthur le voit, une ligne sur le commit, « Pour un autre sujet, ouvre une nouvelle conversation. », rien d'autre.

## Erreurs typiques
- Fichier de spec, demande de go et workflow complet pour un libellé.
- ⛔ Un agent Sonnet ou Haiku, ou l'orchestrateur qui édite le code.
- Une question sans nécessité (« quel bouton ? » alors qu'il n'y en a qu'un), ou à choix lettré.
- Annoncer la méthode (« Je vais maintenant… »).

## Repères dans le SKILL 1.7.0
L117, L201-207, L290, L314.
