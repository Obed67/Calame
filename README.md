# Calame

Annotation d’écran gratuite et open source (MIT). Dessinez par-dessus n’importe quelle application pendant une présentation : Google Meet, Zoom, Teams, des diapositives ou un navigateur.

Calame reprend, sans abonnement, le geste des outils comme Epic Pen, ppInk ou ZoomIt : un calque transparent, un stylo, et une barre qui reste sous la main.

## Prérequis

- Windows 10 ou 11
- [Node.js](https://nodejs.org/) 22 ou plus récent (le développement a été fait avec Node 24)

Ouvrez PowerShell dans le dossier du projet.

## Installation

```powershell
npm install
```

## Lancement

```powershell
npm run dev
```

L’application se place dans la zone de notification. L’écran reste utilisable : les clics traversent le calque. `Ctrl+Shift+D` passe en mode dessin.

Pour vérifier le code sans ouvrir l’interface :

```powershell
npm test
npm run typecheck
```

## Créer l’installateur et la version portable

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
npm run dist
```

Les fichiers sont écrits dans `release\` :

- `Calame-1.0.0-setup.exe` — installateur
- `Calame-1.0.0-portable.exe` — une seule exécutable, sans installation

La signature de code est désactivée par la variable ci-dessus. Windows SmartScreen peut demander une confirmation au premier lancement : choisissez « Informations complémentaires », puis « Exécuter quand même ».

## Utilisation

Deux modes :

- **Souris** — vous utilisez l’ordinateur normalement, les traits restent visibles.
- **Dessin** — le calque capte le stylet, le doigt ou la souris.

La barre flottante se déplace par la plume dorée, à gauche. Un double-clic dessus la replie. Elle propose le stylo, le surligneur, la ligne, la flèche, le rectangle, l’ellipse, le texte, la gomme, le pointeur laser, l’encre éphémère, le projecteur et la loupe. Huit couleurs, une couleur libre, trois épaisseurs. Les tableaux blanc et noir couvrent l’écran pour écrire dessus. Le bouton écran envoie le calque sur l’autre moniteur.

Le texte se pose d’un clic. `Entrée` le valide, `Maj+Entrée` passe à la ligne, `Échap` l’abandonne.

La gomme retire le trait ou la forme entière sous le curseur. `Ctrl+Z` le ramène.

## Raccourcis

Ils se changent dans Réglages (icône engrenage de la barre, ou menu de la zone de notification).

| Action | Raccourci |
| --- | --- |
| Mode dessin / mode souris | `Ctrl+Shift+D` |
| Tout effacer | `Ctrl+Shift+C` |
| Annuler (en mode dessin) | `Ctrl+Z` |
| Rétablir (en mode dessin) | `Ctrl+Y` |
| Pointeur laser | `Ctrl+Shift+L` |
| Capture PNG | `Ctrl+Shift+S` |
| Revenir à la souris | `Échap` |
| Quitter | `Ctrl+Shift+Q` |

`Ctrl+Z` et `Échap` ne sont pris par Calame que pendant le dessin, pour ne pas gêner les autres logiciels.

## Dans Google Meet, Zoom ou Teams

Partagez **l’écran entier**, pas un onglet et pas une fenêtre. Calame est une fenêtre transparente posée au-dessus du bureau : un partage d’onglet ne la montre pas. Le partage de l’écran complet, lui, inclut les traits.

## Zone de notification

Clic droit sur l’icône : afficher ou masquer les annotations, passer d’un mode à l’autre, tout effacer, ouvrir les réglages, quitter. Un clic gauche bascule le mode dessin.

## Licence

MIT. Le texte est dans `LICENSE`. Vous pouvez utiliser, modifier et redistribuer Calame, y compris dans un cadre commercial, à condition de conserver la licence.
