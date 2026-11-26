# 17 — La revue trouve une faille de sécurité

Source : Cas générique (injection SQL trouvée par le relecteur sécurité)
Décisions en jeu : D2, D4, D11, D15, D17, D21, D23, D24 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : réécrite. La faille est trouvée par la revue (spec-first:review), plus par le contrôle strict ; le critère est relancé avec le `rejectedBy` de son `relaunch`, puis la revue revient avec le `focus` du rapport, jamais en entier. Même intention : un seul panel complet par spec, le juge qui a refusé rejuge, la preuve arrive au développeur.
Modifié le 26/11/2026 (1.13.0, D20–D26) : consigne : trois tours de réparation en xhigh (D17), testeurs en même temps (D24), `relaunch.rejectedBy` sans critiques ; A1, A2 : relance avec les mêmes args et le même `baseCommit`, sans commit « étape 2 » ni `recheck` (D23) ; A4 : pas de critique pendant le run, le développeur reçoit la preuve (D21) ; A3, A5 reformulés.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Spec specs/tableau.md, 8 critères. Le premier run (baseCommit 9f8e7d6) a développé et intégré 6 critères ; sa relance (mêmes args, même baseCommit) a développé et intégré les 2 autres (3 et 6). La revue (spec-first:review : six relecteurs et deux testeurs en conditions réelles en même temps, opus xhigh, sur toute la spec depuis 9f8e7d6) vient de revenir.
Le relecteur sécurité a prouvé une faille sur le critère 6 : « le filtre de recherche passe la saisie telle quelle dans la requête SQL : injection ». Les trois tours de réparation de la revue (xhigh) ont échoué. Rapport : pass false ; critère 6 « en échec », effortReached « xhigh », rejectedBy ["security"] ; les 7 autres « validé » ; relaunch = [{ id: "6", rejectedBy: { proof: "[sécurité] injection SQL dans le filtre de recherche — saisie ' OR 1=1 -- : toutes les lignes reviennent" }, focus: [{ id: "6", reviewer: "security", finding: "injection SQL dans le filtre de recherche — saisie ' OR 1=1 -- : toutes les lignes reviennent" }] }] ; focus = [le même] ; result in « integration », branche spec-first-tableau--integration.

QUESTION
Que fais-tu ensuite, étape par étape : quel(s) workflow(s), avec quels arguments ? Qui rejuge le critère 6, et quelle vérification de la spec vient après le run, et pourquoi ? Et si le critère 6 échoue encore ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport de la revue est résumé dans la consigne.

## Points vérifiables
- [ ] A1 Aucun commit « étape 2 » ni squash avant la relance : ce qui est passé, réparations de la revue comprises, est sur la branche d'intégration ; la relance garde le `baseCommit` 9f8e7d6.
- [ ] A2 Un run, avec les mêmes args que les précédents (les 8 critères, même `baseCommit`) : il saute les 7 intégrés et refait le 6 ; `startEffort {"6": "xhigh"}`, `rejectedBy` = celui de `relaunch` tel quel (`{"6": {proof}}`, preuve comprise) ; pas de `recheck`.
- [ ] A3 Le run se termine par sa batterie rapide ; puis la revue avec le `focus` du rapport (même `baseCommit` 9f8e7d6, `workspace` et `branch` du run), pas le panel complet, parce que la revue a déjà eu lieu pour cette spec (une fois par spec) ; la réponse le dit.
- [ ] A4 Le critère 6 est rejugé par celui qui l'a refusé : dans le run, aucun critique — son développeur (xhigh) reçoit la preuve de l'injection et cite sa propre vérification ; puis, dans la revue `focus`, le relecteur sécurité lui-même (xhigh), avec un rejeu en conditions réelles.
- [ ] A5 Pas de deuxième revue complète (six relecteurs et tous les testeurs) pour un seul critère.
- [ ] A6 Échec encore : arrêt (tout le reste est fait), en français simple : le défaut (la recherche laisse passer du SQL), ce qui a été tenté, une recommandation, une question simple sans choix lettré ; le travail commité.
- [ ] A7 Aucune question avant ; une ligne d'avancement en termes de critères.

## Erreurs typiques
- Une deuxième revue complète pour un seul critère.
- Un `focus` oublié ou inventé (un relecteur qui n'a rien refusé), ou une revue `focus` dont le `baseCommit` n'est plus celui du premier run (elle ne voit plus toute la spec).
- `rejectedBy` ou sa preuve oubliés : le run saute le critère 6 comme déjà intégré, ou son développeur ignore ce qui a été prouvé.
- Un commit « étape 2 » ou un nouveau `baseCommit` avant la relance.
- Relancer plusieurs fois, ou demander à Arthur en cours de run.

## Repères dans le SKILL 1.13.0
L76, L148-150, L156, L174-175, L246-256, L298, L305-306, L311, L340, L350, L355, L357.
