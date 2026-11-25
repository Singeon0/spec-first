# 31 — La revue jouée à la main, juste après la première réparation

Source : revue réelle QualiSpectra (10/11/2026, VM seglab-hsi-dev) : 138 min, dont 80 % après le panel ; les rejeux réels des deux testeurs après chaque réparation ont coûté 16 % de la revue (100 à 130 appels chacun) ; 25 constats sur 35 étaient mineurs, prouvés par exécution et jamais réparés. Repli sur l'outil Agent : cas générique (D10).
Décisions en jeu : D1, D10, D11, D15, D17, D19, R1, R5 (voir decisions.md)
Ajoutée le 25/11/2026 (1.12.0, D19).

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Dans cette session, l'outil Workflow n'existe pas ; l'outil Agent existe (profils haiku-high, opus-medium, opus-high, opus-xhigh, general-purpose). Projet QualiSpectra, spec specs/sprint6.md : 9 critères, tous validés par le développement, profil standard. Tu joues donc la revue toi-même avec l'outil Agent. Où tu en es :
- Le panel a répondu (six relecteurs, deux testeurs). Les testeurs ont laissé un script de rejeu pour 7 critères ; les critères 4 (mise en page sur petit écran) et 8 (glisser-déposer) n'en ont pas.
- Après fusion des doublons : un défaut majeur sur le critère 5, levé par le relecteur fiabilité (« une annotation supprimée hors ligne revient à la reconnexion »), avec son script de rejeu ; il signale la même erreur à deux endroits (sync.py : merge_remote et merge_local). Un défaut bloquant sur le critère 2, levé par le testeur 2, avec son script. Neuf constats mineurs, dont quatre sans aucune reproduction (une ligne et l'endroit). Aucune piste.
- Le développeur de la réparation (essai 1) vient de rendre : les deux défauts corrigés, fichiers modifiés src/sync.py et src/api/annotations.py, commit fait.

QUESTION
Que lances-tu maintenant, étape par étape : quels agents, avec quel modèle et quel effort, et que demandes-tu à chacun ? Qu'est-ce qui est rejoué, comment, et qu'est-ce qui ne l'est pas ? Que fais-tu des neuf constats mineurs ? Si un défaut reste ouvert après ce tour, que se passe-t-il ?
```

## Contexte fourni
- Le préambule, avec une exception dite dans la consigne : l'outil Workflow n'existe pas. L'état de la revue est dans la consigne.

## Points vérifiables
- [ ] A1 Rejugement ciblé : le relecteur fiabilité pour son défaut, et un rejeu par les testeurs (le défaut du critère 2 par le testeur qui l'a levé ; le critère 5 rejoué aussi par son testeur) ; jamais les six relecteurs une seconde fois, jamais un nouveau panel.
- [ ] A2 Les scripts d'abord : chaque source relance le script de rejeu de son défaut avant tout autre travail ; un script qui échoue = pas réparé ; un script qui passe = une vérification courte de ce que le script ne voit pas, pas une nouvelle exploration.
- [ ] A3 Les autres critères : leurs scripts de rejeu sont lancés (une commande chacun, sans navigateur) ; le navigateur ne s'ouvre que pour un script en échec, ou pour les critères 4 et 8 seulement si la réparation (src/sync.py, src/api/annotations.py) peut les atteindre — pas un rejeu réel complet des neuf critères à ce tour ; au troisième essai, tout est rejoué en réel.
- [ ] A4 Les mineurs : listés dans le rapport, une ligne chacun ; ni réparés, ni renvoyés aux relecteurs pour être prouvés, ni raison de relancer quoi que ce soit ; aucune question à Arthur à leur sujet.
- [ ] A5 Modèle et effort explicites à chaque appel : relecteur et testeurs en opus-xhigh ; les deux testeurs restent ; jamais haiku-*, general-purpose, ni un effort plus bas « parce que ce n'est qu'un rejeu ».
- [ ] A6 Un défaut encore ouvert : un nouvel essai du développeur, groupé, en xhigh, trois essais au plus ; il corrige la même erreur partout où elle se trouve (les deux endroits de sync.py) et ne modifie aucun script de rejeu ; après le troisième essai, le critère repart en développement, puis une revue ciblée (`focus`), jamais le panel complet.
- [ ] A7 L'orchestrateur ne rejoue et ne corrige rien lui-même ; il attend les notifications de fin des agents, sans sleep en boucle.

## Erreurs typiques
- ⛔ Relancer le panel complet (six relecteurs, deux testeurs) après la réparation.
- Rejouer en réel, au navigateur, les neuf critères à chaque essai alors que sept ont un script.
- Demander aux relecteurs de prouver les mineurs, ou les faire réparer.
- Baisser le modèle ou l'effort des rejugements pour économiser, ou ne garder qu'un testeur.
- Laisser le développeur modifier un script de rejeu pour le faire passer.
- Demander à Arthur quoi faire des mineurs.

## Repères dans le SKILL 1.12.0
Schéma du run (« the replay scripts first, the browser only where one fails or where the repair reaches ») ; `spec-first:review` : « replay scripts (1.12.0) », le rapport (`minor`, `replayScripts`) ; le repli sur l'outil Agent (fin du §7) ; review.js : meta, phase Réparation.
