# 25 — Reprise après une limite d'usage

Source : Eval 31 « reprise-apres-limite-usage » (evals.json) ; inspirée d'un run arrêté par la limite d'usage du compte
Décisions en jeu : D11, D13, R1, R2, R9 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet QualiSpectra, dépôt /home/alo/GitHub/pyplet/apps/QualiSpectra. Il y a cinq jours, spec-first:run sur specs/sprint4.md (13 critères, ids 1 à 13, profil rapide, maxGroups 6, quickTestCommand "npm run test:unit", testCommand "npm test", baseCommit 3c4d5e6) est revenu avec :
- stopped : « 3 agents sans réponse d'affilée (limite d'usage ou API indisponible), arrêt avant la suite » ;
- critères 1 à 9 « validé » (auto-contrôle du développeur, contrôle de fin de run pas encore fait) ; 10 et 11 « en panne » ; 12 et 13 « bloqué », kind « technique », raison « Arrêté : 3 agents sans réponse d'affilée » ;
- resume.withCache : « relancer ce run avec resumeFromRunId et exactement les mêmes args (aucune commande, aucun groupe, aucun critère modifié) : les agents finis reviennent du cache » ;
- resume.integrationBranch : spec-first-sprint4--integration-Ab12Cd, resume.integrated : 1 à 9 ;
- le journal des workflows de la session donne le runId wf_7Hk2Lm.
Arthur écrit aujourd'hui : « Le quota est revenu, reprends. »
Tu penses aussi que quickTestCommand devrait maintenant exclure un test lent (`npm run test:unit -- --exclude slow-export`).

QUESTION
Que fais-tu ici, étape par étape ? Quel workflow, avec quels arguments ? Quel message envoies-tu à Arthur, mot pour mot, et quand ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport du run arrêté et le message d'Arthur sont dans la consigne.

## Points vérifiables
- [ ] A1 Commit local « spec : sprint4 (étape N) » du travail passé avant de relancer, ou vérifie et dit qu'il est déjà fait.
- [ ] A2 Choix cohérent : soit `resumeFromRunId: "wf_7Hk2Lm"` avec exactement les mêmes args (la commande lente gardée pour plus tard), soit, s'il change `quickTestCommand`, un nouveau run avec `integrationBranch` = spec-first-sprint4--integration-Ab12Cd, `recheck` = 1 à 9, `criteria` = 10 à 13 — jamais `resumeFromRunId` avec un arg modifié.
- [ ] A3 Aucune question à Arthur pour reprendre : son « reprends » suffit ; relance dans le même tour.
- [ ] A4 Le message dit l'avancement en critères, sur 13 (« 9 critères sur 13 faits, je reprends les 4 restants »).
- [ ] A5 Les critères 1 à 9 ne sont pas présentés comme terminés : en rapide, ils n'ont pas encore été jugés ; le contrôle de fin de run les jugera.
- [ ] A6 Mêmes autres args (`profil: "rapide"`, `maxGroups`, `testCommand`, `specTotal`) ; un nouveau run passe `specBaseCommit` 3c4d5e6 et un `baseCommit` relevé juste avant l'appel.
- [ ] A7 Pas de jargon dans le message à Arthur (`resumeFromRunId`, `quickTestCommand`, « cache »).

## Erreurs typiques
- ⛔ `resumeFromRunId` avec `quickTestCommand` modifié : tous les agents tournent de nouveau, le quota revenu est brûlé sur du travail déjà fait.
- Demander à Arthur s'il faut reprendre, ou lui proposer des options.
- Repartir de zéro (critères 1 à 9 en `criteria`).
- Traiter 10 à 13 comme des échecs, ou comme un blocage technique à lui signaler.
- Annoncer 9 critères « validés » comme terminés.

## Repères dans le SKILL 1.8.0
L144-149, L263, L268, L271, L273, L291.
