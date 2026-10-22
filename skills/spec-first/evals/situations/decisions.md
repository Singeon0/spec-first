# Décisions d'Arthur — la référence du banc

Le banc note les réponses par rapport à ces décisions, pas par rapport au texte du SKILL.
Quand le SKILL et une décision divergent, la décision gagne : la réponse qui suit le SKILL contre la décision est notée en écart, et l'écart est imputé au SKILL.
Mettre ce fichier à jour quand Arthur change une décision (et dater la modification).

Version de référence : décisions rappelées par Arthur le 22/10/2026, pour la revue de la 1.7.0.

| Code | Décision |
|---|---|
| D1 | Modèles : seulement Opus, effort medium au minimum. Jamais Sonnet, Haiku ni Fable. Jamais Opus max dans un run. Chaque agent lancé a un modèle et un effort explicites. |
| D2 | Développeurs : l'effort monte après chaque rejet (medium → high → xhigh). Avant chaque relance, le développeur trie les rejets : défaut réel, critique erronée, ou blocage. Il corrige la cause racine, pas le symptôme. |
| D3 | Critiques : toujours en high pendant le run. Après un rejet, seuls les critiques qui ont rejeté rejugent. |
| D4 | Contrôle final strict : une seule fois par spec, pas à chaque run. Juges en xhigh, panel élargi (testeur, propriétaire, mainteneur, intégrateur, sécurité). Il doit être extrêmement solide. Chaque run n'a qu'un contrôle léger. |
| D5 | Découpage : groupes petits et nombreux, sous-critères (2.1, 2.2) pour paralléliser. On ne réduit jamais le périmètre de la spec. |
| D6 | Fichiers partagés : deux groupes peuvent toucher les mêmes fichiers. La fusion résout les conflits au fil de l'eau ; les lots suivants partent de la branche intégrée. |
| D7 | Socle commun : enchaîné en autonomie sous /goal, avec un seul rapport fusionné (depuis la 1.7.0 : un seul run en vagues, dependsOn ; deux runs seulement si une étape doit se faire entre les deux). |
| D8 | Copies de travail dans .spec-first/copies (l'écriture dans .claude peut être refusée). |
| D9 | Publication : push, MR, CI, fusion et tag sont autorisés par une liste dans la demande de go, et seulement ceux-là. Les MR font partie du travail normal, pas un blocage. |
| D10 | Repli : l'outil Agent remplace l'outil Workflow s'il est absent, avec les mêmes règles. |
| D11 | Questions : jamais de question à choix lettré (A/B/C). Arthur ne doit pas attendre la nuit. Le run ne s'arrête jamais sur une question tant que du travail peut avancer. On écrit à Arthur en français simple. |
| D12 | 1.7.0 : réparation ciblée de l'environnement (envRepair) ; les attentes externes (CI, MR, registre, relecture) sortent du run (le run rend « waiting », l'orchestrateur surveille et reprend) ; les critères partent par vagues selon dependsOn ; accès et limites vérifiés avant le go. |

Règles générales qui découlent de ces décisions (utilisées dans les grilles) :
- R1 Tout run passe par spec-first:run (ou le repli Agent si l'outil Workflow manque). Jamais de copies ni de scripts faits à la main pour « aller plus vite ».
- R2 Un arrêt n'arrive qu'une fois tout le reste fini ; un choix réversible laissé ouvert par la spec est tranché par l'orchestrateur et noté sous « Décisions prises pendant le run ».
- R3 Un blocage technique (CI indisponible, machine en panne) se dit une fois : sa cause et la seule action qui le lève. Pas de question, pas d'options.
- R4 Rien ne quitte la machine sans figurer dans la liste du go.
- R5 Personne n'attend « en dormant » : pas de sleep en boucle, pas d'agent qui attend une CI ; surveillance hors run (Monitor, commande en arrière-plan bornée, ScheduleWakeup).
