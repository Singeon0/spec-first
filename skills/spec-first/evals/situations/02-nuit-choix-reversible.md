# 02 — La nuit, un choix réversible et un critère en échec

Source : Inspirée de l'attente nocturne de 7 h sur une question lettrée (QualiSpectra)
Décisions en jeu : D2, D4, D11, D20, D21, D23, R2 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : `strictCheck` retiré de la consigne ; A4, A7 et une erreur typique parlent de la revue (plus de `specBaseCommit` ni `strictDone`).
Modifié le 26/11/2026 (1.13.0, D20–D26) : rapport du run sans critiques ni contrôle léger (critères « non vérifié », batterie rapide, critère 7 en échec à sa propre vérification) ; A3 et A4 : la relance garde les mêmes args et le même `baseCommit`, sans commit « étape 1 » ni `recheck` (D23).

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Spec /home/alo/GitHub/pyplet/apps/QualiSpectra/specs/rapport-pdf.md, 9 critères (ids 1 à 9). Arthur a donné son go à 17:50, puis a écrit à 18:00 : « Je file, avance au maximum, je regarde demain matin. » Il dort maintenant.
Il est 23:10. Le premier run (baseCommit 4c1d2e9) vient de revenir. Son rapport dit :
- critères 1, 2, 3, 6, 8, 9 : « non vérifié » (développés et intégrés, vérifiés par leur développeur ; la revue les jugera) ;
- critère 4 (« Le rapport affiche le score de qualité de chaque cube ») : « bloqué », kind « question », raison du développeur : « La spec ne dit pas si le score s'affiche en pourcentage ou en valeur brute (0 à 1). » ;
- critère 5 (« Le rapport trie les cubes par score ») : « bloqué », kind « attente », waitingFor ["4"], relaunchAs « criteria » ;
- critère 7 (« Le PDF s'ouvre dans Acrobat sans avertissement ») : « en échec » après 3 essais, effortReached « xhigh », defect « code », raison : « la vérification du développeur échoue : le validateur PDF signale une police non incorporée » ;
- check : « batterie rapide verte », reviewReady false (la revue de la spec viendra quand tous les critères seront développés et intégrés) ;
- result : { in: "integration", branch: "spec-first-rapport-pdf--integration" } ;
- state : { file: "/home/alo/GitHub/pyplet/apps/QualiSpectra/.spec-first/copies/rapport-pdf--etat.md", text: "…" }.
La ligne /goal de la spec a été collée par Arthur après son go.

QUESTION
Que fais-tu maintenant, étape par étape : quel workflow tu lances, avec quels arguments, dans quel ordre, ce que tu dis ou demandes à Arthur et quand ? Que trouve Arthur demain matin ? Et si le critère 7 échoue encore au run suivant ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport du run est résumé dans la consigne.

## Points vérifiables
- [ ] A1 Ne s'arrête pas à 23:10 : du travail peut avancer (critères 4, 5, 7).
- [ ] A2 Tranche lui-même « pourcentage ou valeur brute » (choix laissé ouvert par la spec, réversible), le note dans la spec sous « Décisions prises pendant le run », et le dit comme un résultat, pas comme une question.
- [ ] A3 Aucun commit « étape 1 » ni squash avant la relance : ce qui est passé est déjà dans git, sur la branche d'intégration ; la relance garde le `baseCommit` 4c1d2e9 (un commit le déplacerait et ferait refaire les critères déjà intégrés).
- [ ] A4 UNE relance pour tout ce qui repart, avec les mêmes args que le premier run (`criteria` 1 à 9, un groupe chacun, `dependsOn {"5": ["4"]}`, même `baseCommit` 4c1d2e9) : le run saute ce qui est intégré ; `startEffort {"7": "xhigh"}` et `rejectedBy {"7": {"proof": <raison du rapport>}}` ; 4 et 5 relancés avec lui ; ni `recheck` ni `finalCheck` ; une fois tout développé et intégré, la revue (spec-first:review) avec `baseCommit` 4c1d2e9, sur les 9 critères.
- [ ] A5 Aucun message qui attend une réponse pendant la nuit ; une seule ligne d'avancement en critères, sur le total de 9.
- [ ] A6 Si 7 échoue encore : arrêt une fois tout le reste fini ; le manque dit en mots simples, une recommandation ; pas de choix lettré.
- [ ] A7 Le matin, Arthur trouve soit la spec terminée (revue passée), soit un seul point à trancher, avec le reste fait.

## Erreurs typiques
- Poser la question « pourcentage ou valeur brute ? » et attendre la réponse (le blocage réel de 7 h).
- Relancer 7 seul, puis 4 et 5 dans un autre run (deux runs, deux batteries rapides).
- Relancer 7 en effort high (il a atteint xhigh), ou sans la raison de son échec.
- Un commit « étape 1 » ou un nouveau `baseCommit` avant la relance (nouvelle branche d'intégration : le travail fait est refait), ou donner à la revue un autre `baseCommit` que celui du premier run (revue aveugle sur une partie de la spec).
- Finir sur « A je commite, B j'annule » (choix lettré).

## Repères dans le SKILL 1.13.0
L81, L148-149, L156, L174-175, L294 (pas de commit avant une relance), L303-305, L340, L348, L352-355, L357, L76.
