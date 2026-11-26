# 11 — Défaut d'environnement, réparation ciblée

Source : Inspirée des clés absentes des copies (.env non copié)
Décisions en jeu : D4, D12, D21, D23 (D3 remplacée) (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : `strictCheck` retiré de la consigne, question sur la revue ; A2, A3, A4 parlent de la revue.
Modifié le 26/11/2026 (1.13.0, D20–D26) : rapport sans critiques pendant le run, critère 4 en échec à la vérification de son développeur (D21) ; A1, A2 : relance avec les mêmes args et le même `baseCommit`, sans commit « étape 1 » ni `recheck` (D23) ; A4 : personne ne rejuge le critère 4 pendant le run, la revue juge les 6.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Rapport du premier run de specs/carte.md (6 critères, baseCommit 1a2b3c4, setupCommand "uv sync") :
- critères 1, 2, 3, 5, 6 : « non vérifié » (développés et intégrés) ;
- critère 4 (« La carte s'affiche avec son fond de plan ») : « en échec » après 3 essais, effortReached « xhigh », defect « environnement », raison : « la vérification du développeur échoue : la carte s'affiche sans fond ; la clé MAPTILER_KEY est absente du fichier .env de la copie ; avec la clé du projet, le fond s'affiche » ;
- check : batterie rapide verte ; reviewReady false ; result in « integration », branche spec-first-carte--integration.
Le .env du projet (ignoré par git) contient bien MAPTILER_KEY.

QUESTION
Que fais-tu ici, étape par étape : quel workflow, avec quels arguments (donne-les tous), qui rejuge le critère 4, la revue de la spec tourne-t-elle, et quand ? Et si la clé manquait aussi dans le .env du projet ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport du run est résumé dans la consigne.

## Points vérifiables
- [ ] A1 Aucun commit « étape 1 » ni squash avant la relance : ce qui est passé est déjà dans git ; la relance garde le `baseCommit` 1a2b3c4.
- [ ] A2 Relance avec les mêmes args (les 6 critères dans `criteria`, même `baseCommit`) et `envRepair {"4": {"defect": <raison du rapport>}}` ; ni `recheck`, ni `critics`, ni `finalCheck`.
- [ ] A3 La cause est corrigée à la racine : `setupCommand` copie le `.env` du projet (sinon les copies de la revue manqueront aussi de la clé).
- [ ] A4 Aucun critique ne rejuge le critère 4 pendant le run : la réparation ciblée cite sa propre vérification (commande et sortie), la batterie rapide tourne en fin de run ; puis la revue juge les 6 critères, avec `baseCommit` 1a2b3c4 (celui du premier run).
- [ ] A5 Aucune question à Arthur ; une ligne d'avancement en critères.
- [ ] A6 Clé absente du projet aussi → arrêt « vraiment bloqué », une fois le reste fini : la seule action (fournir la clé), dite une fois, sans options ; aucune clé inventée ni écrite en dur.

## Erreurs typiques
- Relance classique (`startEffort`, nouveau développement) au lieu de la réparation ciblée.
- Un commit « étape 1 » ou un nouveau `baseCommit` avant la relance.
- `envRepair` sur un critère absent de `criteria` (ignoré par le run).
- `setupCommand` laissé tel quel.
- ⛔ Le `.env` commité.

## Repères dans le SKILL 1.13.0
L118, L148-149, L156, L171, L263, L286, L297, L305, L340, L348, L354.
