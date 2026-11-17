---
name: commit-message
description: Rédige un message de commit au format Conventional Commits à partir du diff git. À utiliser quand l'utilisateur demande un message de commit, veut committer ses changements ou dit « écris le commit ».
---

# Message de commit

## Mode d'emploi

1. Lis les changements avant de proposer quoi que ce soit :
   - `git diff --staged` pour ce qui est indexé ;
   - si c'est vide, `git diff` puis `git status` pour voir les fichiers modifiés.
2. Identifie le changement principal : ce qui a changé et pourquoi.
3. Choisis le type et le scope (le module ou dossier touché).
4. Écris le titre, puis un corps si nécessaire (voir les règles).
5. Propose le message dans un bloc de code, sans committer. Committe seulement si l'utilisateur le demande.
6. Si le diff mélange plusieurs changements sans rapport, propose de faire plusieurs commits.

## Règles de format

- Titre : `type(scope): description`
- Types autorisés : `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Description à l'impératif (« ajoute », « corrige »), en minuscules, sans point final, 50 caractères maximum si possible.
- Pas de ligne vide entre le titre et le corps.
- Corps limité à 72 caractères par ligne.
- Ajoute un corps seulement quand :
  - le pourquoi n'est pas évident en lisant le titre ;
  - le changement touche plusieurs fichiers ou a un effet de bord ;
  - c'est un changement cassant (dans ce cas, ajoute `BREAKING CHANGE:` en fin de corps).
- Pour un petit changement évident, le titre seul suffit.

## Exemples

Bons :

```
feat(auth): ajoute la connexion avec google
```

```
fix(panier): corrige le total quand le panier est vide
le total affichait NaN car la somme partait de undefined.
on initialise maintenant la somme à 0.
```

```
docs(readme): ajoute les étapes d'installation
```

Mauvais :

```
Fixed bug.
```
Trop vague, pas de type, au passé, majuscule et point final.

```
feat: Ajout de plein de trucs et correction du login et du css
```
Plusieurs changements dans un seul commit, description vague, majuscule.

```
update(api): modifie les routes
```
`update` n'est pas un type autorisé, et le pourquoi manque.

## À ne pas faire

- Ne jamais inventer un changement absent du diff.
- Ne pas paraphraser le nom des fichiers : décrire l'effet du changement.
- Ne pas committer sans l'accord de l'utilisateur.