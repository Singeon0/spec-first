# 11 — Défaut d'environnement, réparation ciblée

Source : Inspirée des clés absentes des copies (.env non copié)
Décisions en jeu : D3, D4, D12 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Rapport du premier run de specs/carte.md (6 critères, baseCommit 1a2b3c4, setupCommand "uv sync") :
- critères 1, 2, 3, 5, 6 : « validé » ;
- critère 4 (« La carte s'affiche avec son fond de plan ») : « en échec » après 3 essais, effortReached « xhigh », defect « environnement », rejectedBy ["tester", "owner"], raison : « [tester] la carte s'affiche sans fond : la clé MAPTILER_KEY est absente du fichier .env de la copie ; avec la clé du projet, le fond s'affiche » ;
- check : contrôle léger ; strictCheck false ; result in « integration », branche spec-first-carte--integration-Zx9.
Le .env du projet (ignoré par git) contient bien MAPTILER_KEY.

QUESTION
Que fais-tu ici, étape par étape : quel workflow, avec quels arguments (donne-les tous), qui rejuge le critère 4, le contrôle strict tourne-t-il et quand ? Et si la clé manquait aussi dans le .env du projet ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le rapport du run est résumé dans la consigne.

## Points vérifiables
- [ ] A1 Commit « étape 1 » (squash de la branche d'intégration) avant la relance ; il devient le `baseCommit`.
- [ ] A2 Relance avec `envRepair {"4": {"defect": <raison du rapport>, "critics": ["tester", "owner"]}}`, le critère 4 dans `criteria` ; `recheck` = 1, 2, 3, 5, 6 ; `specBaseCommit` 1a2b3c4 ; pas de `strictDone` ; `finalCheck` auto.
- [ ] A3 La cause est corrigée à la racine : `setupCommand` copie le `.env` du projet (sinon la copie d'intégration du contrôle strict manquera aussi de la clé).
- [ ] A4 Le critère 4 est rejugé seulement par le testeur et l'avocat du propriétaire ; les autres critères par non-régression ; le contrôle strict tourne dans ce même run si tout passe.
- [ ] A5 Aucune question à Arthur ; une ligne d'avancement en critères.
- [ ] A6 Clé absente du projet aussi → arrêt « vraiment bloqué », une fois le reste fini : la seule action (fournir la clé), dite une fois, sans options ; aucune clé inventée ni écrite en dur.

## Erreurs typiques
- Relance classique avec `startEffort` et tout le panel.
- `envRepair` sur un critère absent de `criteria` (ignoré par le run).
- `setupCommand` laissé tel quel.
- ⛔ Le `.env` commité.

## Repères dans le SKILL 1.7.0
L128, L230, L239, L252, L281, L284.
