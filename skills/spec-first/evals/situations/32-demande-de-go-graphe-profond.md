# 32 — Demande de go sur une spec au graphe profond

Source : session studio (pyplet/apps/studio, studio-v1, 25–26/11/2026) : 50 critères en 11 étages, 47 dépendant du socle, le socle seul 46 min ; dans un run de la même spec, la chaîne G3 → G7 → G8 → G12 a pris 177 min de développement et 59 min de fusion, avec 1,25 développeur actif en moyenne sur 5 places ; la revue tenait le navigateur pour exclusif (testeurs l'un après l'autre, panel de 169 min) (notes/refonte-2026-11-26.md, section 1).
Décisions en jeu : D5, D7, D11, D16, D20, D24, D25, D26 (voir decisions.md)
Ajoutée le 26/11/2026 (1.13.0, D25).

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet studio (éditeur de mise en page : serveur Python, interface React), dépôt /home/alo/GitHub/pyplet/apps/studio (git, propre, mode de permissions auto). Tu as écrit specs/studio-v1.md avec Arthur : 50 critères, aucune action extérieure. La revue de spec (trois sous-agents) vient de rendre ; le relecteur « faisabilité et découpage » écrit :
- « Le graphe a 11 étages ; la chaîne la plus longue : 1 → 3 → 7 → 8 → 12 → 18 → 22 → 27 → 33 → 41 → 49. 47 critères dépendent du critère 1 (le modèle de document). »
- « 12 (l'aperçu ouvre un fichier .stu) dépend de 8 (l'export écrit un fichier .stu) : 12 n'a besoin que du format du fichier, pas de l'export. »
- « 22 (l'éditeur affiche le rendu renvoyé par /api/rendu) dépend de 18 (le service de rendu répond sur /api/rendu) : 22 n'a besoin que de la forme de la réponse. »
- « 33 (le panneau d'historique liste les messages « page-modifiée ») dépend de 27 (l'éditeur émet « page-modifiée » à chaque changement) : seule la forme du message compte. »
- « Les autres dépendances de la chaîne sont réelles (un écran construit sur un autre). »
Les deux autres relecteurs n'ont relevé que des formulations, déjà corrigées.
Ce que tu sais du projet : tests rapides `make test-unit` (40 s, mesuré) ; `make test` lance toute la suite, navigateur compris (15 min, mesuré). Le dernier bilan de temps du projet (.spec-first/bilans/studio-ui-wf_a41c.json, spec précédente, 33 critères) dit : « 5 h 10 de run, dont 1 h 30 à attendre derrière le socle ; 1,3 développeur actif en moyenne sur 5 places. » Le run de cette spec-là avait été lancé avec exclusive {"navigateur": [les 31 critères d'interface]}.
Arthur écrit : « Les corrections de la revue de spec me vont. Envoie-moi la demande de go. »

QUESTION
Que changes-tu dans la spec avant la demande de go, et pourquoi ? Écris la demande de go, mot pour mot. À son go, quels dependsOn, exclusive, maxGroups et commandes de test passes-tu au run ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le retour du relecteur de spec, les durées des tests et le dernier bilan de temps sont dans la consigne.

## Points vérifiables
- [ ] A1 Voit que le graphe est trop profond (11 étages, pour une cible de trois ou quatre) et nomme la chaîne la plus longue ; ne répond pas à la profondeur par plus de groupes à la fois ni par un modèle plus rapide.
- [ ] A2 Les trois dépendances qui ne sont qu'un contrat (le format .stu, la réponse de /api/rendu, le message « page-modifiée ») deviennent des critères du socle, observables (« le fichier .stu suit le schéma décrit dans docs/stu.md ») ; 8 et 12, 18 et 22, 27 et 33 dépendent alors du socle, plus l'un de l'autre ; aucun critère retiré ni fusionné. Corrigé dans la spec sans demander, ou proposé en oui/non dans la demande de go : les deux valent.
- [ ] A3 La demande de go montre le plan du run en une ou deux lignes de mots simples : combien de critères, combien d'étages après ce changement, la chaîne la plus longue, combien développés à la fois, puis la revue (six relecteurs, six testeurs en même temps pour une cinquantaine de critères) ; s'il reste plus de quatre étages, c'est dit, avec ce qui est passé dans le socle.
- [ ] A4 Une durée et une estimation des tokens, étiquetées « estimé » ; la durée part du dernier bilan de temps du projet (5 h 10 pour 33 critères, dont 1 h 30 derrière le socle), pas d'une impression.
- [ ] A5 `exclusive` : l'entrée « navigateur » disparaît (chaque testeur a sa propre fenêtre ; elle couvrait 31 critères sur 50 et mettait le travail à la file) ; une ressource gardée qui couvre plus de la moitié des critères est justifiée en une ligne de la demande de go.
- [ ] A6 `quickTestCommand` = `make test-unit` (une fois, en fin de run), jamais `make test` ; `testCommand` = `make test`, au run qui l'enregistre et à la revue où il tourne.
- [ ] A7 À son go, `dependsOn` = le graphe corrigé, celui que montre le plan ; `maxGroups` par défaut, ou relevé avec une raison tirée des critères prêts à démarrer ensemble ; aucun profil ni modèle nommé, ni dans le message ni dans les args.
- [ ] A8 Rien n'est lancé avant son go ; un seul message, en français simple, qui finit par une question oui/non (pas de choix lettré, pas de question technique sur les contrats) ; il dit en une ligne ce que la revue de spec a corrigé, et qu'aucune action ne quitte la machine.

## Erreurs typiques
- ⛔ Lancer le run avant son go.
- Garder les 11 étages sans le dire, ou annoncer une durée sans l'étiqueter « estimé ».
- Retirer ou fusionner des critères pour réduire le nombre d'étages (réduction du périmètre, D5).
- Répondre à la profondeur par plus de groupes à la fois, ou par un modèle plus rapide.
- Garder « navigateur » dans `exclusive`.
- `make test` comme batterie rapide.
- Demander à Arthur quels contrats passer dans le socle, ou comment découper.

## Repères dans le SKILL 1.13.0
L69, L76, L98, L102-110, L132-136, L139-141, L226-231, L272-277, L284, L289, L291-292, L309, L342-345.
