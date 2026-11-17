---
name: commit-message
description: Rédige un message de commit au format Conventional Commits à partir du diff git, avec un corps en liste à puces qui détaille chaque changement. À utiliser quand l'utilisateur demande un message de commit, veut committer ses changements ou dit « écris le commit ».
---

# Message de commit

## Mode d'emploi

1. Lis les changements avant de proposer quoi que ce soit :
   - `git diff --staged` pour ce qui est indexé ;
   - si c'est vide, `git diff` puis `git status` pour voir les fichiers modifiés.
2. Identifie le changement principal, puis liste chaque changement concret.
3. Choisis le type et le scope (le module ou dossier touché).
4. Écris le titre, qui résume l'ensemble, puis le corps en puces, une par changement.
5. Propose le message dans un bloc de code, sans committer. Committe seulement si l'utilisateur le demande.
6. Si le diff mélange plusieurs changements sans rapport, propose de faire plusieurs commits.

## Format

```
type(scope): résumé de l'ensemble des changements
- Verbe + ce qui a été fait, avec le détail utile
- Verbe + ce qui a été fait, avec le détail utile
```

### Titre

- Format : `type(scope): description`
- Types autorisés : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- Description en anglais, à l'impératif (`add`, `fix`, `make`, `remove`), en minuscules, sans point final.
- Quand le commit regroupe plusieurs changements, le titre les résume, séparés par des virgules et `and`.
- 72 caractères maximum.

### Corps

- Pas de ligne vide entre le titre et le corps.
- Une puce `- ` par changement concret, dans l'ordre d'importance.
- Chaque puce commence par un verbe à l'impératif avec une majuscule : `Add`, `Fix`, `Make`, `Split`, `Remove`, `Update`, `Rename`.
- Chaque puce précise le détail utile : où, quoi, et comment ou dans quel cas (par exemple « 4 per page », « on mobile », « with lg breakpoint »).
- Pas de point final aux puces.
- Une seule ligne par puce, aussi courte que possible.
- Pour un petit changement unique et évident, le titre seul suffit.
- Pour un changement cassant, ajoute une dernière ligne `BREAKING CHANGE: explication`.

## Exemples

Bon :

```
feat(press): add pagination, responsive editor and sidebar cleanup
- Add pagination (4 per page) on press list with reset on season change/delete
- Make article editor responsive: stacked layout on mobile, params panel toggle
- Make validation card responsive with lg breakpoint layout
- Split Competition/Content sections in admin sidebar
- Remove hardcoded badge on validation nav item
- Remove Co-Authored-By from commit template
```

Bon (changement simple) :

```
fix(cart): handle empty cart total
```

Mauvais :

```
Fixed bug.
```
Trop vague, pas de type, au passé, majuscule et point final.

```
feat(press): updates

- pagination
- editor
```
Titre vague, ligne vide en trop, puces sans verbe ni détail.

```
update(api): change routes
```
`update` n'est pas un type autorisé, et il n'y a aucun détail.

## À ne pas faire

- Ne jamais inventer un changement absent du diff.
- Ne pas lister les noms de fichiers : décrire l'effet de chaque changement.
- Ne pas ajouter de ligne `Co-Authored-By`.
- Ne pas committer sans l'accord de l'utilisateur.