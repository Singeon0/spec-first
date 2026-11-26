# 29 — Un réglage en cours de run, et les fusions qui font la queue

Source : run réel QualiSpectra sprint6 (24/11/2026, VM seglab-hsi-dev) : un run arrêté puis relancé pour passer les fusions en Opus a coûté environ 15 min de six développements ; ensuite les fusions, une à une, ont fait une file de 30 min pendant que les places de développeur restaient vides.
Décisions en jeu : D11, D18, D20, D26, R1, R6 (voir decisions.md)
Ajoutée le 24/11/2026 (1.11.0, D18).
Modifié le 26/11/2026 (1.13.0, D20–D26) : réécrite en partie — tout est en Opus (D20), le réglage demandé devient l'effort des développeurs au lieu du modèle des fusions ; la conduite reste la même (pas d'arrêt pour un réglage, D18). A2 nouveau ; A1, A5 reformulés.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet QualiSpectra, dépôt /home/alo/GitHub/pyplet/apps/QualiSpectra. Un run spec-first:run tourne en arrière-plan depuis 1 h 10 (runId wf_155c88, lancé par toi) pour specs/sprint6.md : 45 critères en 35 groupes, maxGroups 6, quickTestCommand "make prepush" (une fois, en fin de run). La machine a 16 cœurs, sa charge est à 2.
Le journal montre : 14 groupes fusionnés ; chaque fusion prend environ 4 minutes ; 3 groupes ont fini leur développement et attendent leur fusion ; un seul développeur travaille en ce moment ; 18 groupes n'ont pas commencé, la plupart dépendent de groupes pas encore fusionnés.
Arthur écrit : « J'ai vu que les développeurs commencent en high ; je préfère xhigh dès le premier essai. Et ça traîne : les fusions font la queue. »

QUESTION
Que fais-tu ici, étape par étape : arrêtes-tu le run, en relances-tu un, avec quels arguments ? Que réponds-tu à Arthur, mot pour mot ? Qu'est-ce qui accélère ou non la file des fusions ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le journal et le message d'Arthur sont dans la consigne.

## Points vérifiables
- [ ] A1 Le run n'est pas arrêté pour l'effort des développeurs : ni `TaskStop`, ni reprise, ni nouveau run pour ce réglage ; un redémarrage jetterait les essais en cours sans rien gagner.
- [ ] A2 Le changement va au run suivant, dit comme tel (par exemple `startEffort` à xhigh pour ses critères, ou un changement du plugin si cela doit devenir la règle) ; aucun contournement : ni copie de run.js, ni développement ou fusion à la main (R1, R6) ; jamais un effort sous high.
- [ ] A3 La file : le run fusionne déjà ensemble les groupes qui attendent (une fusion, les seuls tests des fichiers changés des deux côtés), et les groupes dont d'autres dépendent passent en premier ; rien à faire de plus pendant ce run.
- [ ] A4 Ne relève pas `maxGroups` et ne relance pas le run « pour accélérer » : les places de développeur sont vides parce que les groupes attendent des fusions et des dépendances, pas faute de places (charge 2 sur 16 cœurs).
- [ ] A5 Réponse à Arthur courte, en français simple, sans jargon (ni `TaskStop`, ni `maxGroups`) : où en est le run en critères (sur 45), ce qui se passe pour les fusions, quand le changement d'effort pourra s'appliquer ; au plus une question oui/non simple sur ce qui est à lui (l'effort du prochain run), jamais sur l'arrêt du run.
- [ ] A6 Le run continue sous surveillance hors du run (journal, chien de garde) ; pas de boucle de lecture, pas de `sleep`.

## Erreurs typiques
- ⛔ Arrêter le run pour changer l'effort des développeurs (le cas réel, pour le modèle des fusions : environ 15 min de six développements perdues).
- Écrire sa propre copie de run.js, ou fusionner des groupes à la main « pour aller plus vite ».
- Promettre xhigh dès maintenant, ou proposer d'arrêter le run pour l'appliquer.
- Relever `maxGroups` ou relancer le run en croyant vider la file.
- Demander à Arthur s'il faut arrêter le run.

## Repères dans le SKILL 1.13.0
L76, L156, L161, L163, L223-224, L226-229, L242, L278, L289-290, L296.
