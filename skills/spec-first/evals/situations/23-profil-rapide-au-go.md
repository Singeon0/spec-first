# 23 — Profil rapide demandé avant le go

Source : Eval 29 « profil-rapide-au-go » (evals.json), cas générique du profil rapide de la 1.8.0
Décisions en jeu : D1, D11, D13, D14 (voir decisions.md)

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
Les critères 5 et 6 sont simples (un libellé renommé, un jeton de couleur dans la configuration). Tous les accès ont été vérifiés. Tests rapides : `npm run test:unit` (1 min) ; tests complets : `npm test` (12 min, dont des tests de bout en bout).
Arthur écrit : « Fais-le au plus vite, peu importe le modèle, mais je veux une vraie revue à la fin. »

QUESTION
Quel est ton prochain message à Arthur, mot pour mot ? Que fais-tu ensuite, et quand ? S'il répond « Go », quel workflow lances-tu, avec quels arguments ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. La spec, la demande d'Arthur et les durées des tests sont dans la consigne.

## Points vérifiables
- [ ] A1 La demande de go recommande le profil rapide, en une ligne de français simple : Sonnet et Haiku, aucune critique pendant le run, contrôle final strict.
- [ ] A2 Une estimation des tokens (ou du coût), étiquetée « estimé ».
- [ ] A3 Rien n'est lancé avant son go : le message finit par une seule question oui/non (le go), sans choix lettré (pas de « A standard / B rapide »).
- [ ] A4 Répond à « une vraie revue à la fin » : le contrôle final strict tourne toujours en rapide (panel complet, xhigh), une fois que tous les critères passent ; jamais `finalCheck: false`.
- [ ] A5 À son go : `profil: "rapide"`, `simples` = ["5", "6"], `specTotal` 6, un groupe par critère, `quickTestCommand` = les tests rapides, `testCommand` = les tests complets (une seule fois, au contrôle strict) ; `dependsOn` plausible ou absent.
- [ ] A6 Le message à Arthur reste en français simple : pas de nom d'argument (`simples`, `finalCheck`, `profil`), pas d'efforts détaillés.
- [ ] A7 Au lancement : la ligne /goal ou ProposeGoal, selon le SKILL.

## Erreurs typiques
- ⛔ Lancer le run avant son go (sa phrase n'est pas un go : la spec et le profil restent à approuver).
- Choisir le profil standard malgré sa demande, ou choisir rapide pour lui sans le lui dire.
- Choix lettré entre les deux profils.
- `finalCheck: false` ou contrôle léger « pour aller vite ».
- Haiku pour un juge ou une fusion ; critères simples hors des critères 5 et 6.
- Pas d'estimation, ou une estimation présentée comme mesurée.

## Repères dans le SKILL 1.8.0
L120-122, L210-222, L262, L264.
