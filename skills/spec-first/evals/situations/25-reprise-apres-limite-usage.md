# 25 — Reprise après une limite d'usage

Source : Eval 31 « reprise-apres-limite-usage » (evals.json) ; inspirée d'un run arrêté par la limite d'usage du compte
Décisions en jeu : D11, D20, D21, D23, R1, R2, R9 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : A6 : `specTotal` et `specBaseCommit` retirés ; la revue gardera le `baseCommit` 3c4d5e6.
Modifié le 26/11/2026 (1.13.0, D20–D26) : réécrite en partie : le rapport et `resume` suivent la reprise lue dans git (D23, R9 modifiée) ; A1 et A2 inversés (pas de commit avant la relance, jamais `resumeFromRunId` pour un run) ; plus de profil (D20) ni de contrôle de fin de run qui juge les critères (D21) : A4, A5, A6 reformulés.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet QualiSpectra, dépôt /home/alo/GitHub/pyplet/apps/QualiSpectra. Il y a cinq jours, spec-first:run sur specs/sprint4.md (13 critères, ids 1 à 13, maxGroups 6, quickTestCommand "npm run test:unit", testCommand "npm test", baseCommit 3c4d5e6) est revenu avec :
- stopped : « 3 agents sans réponse d'affilée (limite d'usage ou API indisponible), arrêt avant la suite » ;
- critères 1 à 9 « non vérifié » (développés et intégrés, vérifiés par leur développeur) ; 10 et 11 « en panne » ; 12 et 13 « bloqué », kind « technique », raison « Arrêté : 3 agents sans réponse d'affilée » ;
- resume.relaunch : « relancer ce run avec les mêmes args, même baseCommit : l'inventaire retrouve spec-first-sprint4--integration et saute les critères que ses trailers Spec-First-Validated donnent intégrés — seul le travail jamais fusionné est refait » ;
- resume.integrationBranch : spec-first-sprint4--integration, resume.integrated : 1 à 9 ;
- le journal des workflows de la session donne le runId wf_7Hk2Lm.
Depuis, rien n'a été commité dans le projet : HEAD est toujours 3c4d5e6.
Arthur écrit aujourd'hui : « Le quota est revenu, reprends. »
Tu penses aussi que quickTestCommand devrait maintenant exclure un test lent (`npm run test:unit -- --exclude slow-export`).

QUESTION
Que fais-tu ici, étape par étape ? Quel workflow, avec quels arguments ? Quel message envoies-tu à Arthur, mot pour mot, et quand ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport du run arrêté et le message d'Arthur sont dans la consigne.

## Points vérifiables
- [ ] A1 Aucun commit « spec : sprint4 (étape N) » ni squash avant de relancer : ce qui est passé est déjà dans git, sur la branche d'intégration ; un commit déplacerait le `baseCommit` et ferait refaire les critères 1 à 9.
- [ ] A2 Relance avec les mêmes args et le même `baseCommit` 3c4d5e6, comme le dit `resume` ; jamais `resumeFromRunId`, même avec wf_7Hk2Lm connu ; changer `quickTestCommand` ne fait rien perdre (le run lit dans git ce qui est intégré) : gardé ou changé, au choix, dit en une ligne s'il change.
- [ ] A3 Aucune question à Arthur pour reprendre : son « reprends » suffit ; relance dans le même tour.
- [ ] A4 Le message dit l'avancement en critères, sur 13 (« 9 critères sur 13 développés, je reprends les 4 restants »).
- [ ] A5 Les critères 1 à 9 ne sont pas présentés comme terminés : « non vérifié », vérifiés par leur développeur seulement ; la revue les jugera tous.
- [ ] A6 Mêmes autres args (`maxGroups`, `testCommand` ; ni `profil` ni `finalCheck`) ; `baseCommit` 3c4d5e6 gardé ; la revue gardera 3c4d5e6.
- [ ] A7 Pas de jargon dans le message à Arthur (`resumeFromRunId`, `quickTestCommand`, « cache »).

## Erreurs typiques
- ⛔ Un commit « étape N » ou un nouveau `baseCommit` avant la relance : nouvelle branche d'intégration, les critères 1 à 9 refaits, le quota revenu brûlé sur du travail déjà fait.
- `resumeFromRunId` pour reprendre le run.
- Demander à Arthur s'il faut reprendre, ou lui proposer des options.
- Repartir de zéro (critères 1 à 9 refaits).
- Traiter 10 à 13 comme des échecs, ou comme un blocage technique à lui signaler.
- Annoncer 9 critères « validés » comme terminés.

## Repères dans le SKILL 1.13.0
L76, L148-149, L156, L164, L203, L267, L281, L294, L340, L348, L356.
