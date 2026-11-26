# 23 — « Mode rapide » demandé avant le go

Source : Eval 29 « profil-rapide-au-go » (evals.json), cas générique du profil rapide de la 1.8.0 ; réécrite le 26/11/2026 : il n'y a plus qu'un profil
Décisions en jeu : D11, D15, D20, D21, D24, D25 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : A1, A4, A5 et une erreur typique : la revue remplace le contrôle strict ; `finalCheck: false` permis sur le run que la revue suit ; `specTotal` retiré.
Modifié le 26/11/2026 (1.13.0, D20–D26) : réécrite — le profil rapide n'existe plus (D20) ; « mode rapide » au go → un seul profil, le plan du run et ce qui le rend rapide (D25), jamais un modèle moins cher. A1, A2, A4, A5 inversés ou nouveaux (A2 : le plan du run et une durée) ; A6 reformulé.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet QualiSpectra (application web d'annotation d'images hyperspectrales), dépôt /home/alo/GitHub/pyplet/apps/QualiSpectra (git, propre). Avec Arthur, tu as mis au point specs/theme-sombre.md, 6 critères :
1. Un sélecteur « Thème sombre » existe dans les réglages.
2. Le thème choisi est conservé après rechargement de la page.
3. Toutes les pages sont lisibles en thème sombre (contraste suffisant).
4. Les images hyperspectrales gardent leurs couleurs d'origine en thème sombre.
5. Le libellé « Mode nuit » est renommé « Thème sombre » partout.
6. La couleur de fond sombre est un jeton de la configuration du thème.
Les critères 5 et 6 sont simples (un libellé renommé, un jeton de couleur dans la configuration). Tous les accès ont été vérifiés. Tests rapides : `npm run test:unit` (1 min, mesuré) ; tests complets : `npm test` (12 min, dont des tests de bout en bout).
Arthur écrit : « Fais-le au plus vite, en mode rapide, peu importe le modèle, mais je veux une vraie revue à la fin. »

QUESTION
Quel est ton prochain message à Arthur, mot pour mot ? Que fais-tu ensuite, et quand ? S'il répond « Go », quel workflow lances-tu, avec quels arguments ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. La spec, la demande d'Arthur et les durées des tests sont dans la consigne.

## Points vérifiables
- [ ] A1 La demande de go dit en une ligne, dans ses mots, qu'il n'y a plus qu'une façon de travailler : tous les agents en Opus, jamais un modèle moins cher ni une revue réduite pour aller vite ; aucun profil proposé (reprendre ses mots « mode rapide » pour dire qu'il n'y a plus qu'une façon de faire est admis), aucun modèle choisi pour lui.
- [ ] A2 Le plan du run en une ou deux lignes (6 critères, combien d'étages, combien développés à la fois, puis la revue), une durée et une estimation des tokens étiquetées « estimé » ; ce qui le rend rapide (critères en parallèle, batterie rapide d'une minute) ; il ne propose pas de retirer des critères (D5).
- [ ] A3 Rien n'est lancé avant son go : le message finit par une seule question oui/non (le go), sans choix lettré (pas de « A standard / B rapide »).
- [ ] A4 Répond à « une vraie revue à la fin » : la revue tourne toujours, une fois tous les critères développés et intégrés — six relecteurs et des testeurs en conditions réelles en même temps (ici deux), en xhigh ; un critère n'est coché que lorsqu'elle le passe ; le run finit sur sa batterie rapide.
- [ ] A5 À son go : ni `profil`, ni `simples`, ni `finalCheck` ; un groupe par critère ; `quickTestCommand` = `npm run test:unit` (une fois, en fin de run), `testCommand` = `npm test` au run et à la revue ; `dependsOn` plausible ou absent ; la commande suite installée avant l'appel.
- [ ] A6 Le message à Arthur reste en français simple : pas de nom d'argument, ni modèle ni effort détaillés au-delà de la ligne de A1.
- [ ] A7 Au lancement : la ligne /goal ou ProposeGoal, selon le SKILL.

## Erreurs typiques
- ⛔ Lancer le run avant son go (sa phrase n'est pas un go : la spec reste à approuver).
- ⛔ Un modèle moins cher (Sonnet, Haiku) ou un effort plus bas « pour aller plus vite ».
- Proposer un profil « rapide » ou « standard », ou un choix lettré entre deux façons de faire.
- Pas de revue à la fin « pour aller vite », ou une revue réduite (moins de six relecteurs, un seul testeur).
- `profil`, `simples` ou `finalCheck` dans les args.
- Pas d'estimation, ou une estimation présentée comme mesurée.

## Repères dans le SKILL 1.13.0
L76, L132-136, L138-141, L147, L179-190, L204, L226-231, L246-256, L267, L274, L284, L309.
