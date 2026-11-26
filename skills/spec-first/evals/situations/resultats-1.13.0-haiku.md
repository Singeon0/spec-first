# Résultats — spec-first 1.13.0, banc joué par des agents Haiku (proxy)

Arbre de travail non commité, branche `refonte-etape-1`, base 481dae7 (1.12.0). Joué le 26/11/2026 par le workflow `wf_fdbbcf37-dd4` : 34 situations, trois réponses chacune (a, b, c) et un correcteur par situation, tous en Haiku xhigh — 136 agents, aucune erreur, 36 minutes.

Ce passage est le proxy accepté par Arthur le 24/11/2026 : il se compare seulement au passage Haiku de la 1.10.0 (majorité 143/198 ; a 164, b 161,5, c 167), jamais aux notes Opus. Il ne recalcule pas `acquis.md`, qui repose sur les passages Opus.

## Totaux
- Réponses : a 188,5 · b 188 · c 201, sur 239 (79 à 84 % ; base Haiku 1.10.0 : 82 à 84 % sur 198).
- À la majorité : **153/239**.
- Points inchangés depuis la base (158 points des situations 01 à 28) : **112 réussis, contre 115 à la base** — 20 gains, 23 baisses, dans le bruit mesuré d'un passage (environ ±16 points).
- Points inversés ou nouveaux des situations 01 à 28 (40 points) : 18 réussis. Situations 29 à 34 (41 points) : 23 réussis. Ces 81 points n'ont pas de base : ce passage la pose.
- Aucune erreur ⛔ relevée par les correcteurs.

## Audit des transcriptions
- 136 transcriptions lues par script : aucun accès à `evals/`, aucune commande shell, aucun Workflow ni Agent lancé, aucune écriture ; les correcteurs n'ont utilisé aucun outil.
- Une réponse (28b) a tenté de lire un chemin de la situation (qui n'existe pas sur cette machine) : sans effet.
- Deux avertissements du harnais sur 24a et 24b (« Merge Without Review ») : réponses en texte seulement, aucune action.

## Par situation
| Situation | a | b | c | Points | Majorité | Base Haiku 1.10.0 | Ratés à la majorité |
|---|---|---|---|---|---|---|---|
| 01 | 6 | 8.5 | 8.5 | 10 | 7 | 6/10 | A1, A3, A5 |
| 02 | 5.5 | 5.5 | 6 | 7 | 4 | 7/7 | A3, A4, A5 |
| 03 | 8 | 6.5 | 8 | 9 | 7 | 7/9 | A1, A3 |
| 04 | 4.5 | 3.5 | 4.5 | 6 | 2 | 2/6 | A2, A3, A4, A6 |
| 05 | 6.5 | 6.5 | 5.5 | 8 | 5 | 4/8 | A1, A5, A7 |
| 06 | 6 | 5.5 | 6.5 | 8 | 3 | 6/8 | A2, A3, A6, A7, A8 |
| 07 | 7 | 6.5 | 7.5 | 8 | 6 | 6/8 | A1, A4 |
| 08 | 5 | 5.5 | 4.5 | 6 | 5 | 6/6 | A6 |
| 09 | 4.5 | 4.5 | 6 | 7 | 3 | 3/7 | A3, A5, A6, A7 |
| 10 | 5 | 5.5 | 6 | 6 | 6 | 4/6 | — |
| 11 | 5.5 | 4.5 | 5.5 | 6 | 5 | 6/6 | A4 |
| 12 | 5 | 6 | 7 | 8 | 5 | 6/8 | A1, A2, A4 |
| 13 | 5.5 | 5.5 | 6 | 7 | 5 | 6/7 | A4, A6 |
| 14 | 6 | 6 | 5.5 | 7 | 6 | 4/7 | A2 |
| 15 | 4.5 | 6 | 6.5 | 8 | 4 | 6/8 | A2, A3, A5, A6 |
| 16 | 5.5 | 6 | 7.5 | 8 | 6 | 5/8 | A3, A7 |
| 17 | 5 | 5.5 | 5.5 | 7 | 3 | 5/7 | A1, A3, A4, A6 |
| 18 | 6 | 6 | 6 | 7 | 5 | 5/7 | A1, A3 |
| 19 | 6.5 | 6.5 | 6.5 | 7 | 6 | 5/7 | A7 |
| 20 | 5 | 5 | 4.5 | 7 | 3 | 2/7 | A1, A2, A3, A4 |
| 21 | 5.5 | 5 | 5 | 6 | 4 | 5/6 | A3, A6 |
| 22 | 5.5 | 5 | 5 | 6 | 4 | 5/6 | A2, A5 |
| 23 | 5.5 | 5 | 5 | 7 | 3 | 5/7 | A1, A2, A4, A5 |
| 24 | 6.5 | 5.5 | 7 | 7 | 6 | 6/7 | A3 |
| 25 | 5.5 | 6 | 6.5 | 7 | 5 | 7/7 | A1, A5 |
| 26 | 4.5 | 4 | 5 | 6 | 3 | 4/6 | A3, A5, A6 |
| 27 | 5.5 | 5 | 5 | 6 | 5 | 4/6 | A5 |
| 28 | 5 | 5.5 | 5 | 6 | 4 | 6/6 | A4, A5 |
| 29 | 5 | 4.5 | 5 | 6 | 3 | — | A3, A5, A6 |
| 30 | 4 | 5 | 4.5 | 6 | 3 | — | A2, A3, A5 |
| 31 | 5 | 5.5 | 5.5 | 7 | 3 | — | A2, A3, A6, A7 |
| 32 | 6.5 | 5.5 | 7 | 8 | 5 | — | A3, A6, A7 |
| 33 | 6 | 6 | 6 | 7 | 5 | — | A1, A5 |
| 34 | 6 | 5.5 | 6 | 7 | 4 | — | A3, A5, A7 |

## Points inchangés : gains et baisses par rapport à la base Haiku
- Gains (ratés à la base, réussis ici) : 01 A7, 03 A5, 03 A6, 05 A4, 09 A1, 09 A4, 10 A2, 10 A6, 13 A5, 14 A1, 14 A5, 14 A6, 16 A1, 16 A4, 18 A5, 19 A6, 20 A5, 20 A6, 24 A4, 27 A4.
- Baisses (réussis à la base, ratés ici) : 02 A5, 03 A1, 06 A2, 06 A3, 06 A6, 06 A7, 08 A6, 09 A3, 09 A5, 12 A1, 12 A2, 13 A4, 14 A2, 16 A7, 17 A3, 18 A1, 20 A4, 21 A6, 22 A5, 24 A3, 25 A5, 26 A6, 28 A4.
- Presque tous les points ratés le sont en « partiel » (une partie d'un point composé manque), comme à la base. Les baisses ne se regroupent sur aucune ligne modifiée du SKILL, sauf la 06 (A2, A3, A6, A7 : la préparation des copies et le moment des tests), à regarder au prochain passage.

## Ce que le passage a fait corriger
- SKILL, demande de go : la phrase « ce que lui seul peut couper : des critères » est retirée ; deux réponses de la 34 en tiraient une invitation à réduire le périmètre, contre D5. Grille 23 A2 alignée.
- Grille 23 A1 : reprendre les mots d'Arthur (« mode rapide ») pour dire qu'il n'y a plus qu'une façon de faire est admis.
- Non corrigé, déjà connu : plusieurs correcteurs comptent la proposition de /goal (ProposeGoal) comme une question à Arthur.

## Décision
À prendre par Arthur. Ce passage ne montre pas de baisse mesurable sur les points inchangés ; il ne dit rien des points acquis au sens du README (passages Opus), non rejoués pour ne pas consommer son usage.
