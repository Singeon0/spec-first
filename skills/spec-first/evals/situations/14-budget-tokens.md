# 14 — Budget de tokens pour toute la spec

Source : Cas générique (limite fixée par le propriétaire)
Décisions en jeu : D4, D11, R2, R3 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Arthur écrit : « Go sur specs/recherche-plein-texte.md, mais pas plus de 2 millions de tokens pour toute la spec. » La spec a 7 critères ; le dépôt est propre.
Plus tard, le run revient avec : stopped = « budget de tokens presque atteint (1 702k sur 2 000k), arrêt avant l'essai 3 du groupe 5 » ; critères 1 à 4 « validé » ; critère 5 « en échec » (2 essais) ; critères 6 et 7 « bloqué », kind « technique », raison « Arrêté : budget… » ; aucun contrôle strict n'a tourné.

QUESTION
Que fais-tu ici, étape par étape : quels arguments au lancement, que fais-tu au retour du run, relances-tu, que dis-tu à Arthur (mot pour mot) et quand ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le go, la limite et le rapport du run sont dans la consigne.

## Points vérifiables
- [ ] A1 Au lancement : `budget` = 2000000 ; la réponse sait que la limite vaut pour toute la spec (chaque run suivant reçoit ce qui reste) et dit ce que le run compte (tokens de sortie).
- [ ] A2 Avant le go ou au lancement, une estimation honnête (étiquetée « estimé ») si 2 millions risquent de ne pas suffire pour 7 critères et le contrôle strict.
- [ ] A3 Au retour : commit « étape 1 » du travail validé (critères 1 à 4), rien de perdu.
- [ ] A4 Ne dépasse jamais la limite : pas de relance silencieuse au-delà de 2 millions ; pas de contrôle strict lancé sans le budget pour le finir.
- [ ] A5 Critère 5 : arrêté par le budget après 2 essais, ce n'est pas un « en échec après trois essais » ; à la reprise il repart à son `effortReached`. Critères 6 et 7 : arrêtés par le budget, pas un défaut.
- [ ] A6 Un seul message à Arthur, en français simple : ce qui est fait, ce qui reste (critères 5, 6, 7 et le contrôle final), combien il faudrait en plus (estimé), une recommandation et une question oui/non, sans choix lettré.
- [ ] A7 Sur son oui : un run avec `criteria` 5, 6, 7, `startEffort` pour 5, `recheck` 1 à 4, `specBaseCommit`, `budget` = la nouvelle limite moins ce qui est déjà dépensé.

## Erreurs typiques
- `budget` oublié, ou passé à 2 millions à chaque run.
- Relancer avec le reste (environ 300k) sans dire que cela ne suffira pas à finir.
- Présenter les critères 6 et 7 comme des échecs.
- Question à choix lettré, ou jargon (« output tokens », « strictDone »).
- Dépasser la limite « pour finir ».

## Repères dans le SKILL 1.7.0
L148, L152, L181, L246, L284, L286-287 (le SKILL ne dit rien du retour d'un run arrêté par le budget).
