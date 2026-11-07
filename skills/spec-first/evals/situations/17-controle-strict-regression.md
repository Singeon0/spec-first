# 17 — La revue trouve une faille de sécurité

Source : Cas générique (injection SQL trouvée par le relecteur sécurité)
Décisions en jeu : D2, D3, D4, D11, D15 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : réécrite. La faille est trouvée par la revue (spec-first:review), plus par le contrôle strict ; le critère est relancé avec le `rejectedBy` de son `relaunch`, puis la revue revient avec le `focus` du rapport, jamais en entier. Même intention : un seul panel complet par spec, le juge qui a refusé rejuge, la preuve arrive au développeur.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Spec specs/tableau.md, 8 critères. Le premier run (baseCommit 9f8e7d6) a validé 6 critères ; le deuxième run (relance des critères 3 et 6, recheck des 6 autres) a validé les 8. La revue (spec-first:review : six relecteurs et deux testeurs en conditions réelles, opus xhigh, sur toute la spec depuis 9f8e7d6) vient de revenir.
Le relecteur sécurité a prouvé une faille sur le critère 6 : « le filtre de recherche passe la saisie telle quelle dans la requête SQL : injection ». Les deux tours de réparation de la revue (high, puis xhigh) ont échoué. Rapport : pass false ; critère 6 « en échec », effortReached « xhigh », rejectedBy ["security"] ; les 7 autres « validé » ; relaunch = [{ id: "6", rejectedBy: { critics: ["maintainer"], proof: "[sécurité] injection SQL dans le filtre de recherche — saisie ' OR 1=1 -- : toutes les lignes reviennent" }, focus: [{ id: "6", reviewer: "security", finding: "injection SQL dans le filtre de recherche — saisie ' OR 1=1 -- : toutes les lignes reviennent" }] }] ; focus = [le même] ; result in « integration ».

QUESTION
Que fais-tu ensuite, étape par étape : quel(s) workflow(s), avec quels arguments ? Qui rejuge le critère 6, et quelle vérification de la spec vient après le run, et pourquoi ? Et si le critère 6 échoue encore ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport de la revue est résumé dans la consigne.

## Points vérifiables
- [ ] A1 Commit « étape 2 » (squash de la branche d'intégration : les 7 critères validés et les réparations de la revue) avant la relance ; il devient le `baseCommit`.
- [ ] A2 Un run : `criteria` = [6], `startEffort {"6": "xhigh"}`, `recheck` = les 7 autres, `rejectedBy` = celui de `relaunch` (`{"6": {critics, proof}}`, preuve comprise).
- [ ] A3 Le run se termine par son contrôle léger ; puis la revue avec le `focus` du rapport (même `baseCommit` 9f8e7d6, `workspace` et `branch` du nouveau run), pas le panel complet, parce que la revue a déjà eu lieu pour cette spec (une fois par spec) ; la réponse le dit.
- [ ] A4 Le critère 6 est rejugé par ceux qui l'ont refusé : dans le run, le critique qui en tient lieu (mainteneur) avec le testeur, et le développeur relancé reçoit la preuve de l'injection ; puis, dans la revue `focus`, le relecteur sécurité lui-même (xhigh) avec un rejeu en conditions réelles.
- [ ] A5 Pas de deuxième revue complète (six relecteurs, deux testeurs) pour un seul critère.
- [ ] A6 Échec encore : arrêt (tout le reste est fait), en français simple : le défaut (la recherche laisse passer du SQL), ce qui a été tenté, une recommandation, une question simple sans choix lettré ; le travail commité.
- [ ] A7 Aucune question avant ; une ligne d'avancement en termes de critères.

## Erreurs typiques
- Une deuxième revue complète pour un seul critère.
- Un `focus` oublié ou inventé (un relecteur qui n'a rien refusé), ou une revue `focus` dont le `baseCommit` n'est plus celui du premier run (elle ne voit plus toute la spec).
- `rejectedBy` ou sa preuve oubliés : le critère 6 rejugé par le panel ordinaire, et le développeur relancé ignore ce qui a été prouvé.
- Relancer plusieurs fois, ou demander à Arthur en cours de run.

## Repères dans le SKILL 1.9.0 (relaunch, rejectedBy, focus)
L137, L275, L285, L315, L320.

## Repères dans le SKILL 1.8.0 (strictDone, rejectedBy)

## Repères dans le SKILL 1.7.0
L226-227, L247-251, L284-287.
