# 27 — Environnement partagé entre les copies

Source : Inspirée d'un projet Python dont l'environnement virtuel commun, installé en mode éditable, faisait tester aux critiques le code du projet au lieu de celui de leur copie
Décisions en jeu : D5, D8, R1, R8 (voir decisions.md)

## Consigne
À donner à l'agent après le préambule (preambule.md), telle quelle :

```text
SITUATION
Projet seglab-hsi, dépôt /home/alo/GitHub/seglab-hsi (git, propre). Le CLAUDE.md du dépôt dit : « Environnement : source ~/.venvs/seglab/bin/activate (le paquet y est installé en mode éditable : pip install -e . depuis ce dossier). Extension C : make ext (compile dans /home/alo/build/seglab-ext, chemin fixe). Tests : pytest (3 min), tests rapides : pytest -m "not slow" (30 s). »
Spec specs/filtres-spectraux.md, 5 critères indépendants ; les critères 2 et 4 modifient l'extension C. Profil standard. Arthur écrit : « Go. »

QUESTION
Que fais-tu ici, étape par étape : quel workflow, avec quels arguments (setupCommand, exclusive, maxGroups, tests), et pourquoi ? Que se passerait-il si les copies utilisaient toutes l'environnement ~/.venvs/seglab ?
```

## Contexte fourni
- Le préambule et le plugin à la version testée. Le CLAUDE.md du dépôt est cité dans la consigne.

## Points vérifiables
- [ ] A1 Voit le problème : le venv commun installé en mode éditable pointe vers le dossier du projet ; dans une copie, ses tests jugeraient le code du projet, pas celui de la copie (ou chaque copie réinstallerait le paquet et écraserait les autres).
- [ ] A2 `setupCommand` donne à chaque copie son propre environnement (par exemple `python -m venv .venv && .venv/bin/pip install -e .[dev] && make ext`, ou `uv venv && uv pip install -e .`), et les commandes de test l'utilisent (`.venv/bin/pytest …`).
- [ ] A3 Le dossier de build fixe de l'extension : un par copie si le build le permet (chemin dans la copie), sinon `exclusive` pour les critères qui compilent l'extension (au moins 2 et 4).
- [ ] A4 Le parallélisme est gardé : pas de `maxGroups: 1` pour tout le run.
- [ ] A5 Ne touche pas au venv d'Arthur (~/.venvs/seglab) : ni réinstallation, ni suppression.
- [ ] A6 `quickTestCommand` = les tests rapides, `testCommand` = la suite complète ; aucune question à Arthur (c'est le comment).

## Erreurs typiques
- Copies qui partagent ~/.venvs/seglab : les critiques valident le code du projet, pas celui du développeur.
- `maxGroups: 1` « pour être tranquille ».
- Deux compilations de l'extension en même temps dans /home/alo/build/seglab-ext.
- Demander à Arthur comment gérer l'environnement.

## Repères dans le SKILL 1.8.0
L256, L260, L258.
