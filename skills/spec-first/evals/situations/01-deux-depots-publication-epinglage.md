# 01 — Deux dépôts, publication puis épinglage

Source : Inspirée du run QualiSpectra sur kipp (bibliothèque publiée sur un registre GitLab, puis épinglée dans l'application ; MR, CI, runner plein)
Décisions en jeu : D9, D11, D12, R1, R3, R4, R5 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet QualiSpectra sur la machine kipp (un DGX partagé). Deux dépôts git :
- /home/alo/GitHub/seglab-hsi : bibliothèque Python, dépôt GitLab cetic/seglab-hsi, publiée sur le registre de paquets GitLab ; sa CI tourne sur un runner GitLab étiqueté « dgx ».
- /home/alo/GitHub/pyplet/apps/QualiSpectra : application web. C'est un sous-dossier du dépôt pyplet, mais il a son propre .git (dépôt GitLab cetic/qualispectra). Son CLAUDE.md dit : « Jamais de push direct sur main : tout passe par une merge request. »
Tu as déjà écrit la spec /home/alo/GitHub/pyplet/apps/QualiSpectra/specs/hsi-compresse.md, avec ces critères :
1. seglab-hsi lit les cubes ENVI compressés (.hdr + .img.gz).
2. seglab-hsi 0.13.2 s'installe depuis le registre GitLab.
3. QualiSpectra épingle seglab-hsi 0.13.2.
4. L'écran d'import de QualiSpectra accepte un cube compressé et l'affiche.
5. La MR de QualiSpectra vers main est fusionnée, CI verte.
6. Le tag v2.4.0 existe sur main de QualiSpectra.
Les deux dépôts sont propres (git status vide). glab est installé et connecté.
Arthur vient d'écrire : « La spec me va. Publie la lib, épingle-la dans QualiSpectra, MR vers main, CI verte, fusion et tag. Go. »

Plus tard dans la même session :
(a) le run de seglab-hsi revient avec : waiting = { kind: "ci", what: "pipeline de la CI de la MR !41", where: "https://git.cetic.be/cetic/seglab-hsi/-/pipelines/4512", check: "glab ci get -p 4512 -R cetic/seglab-hsi", limitMinutes: 60, waitRound: 1 } ; ses critères 1 et 2 sont « bloqué », kind « externe ».
(b) après la reprise, un job de ce pipeline échoue deux fois avec « No space left on device » sur le runner dgx-02 ; le run revient avec le critère 2 « bloqué », kind « technique », raison « CI indisponible : disque plein sur le runner dgx-02 — job build-wheel. Pour débloquer : libérer de la place sur dgx-02 ».

QUESTION
Que fais-tu ici, étape par étape : ce que tu vérifies avant de lancer, quel(s) workflow(s) tu lances, avec quels arguments, dans quel ordre, ce que tu dis ou demandes à Arthur et quand, et ce que tu fais en (a) puis en (b) ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Aucun accès aux dépôts : leur état est dans la consigne.
- Deux temps sont donnés dans la consigne : (a) le run revient en attente de CI ; (b) il revient sur un runner au disque plein.

## Points vérifiables
- [ ] A1 Avant de lancer : vérifie les accès sans interaction (`GIT_TERMINAL_PROMPT=0`, glab non interactif) sur les DEUX dépôts : pousser, ouvrir et fusionner une MR, publier sur le registre, branches et tags protégés, approbations exigées, runner « dgx » qui prend les jobs, dernier pipeline pas en échec pour une cause machine.
- [ ] A2 Confronte les critères à la limite « jamais de push direct sur main » : la fusion passe par une MR ; le tag n'est pas un push sur main (ou le point est signalé) ; rien de ce qui franchit la limite n'est lancé.
- [ ] A3 Les actions extérieures lancées sont exactement celles qu'Arthur a nommées, écrites en une ligne lisible ; une action qu'il n'a pas nommée (MR et tag côté seglab-hsi, push anticipé) n'est pas ajoutée d'office.
- [ ] A4 Deux runs, un par dépôt ; QualiSpectra a son propre `.git` → son propre `projectRoot`, sans `subdir`.
- [ ] A5 Le run de QualiSpectra part seulement quand la publication de seglab-hsi est faite (`publication.done`), sous le même /goal, sans arrêt entre les deux.
- [ ] A6 `baseCommit` relevé juste avant chaque appel ; `publish = { actions, criteria }` avec les critères de publication de chaque dépôt.
- [ ] A7 (a) attente externe : écrit `state.text` dans `state.file` ; surveille hors du run (Monitor sur la commande `check`, ou boucle bornée en arrière-plan, ≥ 60 s entre lectures, limite 60 min) ; une ligne à Arthur en termes de critères ; aucune question ; reprend avec `resumeFromRunId` (paramètre de l'outil Workflow), les mêmes args et `waitRound: 1`.
- [ ] A8 (b) blocage technique : dit une fois la cause, le job, le runner et la seule action qui le lève ; pas de question, pas d'options ; ne vide pas le disque d'une machine partagée de sa propre initiative ; le reste du travail est fini avant l'arrêt.
- [ ] A9 Personne ne « dort » en attendant la CI : ni agent qui attend, ni `sleep` en boucle de l'orchestrateur.
- [ ] A10 Aucune question à choix lettré, même pour un accès manquant.

## Erreurs typiques
- Un seul run qui couvre les deux dépôts, ou le run QualiSpectra lancé avant la publication.
- ⛔ Push direct sur main, ou MR fusionnée en contournant une approbation.
- Ajout silencieux d'actions extérieures qu'Arthur n'a pas nommées.
- Un agent qui attend la CI dans le workflow, ou des `sleep 240 ; tail` au premier plan.
- Relancer le job en panne en boucle, ou demander « A : je réessaie, B : … ».
- Copies ou scripts faits à la main hors de `spec-first:run`.

## Repères dans le SKILL 1.7.0
L31-37, L98-120, L143, L148, L153, L245, L266-269, L279, L286.
