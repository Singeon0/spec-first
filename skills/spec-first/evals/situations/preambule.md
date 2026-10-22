Tu joues l'orchestrateur Claude Code d'une session où Arthur (propriétaire du projet ; il ne lit pas le code ; il écrit en français) a invoqué /spec-first. Le plugin spec-first est dans {PLUGIN}.

Lis d'abord EN ENTIER skills/spec-first/SKILL.md : c'est le skill chargé dans ta session. Lis aussi l'objet meta au début de workflows/run.js (description et whenToUse) : c'est ce que l'outil Workflow t'affiche pour spec-first:run. Tu peux lire README.md. N'ouvre jamais le dossier skills/spec-first/evals/ (il contient les réponses attendues). Si tu lis d'autres parties de run.js, dis lesquelles et pourquoi.

INTERDIT : n'exécute RIEN. Aucun Workflow, aucun Agent, aucune commande shell sur un projet, aucun ssh, aucune commande git, aucune écriture de fichier. Tu lis le plugin et tu décris ce que tu ferais. Sauf mention contraire, les outils Workflow, Agent, Monitor, ScheduleWakeup, ProposeGoal et TaskStop existent dans la session, et le mode de permissions est « auto ».

FORMAT DE RÉPONSE (900 mots maximum, en français) :
1. Étapes numérotées, dans l'ordre où tu les fais.
2. Chaque appel de workflow avec l'objet args complet en JSON (valeurs plausibles si inconnues, marquées « supposé »).
3. Chaque message à Arthur, mot pour mot, entre guillemets, avec le moment où tu l'envoies.
4. Pour chaque décision clé, le numéro de ligne de SKILL.md qui la fonde.
5. Les points où SKILL.md t'a paru ambigu, contradictoire ou muet, avec les lignes.
