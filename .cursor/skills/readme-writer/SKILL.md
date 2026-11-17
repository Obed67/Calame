---
name: readme-writer
description: Rédige ou met à jour le README.md d'un projet après avoir analysé son code. À utiliser quand l'utilisateur demande un README, veut documenter son projet ou dit « écris le README ».
---

# Rédiger un README.md

## Mode d'emploi

1. **Analyse le projet avant d'écrire quoi que ce soit.**
   - Lis l'arborescence et le point d'entrée (`main`, `index`, `app`, etc.).
   - Lis les fichiers de dépendances (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, etc.) pour connaître la stack, les scripts et les commandes.
   - Cherche `.env.example` et les fichiers de config pour la section Configuration.
   - Cherche `LICENSE`, `CONTRIBUTING.md`, le logo et les images existantes (`docs/`, `assets/`, `public/`).
   - S'il existe déjà un README, garde ce qui est juste.
2. **Résume le projet en une phrase** : ce qu'il fait et pour qui. Si tu n'arrives pas à l'écrire, pose la question à l'utilisateur.
3. **Rédige le README** en suivant la structure ci-dessous. Omets une section seulement si elle n'a aucun sens pour ce projet.
4. **Vérifie** que chaque commande existe vraiment dans le projet (scripts, binaires) et que chaque chemin d'image existe. Sinon, mets un `TODO` visible.
5. **Liste à l'utilisateur** les visuels à produire (captures, GIF) et ce qui reste à compléter.

## Structure, dans l'ordre

1. Titre avec logo (centré)
2. Description courte (une ou deux phrases)
3. Badges (build, version, licence)
4. Table des matières (si le README dépasse environ 4 sections)
5. Installation : prérequis, puis les commandes
6. Utilisation : l'exemple minimal qui marche
7. Exemples : un ou deux cas réels de plus
8. Captures d'écran et GIFs
9. Configuration (variables d'environnement, options)
10. Contribution
11. Licence

Remarque : si le projet a une interface, remonte le visuel principal juste sous la description (comme Excalidraw) et garde la galerie complète en section 8.

## Captures d'écran et GIFs

- **Emplacement :** dans le repo, sous `docs/images/` (ou `assets/`). Jamais d'URL temporaire ni de chemin absolu.
- **Référence :** chemin relatif, avec un texte alternatif parlant.
  `![Tableau de bord avec les statistiques du mois](docs/images/dashboard.png)`
- **Taille :** contrôle-la avec du HTML.
  `<p align="center"><img src="docs/images/demo.gif" width="700" alt="Démo : création d'un projet"></p>`
  Images de 1200 à 1600 px de large, PNG pour les captures et GIF de moins de 10 secondes et de moins de 5 Mo. Pour une démo plus longue, mets un lien vers une vidéo.
- **Nommage :** en minuscules avec des tirets, ce qui est montré plutôt qu'un numéro : `dashboard-dark.png`, `demo-creation-projet.gif`. Évite `Screenshot 2026-11-14.png`.
- **Thème clair et sombre (optionnel) :**
  ```html
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.png">
    <img src="docs/images/logo-light.png" width="160" alt="Logo du projet">
  </picture>
  ```

## Exemples de sections bien rédigées

**En-tête (inspiré d'Excalidraw et du Best README Template) :**
```markdown
<p align="center">
  <img src="docs/images/logo.png" width="120" alt="Logo de TaskFlow">
</p>
<h1 align="center">TaskFlow</h1>
<p align="center">Un tableau de tâches collaboratif, simple et rapide, pour les petites équipes.</p>
<p align="center">
  <img src="https://img.shields.io/badge/licence-MIT-green" alt="Licence MIT">
</p>
<p align="center">
  <img src="docs/images/demo-tableau.gif" width="700" alt="Démo : déplacer une tâche entre deux colonnes">
</p>
```

**Fonctionnalités (style Excalidraw : courtes, concrètes) :**
```markdown
## Fonctionnalités
- 🗂️ Colonnes personnalisables par glisser-déposer
- 🤝 Collaboration en temps réel
- 🌙 Mode sombre
- 📤 Export en CSV et en PDF
```

**Utilisation (style FastAPI : le plus petit exemple qui marche, puis le résultat) :**
````markdown
## Utilisation
Crée un fichier `main.py` :
```python
from taskflow import Board

board = Board("Sprint 1")
board.add("Écrire le README")
print(board.summary())
```
Lance-le :
```bash
python main.py
```
Tu verras :
```
Sprint 1 : 1 tâche à faire
```
````

**Installation :**
````markdown
## Installation
Prérequis : Node.js 20 ou plus.
```bash
git clone https://github.com/utilisateur/taskflow.git
cd taskflow
npm install
npm run dev
```
L'app tourne sur http://localhost:3000.
````

## Erreurs à éviter

- Commencer sans dire à quoi sert le projet.
- Inventer des commandes, des fonctionnalités ou des badges qui ne correspondent pas au code.
- Une installation incomplète (prérequis oubliés, étape manquante).
- Un projet avec une interface mais aucun visuel.
- Des images avec des chemins absolus, des liens cassés ou sans texte alternatif.
- Des GIFs trop lourds ou trop longs.
- Un pavé de texte sans titres ni table des matières.
- Copier-coller la doc de l'API entière : mets un lien vers la doc.
- Oublier la licence et la section Contribution.