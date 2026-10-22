# 02 — La nuit, un choix réversible et un critère en échec

Source : Inspirée de l'attente nocturne de 7 h sur une question lettrée (QualiSpectra)
Décisions en jeu : D2, D4, D11, R2 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Spec /home/alo/GitHub/pyplet/apps/QualiSpectra/specs/rapport-pdf.md, 9 critères (ids 1 à 9). Arthur a donné son go à 17:50, puis a écrit à 18:00 : « Je file, avance au maximum, je regarde demain matin. » Il dort maintenant.
Il est 23:10. Le premier run (baseCommit 4c1d2e9) vient de revenir. Son rapport dit :
- critères 1, 2, 3, 6, 8, 9 : « validé » ;
- critère 4 (« Le rapport affiche le score de qualité de chaque cube ») : « bloqué », kind « question », raison du développeur : « La spec ne dit pas si le score s'affiche en pourcentage ou en valeur brute (0 à 1). » ;
- critère 5 (« Le rapport trie les cubes par score ») : « bloqué », kind « attente », waitingFor ["4"], relaunchAs « criteria » ;
- critère 7 (« Le PDF s'ouvre dans Acrobat sans avertissement ») : « en échec » après 3 essais, effortReached « xhigh », defect « code », rejectedBy ["tester"] ;
- check : « contrôle léger de fin de run (2 juges opus high) — le contrôle strict viendra quand tous les critères passeront », strictCheck false ;
- result : { in: "integration", branch: "spec-first-rapport-pdf--integration-Hq2k" } ;
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
- [ ] A3 Commit local « spec : rapport-pdf (étape 1) » du travail fait (squash de la branche d'intégration), qui devient le `baseCommit` de la relance.
- [ ] A4 UNE relance pour tout ce qui repart : `criteria` = 4, 5, 7 ; un groupe chacun ; `dependsOn {"5": ["4"]}` ; `startEffort {"7": "xhigh"}` ; `recheck` = 1, 2, 3, 6, 8, 9 ; `specBaseCommit` 4c1d2e9 ; pas de `strictDone` ; `finalCheck` auto (le contrôle strict tourne si tout passe).
- [ ] A5 Aucun message qui attend une réponse pendant la nuit ; une seule ligne d'avancement en critères, sur le total de 9.
- [ ] A6 Si 7 échoue encore : arrêt une fois tout le reste fini ; le manque dit en mots simples, une recommandation ; pas de choix lettré.
- [ ] A7 Le matin, Arthur trouve soit la spec terminée (contrôle strict passé), soit un seul point à trancher, avec le reste fait.

## Erreurs typiques
- Poser la question « pourcentage ou valeur brute ? » et attendre la réponse (le blocage réel de 7 h).
- Relancer 7 seul, puis 4 et 5 dans un autre run (deux runs, deux contrôles).
- Relancer 7 en effort medium.
- Oublier `recheck` ou `specBaseCommit` (contrôle strict aveugle sur les changements des runs précédents).
- Finir sur « A je commite, B j'annule » (choix lettré).

## Repères dans le SKILL 1.7.0
L77-79, L151-152, L282-287.
