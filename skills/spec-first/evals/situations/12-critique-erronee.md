# 12 — Critique visiblement erronée

Source : Cas générique (un critique contredit le texte même du critère)
Décisions en jeu : D2, D3, D11, R2 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Rapport du premier run de specs/dates.md (4 critères, baseCommit 5e5e5e5) :
- critères 1, 2, 4 : « validé » ;
- critère 3 : « en échec » après 3 essais, effortReached « xhigh », defect « code », rejectedBy ["maintainer"]. Raison, identique aux trois essais : « [maintainer] le changement modifie utils/dates.py, qu'aucun critère ne demande (débordement du périmètre) ». Le testeur et l'avocat du propriétaire l'ont passé aux trois essais.
Le texte du critère 3 dans la spec est : « Les dates de l'export utilisent le format JJ/MM/AAAA, via le module de dates commun (utils/dates.py). »
Au deuxième et au troisième essai, le développeur a classé le rejet « approach » et a changé deux fois sa façon de faire, sans succès.

QUESTION
Que fais-tu ici, étape par étape : quel workflow, avec quels arguments ? Que dis-tu à Arthur, et quand ? Et si le mainteneur rejette encore le critère 3 au run suivant ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport du premier run et le texte du critère 3 sont dans la consigne.

## Points vérifiables
- [ ] A1 Lit le rejet contre le texte du critère : le critère 3 demande lui-même utils/dates.py ; le rejet du mainteneur est une erreur du critique, ni un défaut du code ni une mauvaise approche.
- [ ] A2 Ne pousse pas le développeur vers une troisième façon de faire qui éviterait utils/dates.py (ce serait sortir du critère) ; le travail qui suit le texte est gardé.
- [ ] A3 Commit « étape 1 » (squash de la branche d'intégration) avant la relance ; il devient le `baseCommit`.
- [ ] A4 Une seule relance du critère 3 : `startEffort {"3": "xhigh"}`, `recheck` = 1, 2, 4, `specBaseCommit` 5e5e5e5, pas de `strictDone` (aucun contrôle strict n'a tourné), `finalCheck` auto ; le critère passé tel qu'il est écrit dans la spec.
- [ ] A5 Fait arriver l'information qui manquait au tour suivant (la phrase du critère qui contredit le rejet), ou dit clairement que la 1.7.0 n'a aucun moyen de la transmettre ni de classer un rejet « critique erronée ».
- [ ] A6 Aucune question à Arthur pendant le run, et jamais une question technique ; une ligne d'avancement en critères.
- [ ] A7 Rejeté encore pour la même raison : pas de troisième relance ; arrêt une fois le reste fini, en français simple : ce que demande la spec, ce que le critique refuse, une recommandation, une question oui/non sans choix lettré ; le travail déjà fait est commité.
- [ ] A8 N'invente aucun argument que run.js n'accepte pas (`rejectedBy`, `critics`, `skipCritic`…) et ne valide pas le critère à la place des critiques.

## Erreurs typiques
- Traiter le rejet comme un défaut réel et relancer une approche qui contourne utils/dates.py.
- Retirer « utils/dates.py » du critère ou de la spec sans l'accord d'Arthur.
- L'orchestrateur qui déclare le critère validé lui-même.
- Question à Arthur en cours de run, ou question à choix lettré (A/B/C).
- Arguments de workflow inventés.

## Repères dans le SKILL 1.7.0
L83, L127, L230-231, L284-287, L151-152.
