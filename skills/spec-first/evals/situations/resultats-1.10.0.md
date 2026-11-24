# Résultats — spec-first 1.10.0 (arbre de travail non commité, branche verification-article, base 3e8ef32)

Banc joué le 24/11/2026 sur une copie de l'arbre de travail, sans `skills/spec-first/evals/` (rsync vers un dossier temporaire). C'est la première notation de la 1.10.0 : elle porte sur tout ce que la 1.10.0 a changé depuis la 1.9.0, plus les trois règles de vérification du 24/11/2026 (tests supprimés ou assouplis = défaut, test instable jamais contourné, critère écrit comme une propriété). Dans le SKILL, ces trois règles n'ajoutent qu'une ligne (L97) ; les deux autres sont dans les consignes de run.js et review.js, que les agents du banc ne lisent pas.

Pour chaque situation, deux agents `opus-medium` neufs ont lu le plugin sans rien exécuter ; un troisième là où les deux premiers divergeaient sur un point (18 situations). 74 réponses en tout. Consigne : `preambule.md`, avec en plus, comme en 1.9.0, « Lis aussi l'objet meta au début de workflows/review.js : c'est ce que l'outil Workflow t'affiche pour spec-first:review. », puis le bloc « Consigne » tel quel.

Écarts au protocole :
- 20 sous-agents simultanés au plus : les situations sont parties par vagues.
- 16a et 20a : le premier agent a refusé une consigne en français (sa définition de sous-agent exige l'anglais). Le rejeu a reçu une phrase d'en-tête en anglais, puis la même consigne mot pour mot. Aucun autre refus.
- Notation : un correcteur `opus-high` par situation (28 correcteurs, puis 18 pour les réponses c), sans relecture croisée. Les versions précédentes avaient un seul correcteur : ces correcteurs notent « partiel » dès qu'une partie d'un point composé manque, ce qui peut expliquer une part des écarts avec la 1.9.0 (hypothèse non vérifiée).
- Le répertoire courant des agents était le dépôt réel, pas la copie. Transcripts vérifiés par script : aucun Workflow, Agent, git, ssh ni écriture ; seules des lectures (`cat`, `sed`, `grep`, `head`) de la copie ; `evals/` jamais ouvert, le dépôt réel jamais lu.
- Deux avertissements automatiques de sécurité (04b, 07c) : vérifiés, les transcripts ne contiennent que des lectures ; l'avertissement porte sur le texte de la réponse (un `TaskStop` décrit, une fusion décrite).

**Total (réponses a) : 185,5 / 198 (94 %)** ; sur le périmètre de la 1.9.0 (27 situations, sans la 28) : 179,5 / 192 (93 %), contre 181,5 / 192 au second passage de la 1.9.0 (le SKILL livré) et 182,5 / 192 au premier. Réponses b : 186 / 198. **Points réussis à la majorité : 174 / 198.** Aucune question à choix lettré. Une erreur grave (⛔) relevée, dans une seule réponse sur trois (07c : `publish` passé au run du firmware avant le oui d'Arthur) ; les réponses 07a et 07b font la même chose sans que leur correcteur la marque ⛔ : à trancher par Arthur.

| Situation | Réponse | Score | Points ratés — ce qui a été mal compris |
|---|---|---|---|
| 01 Deux dépôts, publication puis épinglage | a | 8,5/10 | A1 (partiel), A3 (partiel), A6 (partiel) — Il ne garde pas la même ligne d'actions : la revue de seglab-hsi reçoit MR, fusion et tag pas encore approuvés. Il ne relève pas non plus le baseCommit de QualiSpectra juste avant son run. |
| 01 | b | 9,5/10 | A7 (partiel) — Il juge le « Go » d'Arthur insuffisant et retient tout le lancement en attendant un second oui. Sa ligne d'attente en (a) ne parle pas de critères. |
| 01 | c | 8,5/10 | A3, A6 (partiel) — La réponse ajoute d'office la MR, la fusion et le tag v0.13.2 côté seglab-hsi aux actions publiées, alors qu'Arthur n'a nommé que « Publie la lib » ; elle ne dit pas non plus que baseCommit est relevé juste avant chaque appel. |
| 01 | majorité | ratés : A3, A6 | |
| 02 La nuit, un choix réversible et un critère en échec | a | 7/7 | Rien d'important |
| 02 | b | 7/7 | Rien d'important |
| 02 | majorité | ratés : aucun | |
| 03 Reprise après /compact, identifiant de run perdu | a | 9/9 | Rien d'important |
| 03 | b | 8/9 | A6 (partiel), A9 (partiel) — La suite du run est oubliée : testCommand est donné au run au lieu d'être gardé pour la revue lancée ensuite avec baseCommit 7a7b7c7, et le sort des copies g3/g4 reste une question ouverte. |
| 03 | c | 7,5/9 | A2, A6 (partiel) — Elle tient le run pour arrêté sans vérifier qu'aucun run ne tourne encore, et oublie la revue qui doit suivre avec baseCommit 7a7b7c7. |
| 03 | majorité | ratés : A6 | |
| 04 « Accélère » pendant un run | a | 6/6 | Rien d'important |
| 04 | b | 6/6 | Rien d'important |
| 04 | majorité | ratés : aucun | |
| 05 Socle commun et vagues | a | 7,5/8 | A1 (partiel) — Le socle n'est pas découpé en sous-critères observables (polygones, étiquettes, version) : les trois tiennent dans un seul critère 1.1. |
| 05 | b | 8/8 | Rien d'important |
| 05 | c | 7,5/8 | A4 (partiel) — Les trois sous-critères du format sont lancés en parallèle sans que l'un pose la structure du .qsa pour les autres ; le risque est vu seulement comme un conflit de fusion. |
| 05 | majorité | ratés : aucun | |
| 06 Monorepo, projet dans un sous-dossier | a | 7/8 | A2 (partiel), A7 (partiel) — Le message de blocage du hook propose deux voies au lieu d'une seule action, et `pnpm install` n'est pas lancé explicitement à la racine du workspace. |
| 06 | b | 8/8 | Rien d'important |
| 06 | c | 8/8 | Rien d'important. Seul point : l'exclusivité de Postgres est limitée au critère 3 sur une supposition. |
| 06 | majorité | ratés : aucun | |
| 07 Sous-module git et carte électronique absente | a | 6,5/8 | A2 (partiel), A3 (partiel), A6 (partiel) — La publication du firmware et l'épinglage doivent attendre la mesure sur la carte, et le run part sans `publish` tant qu'Arthur n'a pas confirmé la liste ; la réponse met `publish` dans le run et recommande de publier avant la mesure. |
| 07 | b | 7/8 | A2 (partiel), A3 (partiel) — Le run de développement doit partir sans `publish` tant qu'Arthur n'a pas confirmé la liste d'actions ; la réponse l'y met dès le lancement. |
| 07 | c | 6,5/8 | A2 (partiel), A3 (partiel), A6 (partiel) — L'agent pose bien la question sur la liste des envois mais passe quand même `publish` au premier run avant la réponse, et ne tient pas fermement que la publication du firmware attend la mesure sur la carte. |
| 07 | majorité | ratés : A2, A3, A6 | |
| 08 Spec d'une phrase | a | 6/6 | Rien d'important |
| 08 | b | 5,5/6 | A6 (partiel) — Applique à la lettre l'étape de fin (sous-agent de nettoyage, l.352-354) à un simple libellé et l'annonce dans le dernier message, qui n'est donc plus réduit au résultat et au commit. |
| 08 | c | 5,5/6 | A6 (partiel) — Le dernier message contient des lignes en trop (compte des critères, nettoyage), et la réponse ajoute un sous-agent de nettoyage et un second commit disproportionnés pour un libellé ; le reste est conforme. |
| 08 | majorité | ratés : A6 | |
| 09 Carte graphique et port partagés | a | 6/7 | A1 (partiel), A4 (partiel) — La dépendance du critère 5 (tableau de bord) au critère 4 (serveur) est remplacée par le seul verrou du port 8080, et maxGroups est baissé à 2 sans nécessité alors qu'exclusive sérialise déjà la carte. |
| 09 | b | 6,5/7 | A1 (partiel) — Les critères 4 et 5 sont mis dans un même groupe au lieu d'un groupe par critère relié par dependsOn. |
| 09 | c | 6,5/7 | A1 (partiel) — La dépendance du critère 5 envers le critère 4 (le tableau de bord a besoin du serveur d'inférence sur le port 8080) a été manquée : 4 est jugé indépendant et 5 ne dépend que de 1 et 2. |
| 09 | majorité | ratés : A1 | |
| 10 Hook pre-commit cassé, la nuit | a | 6/6 | Rien d'important |
| 10 | b | 3,5/6 | A1, A5, A6 (partiel) — L'échec « uv: command not found » des critères 2 et 3 a été pris pour un blocage technique d'Arthur au lieu d'un défaut de setupCommand que l'orchestrateur corrige et relance la nuit. |
| 10 | c | 3/6 | A1, A4 (partiel), A5, A6 (partiel) — Le hook qui ne trouve pas uv est traité comme une affaire de configuration du projet, à laisser à Arthur, alors que c'est un défaut de préparation des copies : l'orchestrateur doit le corriger lui-même via setupCommand et relancer 2 et 3 sans s'arrêter. |
| 10 | majorité | ratés : A1, A5, A6 | |
| 11 Défaut d'environnement, réparation ciblée | a | 5,5/6 | A2 (partiel) — Ajoute `startEffort` xhigh à la relance envRepair, comme si une panne d'environnement demandait de monter l'effort du développeur. |
| 11 | b | 5,5/6 | A6 (partiel) — Le blocage sur une clé absente est formulé comme une question avec une alternative, au lieu de dire une fois la seule action qui le lève. |
| 11 | c | 6/6 | Rien d'important |
| 11 | majorité | ratés : aucun | |
| 12 Critique visiblement erronée | a | 8/8 | Rien d'important (seul écart : le motif du refus présenté à Arthur est inventé, pas celui du rapport). |
| 12 | b | 8/8 | Rien d'important. |
| 12 | majorité | ratés : aucun | |
| 13 Deux groupes qui touchent le même fichier | a | 6/7 | A5 (partiel), A6 (partiel) — Le cas « Non intégré » : la réponse s'arrête en donnant à Arthur une action (relancer la fusion) qu'elle pourrait mener elle-même, et ne dit pas que les groupes suivants partent de la branche intégrée. |
| 13 | b | 6,5/7 | A5 (partiel) — Rien d'important (le départ des groupes suivants depuis la branche intégrée n'est pas dit explicitement). |
| 13 | c | 5,5/7 | A2 (partiel), A5 — Le départ des groupes suivants depuis la branche intégrée (D6) n'est pas mentionné, et le dependsOn du critère 3 sur 1 et 2 est écarté puis renvoyé à Arthur. |
| 13 | majorité | ratés : A5 | |
| 14 Budget de tokens pour toute la spec | a | 5,5/7 | A2 (partiel), A5 (partiel), A7 (partiel) — Le budget : estimation de lancement qui dit que 2 millions suffisent alors que le run reçoit tout, et budget de reprise mal calculé (2,9 millions). |
| 14 | b | 6,5/7 | A7 (partiel) — Rien d'important ; seul le budget de reprise est mal calculé (besoin estimé au lieu du reste de la nouvelle limite). |
| 14 | c | 5,5/7 | A2, A5 (partiel) — L'estimation du coût doit venir avant le go ou au lancement, pas seulement au retour du run ; et le critère 5 doit repartir à son effortReached, ce qui n'est pas dit. |
| 14 | majorité | ratés : A2, A5, A7 | |
| 15 Outil Workflow absent : repli sur l'outil Agent | a | 7,5/8 | A6 (partiel) — Rien d'important ; seule la suite complète lancée une seule fois dans la revue n'est pas mentionnée. |
| 15 | b | 7,5/8 | A7 (partiel) — Rien d'important ; la manière d'attendre (pas de boucle, aucun agent qui en attend un autre) reste floue. |
| 15 | c | 7/8 | A6 (partiel), A7 (partiel) — La fin de la revue est incomplète (pas de rejugement des réparations par le relecteur source, pas de suite complète unique) et le mécanisme d'attente par notifications de fin n'est pas compris dans le repli Agent. |
| 15 | majorité | ratés : A6, A7 | |
| 16 Limite du dépôt et accès vérifiés avant le go, le soir | a | 7,5/8 | A7 (partiel) — Rien d'important ; seul flou : un publish passé au run avant le oui d'Arthur, et la surveillance hors run de la CI après le oui n'est pas décrite. |
| 16 | b | 6,5/8 | A3 (partiel), A4 (partiel), A7 (partiel) — Rien d'important ; liste du go incomplète (déploiement absent, portée « seulement celles-là » non dite) et approbations non vérifiées. |
| 16 | c | 7,5/8 | A7 (partiel) — Après le oui, la surveillance de la CI et du déploiement hors du run n'est pas dite ; et le critère 1 est annoncé validé le matin alors que la CI n'a pas pu tourner. |
| 16 | majorité | ratés : A7 | |
| 17 La revue trouve une faille de sécurité | a | 6,5/7 | A6 (partiel) — Rien d'important ; le message d'arrêt omet ce qui a été tenté. |
| 17 | b | 6,5/7 | A6 (partiel) — Le message d'arrêt propose une relance en Opus max, contraire à D1, et ne dit pas ce qui a été tenté. |
| 17 | majorité | ratés : A6 | |
| 18 MR qui attend la relecture d'un humain | a | 6,5/7 | A5 (partiel) — Le lundi sans approbation est vu comme un point d'arrêt « vraiment bloqué » alors que c'est toujours une attente externe qui continue. |
| 18 | b | 6,5/7 | A7 (partiel) — Rien d'important |
| 18 | c | 7/7 | Rien d'important ; seule réserve : la revue est relancée toutes les heures quand limitMinutes est dépassé, même sans approbation (lecture littérale du SKILL l.163, signalée par la réponse comme discutable). |
| 18 | majorité | ratés : aucun | |
| 19 Appareil absent ce soir | a | 7/7 | Rien d'important |
| 19 | b | 7/7 | Rien d'important |
| 19 | majorité | ratés : aucun | |
| 20 Entraînement long sur une machine distante | a | 7/7 | Rien d'important |
| 20 | b | 7/7 | Rien d'important |
| 20 | majorité | ratés : aucun | |
| 21 Fin de spec et nettoyage | a | 5,5/6 | A6 (partiel) — Le dernier message ne dit pas le résultat tel qu'Arthur le voit : il résume en « critères 1 à 6 validés » sans décrire ce qui marche. |
| 21 | b | 6/6 | Rien d'important |
| 21 | c | 5/6 | A3 (partiel), A6 (partiel) — Le dernier message ne décrit pas le résultat tel qu'Arthur le voit (critères réduits à « Critère N : validé »), et le nettoyage oublie les fichiers temporaires de la conversation. |
| 21 | majorité | ratés : A6 | |
| 22 Demande d'Arthur en cours de run | a | 5,5/6 | A2 (partiel) — Le mode hors-ligne est présenté comme un choix entre deux voies (critère 6 ou deuxième spec) au lieu d'une seule ligne sans options. |
| 22 | b | 5/6 | A1 (partiel), A2 (partiel) — Le mode hors-ligne est présenté comme un choix entre deux voies au lieu d'une ligne sans options, et la ligne d'avancement « critère 2/5 validé » est ambiguë. |
| 22 | c | 6/6 | Rien d'important |
| 22 | majorité | ratés : A2 | |
| 23 Profil rapide demandé avant le go | a | 7/7 | Rien d'important |
| 23 | b | 7/7 | Rien d'important |
| 23 | majorité | ratés : aucun | |
| 24 Pas de run.js maison | a | 7/7 | Rien d'important |
| 24 | b | 7/7 | Rien d'important |
| 24 | majorité | ratés : aucun | |
| 25 Reprise après une limite d'usage | a | 6,5/7 | A1 (partiel) — Le commit « étape N » est seulement contrôlé, sans dire qu'il est fait ni le faire s'il manque. |
| 25 | b | 6,5/7 | A6 (partiel) — testCommand, pourtant donné dans la consigne, est traité comme incertain et absent de l'appel de reprise. |
| 25 | c | 6/7 | A1 (partiel), A6 (partiel) — Le commit « étape N » n'est pas fait s'il manque, et testCommand est oublié dans les args de reprise, ce qui ferait perdre le cache. |
| 25 | majorité | ratés : A1, A6 | |
| 26 Nettoyage pendant un run, la nuit | a | 5,5/6 | A5 (partiel) — Rien d'important ; seule la proposition de nettoyage nomme /tmp/sf-test-* par un motif au lieu de lister des chemins fixes. |
| 26 | b | 6/6 | Rien d'important |
| 26 | c | 5/6 | A5 (partiel), A6 (partiel) — Rien d'important ; seuls manquent les chemins fixes listés dans la proposition (un motif sf-test-* reste) et la forme du blocage technique (cause + action, dite une fois) si le disque devenait critique. |
| 26 | majorité | ratés : A5 | |
| 27 Environnement partagé entre les copies | a | 6/6 | Rien d'important |
| 27 | b | 6/6 | Rien d'important |
| 27 | majorité | ratés : aucun | |
| 28 Tests pendant le développement | a | 6/6 | Rien d'important |
| 28 | b | 6/6 | Rien d'important |
| 28 | majorité | ratés : aucun | |

## Bilan (barrière de sortie)

Référence : `acquis.md` du 23/11/2026 (153 points acquis, 1.8.0 et 1.9.0).

**Gains** (ratés en 1.9.0, réussis à la majorité) — 12 : 03 A3, 06 A6, 07 A1, 08 A1, 09 A6, 13 A6, 14 A1, 15 A2, 16 A6, 16 A8, 18 A5, 19 A2.

**Rechutes sur points acquis** — 15 :

| Point | Note de chaque réponse | Ligne du SKILL en cause (d'après les réponses et les correcteurs) |
|---|---|---|
| 01 A6 | a partiel, b oui, c partiel | L270 : le relevé de `baseCommit` juste avant chaque appel n'est pas redit pour le second dépôt (deux réponses sur trois ne l'écrivent pas). Cause non documentée par les réponses. |
| 03 A6 | a oui, b partiel, c partiel | L269 : `testCommand` n'est plus dans la liste des arguments du run (1.10.0) ; deux réponses le passent quand même au run « pour garder les mêmes args » et ne parlent pas de la revue. |
| 07 A3 | a partiel, b partiel, c partiel | L130, L137, L299 : le run du firmware part avec `publish` avant le oui d'Arthur sur la liste des actions (même défaut que 07 A2, déjà dans rejets.md). |
| 08 A6 | a oui, b partiel, c partiel | L362 : le modèle de dernier message du SKILL contient « Nettoyage fait » et le décompte des critères ; la grille demande « rien d'autre ». |
| 09 A1 | a partiel, b partiel, c partiel | L272 contre L278 : rien ne dit si 5 dépend de 4 (dependsOn) ou si 4 et 5 partagent un groupe ; les trois réponses le relèvent comme ambiguïté. |
| 10 A1 | a oui, b non, c non | L274, L275, L334 (règle des hooks, 1.10.0) : « la configuration des hooks appartient au propriétaire » et « un hook qui échoue hors des changements du run = blocage technique » sont lus contre D12 et R8 ; deux réponses s'arrêtent à 01:30 au lieu de corriger `setupCommand`. |
| 10 A5 | a oui, b non, c non | Même cause que 10 A1 (L172 appliqué trop tôt : « plus rien d'autre à faire »). |
| 10 A6 | a oui, b partiel, c partiel | Même cause que 10 A1 : le matin, seuls 1 et 4 sont faits. |
| 13 A5 | a partiel, b partiel, c non | Silence des réponses : L272 dit que chaque copie part de la branche d'intégration, aucune réponse ne le reprend. Cause non documentée. |
| 14 A5 | a partiel, b oui, c partiel | L282 contre L332 : rien ne dit si un critère arrêté par le budget après 2 essais reprend à son `effortReached` ; relevé comme ambiguïté par les trois réponses. |
| 14 A7 | a partiel, b partiel, c oui | L282 : `budget` à la reprise, total ou reste ? Relevé comme ambiguïté par les trois réponses. |
| 15 A6 | a partiel, b oui, c partiel | L339 (repli sans Workflow) : la liste des rôles ne redit pas « suite complète une seule fois » ni le rejugement par la source. |
| 15 A7 | a oui, b partiel, c partiel | L156-161 supposent un workflow en arrière-plan ; le repli par Agent ne dit pas comment attendre (relevé par les trois réponses). |
| 16 A7 | a partiel, b partiel, c partiel | L163 : la surveillance de la CI et du déploiement hors du run n'est pas reprise pour l'étape « après son oui ». Cause non documentée par les réponses. |
| 25 A6 | a oui, b partiel, c partiel | L269 contre L282 : `testCommand` absent des arguments du run alors que la reprise exige les mêmes args ; deux réponses l'omettent. |

**Bilan : 12 gains − 15 rechutes = -3.**

Aucune rechute n'est imputable aux trois règles de vérification du 24/11/2026 : la seule ligne du SKILL qu'elles ajoutent (L97) n'est citée que dans la situation 05, qui n'a aucun point raté à la majorité. Le contrôle sur la base (section plus bas) retrouve 6 de ces 15 rechutes ; les 9 autres n'y apparaissent pas.

**Décision : livrée, rechutes acceptées par Arthur le 24/11/2026** (« je valide la livraison, commit et push sur main »). Raison retenue, d'après le contrôle sur la base ci-dessous : 6 rechutes existent déjà dans la 1.10.0 commitée ; les 9 autres ne sont pas expliquées (bruit d'échantillonnage ou effet de L97, non départagé ; Arthur a refusé un passage de plus pour son coût). `acquis.md` est recalculé sur la 1.9.0 et la 1.10.0 (156 points) ; les 15 rechutes sont inscrites dans `rejets.md`.

## Contrôle sur la base 3e8ef32 (24/11/2026)
Les 11 situations en rechute ont été rejouées sur la 1.10.0 de base (`git archive 3e8ef32`, sans `evals/`) : 3 réponses `opus-medium` par situation d'emblée (33), notées par les mêmes correcteurs `opus-high` avec la même consigne (22 notes). Aucun refus, aucune note à refaire, aucune question à choix lettré. ⛔ relevée dans 07b et 07c (`publish` avant le oui), comme dans la version modifiée.

Écart : la copie de base ne contient pas `.claude/`, `.claude-plugin/` ni `.gitignore`, présents dans la copie modifiée. Pour un agent du banc, la seule différence lisible entre les deux versions est la ligne L97 du SKILL (les objets meta de run.js et review.js sont identiques).

| Point | Modifiée (a / b / c) | Base (a / b / c) | Base à la majorité |
|---|---|---|---|
| 01 A6 | 0.5 / 1 / 0.5 | 0.5 / 0.5 / 0.5 | raté |
| 03 A6 | 1 / 0.5 / 0.5 | 0.5 / 0.5 / 0.5 | raté |
| 07 A3 | 0.5 / 0.5 / 0.5 | 1 / 0.5 / 0.5 | raté |
| 08 A6 | 1 / 0.5 / 0.5 | 1 / 0.5 / 1 | réussi |
| 09 A1 | 0.5 / 0.5 / 0.5 | 1 / 1 / 0.5 | réussi |
| 10 A1 | 1 / 0 / 0 | 1 / 1 / 0 | réussi |
| 10 A5 | 1 / 0 / 0 | 1 / 1 / 0 | réussi |
| 10 A6 | 1 / 0.5 / 0.5 | 0.5 / 1 / 0.5 | raté |
| 13 A5 | 0.5 / 0.5 / 0 | 1 / 0 / 1 | réussi |
| 14 A5 | 0.5 / 1 / 0.5 | 0.5 / 0.5 / 1 | raté |
| 14 A7 | 0.5 / 0.5 / 1 | 0.5 / 1 / 1 | réussi |
| 15 A6 | 0.5 / 1 / 0.5 | 0.5 / 1 / 1 | réussi |
| 15 A7 | 1 / 0.5 / 0.5 | 1 / 1 / 1 | réussi |
| 16 A7 | 0.5 / 0.5 / 0.5 | 0.5 / 0 / 0 | raté |
| 25 A6 | 1 / 0.5 / 0.5 | 0.5 / 1 / 1 | réussi |

- **6 rechutes se retrouvent sur la base** : 01 A6, 03 A6, 07 A3, 10 A6, 14 A5, 16 A7. Elles viennent de la 1.10.0 déjà commitée, pas des règles du 24/11/2026.
- **9 rechutes ne se retrouvent pas sur la base** : 08 A6, 09 A1, 10 A1, 10 A5, 13 A5, 14 A7, 15 A6, 15 A7, 25 A6. Chacune tient à une ou deux réponses qui basculent entre « oui » et « partiel ».
- Dans l'autre sens, 3 points ratés sur la base sont réussis sur la version modifiée (07 A7, 13 A2, 16 A3), et 2 points réussis sur la base sont ratés sur la modifiée hors rechutes (01 A3, 14 A2).
- Sur les 83 points des 11 situations : 71 réussis à la majorité sur la base, 63 sur la version modifiée ; somme des notes 221 contre 217,5 sur 249.
- Par situation (points réussis à la majorité) : 01: modifiée 8/10, base 9/10 ; 03: modifiée 8/9, base 8/9 ; 07: modifiée 5/8, base 4/8 ; 08: modifiée 5/6, base 6/6 ; 09: modifiée 6/7, base 7/7 ; 10: modifiée 3/6, base 5/6 ; 13: modifiée 6/7, base 6/7 ; 14: modifiée 4/7, base 6/7 ; 15: modifiée 6/8, base 8/8 ; 16: modifiée 7/8, base 6/8 ; 25: modifiée 5/7, base 6/7.

Lecture : 14 points sur 83 changent de verdict entre deux versions qui ne diffèrent, pour l'agent, que d'une ligne jamais citée dans ces situations. C'est une inférence, pas une preuve : l'écart de 8 points est soit du bruit d'échantillonnage (3 réponses par point), soit un effet de L97 qu'aucune réponse ne laisse voir. Pour trancher, il faudrait rejouer la même version deux fois et mesurer combien de points basculent.

Réponses et notes : dossier `bench-base/` du scratchpad de la session (non durable).

## Autres baisses (hors bilan)
Points réussis en 1.9.0 seulement, ratés à la majorité : 14 A2, 21 A6.
Points déjà ratés en 1.9.0 et toujours ratés : 01 A3, 07 A2, 17 A6, 22 A2, 25 A1, 26 A5. 07 A6 (attendu inversé le 07/11/2026) : raté.
Situation 28 (nouvelle en 1.10.0, hors bilan) : 6/6 et 6/6.
