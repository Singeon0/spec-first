# 17 — Le contrôle strict trouve une faille de sécurité

Source : Cas générique (injection SQL trouvée par le juge sécurité)
Décisions en jeu : D2, D3, D4, D11 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Spec specs/tableau.md, 8 critères. Le premier run (baseCommit 9f8e7d6) a validé 6 critères ; le deuxième run (relance des critères 3 et 6, recheck des 6 autres, specBaseCommit 9f8e7d6) vient de revenir. Comme tous les critères passaient, le contrôle strict a tourné : check = « contrôle strict de la spec (7 juges opus xhigh, panel complet) », strictCheck true.
Le contrôle strict a trouvé le critère 6 cassé (juge sécurité : « le filtre de recherche passe la saisie telle quelle dans la requête SQL : injection »). Trois essais de réparation ont échoué. Critère 6 : « en échec », effortReached « xhigh », defect « code », rejectedBy ["security"]. Les 7 autres : « validé ». result in « integration ».

QUESTION
Que fais-tu ensuite, étape par étape : quel workflow, avec quels arguments ? Quel contrôle termine le run suivant, et pourquoi ? Et si le critère 6 échoue encore ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport du deuxième run est résumé dans la consigne.

## Points vérifiables
- [ ] A1 Commit « étape 2 » (squash de la branche d'intégration, les 7 critères validés) avant la relance ; il devient le `baseCommit`.
- [ ] A2 Un run : `criteria` = [6], `startEffort {"6": "xhigh"}`, `recheck` = les 7 autres, `specBaseCommit` 9f8e7d6, `strictDone: true`.
- [ ] A3 Le run se termine par le contrôle léger, parce que le contrôle strict a déjà eu lieu pour cette spec (une fois par spec) ; la réponse le dit.
- [ ] A4 Voit le point faible : le juge sécurité qui a rejeté ne rejugera pas (ce sont les trois critiques du run qui rejugent, le mainteneur couvrant la sécurité) et le développeur relancé ne reçoit pas la preuve ; la réponse fait passer la preuve (l'injection) ou signale le manque. Elle n'affirme jamais que le juge sécurité rejuge.
- [ ] A5 Pas de deuxième contrôle strict complet pour un seul critère.
- [ ] A6 Échec encore : arrêt (tout le reste est fait), en français simple : le défaut (la recherche laisse passer du SQL), ce qui a été tenté, une recommandation, une question simple sans choix lettré ; le travail commité.
- [ ] A7 Aucune question avant ; une ligne d'avancement en termes de critères.

## Erreurs typiques
- `strictDone` oublié : un second contrôle strict complet (7 juges xhigh) pour un critère.
- `specBaseCommit` oublié (le contrôle ne voit plus toute la spec).
- Affirmer que le juge sécurité rejugera le critère 6.
- Relancer plusieurs fois, ou demander à Arthur en cours de run.

## Repères dans le SKILL 1.7.0
L226-227, L247-251, L284-287.
