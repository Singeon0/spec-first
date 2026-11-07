# Résultats — spec-first 1.9.0 (arbre de travail non commité, base b94b7c0)

Banc joué le 07/11/2026 sur une copie de l'arbre de travail, sans `skills/spec-first/evals/` (`rsync … /tmp/sf-1.9.0`). Pour chaque situation, un agent `opus-medium` neuf a lu le plugin sans rien exécuter. Sa consigne : `preambule.md`, avec en plus, après la mention de run.js, « Lis aussi l'objet meta au début de workflows/review.js : c'est ce que l'outil Workflow t'affiche pour spec-first:review. », puis le bloc « Consigne » de la situation, tel quel.

Écarts au protocole :
- La session limite à 20 le nombre de sous-agents simultanés. Les situations 01 à 19 sont donc parties ensemble, puis 20 à 27 dès que des places se sont libérées.
- Un seul correcteur, sans relecture croisée.
- Trois situations surprenantes ou en recul (15, 19, 22) ont été rejouées une fois (« b »). Le total compte les premières réponses ; les rejeux ne servent qu'à dire si l'écart vient du SKILL. Rejeux : 15b 8/8, 19b 6/7, 22b 5,5/6.
- 19b : le premier agent a refusé de travailler sur une consigne en français (sa définition de sous-agent exige l'anglais). Le second a reçu une phrase d'en-tête en anglais, suivie de la même consigne mot pour mot. Aucun des 30 autres agents n'a refusé.

Transcripts vérifiés : aucun Workflow, Agent, git, ssh ni écriture. Les seules commandes lancées sont `cat`, `grep`, `sed`, `awk` et `wc` sur `/tmp/sf-1.9.0`. `evals/` n'a jamais été ouvert.

Notation : grilles du banc + `decisions.md`. D15 remplace la partie « contrôle strict » de D14. Un point rendu caduc par D15 est noté selon son équivalent pour la revue (la revue une fois par spec quand tout passe, `focus` au lieu d'un deuxième panel, `finalCheck: false` permis en rapide). Ces points sont marqués « R » et listés plus bas, à réaligner. Les numéros « L » renvoient au SKILL 1.9.0 de l'arbre de travail.

**Total (premières réponses) : 182,5 / 192 (95 %)**, contre 171,5 / 192 (89 %) pour les premières réponses de la 1.8.0. Sur le même périmètre que le total 1.8.0, avec les rejeux « b » de la 1.8.0 : 195,5 / 221 (88 %). Aucune erreur grave (⛔). Aucune question à choix lettré.

| Situation | Réponse | Score | 1.8.0 (a / b) | Ce qui a été mal compris |
|---|---|---|---|---|
| 01 Deux dépôts, publication puis épinglage | a | 10/10 | 9 | Rien d'important. Les actions de publication de la lib, qu'Arthur n'a pas nommées, lui sont montrées avec un oui/non (corrige la 1.8.0), mais elles sont déjà dans le `publish` du run avant sa réponse. Le « run qui rend `waiting` » de la consigne est relu comme la revue (consigne à réaligner). |
| 02 La nuit, un choix réversible | a | 7/7 | 6,5 | Rien d'important. R : `specBaseCommit` remplacé par le `baseCommit` 4c1d2e9 de la revue. |
| 03 Reprise après /compact | a | 8/9 | 8 | Comme en 1.8.0 : tient l'identifiant du run pour perdu sans le chercher dans le journal (L151) ; voit que « fusionné » n'est pas « validé », mais n'en tire pas `unverified: true`. |
| 04 « Accélère » pendant un run | a | 6/6 | 6 | Rien d'important. |
| 05 Socle commun et vagues | a | 8/8 | 7,5 | Rien d'important (format découpé en 1.1 à 1.3, dans un même groupe). R : A3, A7. |
| 06 Monorepo | a | 8/8 | 7,5 | Rien d'important. Corrige d'abord `setupCommand` (la 1.8.0 passait par `envRepair`). |
| 07 Sous-module et carte absente | a | 8/8 | 8 | Rien d'important pour la grille. Défaut à côté : la revue du firmware reçoit `publish.criteria: []`, que review.js refuse (`{error}`). R : A6. |
| 08 Spec d'une phrase | a | 6/6 | 5,5 | Rien d'important. |
| 09 Carte graphique et port partagés | a | 6/7 | 5 | Rien n'empêche le testeur du critère 3 de réentraîner. Le point est relevé comme un silence du SKILL (L255). |
| 10 Hook pre-commit cassé, la nuit | a | 6/6 | 6 | Rien d'important. R : A4. |
| 11 Défaut d'environnement | a | 6/6 | 6 | Rien d'important. R : A2, A4. |
| 12 Critique visiblement erronée | a | 8/8 | 6,5 / 7,5 | Rien d'important (squash fait, preuve transmise par `rejectedBy {critics, proof}`). |
| 13 Même fichier, deux groupes | a | 6,5/7 | 6,5 | Comme en 1.8.0 : sur une fusion échouée, s'arrête et donne comme action une relance qu'il pouvait faire lui-même (L163 et L319 contre L151 et L318). |
| 14 Budget de tokens | a | 6,5/7 | 6 | Ne dit pas à Arthur que le budget compte les tokens de sortie, et ne sait pas répartir les 2 M entre le run et la revue (relevé comme ambiguïté, L270 et L279). |
| 15 Outil Workflow absent | a | 7,5/8 | 8 | Agents `general-purpose` avec `model: opus` et un effort explicite, alors que la grille veut un profil opus-* (L219, L324 : rien sur les profils). |
| 15 | b | 8/8 | | Profils opus-medium, opus-high et opus-xhigh, avec modèle et effort explicites : l'écart de la réponse a vient de la variance d'un agent, sur un point que le SKILL ne règle pas (les deux agents le relèvent). |
| 16 Limite du dépôt avant le go, le soir | a | 6,5/8 | 6,5 | Comme en 1.8.0 : sans réponse, rien ne tourne la nuit (L125 contre L119 et L161) ; pas de ligne du matin. |
| 17 Le contrôle strict trouve une faille | a | 6,5/7 | 3 / 3,5 (reprise : 6,5 et 7) | Lit le rapport ancien comme une revue faite, relance le 6 avec `rejectedBy {security, proof}`, puis lance la revue en `focus` sur le relecteur sécurité, sans second panel. Défaut : le message d'arrêt recommande « le modèle le plus puissant » (Opus max : question de modèle, L86 contre L218), avec un repli qui retire le filtre de la spec. R : A2, A3, A4, A5. |
| 18 MR qui attend une relecture | a | 7/7 | 7 | Rien d'important (relit `wf_51aa09` comme l'identifiant de la revue). |
| 19 Appareil absent ce soir | a | 6/7 | 5 | Lance la revue complète ce soir, avec le critère 2 « non vérifié » (L314 contre L278), puis le matin un `focus` sur le 2 avec un relecteur inventé (« usage (supposé) »). Ne parle pas de trames enregistrées pour aller plus loin sans le drone. R : A4, A6. |
| 19 | b | 6/7 | | Même conduite que la réponse a : revue complète le soir, puis le matin un `focus` sur le 2 avec « usage (supposé) ». 2 fois sur 2, l'écart vient du plugin. run.js:1491 met `reviewReady: true` dès que tout est « validé » ou « non vérifié », y compris quand l'appareil manque. SKILL L306, L311 et L314 envoient ce cas à la revue complète. Aucun relecteur ne convient pour un `focus` sur un critère que personne n'a rejeté (L284). Rejouée avec une phrase d'en-tête en anglais : un premier agent avait refusé la consigne en français. |
| 20 Entraînement long à distance | a | 6/7 | 5,5 | Rien n'empêche le testeur du critère 2 de réentraîner 5 h (relevé comme manque du plugin). |
| 21 Fin de spec et nettoyage | a | 6/6 | 5,5 | Rien d'important. Le rapport de la consigne (contrôle strict à 6 juges) est pris comme la revue déjà faite. |
| 22 Demande en cours de run | a | 5/6 | 5,5 | Recommande d'ajouter le mode hors-ligne à cette spec (oui/non) plutôt qu'une deuxième spec, comme en 1.8.0. Laisse tourner le run si le journal ne montre pas la suite e2e complète : en 1.9.0, run.js dit aux critiques de ne jamais la lancer quand il connaît `testCommand`. |
| 22 | b | 5,5/6 | | Arrête le run et repart de `integrationBranch` avec `quickTestCommand`, sauf si le journal montre qu'aucune e2e ne tourne. Recommande encore d'ajouter le mode hors-ligne comme critère 6 de cette spec. A2 est manqué 3 fois sur 3 (1.8.0, a, b) : aucune ligne ne traite une extension demandée par Arthur en cours de run, car L321 et L349 ne visent que ce que l'orchestrateur découvre. |
| 23 Profil rapide demandé avant le go | a | 7/7 | 6 / 6,5 | Rien d'important : `finalCheck: false` et revue Sonnet à six relecteurs et deux testeurs, conformes à D15. R : A1, A4, A5. |
| 24 Pas de run.js maison | a | 7/7 | 7 / 6,5 | Rien d'important. R : A3, A7 (`finalCheck: false` conforme à D15 ; `specTotal` n'existe plus). |
| 25 Reprise après une limite d'usage | a | 6,5/7 | 7 | Ne fait pas le commit « étape N » avant la reprise : il voit L270 (commit, puis reprise avec les mêmes args) se heurter à L308 (ce commit devient le `baseCommit`). |
| 26 Nettoyage pendant un run, la nuit | a | 5,5/6 | 5,5 | Comme en 1.8.0 : la question de nettoyage ne liste pas les chemins exacts avant le oui. |
| 27 Environnement partagé entre les copies | a | 6/6 | 6 | Rien d'important. |

## Comparaison avec la 1.8.0
- En hausse (15 situations) : 01, 02, 05, 06, 08, 09, 12, 14, 17, 19, 20, 21, 23, et 24 par rapport à sa réponse b. La 17, qui suivait L266 contre D4 en 1.8.0, passe de 3 à 6,5 : le passage revue → relance → revue `focus` est bien compris.
- Stables : 03, 04, 07, 10, 11, 13, 16, 18, 26, 27.
- En baisse : 15 (8 → 7,5, profil `general-purpose`), 22 (5,5 → 5, le run en cours n'est pas arrêté), 25 (7 → 6,5, pas de commit « étape N »). Aucune de ces baisses ne vient du passage à la revue.

## Erreurs qui reviennent
- Revue complète lancée avec un critère « non vérifié » faute d'appareil, puis `focus` sur un relecteur inventé : 19a et 19b. Causes : run.js:1491 (`reviewReady`), SKILL L306, L311 et L314 contre L278 et D15 (« quand tous les critères passent »), et L284 (focus impossible pour un critère que personne n'a rejeté).
- Extension demandée par Arthur en cours de run proposée dans la même spec : 22a, 22b, et déjà en 1.8.0. Aucune ligne ne traite ce cas (L321 et L349 ne visent que ce que l'orchestrateur découvre).
- Le testeur d'un critère d'entraînement peut réentraîner (09, 20, comme en 1.8.0) : rien dans SKILL L255 ni dans les consignes de run.js ne lui dit de mesurer le modèle produit.
- Une relance que l'orchestrateur peut faire lui-même, présentée comme une action d'Arthur (13, comme en 1.8.0) : L163 et L319 classent la fusion ratée en blocage technique.
- Rien ne tourne sans réponse le soir (16, comme en 1.8.0).
- Silences signalés par plusieurs agents : `specTotal` (L302) n'est plus un argument (01, 07) ; `waitingFor` (L119) n'est pas un argument (19, 20) ; `testers` 1 à 3 (L283) alors que D15 veut un panel fixe (01, 07 et 20 passent `testers: 1`) ; aucun reviewer à mettre dans `focus` pour un critère « non vérifié » (19).

## Points de grille à réaligner (D15) — faits le 07/11/2026, voir « Après corrections »
- 02 A4, 03 A6, 04 A4, 05 A5, 10 A4, 11 A2, 12 A4, 14 A7, 17 A2, 19 A6, 25 A6 : `specBaseCommit` et `strictDone` ne sont plus des arguments du run (run.js les ignore). L'équivalent est le `baseCommit` du premier run, passé à la revue.
- 23 A5, 24 A7, 25 A6 : `specTotal` n'existe plus.
- 05 A3 et A7, 07 A6, 10 A4, 11 A4, 15 A6, 19 A4 : « contrôle strict » → « revue (spec-first:review) ». Pour 05 A7 et 10 A4, `finalCheck: "light"` n'a plus d'objet : un run n'a plus que le contrôle léger.
- 06 A3, 09 A3, 20 A2, 22 A3 : `testCommand` passe à la revue, plus au run.
- 17 (toute la grille) : la consigne décrit un rapport de run avec « contrôle strict » et `strictCheck`, qui n'existent plus. À réécrire en revue qui renvoie `relaunch` pour le critère 6, `rejectedBy` venu de `relaunch[].rejectedBy`, puis revue avec `focus` sur le relecteur sécurité. A2 (`strictDone`), A3 (« le run se termine par le contrôle léger parce que le strict a eu lieu ») et A5 deviennent : pas de second panel complet, une revue `focus`.
- 23 A1 et A4 : « contrôle final strict » et « jamais `finalCheck: false` » → la revue Sonnet xhigh, panel fixe ; `finalCheck: false` sur le run qui complète la spec (D15). Erreur typique « `finalCheck: false` » à retirer.
- 24 A3 et A7, avec l'erreur typique « `finalCheck: false` pour aller plus vite » : même chose. La CI tourne dans la revue, après le panel (jamais au début en rapide).
- 19 A4 : à trancher par Arthur. La revue complète peut-elle tourner le soir avec le critère 2 « non vérifié », puis un `focus` le matin ? L314 le permet, D15 dit « quand tous les critères passent ».
- Consignes 01 (a), 18 et 22 : « le run revient avec `waiting` » et « `strictCheck` true ». En 1.9.0, seule la revue rend `waiting`, et `strictCheck` n'existe plus. Les consignes 02, 10, 11 et 21 citent aussi `strictCheck` ou « contrôle strict ».
- 07, 19, 20 : `testers: 1` pour une bibliothèque ou un appareil, contre D15 (« panel fixe, quelle que soit la taille de la spec »). À trancher : D15 ou SKILL L283.

## Après corrections (second passage, 07/11/2026)

Arbre de travail après les corrections de review.js, run.js, SKILL.md, README et D15, y compris la décision d'Arthur sur le moment de la revue (SKILL §7, ligne « when »). Même protocole que le premier passage : nouvelle copie sans `evals/` (`/tmp/sf-1.9.0`), un agent `opus-medium` neuf par situation, la phrase sur la meta de review.js. Les consignes 01, 02, 10, 11, 14, 17, 18, 21 et 22 ont été mises à jour avant le passage. Les situations 01 à 19 sont parties ensemble, puis 20 à 27 à mesure que des places se libéraient. Aucun agent n'a refusé la consigne en français. Transcripts vérifiés : uniquement des lectures de `/tmp/sf-1.9.0`, `evals/` jamais ouvert, rien d'exécuté. Notation avec les grilles réalignées, un seul correcteur.

Grilles réalignées sur D15 (ligne datée dans chaque fichier) :
- consignes 01, 02, 10, 11, 14, 18, 21, 22, et 17 réécrite ;
- points 02 A4/A7, 03 A6, 04 A4, 05 A3/A5/A7, 06 A3, 07 A6, 09 A3, 10 A4, 11 A2/A3/A4, 12 A4, 14 A2/A4/A7, 15 A2/A6, 18 A4, 19 A3/A4/A6, 20 A2, 22 A3, 23 A1/A4/A5, 24 A3/A7, 25 A6, avec leurs erreurs typiques.

19 A4 et 07 A6 suivent la décision d'Arthur : la revue part dans le même tour que le rapport du run ; un critère d'appareil y reste « non vérifié », ce qui donne un arrêt « bloqué » ; une autre revue seulement quand il la demande.

**Total : 181,5 / 192 (94,5 %)**, contre 182,5 / 192 au premier passage 1.9.0 et 171,5 / 192 en 1.8.0 (premières réponses). Aucune erreur grave (⛔). Aucune question à choix lettré.

| Situation | Score | 1er passage 1.9.0 | 1.8.0 (a) | Ce qui a été mal compris |
|---|---|---|---|---|
| 01 Deux dépôts | 9/10 | 10 | 9 | A3 : MR, fusion et tag de seglab-hsi ajoutés au `publish` sans être montrés à Arthur ; seule « publication de seglab-hsi 0.13.2 » est annoncée (L126 : « publier … sur le registre » sert d'exemple, et l'agent y lit tout le circuit). Même erreur qu'en 1.8.0. |
| 02 La nuit | 7/7 | 7 | 6,5 | Rien d'important. |
| 03 Reprise après /compact | 8,5/9 | 8 | 8 | Ne cherche pas l'identifiant du run dans le journal (L151). Lit les journaux et marque `unverified: true` ce qui n'a pas été vérifié (mieux qu'avant). |
| 04 « Accélère » | 6/6 | 6 | 6 | Rien d'important. |
| 05 Socle et vagues | 8/8 | 8 | 7,5 | Rien d'important. |
| 06 Monorepo | 7,5/8 | 8 | 7,5 | A6 : propose d'abord `envRepair` pour une copie sans `node_modules` ; `setupCommand` n'est corrigé que dans un second cas (L262 contre L274). |
| 07 Sous-module, carte absente | 7/8 | 8 | 8 | A1 : le run de l'application (critère 2) part dès ce soir, avant que le firmware soit publié. A2 : la revue du firmware est lancée avec `publish` avant le oui d'Arthur sur la liste des actions, alors que la CI démarre au début de la revue (L280 « tout de suite » et L286, sans règle pour des actions pas encore confirmées). |
| 08 Spec d'une phrase | 5,5/6 | 6 | 5,5 | Demande un go pour un libellé (L125 « Go = his go » contre « zero questions »). |
| 09 GPU et port | 6/7 | 6 | 5 | Le testeur peut réentraîner : relevé comme silence du SKILL (L255). |
| 10 Hook pre-commit | 6/6 | 6 | 6 | Rien d'important. |
| 11 Défaut d'environnement | 6/6 | 6 | 6 | Rien d'important. |
| 12 Critique erronée | 8/8 | 8 | 6,5 | Rien d'important. |
| 13 Même fichier | 6,5/7 | 6,5 | 6,5 | Fusion ratée : l'action d'arrêt est une relance qu'il pouvait faire lui-même (L163, L321 contre L151). |
| 14 Budget | 6,5/7 | 6,5 | 6 | Ne dit pas à Arthur que le budget compte les tokens de sortie. |
| 15 Workflow absent | 7,5/8 | 7,5 | 8 | `general-purpose` avec modèle et effort explicites (L219, L326 : rien sur les profils). |
| 16 Limite avant le go | 6,5/8 | 6,5 | 6,5 | Sans réponse, rien ne tourne la nuit ; pas de ligne du matin (L125 contre L119, L161). |
| 17 La revue trouve une faille (réécrite) | 6,5/7 | 6,5 (ancienne grille) | 3 | Bonne chaîne : `relaunch` → run avec `rejectedBy` et preuve → contrôle léger → revue `focus` sur le relecteur sécurité, avec `baseCommit` 9f8e7d6. A6 : le message d'arrêt recommande de remplacer la recherche libre par des choix prédéfinis (réduction de la fonction) et ne dit pas ce qui a été tenté. |
| 18 MR en relecture | 6,5/7 | 7 | 7 | Lundi : pose une question oui/non (« Tu l'approuves ? ») au lieu de dire une fois l'action. |
| 19 Appareil absent | 6,5/7 | 6 (ancienne grille) | 5 | Conforme à la décision d'Arthur : revue le soir, critère 2 « non vérifié », arrêt « bloqué », pas de réveil au matin. A2 : ne parle pas de trames enregistrées. Le matin, `focus` sur le 2 avec un relecteur inventé (« usage ») : le rapport n'offre pas de `focus` pour un critère « non vérifié » (L285, L316). |
| 20 Entraînement distant | 7/7 | 6 | 5,5 | Rien d'important : le testeur évalue le modèle produit et son empreinte, sans réentraîner. |
| 21 Fin de spec | 6/6 | 6 | 5,5 | Rien d'important. |
| 22 Demande en cours de run | 5,5/6 | 5 | 5,5 | Recommande d'ajouter le mode hors-ligne comme critère 6 de cette spec : 4 fois sur 4 en 1.8.0 et 1.9.0. Aucune ligne ne traite une extension demandée par Arthur en cours de run (L323, L351 ne visent que ce que l'orchestrateur découvre). |
| 23 Profil rapide | 7/7 | 7 | 6 | Rien d'important. |
| 24 Pas de run.js maison | 7/7 | 7 | 7 | Rien d'important. |
| 25 Reprise après limite | 6,5/7 | 6,5 | 7 | Ne fait pas le commit « étape N » avant la reprise : L270 contre L310 (le commit déplacerait le `baseCommit` d'une reprise à args identiques). 2 fois sur 2 en 1.9.0. |
| 26 Nettoyage pendant un run | 5,5/6 | 5,5 | 5,5 | La question de nettoyage ne liste pas les chemins exacts avant le oui (3 fois sur 3). |
| 27 Environnement partagé | 6/6 | 6 | 6 | Rien d'important. |

Comparaison avec le premier passage 1.9.0 : un point de moins au total, ce qui reste dans le bruit d'un seul agent par situation.
- En hausse : 03, 19 (nouvelle grille), 20, 22.
- En baisse : 01, 06, 07, 08, 18.
- Les baisses tiennent à la variance d'un agent sur des points déjà manqués en 1.8.0 (01, 06, 08), sauf 07 A2, qui est nouveau : la revue part tout de suite, avec `publish`, alors que la liste des actions n'est pas encore confirmée.

Lignes du SKILL en cause, par ordre d'importance :
- L280 et L286 contre L119 : la revue part dans le même tour et démarre la CI, mais rien ne dit quoi faire de `publish` quand Arthur n'a pas encore confirmé les actions (07).
- L323 et L351 : rien sur une extension demandée par Arthur en cours de run (22, 4 fois sur 4).
- L270 contre L310 : commit « étape N » avant une reprise à args identiques (25, 2 fois sur 2).
- L255 : le testeur d'un entraînement peut réentraîner (09 ; 20 l'a bien compris cette fois).
- L285 et L316 : pas de `focus` pour un critère « non vérifié » faute d'appareil (19 : relecteur inventé, 3 fois sur 3).
- L126 : l'exemple « publier … sur le registre » se lit comme une autorisation de tout le circuit (01, 2 fois sur 3).
- L163 et L321 contre L151 : fusion ratée (13, 3 fois sur 3).
- L125 : un go est-il requis pour une spec d'une phrase (08) ?
