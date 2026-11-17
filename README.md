<!-- TODO: ajouter docs/images/logo.png (environ 120 px de large) -->

<h1 align="center">Calame</h1>
<p align="center">Annotation d’écran gratuite pour dessiner par-dessus n’importe quelle application, pendant une présentation, un cours ou un appel.</p>
<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/licence-MIT-green" alt="Licence MIT">
  <img src="https://img.shields.io/badge/plateforme-Windows-lightgrey" alt="Windows">
</p>

<!-- TODO: ajouter docs/images/demo-dessin.gif (1200 à 1600 px de large, moins de 10 s et de 5 Mo) -->

Un calque transparent reste au-dessus du bureau. En mode souris, les clics traversent le calque et l’ordinateur reste utilisable. En mode dessin, le stylet, le doigt ou la souris tracent sur l’écran.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Exemples](#exemples)
- [Captures d’écran](#captures-décran)
- [Configuration](#configuration)
- [Contribution](#contribution)
- [Licence](#licence)

## Fonctionnalités

- Stylo, surligneur et encre éphémère, avec pression du stylet
- Ligne, flèche, rectangle, ellipse et texte
- Gomme qui retire le trait ou la forme entière, annulation et rétablissement
- Pointeur laser, projecteur et loupe
- Huit couleurs, une couleur libre, trois épaisseurs
- Tableaux blanc et noir pour écrire sur un fond plein
- Barre flottante déplaçable, repliable d’un double-clic
- Bascule d’écran quand plusieurs moniteurs sont branchés
- Capture PNG de l’écran avec les annotations
- Raccourcis modifiables et icône dans la zone de notification

## Installation

Prérequis : Windows 10 ou 11 (64 bits) et [Node.js](https://nodejs.org/) 22.12 ou plus récent. npm est fourni avec Node.js.

```powershell
git clone https://github.com/Obed67/Calame.git
cd Calame
npm install
npm run dev
```

Calame se place dans la zone de notification. Les clics traversent le calque. `Ctrl+Shift+D` passe en mode dessin.

Pour vérifier le code sans ouvrir l’interface :

```powershell
npm test
npm run typecheck
```

### Installateur et version portable

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
npm run dist
```

Les fichiers sont écrits dans `release\` :

- `Calame-1.0.0-setup.exe` — installateur (raccourcis Bureau et menu Démarrer, dossier d’installation au choix)
- `Calame-1.0.0-portable.exe` — un seul exécutable, sans installation

La variable désactive la signature de code. Au premier lancement, Windows SmartScreen peut demander une confirmation : choisissez « Informations complémentaires », puis « Exécuter quand même ».

`npm run build` produit l’application dans `out\`. `npm run preview` la lance sans le serveur de développement.

## Utilisation

Deux modes :

- **Souris** — l’ordinateur s’utilise normalement, les traits restent visibles.
- **Dessin** — le calque capte le stylet, le doigt ou la souris.

`Ctrl+Shift+D` bascule d’un mode à l’autre. `Échap` revient à la souris. Un second lancement de Calame, pendant qu’il tourne déjà, bascule aussi le mode dessin.

La barre se déplace par la plume, à gauche. Un double-clic dessus la replie. Elle propose les outils, les couleurs, les épaisseurs (fin, moyen, épais), les tableaux, le changement d’écran, la capture et les réglages.

Le texte se pose d’un clic. `Entrée` le valide, `Maj+Entrée` passe à la ligne, `Échap` l’abandonne.

La gomme retire le trait ou la forme entière sous le curseur. `Ctrl+Z` le ramène, `Ctrl+Y` rétablit.

La capture ouvre une boîte « Enregistrer la capture » et propose un fichier `calame-AAAAMMJJ-HHMM.png`.

### Raccourcis

Ils se changent dans Réglages (engrenage de la barre, ou menu de la zone de notification). Cliquez une combinaison, puis appuyez sur les touches.

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

`Ctrl+Z`, `Ctrl+Y` et `Échap` ne sont pris par Calame que pendant le dessin, pour ne pas gêner les autres logiciels.

### Zone de notification

Clic droit sur l’icône : afficher ou masquer les annotations, passer d’un mode à l’autre, tout effacer, ouvrir les réglages, quitter. Un clic gauche bascule le mode dessin. Fermer les fenêtres ne quitte pas Calame : l’application reste dans la zone de notification.

## Exemples

### Annoter un appel

Dans Google Meet, Zoom ou Teams, partagez **l’écran entier**, pas un onglet et pas une fenêtre. Calame est une fenêtre transparente posée au-dessus du bureau : un partage d’onglet ne la montre pas. Le partage de l’écran complet inclut les traits.

1. Lancez Calame et rejoignez l’appel.
2. Partagez l’écran entier.
3. `Ctrl+Shift+D`, puis dessinez. `Échap` rend la souris pour cliquer dans l’appel.

### Écrire sur un tableau

Le bouton tableau blanc ou tableau noir couvre l’écran d’un fond plein. Dessinez dessus, puis réappuyez sur le même bouton pour retrouver le bureau. L’encre éphémère disparaît au bout de 2,5 secondes (réglable de 2 à 3 secondes).

## Captures d’écran

<!-- TODO: déposer les fichiers ci-dessous dans docs/images/ avant de retirer ces lignes -->

- `docs/images/barre-outils.png` — la barre dépliée, avec le stylo et la palette
- `docs/images/tableau-blanc.png` — un schéma sur le tableau blanc
- `docs/images/reglages.png` — la fenêtre Réglages, raccourcis compris
- `docs/images/demo-dessin.gif` — un trait, puis le retour en mode souris

## Configuration

Les réglages s’ouvrent depuis la barre ou la zone de notification. Ils sont enregistrés dans `settings.json`, dans le dossier de données de l’application. Sous Windows, ce dossier est `%APPDATA%\calame\`.

| Réglage | Valeurs | Défaut |
| --- | --- | --- |
| Outil au lancement | un des douze outils | Stylo |
| Encre éphémère | 2,0 s à 3,0 s | 2,5 s |
| Rayon du projecteur | 60 px à 320 px | 140 px |
| Grossissement de la loupe | ×1,5 à ×4 | ×2 |
| Écran annoté | un écran branché | écran principal |
| Raccourcis | combinaison au clavier | voir le tableau ci-dessus |

La couleur libre et l’emplacement de la barre sont mémorisés avec ces réglages. Huit couleurs fixes sont proposées dans la barre : ivoire, encre, terracotta, or, vert, bleu, rose, jaune. La couleur du stylo au premier lancement est le terracotta `#E15A3A`.

## Contribution

Les suggestions et corrections sont les bienvenues sur [GitHub](https://github.com/Obed67/Calame). Avant une modification, lancez `npm test` et `npm run typecheck`.

## Licence

MIT. Le texte est dans [`LICENSE`](LICENSE). Copyright © 2026 ObeDev. Vous pouvez utiliser, modifier et redistribuer Calame, y compris dans un cadre commercial, à condition de conserver la licence.
