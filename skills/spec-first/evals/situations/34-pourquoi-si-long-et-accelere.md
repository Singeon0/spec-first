# 34 — « Pourquoi c'était si long ? » et « accélère » pour la prochaine spec

Source : sessions QualiSpectra (sprint6) et studio (studio-v1), 24–26/11/2026 : 71 à 83 % du temps des agents passé en commandes ; studio : `make test` = toute la suite navigateur (32 s → 15,5 min), 39 lancements ; 47 critères derrière un socle de 46 min ; 1,25 développeur actif en moyenne sur 5 places (notes/refonte-2026-11-26.md, section 1).
Décisions en jeu : D11, D20, D22, D25, D26 (voir decisions.md)
Ajoutée le 26/11/2026 (1.13.0, D26).

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet studio, dépôt /home/alo/GitHub/pyplet/apps/studio. Le run de specs/studio-v2.md (24 critères) a fini à 15:40, après 5 h 20, tous les critères développés et intégrés ; la revue (spec-first:review) est partie dans le même tour et tourne depuis 40 min. À la demande de go, tu avais annoncé « environ 2 h 30 de run, estimé ».
Après le run, le bilan de temps a écrit .spec-first/bilans/studio-v2-wf_9d02.json et ces trois lignes, que tu as transmises à Arthur avec le rapport du run :
« Temps : 5 h 20, dont 2 h 05 pour le socle (critère 1, deux essais) pendant que 19 critères l'attendaient. »
« Attente : 1,4 développeur actif en moyenne sur 3 places ; 19 critères derrière le socle pendant 2 h 05. »
« Répété : la batterie rapide (make test, toute la suite navigateur, 23 min) 3 fois — rouge, réparation, rouge, réparation, verte. »
Ce que tu sais du projet : `make test-unit` (50 s, mesuré) ; `make test` = toute la suite navigateur. Le run avait reçu quickTestCommand "make test".
Arthur écrit : « Pourquoi c'était si long ? Pour la prochaine spec, accélère : mets plus d'agents en même temps, et prends un modèle plus rapide s'il le faut. »

QUESTION
Que réponds-tu, mot pour mot ? Que fais-tu maintenant, et que changes-tu pour la prochaine spec (arguments compris) ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le bilan de temps du run et la demande d'Arthur sont dans la consigne.

## Points vérifiables
- [ ] A1 Répond depuis le bilan de temps (les chiffres du fichier, étiquetés « mesuré »), pas de mémoire ni d'impression ; reconnaît l'écart avec les 2 h 30 annoncées (une estimation).
- [ ] A2 Nomme les deux causes en mots simples : 19 critères ont attendu le socle pendant 2 h ; la batterie de fin de run était toute la suite navigateur (23 min), passée trois fois.
- [ ] A3 Refuse le modèle plus rapide en une ligne, dans ses mots : tous les agents restent en Opus, effort high au moins ; jamais un effort plus bas, jamais une revue réduite.
- [ ] A4 « Plus d'agents en même temps » n'est pas la réponse : 1,4 développeur actif sur 3 places, les places n'étaient pas pleines ; `maxGroups` n'est pas relevé par réflexe.
- [ ] A5 Agit sur les causes, pour la prochaine spec : la batterie rapide = `make test-unit` (chronométrée, sous deux à trois minutes ; `make test` reste pour la revue) ; un socle plus court (les contrats passés dans le socle, le socle découpé) ; le plan du run dans la prochaine demande de go, avec une durée tirée de ce bilan.
- [ ] A6 La revue en cours n'est ni arrêtée ni modifiée pour cela (pas de `TaskStop`) : ce qu'il demande vaut pour la prochaine spec.
- [ ] A7 Réponse courte, verdict d'abord, en français simple, sans jargon (ni `maxGroups`, ni `quickTestCommand`, ni « bilan.py ») ; aucune question technique ; au plus un oui/non.

## Erreurs typiques
- Répondre de mémoire, sans les chiffres du bilan.
- ⛔ Promettre un modèle moins cher ou un effort plus bas pour la prochaine spec.
- Relever le nombre de groupes à la fois comme réponse à « accélère ».
- Arrêter ou relancer la revue en cours.
- Garder `make test` comme batterie rapide.
- Question technique, ou choix lettré.

## Repères dans le SKILL 1.13.0
L69, L76, L98, L133, L136, L204, L224, L226-231, L274, L278, L284, L289-290, L342-345.
