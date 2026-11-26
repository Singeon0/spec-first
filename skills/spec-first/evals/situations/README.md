# Banc de situations — spec-first

Ce banc vérifie, à chaque version du plugin, qu'un orchestrateur qui lit SKILL.md agit comme Arthur l'a décidé : aller vite, ne pas bloquer, ne pas faire tourner de critique inutile, garder une revue finale solide (le contrôle strict jusqu'à la 1.8.0, spec-first:review depuis la 1.9.0). Il sert aussi à comparer deux versions sur les mêmes situations.

## Contenu
- `decisions.md` : la référence. Les grilles notent les réponses par rapport aux décisions d'Arthur, pas par rapport au texte du SKILL.
- `preambule.md` : le début de consigne, commun à toutes les situations.
- `NN-*.md` : une situation par fichier — la consigne, le contexte fourni, les points vérifiables (A1, A2…), les erreurs typiques et les lignes du SKILL concernées (« Repères », sur le SKILL 1.13.0 depuis le 26/11/2026). Ajoutées le 26/11/2026 : 32 (demande de go sur un graphe profond : plan du run, contrats dans le socle), 33 (la commande des suites : absente, copie refusée, suite perdue), 34 (« pourquoi c'était si long ? » et « accélère » : réponse depuis le bilan de temps).
- `resultats-1.7.0.md` : les notes de la 1.7.0, point de départ des comparaisons.
- `resultats-1.8.0.md` : les notes de la 1.8.0 (27 situations ; la 28 date de la 1.10.0).
- `resultats-1.9.0.md` : les notes de la 1.9.0, avant et après corrections.
- `acquis.md` : les points acquis (réussis aux deux dernières versions notées), recalculés après chaque version ; la barrière de sortie s'appuie dessus.
- `rejets.md` : les modifications du SKILL qui ont fait tomber un point, et les pistes refusées par Arthur, avec la condition pour les refaire.

Modifié le 07/11/2026 (1.9.0, D15) : les grilles et les consignes parlent de la revue (spec-first:review) au lieu du contrôle strict ; chaque situation modifiée porte une ligne « Modifié le 07/11/2026 » sous « Décisions en jeu ».

Modifié le 24/11/2026 (1.11.0, D18) : situations 29 (réglage en cours de run, file des fusions) et 30 (batterie rapide en parallèle).

Modifié le 25/11/2026 (1.12.0, D19) : situation 31 (la revue jouée à la main après une réparation : scripts de rejeu d'abord, rejeu réel limité, mineurs en une ligne).

Modifié le 26/11/2026 (1.13.0, D20–D26) : situations 01 à 31 réalignées sur un seul profil Opus high au minimum, le run sans critiques ni contrôle léger (testeur du socle, batterie rapide en fin de run, critères « non vérifié » jusqu'à la revue), la commande des suites, la reprise lue dans git, les testeurs de la revue en parallèle, le plan du run et le bilan de temps ; 04, 12, 23 réécrites, 03, 22, 25, 29 réécrites en partie ; repères mis à jour sur le SKILL 1.13.0 ; situations 32, 33 et 34 ajoutées ; acquis.md : points inversés ou nouveaux, section du 26/11/2026.

Modifié le 23/11/2026 (décision d'Arthur) : trois passages par situation, notés à la majorité ; points acquis et barrière de sortie ; registre des rejets.

## Relancer le banc
1. Mettre la version à tester dans un dossier à part, sans `skills/spec-first/evals/` (les agents ne doivent pas voir les réponses attendues), par exemple : `mkdir /tmp/sf-X && git archive <commit> | tar -x -C /tmp/sf-X --exclude=skills/spec-first/evals`.
2. Pour chaque situation, deux agents neufs, `subagent_type: "opus-medium"` (jamais un autre modèle). Leur consigne : le contenu de `preambule.md` avec `{PLUGIN}` remplacé par ce dossier, une ligne vide, puis le bloc « Consigne » du fichier, tel quel. Lancer tous les agents en même temps, par vagues si la session limite leur nombre (20 en 1.9.0).
3. Les agents n'exécutent rien. Vérifier dans leur transcript qu'ils n'ont lancé aucun workflow, agent, commande git ou ssh, et qu'ils n'ont pas ouvert `evals/` ; sinon la réponse ne compte pas.
4. Noter les deux réponses. Si l'une réussit un point que l'autre rate : un troisième agent neuf, même consigne, pour cette situation. Sinon il ne changerait pas la majorité, on ne le lance pas.
5. Trois passages pour toutes les situations : 26 sur 28 ont des points acquis à protéger, et la 17 et la 28 n'en gagnent qu'à la majorité. Coût : de 56 à 84 agents par version au lieu de 28 ; le troisième seulement là où les deux premiers divergent.

## Noter une réponse
- Chaque réponse est notée seule. Chaque point vérifiable : oui = 1, partiel = 0,5, non = 0, avec une citation courte de la réponse comme preuve. Une intention vague ne vaut pas « oui ».
- Un point est réussi pour la version s'il vaut « oui » dans au moins deux réponses sur trois (deux sur deux sans troisième agent) ; « partiel » compte comme raté. Le total se compte sur les réponses a, comme avant ; la barrière se juge sur les points à la majorité.
- Une erreur marquée ⛔ dans les erreurs typiques : la situation est en échec, quel que soit le score.
- Une réponse qui suit le SKILL contre une décision d'Arthur : le point vaut « non », et l'écart est imputé au SKILL (défaut de rédaction, pas de l'agent).
- Le même point manqué par plusieurs agents : défaut de rédaction du SKILL ; citer la ligne en cause.
- Écrire les notes d'une version dans `resultats-<version>.md`, avec le même tableau que `resultats-1.7.0.md` (une ligne par réponse : a, b, c), et comparer situation par situation, pas seulement le total.
- Pour chaque situation, nommer les points ratés à la majorité (A3, A6…) : sans eux, `acquis.md` ne peut pas être recalculé.

## Barrière de sortie
- Point acquis : réussi aux deux dernières versions notées (`acquis.md`). Rechute : un point acquis raté à la majorité (un seul agent sur trois ne suffit pas).
- Une version avec une rechute n'est pas livrée, sauf si Arthur accepte cette régression explicitement ; son accord s'écrit dans le résultat, avec la date et la raison. Sans accord, la modification en cause est retirée et notée dans `rejets.md`.
- Chaque `resultats-<version>.md` finit par ce bilan :
  - Gains : points ratés à la version notée précédente, réussis maintenant.
  - Rechutes sur points acquis : le point, la note de chaque réponse, la ligne du SKILL en cause.
  - Bilan : gains − rechutes.
  - Décision : livrée (aucune rechute) ; livrée, rechute acceptée par Arthur le JJ/MM/AAAA (raison) ; ou pas livrée (modification retirée, voir `rejets.md`).
- Les autres baisses (points réussis à la version précédente seulement) se listent à part, hors bilan. Une situation nouvelle n'entre pas dans le bilan.

## Tenir le banc à jour
- Arthur change une décision : mettre à jour `decisions.md` (en datant le changement), puis les points des grilles concernés.
- Une nouvelle version décale les lignes du SKILL : mettre à jour les « Repères », sans toucher aux points vérifiables.
- Une version notée : recalculer `acquis.md` sur les deux dernières versions notées. Une version jouée deux fois (avant et après corrections) : seule la dernière notation compte.
- Un point dont l'attendu s'inverse (décision d'Arthur) n'est plus acquis ; il le redevient après deux versions réussies sous le nouveau texte. Un simple renommage (même conduite) garde son historique.
- Une version fait retomber un point acquis, une modification est abandonnée, ou Arthur refuse une piste : une ligne dans `rejets.md`.
- Avant de proposer une modification du SKILL : lire `rejets.md` ; ne pas reproposer ce qui y figure sans remplir sa condition.
- Ajouter une situation : même format, numéro suivant ; partir d'un problème vu en vrai, ou d'un cas générique qui touche un point sensible (quand s'arrêter, quand rejuger, quand lancer la revue, quand publier, quand demander à Arthur).
