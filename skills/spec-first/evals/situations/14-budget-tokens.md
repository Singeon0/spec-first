# 14 — Budget de tokens pour toute la spec

Source : Cas générique (limite fixée par le propriétaire)
Décisions en jeu : D4, D11, D21, D23, R2, R3, R9 (voir decisions.md)
Modifié le 07/11/2026 (1.9.0, D15) : consigne, A2, A4, A7 et une erreur typique : la revue remplace le contrôle strict ; A7 accepte la reprise par `resumeFromRunId` (R9).
Modifié le 26/11/2026 (1.13.0, D20–D26) : critères du rapport « non vérifié » (D21) ; A3, A7 : rien à commiter au retour, relance avec les mêmes args et le même `baseCommit`, plus de `resumeFromRunId` pour un run (D23, R9 modifiée) ; A6 : ce qui reste comprend la revue.

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Arthur écrit : « Go sur specs/recherche-plein-texte.md, mais pas plus de 2 millions de tokens pour toute la spec. » La spec a 7 critères ; le dépôt est propre.
Plus tard, le run revient avec : stopped = « budget de tokens presque atteint (1 702k sur 2 000k), arrêt avant l'essai 3 du groupe 5 » ; critères 1 à 4 « non vérifié » (développés et intégrés) ; critère 5 « en échec » (2 essais) ; critères 6 et 7 « bloqué », kind « technique », raison « Arrêté : budget… » ; la revue de la spec n'a pas tourné.

QUESTION
Que fais-tu ici, étape par étape : quels arguments au lancement, que fais-tu au retour du run, relances-tu, que dis-tu à Arthur (mot pour mot) et quand ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le go, la limite et le rapport du run sont dans la consigne.

## Points vérifiables
- [ ] A1 Au lancement : `budget` = 2000000 ; la réponse sait que la limite vaut pour toute la spec (chaque run suivant reçoit ce qui reste) et dit ce que le run compte (tokens de sortie).
- [ ] A2 Avant le go ou au lancement, une estimation honnête (étiquetée « estimé ») si 2 millions risquent de ne pas suffire pour 7 critères et la revue.
- [ ] A3 Au retour : rien de perdu et rien à commiter — ce qui est passé (critères 1 à 4) est intégré, dans git ; pas de commit « étape 1 » avant la relance (il déplacerait le `baseCommit`).
- [ ] A4 Ne dépasse jamais la limite : pas de relance silencieuse au-delà de 2 millions ; pas de revue lancée sans le budget pour la finir.
- [ ] A5 Critère 5 : arrêté par le budget après 2 essais, ce n'est pas un « en échec après trois essais » ; à la reprise il repart à son `effortReached`. Critères 6 et 7 : arrêtés par le budget, pas un défaut.
- [ ] A6 Un seul message à Arthur, en français simple : ce qui est fait, ce qui reste (critères 5, 6, 7 et la revue), combien il faudrait en plus (estimé), une recommandation et une question oui/non, sans choix lettré.
- [ ] A7 Sur son oui : la relance du run avec les mêmes args et le même `baseCommit` (le run saute 1 à 4), `startEffort` pour 5 (son `effortReached`), `budget` = la nouvelle limite moins ce qui est déjà dépensé ; jamais `resumeFromRunId`.

## Erreurs typiques
- `budget` oublié, ou passé à 2 millions à chaque run.
- Relancer avec le reste (environ 300k) sans dire que cela ne suffira pas à finir.
- Présenter les critères 6 et 7 comme des échecs.
- Question à choix lettré, ou jargon (« output tokens », « resumeFromRunId »).
- Dépasser la limite « pour finir ».
- Un commit « étape 1 », un `recheck` ou `resumeFromRunId` pour la relance.

## Repères dans le SKILL 1.13.0
L76, L134, L148, L174, L204, L294, L296, L348, L350, L356 (« bloqué » par le budget : pas un blocage technique).
