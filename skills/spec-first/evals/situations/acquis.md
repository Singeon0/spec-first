# Points acquis

Un point est acquis quand il est réussi aux deux dernières versions notées. Une version qui en fait retomber un ne sort pas sans l'accord d'Arthur (README, « Barrière de sortie »).

Calculé le 24/11/2026 à partir de la 1.9.0 et de la 1.10.0. À recalculer après chaque version notée (prochaine : avec la 1.10.0).

**156 points acquis sur 198.**

## Comment ils sont tirés des résultats
- Réussi = « oui » ; « partiel » compte comme raté.
- 1.10.0 : à la majorité des réponses notées (« oui » dans au moins deux réponses sur trois, deux sur deux sans troisième) ; ligne « majorité » de `resultats-1.10.0.md`. Le contrôle sur la base 3e8ef32 n'entre pas dans le calcul.
- 1.9.0 : le second passage (« Après corrections »), une réponse par situation ; points ratés : ceux que le fichier nomme.
- Les 15 rechutes de la 1.10.0, acceptées par Arthur le 24/11/2026, ne sont plus acquises : colonne « Pas acquis », marque « (1.10.0) », avec les autres baisses.
- Attendu inversé le 07/11/2026 (D15) : 07 A6, 19 A4, 19 A6 et la 17. La 1.9.0 et la 1.10.0 sont toutes deux notées sous le nouveau texte ; ces points sont donc acquis s'ils sont réussis aux deux.
- 28 : nouvelle en 1.10.0, une seule version notée.

## Table
| Situation | Acquis | Pas acquis (raté en) | Note |
|---|---|---|---|
| 01 | A1, A2, A4, A5, A7–A10 | A3 (les deux) ; A6 (1.10.0) | |
| 02 | A1–A7 | — | |
| 03 | A1, A2, A4, A5, A7–A9 | A3 (1.9.0) ; A6 (1.10.0) | |
| 04 | A1–A6 | — | |
| 05 | A1–A8 | — | |
| 06 | A1–A5, A7, A8 | A6 (1.9.0) | |
| 07 | A4, A5, A7, A8 | A2 (les deux) ; A1 (1.9.0) ; A3, A6 (1.10.0) | |
| 08 | A2–A5 | A1 (1.9.0) ; A6 (1.10.0) | |
| 09 | A2–A5, A7 | A6 (1.9.0) ; A1 (1.10.0) | |
| 10 | A2–A4 | A1, A5, A6 (1.10.0) | |
| 11 | A1–A6 | — | |
| 12 | A1–A8 | — | |
| 13 | A1–A4, A7 | A6 (1.9.0) ; A5 (1.10.0) | |
| 14 | A3, A4, A6 | A1 (1.9.0) ; A2, A5, A7 (1.10.0) | |
| 15 | A1, A3–A5, A8 | A2 (1.9.0) ; A6, A7 (1.10.0) | |
| 16 | A1–A5 | A6, A8 (1.9.0) ; A7 (1.10.0) | |
| 17 | A1–A5, A7 | A6 (les deux) | |
| 18 | A1–A4, A6, A7 | A5 (1.9.0) | |
| 19 | A1, A3–A7 | A2 (1.9.0) | |
| 20 | A1–A7 | — | |
| 21 | A1–A5 | A6 (1.10.0) | |
| 22 | A1, A3–A6 | A2 (les deux) | |
| 23 | A1–A7 | — | |
| 24 | A1–A7 | — | |
| 25 | A2–A5, A7 | A1 (les deux) ; A6 (1.10.0) | |
| 26 | A1–A4, A6 | A5 (les deux) | |
| 27 | A1–A6 | — | |
| 28 | — | nouvelle (1.10.0 : 6/6 à la majorité) ; acquise si réussie à la prochaine version | |

## Réalignement du 26/11/2026 (1.13.0, D20–D26) — avant tout passage du banc
Les scores ne sont pas recalculés ici. Ce tableau dit, situation par situation, quels points ont changé de texte avec les décisions D20 à D26 (et D1, D2, D3, D13, D14, D15, D18, R6, R9, R10 modifiées) :
- **inversé ou nouveau** : l'attendu a changé (une réponse qui réussissait avant échouerait maintenant, ou le point demande une conduite nouvelle). Ces points ne sont plus acquis ; ils le redeviennent après deux versions réussies sous le nouveau texte (README, « Tenir le banc à jour »).
- **reformulé** : même conduite, mots ou mécanisme adaptés (par exemple « critique » devenu « testeur du socle » ou « agent », « contrôle léger » devenu « batterie rapide », « validé » devenu « non vérifié » dans la consigne). L'historique est gardé.
Un point absent des deux colonnes n'a pas changé. Le détail de chaque changement est sous « Décisions en jeu », ligne « Modifié le 26/11/2026 », dans chaque situation.

| Situation | Inversé ou nouveau (plus acquis) | Reformulé (historique gardé) | Note |
|---|---|---|---|
| 01 | — | — | repères seuls |
| 02 | A3, A4 | — | relance aux mêmes args et même baseCommit, sans commit « étape 1 » ni recheck (D23) ; consigne : critères « non vérifié », batterie rapide |
| 03 | A3, A4 | A1, A5, A6, A9 | jamais resumeFromRunId pour un run ; l'inventaire lit dans git (D23) |
| 04 | A1, A2, A3, A4, A5 | A6 | réécrite : « accélère » depuis le journal ou le bilan de temps (D26) |
| 05 | A5 | A7 | |
| 06 | A4 | A3 | A4 : une liste exclusive sur plus de la moitié des critères se justifie (D26) |
| 07 | — | — | repères seuls |
| 08 | A2 | — | Opus high au lieu de medium (D20) |
| 09 | — | A3, A4 | plus de critique pendant le run |
| 10 | A4 | — | |
| 11 | A1, A2, A4 | — | envRepair sans critiques ; la revue juge les 6 |
| 12 | A3, A4, A5, A8 | A1, A2, A6, A7 | réécrite : le rejet vient du testeur du socle ; la preuve passe par rejectedBy |
| 13 | A6 | A4 | |
| 14 | A3, A7 | A6 | |
| 15 | A2, A3, A6 | A1 | plus de trois critiques ; Opus high au minimum ; batterie rapide en fin de run |
| 16 | — | — | repères seuls |
| 17 | A1, A2, A4 | A3, A5 | |
| 18 | — | — | repères seuls |
| 19 | — | A3 | |
| 20 | — | A2, A4 | |
| 21 | A3 | — | nettoyage en Opus high |
| 22 | A4 | A1, A3 | consigne réécrite : la batterie de fin de run lancerait la suite e2e |
| 23 | A1, A2, A4, A5 | A6 | réécrite : « mode rapide » au go, un seul profil, le plan du run (D20, D25) |
| 24 | A7 | A2, A3 | |
| 25 | A1, A2 | A4, A5, A6 | |
| 26 | — | — | consigne sans profil ; points inchangés |
| 27 | — | — | consigne sans profil ; points inchangés |
| 28 | A3, A5 | A1, A4 | jamais acquise (une seule version notée) |
| 29 | A2 | A1, A5 | jamais notée ; le réglage demandé devient l'effort des développeurs |
| 30 | A2, A5 | A1, A4 | jamais notée |
| 31 | A1, A3 | A5 | jamais notée |
| 32 | A1–A8 | — | nouvelle (plan du run, contrats dans le socle) |
| 33 | A1–A7 | — | nouvelle (commande des suites) |
| 34 | A1–A7 | — | nouvelle (bilan de temps, « accélère ») |

Points acquis du tableau du 24/11/2026 qui passent en « inversé ou nouveau » : 33 (02 : 2 ; 03 : 1 ; 04 : 5 ; 05, 06, 08, 10 : 1 chacun ; 11 : 3 ; 12 : 4 ; 14 : 1 ; 15 : 2 ; 17 : 3 ; 21, 22 : 1 chacun ; 23 : 4 ; 24, 25 : 1 chacun). Restent acquis, sans recalcul : 156 − 33 = 123 sur 198.

Total du banc : **239 points** sur 34 situations — 198 pour les situations 01 à 28 (inchangé), 19 pour 29 à 31, 22 pour les nouvelles 32 à 34. Les situations 29 à 34 n'entrent pas dans le bilan d'une version tant qu'elles n'ont pas été notées une fois (README, « Barrière de sortie »).
