# Registre des modifications refusées

Les modifications et les lignes du SKILL qui ont fait tomber un point, et les pistes refusées par Arthur. À lire avant de proposer une modification du SKILL : ne pas reproposer ce qui figure ici sans remplir la condition écrite.

Ajouter une ligne quand :
- une version fait retomber un point acquis (à la majorité, voir `acquis.md`) : la modification en cause, retirée ou acceptée par Arthur (date, raison) ;
- une modification est abandonnée, ou une piste refusée par Arthur.

Seulement ce que les résultats établissent ; une cause qu'ils ne donnent pas s'écrit « non documenté ». Les numéros « L » sont ceux du SKILL noté, comme dans chaque fichier de résultats.

Amorcé le 23/11/2026 à partir de resultats-1.7.0, 1.8.0 et 1.9.0.

## Baisses imputées à des lignes du SKILL
| Version | Lignes du SKILL en cause | Points touchés | Cause | Ne pas refaire / condition |
|---|---|---|---|---|
| 1.8.0 (SKILL de dbe64cd) | L266 : un critère refusé par le contrôle strict repasse un contrôle strict complet | 17 : 6,5 et 6 en 1.7.0 (a, b) → 3 et 3,5 (a, b), 2 sur 2 | L266 contredit D4 et la grille ; la consigne annonçait aussi `strictCheck: true` avec un critère en échec, ce que run.js ne produisait plus | Jamais un deuxième panel complet pour un critère refusé : le juge qui l'a refusé rejuge (D4 ; revue `focus` depuis D15). Corrigé par la reprise de la 17 (resultats-1.8.0) : 6,5 et 7. |
| 1.9.0, second passage (arbre de travail, base b94b7c0) | L280 (« tout de suite ») et L286 contre L119 : la revue part dans le même tour que le rapport du run et démarre la CI | 07 A2 : réussi en 1.8.0 et au premier passage → partiel ; nouveau | Rien ne dit quoi faire de `publish` tant qu'Arthur n'a pas confirmé la liste des actions : la revue du firmware part avec `publish` avant son oui | Ne pas lancer la revue avec `publish` avant le oui d'Arthur sur la liste des actions (R4). La revue immédiate elle-même est sa décision (D15) : à garder. Condition : le SKILL dit quoi faire de `publish` tant que la liste n'est pas confirmée. |
| 1.9.0, deux passages | L270 (commit « étape N », puis reprise avec les mêmes args) contre L308, puis L310 (ce commit devient le `baseCommit`) | 25 A1 : 7/7 en 1.8.0 → 6,5, 2 fois sur 2 | Les deux lignes se contredisent : le commit déplacerait le `baseCommit` d'une reprise à args identiques, l'agent ne le fait pas | Pas deux lignes qui se contredisent sur ce commit. Condition : le SKILL dit si le commit « étape N » déplace le `baseCommit` d'une reprise à args identiques (R9 demande le commit, puis exactement les mêmes args). |

## Pistes refusées par Arthur (aucune baisse mesurée)
| Version | Piste | Où on l'a vue | Décision | Ne pas refaire / condition |
|---|---|---|---|---|
| 1.7.0 (bd2958d) | Questions à choix lettré (A/B/C) : L73-75, L96, L109, L115, L152, L287, L314, L329, L339 | 16 réponses sur 28 ; l'agent suit le SKILL chaque fois | D11 ; aucune en 1.8.0 ni en 1.9.0 | Jamais, même pour un accès manquant, un arrêt ou la fin de spec (D11). |
| 1.9.0 | `testers` de 1 à 3 selon la spec (L283) | Premier passage : 01, 07, 19 et 20 passent `testers: 1` | D15 : panel fixe, toujours deux testeurs en conditions réelles, jamais moins pour économiser (confirmé le 07/11/2026) | Pas de panel réduit pour économiser des tokens, sauf nouvelle décision d'Arthur. |

## Baisses sans modification en cause
Pour mémoire : les résultats ne les imputent à aucune modification (variance d'un agent, ou silence du SKILL). Rien à « ne pas refaire ».
| Version | Point | Par rapport à | Ce qu'en disent les résultats |
|---|---|---|---|
| 1.9.0, second passage | 01 A3, 06 A6, 08 A1 | Premier passage 1.9.0 ; déjà ratés en 1.8.0 | Variance d'un agent. Lignes ambiguës : L126 (01), L262 contre L274 (06), L125 (08). |
| 1.9.0, second passage | 07 A1 | 1.8.0 et premier passage | Le run de l'application part dès ce soir, avant la publication du firmware. Cause non documentée. |
| 1.9.0, second passage | 18 A5 | 1.8.0 et premier passage | Lundi : une question oui/non au lieu de dire une fois l'action. Cause non documentée. |
| 1.9.0, deux passages | 15 A2 | 1.8.0 | Agents `general-purpose` ; le SKILL ne dit rien des profils (L219, L324 puis L326) ; le rejeu 15b réussit. |
| 1.9.0, premier passage | 22 A4 | 1.8.0 | Le run en cours n'est pas arrêté ; l'agent s'appuie sur run.js 1.9.0 (les critiques ne lancent jamais la suite complète quand il connaît `testCommand`). 22b et le second passage réussissent. |
