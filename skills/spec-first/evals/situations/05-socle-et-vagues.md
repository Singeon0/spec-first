# 05 — Socle commun et vagues

Source : Inspirée des runs enchaînés « socle puis écrans » (QualiSpectra), générique
Décisions en jeu : D5, D7, D11, D12 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : A3, A5, A7 et une erreur typique : la revue (spec-first:review) remplace le contrôle strict ; plus de `specBaseCommit` ni de `finalCheck: "light"`.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet web (serveur Python, interface React), dépôt git propre, /home/alo/GitHub/pyplet/apps/QualiSpectra. Tu prépares la spec. Arthur a écrit : « Je veux un nouveau format d'export des annotations (fichier .qsa), et les quatre écrans qui l'utilisent : export, import, aperçu, comparaison. »
Le format .qsa doit contenir les polygones, les étiquettes et une version de format. Les quatre écrans en dépendent tous.

QUESTION
Comment découpes-tu les critères ? Quels groups et quel dependsOn ? Combien de runs, lesquels, avec quels arguments ? Que se passe-t-il si le critère du format échoue après 3 essais ? Et si, entre le format et les écrans, le serveur de démonstration devait être redémarré (une étape hors de tout run) ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. La spec n'est pas encore écrite : l'agent la prépare.

## Points vérifiables
- [ ] A1 Découpe fine sans réduire le périmètre : le format (socle) en sous-critères observables (polygones, étiquettes, version) et un critère par écran ; aucun écran retiré.
- [ ] A2 `dependsOn` : chaque écran dépend du socle (ou de ses sous-critères) ; un groupe par critère (`groups` omis ou explicite).
- [ ] A3 Un seul run pour toute la spec, en vagues, puis une seule revue (spec-first:review), à la fin.
- [ ] A4 Les sous-critères du socle qui définissent une même structure ne l'inventent pas trois fois en parallèle : soit un même groupe, soit l'un pose la structure et les autres en dépendent (ou le risque est signalé).
- [ ] A5 Format en échec après 3 essais : commit « étape 1 », UNE relance avec le critère du format (`startEffort` = son `effortReached`, ou `envRepair` si le défaut est d'environnement) et les écrans « en attente des dépendances » (`relaunchAs`), même `dependsOn`, `recheck` = les critères validés.
- [ ] A6 Échec encore → arrêt (plus rien ne peut avancer), en mots simples, avec une recommandation, sans choix lettré.
- [ ] A7 Redémarrage du serveur entre le format et les écrans : deux runs enchaînés ; le premier finit sur son contrôle léger, sans revue, son résultat commité « étape 1 » ; le redémarrage hors run (listé dans le go s'il touche une machine extérieure) ; le second avec `recheck` = les critères du premier, puis la revue une seule fois (`baseCommit` du premier run) ; même /goal, sans arrêt entre les deux.
- [ ] A8 Aucune question à Arthur sur la façon de découper ; une question sur la spec seulement si elle change ce qu'il obtient, simple, sans choix lettré.

## Erreurs typiques
- Un run par écran, ou les écrans lancés avant que le format soit fusionné.
- Une revue lancée après le premier de deux runs enchaînés : revue prématurée, à refaire.
- Un écran retiré « pour simplifier ».
- Deux relances séparées (le format, puis les écrans).

## Repères dans le SKILL 1.7.0
L93-94, L197, L243, L256-264, L283-285.
