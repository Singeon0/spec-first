# Banc de situations — spec-first

Ce banc vérifie, à chaque version du plugin, qu'un orchestrateur qui lit SKILL.md agit comme Arthur l'a décidé : aller vite, ne pas bloquer, ne pas faire tourner de critique inutile, garder un contrôle strict solide. Il sert aussi à comparer deux versions sur les mêmes situations.

## Contenu
- `decisions.md` : la référence. Les grilles notent les réponses par rapport aux décisions d'Arthur, pas par rapport au texte du SKILL.
- `preambule.md` : le début de consigne, commun à toutes les situations.
- `NN-*.md` : une situation par fichier — la consigne, le contexte fourni, les points vérifiables (A1, A2…), les erreurs typiques et, pour la 1.7.0, les lignes du SKILL concernées.
- `resultats-1.7.0.md` : les notes de la 1.7.0, point de départ des comparaisons.

## Relancer le banc
1. Mettre la version à tester dans un dossier à part, sans `skills/spec-first/evals/` (les agents ne doivent pas voir les réponses attendues), par exemple : `mkdir /tmp/sf-X && git archive <commit> | tar -x -C /tmp/sf-X --exclude=skills/spec-first/evals`.
2. Pour chaque situation, un agent neuf, `subagent_type: "opus-medium"` (jamais un autre modèle). Sa consigne : le contenu de `preambule.md` avec `{PLUGIN}` remplacé par ce dossier, une ligne vide, puis le bloc « Consigne » du fichier, tel quel. Lancer toutes les situations en même temps.
3. Les agents n'exécutent rien. Vérifier dans leur transcript qu'ils n'ont lancé aucun workflow, agent, commande git ou ssh, et qu'ils n'ont pas ouvert `evals/` ; sinon la réponse ne compte pas.
4. Une situation où la réponse surprend : la relancer avec un deuxième agent neuf avant de conclure.

## Noter une réponse
- Chaque point vérifiable : oui = 1, partiel = 0,5, non = 0, avec une citation courte de la réponse comme preuve. Une intention vague ne vaut pas « oui ».
- Une erreur marquée ⛔ dans les erreurs typiques : la situation est en échec, quel que soit le score.
- Une réponse qui suit le SKILL contre une décision d'Arthur : le point vaut « non », et l'écart est imputé au SKILL (défaut de rédaction, pas de l'agent).
- Le même point manqué par plusieurs agents : défaut de rédaction du SKILL ; citer la ligne en cause.
- Écrire les notes d'une version dans `resultats-<version>.md`, avec le même tableau que `resultats-1.7.0.md`, et comparer situation par situation, pas seulement le total.

## Tenir le banc à jour
- Arthur change une décision : mettre à jour `decisions.md` (en datant le changement), puis les points des grilles concernés.
- Une nouvelle version décale les lignes du SKILL : mettre à jour les « Repères », sans toucher aux points vérifiables.
- Ajouter une situation : même format, numéro suivant ; partir d'un problème vu en vrai, ou d'un cas générique qui touche un point sensible (quand s'arrêter, quand rejuger, quand passer au contrôle strict, quand publier, quand demander à Arthur).
