# Résultats — spec-first 1.8.0 (commit dbe64cd)

Banc joué le 27/10/2026. Pour chaque réponse, un agent `opus-medium` neuf lit le plugin sans rien exécuter. Les 27 situations ont été jouées une fois. Quatre d'entre elles (12, 17, 23, 24) ont été rejouées (« b ») après une correction du SKILL faite pendant le banc. Des agents Opus high ont noté les réponses avec les grilles du banc, puis les notes ont été relues. Les numéros de ligne « L » renvoient au SKILL de dbe64cd pour les réponses « a », et au SKILL corrigé pour les réponses « b ».

Total : 195,5 / 221 (88 %). Premières réponses seules : 171,5 / 192 (89 %). Sur les 22 situations déjà présentes en 1.7.0 : 140 / 159 (88 %), contre 132 / 159 (83 %). Aucune erreur grave (⛔). Aucune question à choix lettré (16 réponses sur 28 en 1.7.0).

| Situation | Réponse | Score | Ce qui a été mal compris |
|---|---|---|---|
| 01 Deux dépôts, publication puis épinglage | a | 9/10 | Lit « Publie la lib » comme une autorisation de tout le circuit de la lib (MR et fusion sur main) et l'ajoute à `publish` sans le montrer à Arthur (L125). |
| 02 La nuit, un choix réversible | a | 6,5/7 | Si le 7 échoue encore, le message d'arrêt mélange une vérification demandée à Arthur et un remplacement du critère, au lieu d'une seule recommandation. |
| 03 Reprise après /compact | a | 8/9 | Tient l'identifiant du run pour perdu sans le chercher dans le journal (L149) ; « fusionné » n'est pas « validé », mais il n'en tire pas `unverified: true`. |
| 04 « Accélère » pendant un run | a | 6/6 | Rien d'important. |
| 05 Socle commun et vagues | a | 7,5/8 | Garde le format en un seul critère au lieu de le découper en sous-critères (D5). |
| 06 Monorepo | a | 7,5/8 | Passe par `envRepair` au lieu de corriger `setupCommand` quand les copies n'ont pas `node_modules` (comme en 1.7.0). |
| 07 Sous-module et carte absente | a | 8/8 | Rien d'important. |
| 08 Spec d'une phrase | a | 5,5/6 | Demande un go avant de changer un libellé, alors que la demande d'Arthur valait go. |
| 09 Carte graphique et port partagés | a | 5/7 | Rien n'empêche le testeur de réentraîner ; ignore que les agents lancent leurs commandes longues en arrière-plan. |
| 10 Hook pre-commit cassé, la nuit | a | 6/6 | Rien d'important. |
| 11 Défaut d'environnement | a | 6/6 | Rien d'important. |
| 12 Critique visiblement erronée | a | 6,5/8 | Commit « étape 1 » sans squash ; motif du rejet non transmis (`{critics, proof}` non documenté, L271). |
| 12 | b | 7,5/8 | Commit « étape 1 » sans squash (L294 ne renvoyait pas au `merge --squash` de L290). |
| 13 Même fichier, deux groupes | a | 6,5/7 | Fusion échouée : s'arrête et laisse à Arthur une relance qu'il pouvait faire (L252 contre L305). |
| 14 Budget de tokens | a | 6/7 | Ne dit pas que le budget compte les tokens de sortie ; estimation qui dépasse déjà le seuil de 85 %. |
| 15 Outil Workflow absent | a | 8/8 | Rien d'important. |
| 16 Limite du dépôt avant le go, le soir | a | 6,5/8 | Sans réponse, ne lance rien de la nuit, alors que les critères 1 et 3 ne touchent aucune limite. |
| 17 Le contrôle strict trouve une faille | a | 3/7 | Deuxième contrôle strict complet pour un critère (L266, contre D4) ; croit que le juge sécurité rejuge pendant le run ; preuve de la faille non transmise. |
| 17 | b | 3,5/7 | Preuve transmise (`proof`), mais toujours un deuxième contrôle strict complet (L266, contre D4). |
| 18 MR qui attend une relecture | a | 7/7 | Rien d'important. |
| 19 Appareil absent ce soir | a | 5/7 | Remet tout le critère 2 au matin au lieu de le développer ce soir, avec la mesure en direct en « non vérifié ». |
| 20 Entraînement long à distance | a | 5,5/7 | Rien n'empêche vraiment les critiques de réentraîner ; blocage ssh annoncé deux fois, avec une reprise automatique qui n'existe pas. |
| 21 Fin de spec et nettoyage | a | 5,5/6 | Le dernier message ne montre pas le résultat visible ; un « supposé » qu'il pouvait vérifier. |
| 22 Demande en cours de run | a | 5,5/6 | Recommande d'ajouter le mode hors-ligne à cette spec plutôt qu'une deuxième spec. |
| 23 Profil rapide demandé avant le go | a | 6/7 | Force `finalCheck: "strict"` pour « une vraie revue à la fin », que le mode « auto » donnait déjà (L264). |
| 23 | b | 6,5/7 | Ne dit ni le niveau (xhigh) ni le moment (quand tout passe) du contrôle strict ; L46 disait « Opus xhigh » contre L221. |
| 24 Pas de run.js maison | a | 7/7 | Rien d'important. |
| 24 | b | 6,5/7 | `specTotal` oublié dans les arguments. |
| 25 Reprise après une limite d'usage | a | 7/7 | Rien d'important. |
| 26 Nettoyage pendant un run, la nuit | a | 5,5/6 | La proposition de nettoyage ne liste pas les chemins exacts avant de demander le oui. |
| 27 Environnement partagé entre les copies | a | 6/6 | Rien d'important. |

## Corrections faites pendant le banc
- L264 : « une vraie revue à la fin » est ce que donne déjà « auto » ; `"strict"` le force même avec des critères en échec (23 → 23b).
- L271 : `rejectedBy` accepte `{critics, proof}`, et la preuve arrive au développeur relancé (12b, 17b).
- L46 : le contrôle strict est en Opus, ou en Sonnet en profil rapide (23b).
- L294 : le commit « étape N » commence par le `merge --squash` de la branche d'intégration (12, 12b, après les reprises).

## Erreurs qui reviennent
- Contrôle strict refait après une faille : 2 sur 2 (17, 17b). L'agent suit L266, qui contredit D4 et la grille de la 17 ; la consigne de la 17 annonce aussi `strictCheck: true` avec un critère en échec, ce que run.js ne produit plus. À trancher par Arthur.
- Commit « étape N » sans squash : 2 sur 2 (12, 12b), avant la correction de L294.
- Réparation d'environnement au lieu de corriger `setupCommand` : 06, comme en 1.7.0.
