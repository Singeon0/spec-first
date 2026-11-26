# 31 — La revue jouée à la main, juste après la première réparation

Source : revue réelle QualiSpectra (10/11/2026, VM seglab-hsi-dev) : 138 min, dont 80 % après le panel ; les rejeux réels des deux testeurs après chaque réparation ont coûté 16 % de la revue (100 à 130 appels chacun) ; 25 constats sur 35 étaient mineurs, prouvés par exécution et jamais réparés. Repli sur l'outil Agent : cas générique (D10).
Décisions en jeu : D1, D10, D11, D15, D17, D19, D20, D24, R1, R5 (voir decisions.md)
Ajoutée le 25/11/2026 (1.12.0, D19).
Modifié le 26/11/2026 (1.13.0, D20–D26) : les testeurs ont chacun leur tranche et rejugent en même temps les seules tranches touchées ; la suite complète tourne de nouveau après la réparation (D24) : A1, A3 nouveaux, A5 reformulé ; la consigne ne nomme plus de profil (D20).

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Dans cette session, l'outil Workflow n'existe pas ; l'outil Agent existe (profils haiku-high, opus-medium, opus-high, opus-xhigh, general-purpose). Projet QualiSpectra, spec specs/sprint6.md : 9 critères, tous développés et intégrés par le run (« non vérifié »). Tu joues donc la revue toi-même avec l'outil Agent. Où tu en es :
- Le panel a répondu (six relecteurs, et deux testeurs en même temps : le testeur 1 pour les critères 1 à 5, le testeur 2 pour les critères 6 à 9). Les testeurs ont laissé un script de rejeu pour 7 critères ; les critères 4 (mise en page sur petit écran) et 8 (glisser-déposer) n'en ont pas. Le critère 8 passe par src/api/annotations.py ; le critère 4 ne touche ni src/sync.py ni src/api/annotations.py. La suite complète, lancée par la commande suite, était verte avant la réparation.
- Après fusion des doublons : un défaut majeur sur le critère 5, levé par le relecteur fiabilité (« une annotation supprimée hors ligne revient à la reconnexion »), avec son script de rejeu ; il signale la même erreur à deux endroits (sync.py : merge_remote et merge_local). Un défaut bloquant sur le critère 2, levé par le testeur 1, avec son script. Neuf constats mineurs, dont quatre sans aucune reproduction (une ligne et l'endroit). Aucune piste.
- Le développeur de la réparation (essai 1) vient de rendre : les deux défauts corrigés, fichiers modifiés src/sync.py et src/api/annotations.py, commit fait.

QUESTION
Que lances-tu maintenant, étape par étape : quels agents, avec quel modèle et quel effort, et que demandes-tu à chacun ? Qu'est-ce qui est rejoué, comment, et qu'est-ce qui ne l'est pas ? Que fais-tu des neuf constats mineurs ? Si un défaut reste ouvert après ce tour, que se passe-t-il ?
```

## Contexte fourni
- Le préambule, avec une exception dite dans la consigne : l'outil Workflow n'existe pas. L'état de la revue est dans la consigne.

## Points vérifiables
- [ ] A1 Rejugement ciblé : le relecteur fiabilité pour son défaut, et les testeurs des tranches touchées, en même temps — le testeur 1 (constats ouverts sur 2 et 5), le testeur 2 (la réparation touche src/api/annotations.py, par où passe le critère 8) ; jamais les six relecteurs une seconde fois, jamais un nouveau panel.
- [ ] A2 Les scripts d'abord : chaque source relance le script de rejeu de son défaut avant tout autre travail ; un script qui échoue = pas réparé ; un script qui passe = une vérification courte de ce que le script ne voit pas, pas une nouvelle exploration.
- [ ] A3 Les autres critères : leurs scripts de rejeu, lancés par le testeur de leur tranche (une commande chacun, sans navigateur) ; le navigateur seulement pour un script en échec et pour le critère 8, que la réparation atteint — pas pour le 4, qu'elle n'atteint pas ; la suite complète de nouveau, par la commande suite (un agent à part) ; au troisième essai, tout est rejoué en réel.
- [ ] A4 Les mineurs : listés dans le rapport, une ligne chacun ; ni réparés, ni renvoyés aux relecteurs pour être prouvés, ni raison de relancer quoi que ce soit ; aucune question à Arthur à leur sujet.
- [ ] A5 Modèle et effort explicites à chaque appel : relecteur et testeurs en opus-xhigh ; les testeurs des tranches touchées restent en conditions réelles ; jamais haiku-*, opus-medium, general-purpose, ni un effort plus bas « parce que ce n'est qu'un rejeu ».
- [ ] A6 Un défaut encore ouvert : un nouvel essai du développeur, groupé, en xhigh, trois essais au plus ; il corrige la même erreur partout où elle se trouve (les deux endroits de sync.py) et ne modifie aucun script de rejeu ; après le troisième essai, le critère repart en développement, puis une revue ciblée (`focus`), jamais le panel complet.
- [ ] A7 L'orchestrateur ne rejoue et ne corrige rien lui-même ; il attend les notifications de fin des agents, sans sleep en boucle.

## Erreurs typiques
- ⛔ Relancer le panel complet (six relecteurs et tous les testeurs) après la réparation.
- Rejouer en réel, au navigateur, les neuf critères à chaque essai alors que sept ont un script.
- Demander aux relecteurs de prouver les mineurs, ou les faire réparer.
- Baisser le modèle ou l'effort des rejugements pour économiser, ne garder qu'un testeur, ou rejouer les tranches l'une après l'autre.
- Laisser le développeur modifier un script de rejeu pour le faire passer.
- Demander à Arthur quoi faire des mineurs.

## Repères dans le SKILL 1.13.0
L161, L229, L246-256, L266-270, L307-310, L315, L361 ; review.js : meta, phase Réparation.
