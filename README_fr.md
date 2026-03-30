# ConteXo
> CLI pour balancer tout ton code à la gueule de ton LLM.

*ConteXo* crache sur STDOUT tout ton code, pensé spécifiquement pour qu'un LLM le lise.
Il propose plusieurs réglages de contrôle du texte pour éviter de saturer ton LLM en tokens.
Cet outil est surtout utile quand tu ne veux pas te compliquer la vie et que tu veux juste donner
absolument tout ton code au LLM d'un seul coup.

# WHY?

Je pense que beaucoup de projets d'"exploration de code" pour obtenir du contexte finissent par être
de la suringénierie, et en plus tous les logiciels avec LLM ne sont pas livrés avec de bons outils
pour ça. Pourquoi ne pas simplement COPIER et COLLER tout le code avec ses chemins et basta ?
c'est essentiellement `ConteXo`, pour que tu copies-colles, ou tu peux demander au LLM d'utiliser l'outil `bash`
(que beaucoup ont aujourd'hui) pour lancer cette commande

> regarde la FAQ pour voir s'il vaut mieux `ConteXo` ou d'autres outils

# Visual Example
> This is just an illustrative example
> (obviously the margins and other decorators don't exist)

ex command:
```bash
contexo some/path \
    --nosummary \
    --clean "blankline,spaceunless,comments:line" \
    --line-maxchars "max:14,cut:middle" \
    --file-maxlines "max:10" \
    --stdout-maxlines 22
```

``````
├─INPUT──────────────────┤  ├─OUTPUT──────────┤
╭────────────────────────╮
│MY FILE 1               │   optional/absolute
│                        │   optional/relative
│truncate by line length │  ╭```txt───────────╮
│// Remove comments line │  │MY FILE 1        │
│/**                     │  │truncate by le...│
│ Remove (or preserve)   │  │/**              │
│ Comment block          │  │ Remove (or pr...│
│**/                     │  │ Comment block   │
│                        │  │**/              │
│remove blanklines       │  │remove blankli...│
│or       spaceunless    │  │or spaceunless   │
│   preserve identation  │  │   preserve id...│
│                        │  │...[filetrunc]   │
│limit by each file      │  ╰```──────────────╯
│truncate marks          │
│for all case            │   optional/absolute
╰────────────────────────╯   optional/relative
╭────────────────────────╮  ╭```txt───────────╮
│MY FILE 2               │  │MY FILE 2        │
│                        │  │Limit by total...│
│Limit by total stdout   │  ╰```──────────────╯
│pagination total stdout │  ...bylines:[page 1/2]
│  by line or by chars   │
╰────────────────────────╯
``````

# Features

* LLM friendly:
    La CLI est faite pour donner au LLM les infos dont il a besoin sans supposer que le LLM connaît cette CLI.
    Elle fournit tout le nécessaire par défaut, comme :
    chemins absolus et relatifs, un aperçu utile des ignores pertinents et des erreurs de lecture,
    avertissements et infos supplémentaires, etc...
* Summary:
    la sortie normale inclut déjà des sections de summary au début.
    avec `--summary`, tu obtiens la vue résumée/visuelle sans contexte ni skippedlist.
    stats utiles :
    - quantité de lignes et de caractères de la sortie canonique finale après filtres et troncatures
      (avant pagination)
    - top des répertoires avec le plus de fichiers
    - top des fichiers les plus longs en lignes et en caractères
    - longest lines
    - si tu utilises `--compare-model`, aussi `tokens`, `usage` et `cost usd` approximatifs
* Troncature granulaire :
    tu peux tronquer chaque ligne, fichier ou le `stdout` total séparément
    en utilisant les flags canoniques `--line-maxchars`, `--file-maxlines`, `--file-maxchars`,
    `--stdout-maxlines` et `--stdout-maxchars`
    exemple descriptif :
        "_tronquer toute ligne qui dépasse 100 caractères, et tronquer les fichiers de plus de 200 lignes, et en plus faire en sorte que les fichiers ne dépassent pas 3000 caractères, et en plus que le total ne dépasse pas 100000 caractères_"
* Clean: tu peux omettre les espaces blancs, les lignes vides et les commentaires de code.
* Pagination :
    Tu peux paginer si tu as défini une limite totale de `stdout` en lignes ou en nombre de caractères.
    `--stdout-maxlines` et `--stdout-maxchars` sont mutuellement exclusifs.
    Si c'est le LLM qui exécute `ConteXo`, il est informé qu'il existe plus de pages.
    C'est utile parce que la plupart des logiciels LLM ont des limites en lignes ou en caractères
    à chaque `tool execution`
* Control Files:
    Lecture automatique et récursive de `.gitignore` et `.ignore` (désactivable avec `--disable-ignorefile`).
    Flags pour ignorer des dossiers ou fichiers (`--ignore`), ignorer par regex (`--ignore-regex`)
    et filtrer par globs root-relative (`--pattern`).
    `skippedlist` essaie de donner un aperçu bref et fidèle : il montre les ignores issus des ignorefiles,
    les entrées réelles ignorées par `--ignore`, des résumés des correspondances de `--ignore-regex`
    et un avertissement formel quand `--pattern` exclut des chemins qui ne matchent pas.
    Options pour suivre les symbolic links et mounts (prévention circulaire) ou ne pas les suivre
* Number Line:
    `--number-line` (`-n`) préfixe chaque ligne émise avec son numéro de ligne.
* Encoding et comparaison avec des modèles
    Utilise `anomalyco/models.dev` (en local) pour comparer les tokens avec des modèles à jour
    et ainsi calculer quelle part de la fenêtre de contexte occupe ton `contexte` et combien cela te coûtera approximativement.

# Installation

* [Download Realease Binary](https://github.com/kelvinauta/ConteXo/releases)

OR
* Build desde el código fuente
> `bun` requerido: [Bun](https://bun.com/docs/installation)

```bash
git clone https://github.com/kelvinauta/ConteXo.git
bun install
bun run build:binary -- --target bun-linux-x64
install -m 755 ./contexo /usr/local/bin/contexo
```

# Guide d'utilisation

Ce guide clarifie seulement les infos non contenues dans `--help`
> Pour un guide rapide `contexo --help`

## Summary

Je conseille toujours de commencer avec `--summary`, car cela te permet de configurer le contexte que tu envoies.
def: `contexo [<path>] --summary [...options]`
```bash
# examples
contexo --summary
contexo some/path --summary
contexo some/path --summary --ignore some/dir --ignore other/dir
```
La sortie normale inclut déjà un summary au début ; `--summary` passe simplement en mode
résumé/visuel et masque `context` + `skippedlist`.
Si tu veux seulement masquer le summary, utilise `--nosummary` ou `--hide summary`.
Si tu veux garder uniquement le contexte, tu voudras normalement `--hide summary,skippedlist`.

`summary` est toujours calculé à la fin de toutes les configurations, donc
cela te permet de voir ce que tu vas passer au LLM avant de le faire.

> Tip: Si le LLM est conscient de ses propres limites (comme dans `anomalyco/opencode`), le `LLM` peut lui-même chercher sa configuration optimale.

Exemple de sortie :
```shell
$ contexo --summary

  STDOUT
    lines        68_569
    chars        1_336_947

  PROJECT
    files        139
    dirs         1
    avg lines    487.19 / file
    avg chars    9467.18 / file
    avg len      19.43 / line

  TOP BY LINES
    - scc-data/graphql.graphql (61_603)
    - scc-data/arturo.art (417)
    - scc-data/cloudformation.json (407)
    - scc-data/metal.metal (401)
    - scc-data/test.sieve (193)

  TOP BY CHARS
    - scc-data/graphql.graphql (1_156_299)
    - scc-data/arturo.art (9_981)
    - scc-data/cloudformation.json (9_241)
    - scc-data/metal.metal (8_051)
    - scc-data/bosque.bsq (6_900)

  TOP DIRS
    - scc-data (139)
    - / (1)

  LONGEST LINES
    - scc-data/cloudformation.json:3 (444)
    - scc-data/cloudformation.yml:92 (415)
    - scc-data/MLIR.mlir:3 (315)
    - scc-data/test.sieve:1 (312)
    - scc-data/graphql.graphql:27978 (287)
```
Comme on peut le voir, cette commande nous donne des infos utiles sur le "poids" total de notre projet
et nous donne des indices sur les fichiers qui peuvent être trop lourds.
dans cet exemple `scc-data/graphql.graphql` a plus d'un million de caractères, si ce n'est pas un fichier précieux
on peut choisir de l'ignorer.
Si on relançait `contexo --summary --ignore scc-data/graphql.graphql`, le calcul
qui nous serait donné serait sans tenir compte de ce fichier

> Si en plus tu utilises `--compare-model`, la section `ENCODING` apparaîtra aussi
> avec des tokens, context, usage et cost approximatifs.

## Clean
souvent, il est utile d'exécuter `contexo --clean all` ; cela nettoie à la fois :
- les espaces blancs répétés (double espace et respecte l'indentation)
- les lignes vides `^\s*$`
- les commentaires de code (bloc et en ligne)
Cependant, il se peut que tu ne veuilles pas retirer les commentaires ;
par exemple en typescript beaucoup de commentaires de bloc ont des infos précieuses car ils utilisent `ts-doc`
donc il peut t'intéresser de retirer les commentaires de ligne mais pas ceux de bloc
tu peux alors faire : `--clean "blankline,spaceunless,comments:line"`
cela dit `--clean all` et `--clean "blankline,spaceunless,comments:line,comments:block"` sont exactement la même chose

## Filtrage et ignores

`ConteXo` peut supprimer énormément de bruit avant d'émettre le contexte :

- `--pattern`: filtre par glob root-relative. Peut être répété et aussi accepter du CSV.
- `--ignore`: ajoute des ignores explicites.
- `--ignore-regex`: ajoute des ignores par regex.
- `.gitignore` et `.ignore`: s'appliquent automatiquement et récursivement par sous-arbre.
- `--disable-ignorefile`: désactive la lecture de `.gitignore` / `.ignore`.

Exemples :
```bash
contexo . --pattern "src/**/*.ts"
contexo . --pattern "src/**/*.ts" --pattern "scripts/*.ts,src/*.py"
contexo . --ignore dist --ignore node_modules
contexo . --ignore-regex "\\.min\\.(js|css)$"
```

## Models
Si tu veux comparer la sortie avec le `price per 1M token` d'un modèle et le `context length`
tu peux utiliser `contexo --models` ; cela te donnera la liste des modèles disponibles
fournie par `anomalyco/models.dev`, au format `provider/model`
Tu peux aussi filtrer directement par provider :
`contexo --models openai`

Le flag canonique pour comparer est `--compare-model`.
Maintenant pour comparer ton contexte total avec un modèle, tu exécutes :
`contexo --summary --compare-model "openai/gpt-4o"`

Exemple de sortie (section) :
```
  ENCODING
    encoder      o200k_base
    compare      openai/gpt-4o
    tokens       ~4_365
    context      128_000
    usage        ~3.41%
    cost usd     ~0.010913
```
> La section `ENCODING` n'apparaît que quand tu utilises `--compare-model <provider>/<model>`
> À propos de l'encoder (celui qui tokenise), tu peux le changer avec `--enc`
> mais quand tu le passes explicitement il faut `--compare-model` ou `--model`
> Il est important de comprendre que seuls des encoders open source sont utilisés, donc les tokens calculés ne sont qu'une approximation.
> `--model` existe toujours comme alias de compatibilité, mais la documentation utilise `--compare-model`.
* Comportamiento interno:
seulement pour que tu le saches, pour pouvoir fonctionner localement la commande fait lors de la première exécution.
cloner : `github.com/anomalyco/models.dev` dans `/tmp/contexo-models-cache/`
elle essaie de mettre à jour si le repo existant a plus de 24 heures

## Limites
Cela peut être confus, donc je vais l'expliquer.
Il existe 3 `scopes` ; à chaque `scope` on peut appliquer une limite et un type de troncature.
* scopes
    ce sont les éléments que tu peux tronquer (chaque scope séparément et avec ses propres règles)
    ligne: `--line-maxchars`
    file: `--file-maxlines` et `--file-maxchars`
    stdout: `--stdout-maxlines` et `--stdout-maxchars`
    chaque scope accepte un nombre ou `TRUNCOPTS` sous la forme `max:N[,cut:mode][,mark:text]`
* types de troncature
    ce sont `start`, `middle` et `end` (par défaut)
    cela signifie où cela sera tronqué.
    exemples visuels :
    - start  : `...cate in start`
    - middle : `trun... in middle`
    - end    : `truncate in e...`
    `middle` est extrêmement utile sur les lignes.
    parce qu'il garde le contexte du début et de la fin où souvent
    il y a des infos utiles
* mark
    Le `--mark` global est TRÈS important ; il permet à un LLM de savoir que quelque chose est tronqué.
    Tu peux aussi définir `mark:` dans le `TRUNCOPTS` d'un scope concret.
    par défaut c'est `...` et en général ça marche bien quand le type de troncature est `end`
    mais dans d'autres troncatures cela peut être confus pour le LLM, dans ces cas je recommande quelque chose d'explicite
    comme : `contexo --line-maxchars "max:100,cut:middle,mark:...[TRUNCATED]..."`
* Exemples :
    ```bash
    contexo \
        --line-maxchars "max:200,cut:middle" \
        --file-maxlines "max:500,cut:end" \
        --file-maxchars "max:3000" \
        --stdout-maxlines 2000
    ```
* Extras :
    - `--stdout-maxlines` et `--stdout-maxchars` ne peuvent tronquer qu'à la fin
      `end` parce que ce serait incompatible avec la logique de pagination qu'on verra plus loin
    - `--stdout-maxlines` et `--stdout-maxchars` sont mutuellement exclusifs
    - `--page-lines` requiert `--stdout-maxlines`
    - `--page-char` requiert `--stdout-maxchars`
    - `--limit-files`: limite le nombre de fichiers à scanner au maximum
    - `--limit-nested`: limite le scan récursif (profondeur)
    - la longueur du `mark` compte aussi pour générer la limite
    - ce README utilise toujours les noms canoniques actuels des flags
* pourquoi des limites en chars et en lines ?
    beaucoup de logiciels LLM ont toutes sortes de limites fixes pour contrôler
    et éviter de consommer trop de tokens ou des erreurs des fournisseurs.
    ils peuvent donc limiter par caractères et/ou par nombre de lignes.
    c'est pour ça que `ConteXo` te permet de travailler avec un type de limite ou un autre
    selon l'environnement où il s'exécute.
    Par exemple, dans `opencode` (à la date de rédaction de ce README)
    la limite de chaque `tool execute` est souvent de `2000` lignes fixes NON CONFIGURABLES
    elles sont hardcodées dans le code, même si l'avantage est que les agents sont conscients
    de cette limite parce que `opencode` la leur informe en interne
    Par conséquent dans ce cas spécifique il est plus utile de travailler avec `--stdout-maxlines`.

## Pagination

La pagination existe en 2 versions et par exécution tu ne dois en utiliser qu'une :

- `--page-lines <number>`: change de page quand `--stdout-maxlines` est activé
- `--page-char <number>`: change de page quand `--stdout-maxchars` est activé

Les paginations ne servent que lorsqu'une limite totale est active et que cette limite est dépassée.
Quand cela arrive, `ConteXo` ajoute des marqueurs comme `...bylines:[page 1/2]`
ou `...bychars:[page 1/2]` dans le budget disponible,
et en plus il avertit via `stderr` qu'il existe plus d'une page.
Si tu demandes une page hors plage, il te montrera la dernière et émettra un warning.

* Exemple:
Supposons que le logiciel LLM que tu utilises ne te laisse pas envoyer un message de plus de 1000 caractères
(ce qui est nul à chier), alors :
d'abord tu peux exécuter `contexo --summary` pour savoir combien de caractères prend ton contexte,
supposons que ce soit 1500, alors tu peux faire quelque chose comme :
`contexo --stdout-maxchars 750 --page-char 1` et copier la sortie.
La coller et dire à ton LLM (Ceci est la page 1 sur 2, je t'envoie la seconde juste après)
`contexo --stdout-maxchars 750 --page-char 2` tu copies, tu colles, tu poses ta question, tout le monde est content !

# FAQ

* `ConteXo` c'est seulement pour tout un projet complet ?
| Non ! tu peux passer le chemin que tu veux, et en fait c'est une bonne idée de demander à un LLM
| d'explorer avec cet outil certains dossiers
| `contexo <path>`
| ou même de filtrer dans ce chemin avec `--pattern "src/**/*.ts"`

* `ConteXo` c'est seulement pour des projets de code ?
| Non, mais oui c'est pensé principalement pour ça
| Cependant je crois que la seule feature incompatible
| avec des projets non-code est `--clean comments` (nettoyer les commentaires de code)

* `ConteXo` est meilleur en consommation de Tokens que d'autres outils ?
| Cela dépend de la tâche, du projet (contexte) et du logiciel que tu utilises
| quand le logiciel donne aux agents les bonnes `tools`
| souvent les LLM ne cherchent que l'info dont ils ont besoin
| et les tokens consommés sont nettement plus faibles que de copier TOUT ton code
| mais dans les longues sessions ou les gros projets
| cette même exploration de fichiers, comme elle dépend des décisions des LLM
| peut consommer beaucoup de tokens de réflexion
| `ConteXo` ne doit pas être vu comme un remplacement, mais comme un complément
| Parfois la tâche est simple et les fichiers sont faciles à trouver et donnent assez d'informations
| Mais si tu vas travailler sur une grosse tâche qui implique tout le projet
| Il est plus pratique d'épargner au LLM le travail de réfléchir à ce qu'il faut faire et où aller
| et de simplement lui passer tout le `ConteXo`, et voilà...

# Errata :
Il y a des choses que je ne connais pas et dont je n'ai pas testé le fonctionnement.
* J'ai testé sur de gros projets, mais vu comment ça fonctionne à l'intérieur il semble que
  tout le `STDOUT` finit par être entièrement en RAM à un certain
  moment, donc en théorie la mémoire devrait mourir sur de gros projets,
  pourtant étonnamment cela ne m'est pas arrivé, en vérité je n'y ai pas
  assez réfléchi, peut-être que `Bun` fait plus de magie que prévu
  ou alors je n'ai simplement pas testé avec un projet assez gros
* L'encoder est lourd pour certains ordinateurs, à utiliser avec précaution
* Aujourd'hui la CLI rejette déjà le mélange de `--stdout-maxlines` et `--stdout-maxchars`,
  et en plus `--page-lines` / `--page-char` requièrent leur limite correspondante
* `ConteXo` n'a pas de limites configurées par défaut, donc si ton `LLM`
  décide simplement d'exécuter la commande telle quelle sans options, il pourrait remplir sa `context length`
* Linux reste ce qui a été le plus testé ; je génère des releases pour Windows et macOS,
  mais je ne les ai pas autant validées que Linux

# Futures features (TODO) :
_les `[ ]` signifient que je le ferai, les `[?]` signifient "je ne sais pas xD"_

- [ ] Toonify:
| Convertir des Data Formats comme `JSON` en fichiers `TOON` pour économiser des tokens
| (en informant évidemment le LLM de ce changement)

- [ ] Skills:
| Ajouter des Skills pour que n'importe quel agent puisse utiliser cet outil

- [?] Treesitter:
| Je ne sais pas si l'idée me plaît...
| Mais ce serait intéressant de pouvoir lui passer le schéma Treesitter d'un projet entier
| En théorie cela devrait consommer peu de tokens et lui donner un bon contexte général du projet
| Mais j'ai vu que travailler avec Treesitters n'est pas si agréable pour le développeur
| (ummm... un travail parfait pour un LLM esclave)

- [?] LSP:
| * Joindre des messages de LSP dans les fichiers
| * Utiliser les définitions et symbols que le LSP fournit
| * Utiliser artificiellement `lsp-hover` sur des symbols choisis par l'utilisateur via des flags
