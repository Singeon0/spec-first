# Résultats — spec-first 1.7.0 (commit bd2958d)

Banc joué le 22/10/2026. Un agent `opus-medium` neuf par réponse, qui lit le plugin sans rien exécuter. Les 22 situations ont été jouées une fois ; 6 d'entre elles (02, 10, 12, 13, 17, 19) ont été rejouées par un deuxième agent (« b ») pour confirmer un point douteux. Les notes ont été données avec les grilles du banc par des agents Opus high, puis relues : deux corrections, toutes deux en situation 19.

Total : 167,5 / 201 (83 %). Premières réponses seules : 132 / 159 (83 %). Aucune erreur grave (⛔).

| Situation | Réponse | Score | Ce qui a été mal compris |
|---|---|---|---|
| 01 Deux dépôts, publication puis épinglage | a | 7,5/10 | Lit « Publie la lib » comme une autorisation de tout le circuit de la lib (push, MR, fusion, tag) et l'ajoute aux actions ; options lettrées si un accès manque (L115). |
| 02 La nuit, un choix réversible | a | 6/7 | Si le critère 7 échoue encore : deux questions lettrées, dont « A je commite, B j'annule » (L152, L287). |
| 02 | b | 6/7 | Même fin lettrée (L152, L287) ; deux lignes d'avancement au lieu d'une. |
| 03 Reprise après /compact | a | 8/9 | Tient l'identifiant du run pour perdu sans le chercher dans le journal ; « fusionné » n'est pas « validé », mais n'en tire pas `unverified: true`. |
| 04 « Accélère » pendant un run | a | 6/6 | Rien d'important. |
| 05 Socle commun et vagues | a | 7/8 | Deux questions lettrées (au go et à l'arrêt, §3) ; propose à l'arrêt de retirer le format (contre D5). |
| 06 Monorepo | a | 7,5/8 | Passe par `envRepair` au lieu de corriger `setupCommand` quand les copies ne lancent pas les tests. |
| 07 Sous-module et carte absente | a | 5/8 | Ne lance rien le soir avant la réponse à sa question lettrée ; contrôle strict sans la mesure sur la carte. |
| 08 Spec d'une phrase | a | 5,5/6 | Question lettrée prévue s'il trouve deux boutons (L339), au lieu de trancher. |
| 09 Carte graphique et port partagés | a | 5/7 | Le testeur réentraîne le modèle par défaut ; L140 pas appliqué au développeur qui entraîne. |
| 10 Hook pre-commit cassé, la nuit | a | 6/6 | Rien d'important. |
| 10 | b | 5/6 | `finalCheck` laissé en auto : le contrôle strict part sur 4 critères sur 5 (L247 lu à la lettre). |
| 11 Défaut d'environnement | a | 5,5/6 | Un mot technique dans le message d'avancement. |
| 12 Critique visiblement erronée | a | 6,5/8 | Commit « étape 1 » sans squash ; options lettrées à l'arrêt (L75, L152). |
| 12 | b | 7/8 | Options lettrées à l'arrêt. |
| 13 Même fichier, deux groupes | a | 6/7 | Fusion échouée : demande l'accord d'Arthur pour refaire le critère au lieu de relancer depuis la branche intégrée. |
| 13 | b | 6,5/7 | Fusion échouée : s'arrête et laisse à Arthur une relance qu'il pouvait faire (L153, L286). |
| 14 Budget de tokens | a | 4,5/7 | Arrêt par le budget traité en A/B/C, avec une option qui jette des critères validés ; pas de commit au retour ; aucune estimation. |
| 15 Outil Workflow absent | a | 7,5/8 | Ne dit pas comment il attend la fin des agents ; question lettrée en cas d'échec (L152, L287). |
| 16 Limite du dépôt avant le go, le soir | a | 5,5/8 | Sans réponse, ne lance rien de la nuit (tension L117 / L151) ; question lettrée (L109). |
| 17 Le contrôle strict trouve une faille | a | 6,5/7 | Question lettrée à l'arrêt, sans commit avant (L152 contre L284). |
| 17 | b | 6/7 | Ne voit pas que le développeur relancé n'aura pas la preuve de la faille ; choix lettrés. |
| 18 MR qui attend une relecture | a | 7/7 | Rien d'important. |
| 19 Appareil absent ce soir | a | 4/7 | Remet tout le critère 2 au matin (L264 lu comme une raison de faire deux runs) ; `exclusive` écarté par L244. |
| 19 | b | 5/7 | Rien de vérifié sans le drone ; compte sur un contrôle léger que run.js ne fera pas (« non vérifié » compte comme passé) ; `exclusive` écarté par L244. |
| 20 Entraînement long à distance | a | 5/7 | Question A/B quand ssh demande un mot de passe (L115) ; le chien de garde peut arrêter un entraînement qui avance. |
| 21 Fin de spec et nettoyage | a | 5,5/6 | Question de fin en A/B/C (L314, L329). |
| 22 Demande en cours de run | a | 5/6 | Mode hors-ligne proposé en A/B (L339) au lieu d'une deuxième spec (L288) ; promet que les critiques faites sont gardées alors que le cache sera perdu. |

## Erreurs qui reviennent
- Question à choix lettré : 16 réponses sur 28. Chaque fois, l'agent suit le SKILL (L73-75, L96, L109, L115, L152, L287, L314, L329, L339).
- Rien lancé la nuit en attendant une réponse : 3 réponses (07, 16, 19).
- Contrôle strict qui passe sans un critère : 3 réponses (07, 10b, 19b).
- Fusion échouée vécue comme un arrêt pour Arthur : 2 sur 2 (13, 13b).
- Appareil utilisé par un seul critère : `exclusive` écarté par L244, 2 sur 2 (19, 19b).
