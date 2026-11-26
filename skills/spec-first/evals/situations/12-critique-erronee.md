# 12 — Rejet visiblement erroné du testeur du socle

Source : Cas générique (un critique contredit le texte même du critère) ; depuis la 1.13.0, le seul critique d'un run est le testeur du socle
Décisions en jeu : D2, D11, D20, D21, D23, R2 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : A4 : plus de `specBaseCommit` ni `strictDone` ; la revue reçoit `baseCommit` 5e5e5e5.
Modifié le 26/11/2026 (1.13.0, D20–D26) : réécrite — le rejet erroné vient du testeur du socle, seul critique du run (D21) ; la phrase du critère passe au développeur par `rejectedBy` (A5 et A8 inversés) ; relance aux mêmes args et au même `baseCommit`, sans commit « étape 1 » (A3 inversé, D23).

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Rapport du premier run de specs/dates.md (6 critères, baseCommit 5e5e5e5, dependsOn {"4": ["3"], "5": ["3"], "6": ["3"]}) :
- critères 1 et 2 : « non vérifié » (développés et intégrés) ;
- critère 3 (le socle : les critères 4, 5 et 6 en dépendent) : « en échec » après 3 essais, effortReached « xhigh », defect « code ». Le développeur a passé sa propre vérification aux trois essais (il cite le test de l'export et sa sortie). Le testeur du socle l'a rejeté trois fois, avec la même raison : « le changement modifie utils/dates.py, qu'aucun critère ne demande (débordement du périmètre) ». Au deuxième et au troisième essai, le développeur a classé le rejet « approach » et a changé deux fois sa façon de faire, sans succès.
- critères 4, 5 et 6 : « bloqué », kind « attente », waitingFor ["3"], relaunchAs « criteria » ;
- check : batterie rapide verte ; reviewReady false.
Le texte du critère 3 dans la spec est : « Les dates de l'export utilisent le format JJ/MM/AAAA, via le module de dates commun (utils/dates.py). »

QUESTION
Que fais-tu ici, étape par étape : quel workflow, avec quels arguments ? Que dis-tu à Arthur, et quand ? Et si le testeur du socle rejette encore le critère 3 au run suivant ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport du premier run et le texte du critère 3 sont dans la consigne.

## Points vérifiables
- [ ] A1 Lit le rejet contre le texte du critère : le critère 3 demande lui-même utils/dates.py ; le rejet du testeur est une erreur du critique, ni un défaut du code ni une mauvaise approche (et le périmètre n'est pas ce que juge un testeur : les relecteurs de la revue en jugent).
- [ ] A2 Ne pousse pas le développeur vers une troisième façon de faire qui éviterait utils/dates.py (ce serait sortir du critère) ; le travail qui suit le texte est gardé.
- [ ] A3 Aucun commit « étape 1 » ni squash avant la relance : les mêmes args et le même `baseCommit` 5e5e5e5 ; le run saute 1 et 2, intégrés ; pas de `recheck`.
- [ ] A4 Une seule relance : le critère 3 avec `startEffort {"3": "xhigh"}`, et 4, 5, 6 relancés avec lui (même `dependsOn`) ; puis, une fois tout intégré, la revue sur les 6 critères avec `baseCommit` 5e5e5e5 ; le critère 3 gardé tel qu'il est écrit dans la spec.
- [ ] A5 Fait arriver l'information qui manquait : `rejectedBy {"3": {"proof": …}}`, dont la preuve cite la phrase du critère qui contredit le rejet (« via le module de dates commun (utils/dates.py) »).
- [ ] A6 Aucune question à Arthur pendant le run, et jamais une question technique ; une ligne d'avancement en critères.
- [ ] A7 Rejeté encore pour la même raison : pas de troisième relance ; arrêt une fois le reste fini (ici rien d'autre n'avance : 4, 5 et 6 attendent le 3), en français simple : ce que demande la spec, ce que le testeur refuse, une recommandation, une question oui/non sans choix lettré ; le travail déjà fait est commité (« étape N »).
- [ ] A8 N'invente aucun argument (`critics`, `skipCritic`, un `rejectedBy` qui nomme des critiques…) ; ne valide pas le critère lui-même ni par un agent isolé ; ne retire pas le testeur du socle.

## Erreurs typiques
- Traiter le rejet comme un défaut réel et relancer une approche qui contourne utils/dates.py.
- Retirer « utils/dates.py » du critère ou de la spec sans l'accord d'Arthur.
- L'orchestrateur qui déclare le critère validé lui-même, ou le fait juger par un agent isolé.
- Question à Arthur en cours de run, ou question à choix lettré (A/B/C).
- Arguments de workflow inventés ; un commit « étape 1 » ou un nouveau `baseCommit` avant la relance.

## Repères dans le SKILL 1.13.0
L76, L81, L86, L148-149, L174-175, L240-241, L259, L261, L263, L298, L340, L348, L351, L353-355, L357.
