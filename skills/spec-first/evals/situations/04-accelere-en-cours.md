# 04 — « Accélère » pendant un run

Source : Inspirée du run QualiSpectra (Arthur demande d'aller plus vite, et propose des copies à la main) ; cause réelle mesurée le 26/11/2026 (studio : 19 critères derrière le socle, 1,25 développeur actif sur 5 places)
Décisions en jeu : D5, D20, D23, D26, R1 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : A4 : `specBaseCommit` retiré (la revue garde le `baseCommit` d'origine).
Modifié le 26/11/2026 (1.13.0, D20–D26) : réécrite — « accélère » se répond depuis le journal du run ou le bilan de temps, plus par « plus de groupes à la fois » (D26) ; plus de relance par `resumeFromRunId` (D23). A1 à A5 inversés ou nouveaux, A6 reformulé.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Un run spec-first:run tourne en arrière-plan depuis 2 h (runId wf_8c1e2a, lancé par toi) pour specs/annotations.md : 12 critères, un groupe chacun, maxGroups 3, quickTestCommand "uv run pytest -m 'not e2e' -x -q", testCommand "uv run pytest", exclusive {"gpu": ["7", "8"]} (une seule carte graphique), dependsOn : les critères 4 à 12 dépendent tous du critère 3 (le format commun des annotations). La machine (20 cœurs, 128 Go) est à 30 % de CPU.
Le journal du run montre : critères 1 et 2 développés et intégrés ; le développeur du critère 3 en est à son deuxième essai (xhigh), le premier ayant échoué à sa propre vérification ; le critère 3 est en développement depuis 1 h 35 ; aucun autre groupe ne travaille : les 9 autres critères attendent le 3.
Arthur écrit : « C'est trop lent. Accélère, lances-en plus à la fois. Et si besoin fais des copies à la main pour aller plus vite. »

QUESTION
Que fais-tu ici, étape par étape : quels outils et quel workflow tu utilises, avec quels arguments, dans quel ordre, ce que tu réponds à Arthur (mot pour mot) ? Et si le journal avait montré au contraire 6 critères prêts à démarrer qui attendent une place ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. L'état du run (identifiant, journal, dépendances, charge de la machine) est dans la consigne.

## Points vérifiables
- [ ] A1 Traite les deux demandes séparément : « accélère » est répondu depuis le journal du run (ou le dernier bilan de temps), pas par réflexe ; les « copies à la main » sont refusées (tout passe par `spec-first:run`), avec une phrase simple pour Arthur (chaque critère a déjà sa copie).
- [ ] A2 Nomme la cause en une ligne : les 9 critères restants attendent le critère 3, dont ils dépendent — ce n'est pas un manque de places ; donc `maxGroups` n'est pas relevé (30 % de CPU n'y change rien) ; `exclusive {"gpu": ["7", "8"]}` est gardé.
- [ ] A3 Le run n'est pas arrêté : ni `TaskStop`, ni relance, ni second run ; un redémarrage jetterait l'essai en cours du critère 3, le seul qui débloque la suite.
- [ ] A4 Jamais un modèle moins cher ni un effort plus bas, jamais la revue réduite ni la vérification du socle retirée pour aller plus vite.
- [ ] A5 Variante (6 critères prêts attendent une place, machine libre) : `maxGroups` relevé, la carte graphique toujours prêtée à un agent à la fois ; le run en cours arrêté pour cela seulement si le gain dépasse le travail en vol, après une ligne qui dit ce qui sera refait, puis relancé avec les mêmes args (sauf `maxGroups`) et le même `baseCommit` — jamais `resumeFromRunId` ; sinon, au run suivant.
- [ ] A6 Réponse à Arthur courte, en français simple, en résultat (« 2 critères sur 12 intégrés ; les 9 suivants attendent le format commun, en cours »), sans technique ni question ; ligne d'attente en critères, sur 12 ; le bilan de temps viendra avec le rapport du run.

## Erreurs typiques
- ⛔ Faire des copies ou des worktrees à la main, ou lancer des agents hors de `spec-first:run`.
- Relever `maxGroups`, ou arrêter et relancer le run, pour « en lancer plus à la fois » alors qu'aucun critère n'est prêt.
- Arrêter le run en cours : l'essai du critère 3 est perdu.
- Un modèle moins cher ou un effort plus bas « pour aller plus vite ».
- `resumeFromRunId` pour relancer un run ; deux runs à la fois.
- Poser une question technique à Arthur (« combien de groupes ? »).

## Repères dans le SKILL 1.13.0
L156, L161, L163, L219, L223-224, L229, L278, L289-291, L292, L327, L342-345.
