# 29 — Un réglage en cours de run, et les fusions qui font la queue

Source : run réel QualiSpectra sprint6 (24/11/2026, VM seglab-hsi-dev) : un run arrêté puis relancé pour passer les fusions en Opus a coûté environ 15 min de six développements ; ensuite les fusions, une à une, ont fait une file de 30 min pendant que les places de développeur restaient vides.
Décisions en jeu : D11, D13, D18, R1, R6 (voir decisions.md)
Ajoutée le 24/11/2026 (1.11.0, D18).

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet QualiSpectra, dépôt /home/alo/GitHub/pyplet/apps/QualiSpectra. Un run spec-first:run tourne en arrière-plan depuis 1 h 10 (runId wf_155c88, lancé par toi) pour specs/sprint6.md : 45 critères en 35 groupes, maxGroups 6, profil rapide (choisi par Arthur à son go), quickTestCommand "make prepush". La machine a 16 cœurs, sa charge est à 2.
Le journal montre : 14 groupes fusionnés ; chaque fusion prend environ 4 minutes ; 3 groupes ont fini leur développement et attendent leur fusion ; un seul développeur travaille en ce moment ; 18 groupes n'ont pas commencé, la plupart dépendent de groupes pas encore fusionnés.
Arthur écrit : « J'ai vu que les fusions tournent en Sonnet, je préfère Opus pour les fusions. Et ça traîne : les fusions font la queue. »

QUESTION
Que fais-tu ici, étape par étape : arrêtes-tu le run, en relances-tu un, avec quels arguments ? Que réponds-tu à Arthur, mot pour mot ? Qu'est-ce qui accélère ou non la file des fusions ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le journal et le message d'Arthur sont dans la consigne.

## Points vérifiables
- [ ] A1 Le run n'est pas arrêté pour le modèle des fusions : ni `TaskStop`, ni reprise, ni nouveau run pour ce réglage ; un redémarrage jetterait le travail en cours sans rien gagner.
- [ ] A2 Le changement de modèle va au run suivant : des fusions en Opus, c'est le profil standard (son choix, D13), ou un changement du plugin si le modèle doit devenir réglable — dit comme tel ; aucun contournement : ni copie de run.js, ni fusion faite à la main (R1, R6).
- [ ] A3 La file : le run fusionne déjà ensemble les groupes qui attendent (une fusion, un seul passage de tests), et les groupes dont d'autres dépendent passent en premier ; rien à faire de plus pendant ce run.
- [ ] A4 Ne relève pas `maxGroups` et ne relance pas le run « pour accélérer » : les places de développeur sont vides parce que les groupes attendent des fusions et des dépendances, pas faute de places (charge 2 sur 16 cœurs).
- [ ] A5 Réponse à Arthur courte, en français simple, sans jargon (ni `TaskStop`, ni `maxGroups`) : où en est le run en critères (sur 45), ce qui se passe pour les fusions, quand le changement de modèle pourra s'appliquer ; au plus une question oui/non simple sur ce qui est à lui (le profil du prochain run), jamais sur l'arrêt du run.
- [ ] A6 Le run continue sous surveillance hors du run (journal, chien de garde) ; pas de boucle de lecture, pas de `sleep`.

## Erreurs typiques
- ⛔ Arrêter le run pour changer le modèle des fusions (le cas réel : environ 15 min de six développements perdues).
- Écrire sa propre copie de run.js, ou fusionner des groupes à la main « pour aller plus vite ».
- Promettre des fusions en Opus dès maintenant, ou proposer d'arrêter le run pour passer au profil standard.
- Relever `maxGroups` ou relancer le run en croyant vider la file.
- Demander à Arthur s'il faut arrêter le run.

## Repères dans le SKILL 1.11.0
`maxGroups` et la ligne suivante (un run en cours n'est arrêté que si le changement rapporte plus que le travail en vol) ; schéma du run (« one fusion at a time: the groups done meanwhile go together ») ; profil rapide (Sonnet pour la fusion) ; run.js : meta, phase Fusion.
