# ConteXo
> CLI to throw all your code in your LLM's face.

*ConteXo* spits all your code to STDOUT, specifically designed so an LLM can read it.
It has several text-control settings so you do not choke your LLM with tokens.
This tool is useful above all when you do not want complications and only want to give
absolutely all your code to the LLM in one shot.

# WHY?

I think many "code exploration" projects for getting context end up being
overengineering, and not all LLM software comes integrated with good tools
for that. Why not simply COPY and PASTE all the code with its path addresses and be done?
That is basically `ConteXo`, so you can copy and paste, or you can ask the LLM to use the `bash`
tool (which many have these days) to use this command

> check the FAQ to see whether `ConteXo` vs other tools is better

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
    The CLI is made to give the LLM the info it needs without assuming the LLM knows this CLI.
    It gives everything needed by default, such as:
    absolute and relative paths, a useful overview of relevant ignores and read errors,
    warnings and extra info, etc...
* Summary:
    normal output already includes summary sections at the start.
    with `--summary` you get the summarized/visual view without context or skippedlist.
    useful stats:
    - number of lines and characters in the final canonical output after filters and truncations
      (before pagination)
    - top directories with the most files
    - top longest files by lines and characters
    - longest lines
    - if you use `--compare-model`, also approximate `tokens`, `usage`, and `cost usd`
* Granular Truncate:
    you can truncate each line, file, or total `stdout` separately
    using the canonical flags `--line-maxchars`, `--file-maxlines`, `--file-maxchars`,
    `--stdout-maxlines` and `--stdout-maxchars`
    descriptive example:
        "_truncate any line that exceeds 100 characters, and truncate files over 200 lines, and also make files not exceed 3000 characters, and also make the total not exceed 100000 characters_"
* Clean: you can omit whitespace, blank lines, and code comments.
* Pagination:
    You can paginate if you set a total `stdout` limit by lines or by number of characters.
    `--stdout-maxlines` and `--stdout-maxchars` are mutually exclusive.
    If the LLM is the one executing `ConteXo`, it is informed that more pages exist.
    This is useful because most LLM software has limits by lines or characters
    in each `tool execution`
* Control Files:
    Automatic and recursive reading of `.gitignore` and `.ignore` (can be disabled with `--disable-ignorefile`).
    Flags to ignore folders or files (`--ignore`), ignore by regex (`--ignore-regex`)
    and filter by root-relative globs (`--pattern`).
    `skippedlist` tries to give a brief and faithful overview: it shows ignores from ignorefiles,
    real entries ignored by `--ignore`, summaries of matches for `--ignore-regex`
    and a formal notice when `--pattern` excludes paths that do not match.
    Options to follow symbolic links and mounts (circular prevention) or not follow them
* Number Line:
    `--number-line` (`-n`) prefixes each emitted line with its line number.
* Encoding and comparing with Models
    Use `anomalyco/models.dev` (locally) to compare tokens with updated models
    and thus calculate how much of the context window your `context` "weighs" and roughly how much it will cost.

# Installation

> Linux is the most tested right now, but releases also generate binaries for macOS and Windows.

* [Download Realease Binary](https://github.com/kelvinauta/ConteXo/releases)
OR
* Build from source

> To Build required: [Bun](https://bun.com/docs/installation)

```bash
git clone https://github.com/kelvinauta/ConteXo.git
bun install
bun run build:binary -- --target bun-linux-x64
install -m 755 ./contexo /usr/local/bin/contexo
```

# Usage Guide

This guide only clarifies info not contained in `--help`
> For a quick guide `contexo --help`

## Summary

I always recommend starting with `--summary`, because this lets you configure the context you are passing.
def: `contexo [<path>] --summary [...options]`
```bash
# examples
contexo --summary
contexo some/path --summary
contexo some/path --summary --ignore some/dir --ignore other/dir
```
Normal output already includes summary at the beginning; `--summary` simply switches to
summary/visual mode and hides `context` + `skippedlist`.
If you only want to hide summary, use `--nosummary` or `--hide summary`.
If you only want to keep the context, you will usually want `--hide summary,skippedlist`.

`summary` is always calculated at the end of all configuration, so
it lets you see how much you will pass to the LLM before doing it.

> Tip: If the LLM is aware of its own limits (as in `anomalyco/opencode`), the `LLM` itself can search for its optimal configuration.

Example output:
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
As you can see, this command gives us useful information about the total "weight" of our project
and gives us clues about which files may be too heavy.
In this example `scc-data/graphql.graphql` has more than a million characters; if it is not a valuable file
we can choose to ignore it.
If we ran `contexo --summary --ignore scc-data/graphql.graphql` again, the calculation
we would get would be without considering that file

> If you also use `--compare-model`, the `ENCODING` section will also appear
> with approximate tokens, context, usage, and cost.

## Clean
it is often useful to run `contexo --clean all`; this cleans both:
- repeated whitespace (double spaces while preserving indentation)
- blank lines `^\s*$`
- code comments (block and inline)
However, you may be interested in not removing comments;
for example, in typescript many block comments have valuable info because they use `ts-doc`
so you may want to remove line comments but not block comments
then you can use: `--clean "blankline,spaceunless,comments:line"`
that said `--clean all` and `--clean "blankline,spaceunless,comments:line,comments:block"` are exactly the same

## Filtering and ignores

`ConteXo` can cut a lot of noise before emitting context:

- `--pattern`: filters by root-relative glob. It can be repeated and also accepts CSV.
- `--ignore`: adds explicit CWD-relative path ignores.
- `--ignore-regex`: adds regex-based ignores.
- `.gitignore` and `.ignore`: they are applied automatically and recursively by subtree.
- `--disable-ignorefile`: disables reading `.gitignore` / `.ignore`.

Examples:
```bash
contexo . --pattern "src/**/*.ts"
contexo . --pattern "src/**/*.ts" --pattern "scripts/*.ts,src/*.py"
contexo . --ignore dist --ignore node_modules
contexo examples --ignore examples/TOIGNORE.txt
contexo . --ignore-regex "\\.min\\.(js|css)$"
```

## Models
If you are interested in comparing the output with a model's `price per 1M token` and `context length`
you can use `contexo --models`; this will give you the list of available models
provided by `anomalyco/models.dev`, in `provider/model` format
You can also filter by provider directly:
`contexo --models openai`

The canonical flag for comparison is `--compare-model`.
Now to compare your total context with a model, run:
`contexo --summary --compare-model "openai/gpt-4o"`

Example output (section):
```
  ENCODING
    encoder      o200k_base
    compare      openai/gpt-4o
    tokens       ~4_365
    context      128_000
    usage        ~3.41%
    cost usd     ~0.010913
```
> The `ENCODING` section only appears when you use `--compare-model <provider>/<model>`
> About the encoder (the component responsible for tokenizing), you can change it with `--enc`
> but when you pass it explicitly it requires `--compare-model` or `--model`
> It is important to understand that only open source encoders are used, so the calculated tokens are only approximate.
> `--model` still exists as a compatibility alias, but the documentation uses `--compare-model`.
* Internal behavior:
just so you know, so it can work locally, on first run the command does the following.
clone: `github.com/anomalyco/models.dev` into `/tmp/contexo-models-cache/`
tries to update if the existing repo is older than 24 hours

## Limits
This could be confusing, so I will explain it.
There are 3 `scopes`; each `scope` can have a limit and a truncation type applied.
* scopes
    these are the elements you can truncate (each scope separately and with its own rules)
    line: `--line-maxchars`
    file: `--file-maxlines` and `--file-maxchars`
    stdout: `--stdout-maxlines` and `--stdout-maxchars`
    each scope accepts a number or `TRUNCOPTS` shaped like `max:N[,cut:mode][,mark:text]`
* truncation types
    they are `start`, `middle` and `end` (default)
    this means where truncation will happen.
    visual examples:
    - start  : `...cate in start`
    - middle : `trun... in middle`
    - end    : `truncate in e...`
    `middle` is extremely useful on lines.
    because it preserves the context at the beginning and the end where there is often
    useful information
* mark
    The global `--mark` is VERY important; it lets an LLM know that something is truncated.
    You can also define `mark:` inside the `TRUNCOPTS` of a specific scope.
    by default it is `...` and it generally works well when the truncation type is `end`
    but in other truncation modes it can be confusing for the LLM; in those cases I recommend something explicit
    like: `contexo --line-maxchars "max:100,cut:middle,mark:...[TRUNCATED]..."`
* Examples:
    ```bash
    contexo \
        --line-maxchars "max:200,cut:middle" \
        --file-maxlines "max:500,cut:end" \
        --file-maxchars "max:3000" \
        --stdout-maxlines 2000
    ```
* Extras:
    - `--stdout-maxlines` and `--stdout-maxchars` can only truncate at the end
      `end` because it would be incompatible with the pagination logic we will see later
    - `--stdout-maxlines` and `--stdout-maxchars` are mutually exclusive
    - `--page-lines` requires `--stdout-maxlines`
    - `--page-char` requires `--stdout-maxchars`
    - `--limit-files`: limits the maximum number of files to scan
    - `--limit-nested`: limits recursive scanning (depth)
    - the length of `mark` is also counted when generating the limit
    - this README always uses the current canonical flag names
* why char and line limits?
    a lot of LLM software has all kinds of fixed limits to control
    not consuming too many tokens or avoiding provider failures.
    so they may limit by characters and/or by number of lines.
    that is why `ConteXo` lets you work with one kind of limit or another
    depending on the environment where it runs.
    For example, in `opencode` (at the time this README was written)
    the limit of each `tool execute` is usually a fixed `2000` lines NOT CONFIGURABLE
    they are hardcoded in the code, although the good part is that agents are aware
    of this limit because `opencode` informs them internally
    Therefore in this specific case it is more useful to work with `--stdout-maxlines`.

## Pagination

Pagination comes in 2 versions and per execution you should only use one:

- `--page-lines <number>`: changes page when `--stdout-maxlines` is enabled
- `--page-char <number>`: changes page when `--stdout-maxchars` is enabled

Pagination is only useful when a total limit is enabled and that limit is exceeded.
When that happens, `ConteXo` adds markers like `...bylines:[page 1/2]`
or `...bychars:[page 1/2]` inside the available budget,
and it also warns through `stderr` that more than one page exists.
If you ask for an out-of-range page, it will show the last one and emit a warning.

* Example:
Suppose the LLM software you use does not let you send a message longer than 1000 characters
(which is a pain), then:
first you can run `contexo --summary` to know how many characters your context takes,
suppose it is 1500, then you can do something like:
`contexo --stdout-maxchars 750 --page-char 1` and copy the output.
Paste it and tell your LLM (This is page 1 of 2, I will send you the second right away)
`contexo --stdout-maxchars 750 --page-char 2` copy, paste, ask your question, everybody is happy!

# FAQ

* Is `ConteXo` only for a whole project?
| No! you can pass whatever path you want, in fact it is a good idea to ask an LLM
| to explore certain folders with this tool
| `contexo <path>`
| or even filter inside that path with `--pattern "src/**/*.ts"`

* Is `ConteXo` only for code projects?
| No, but it is mainly designed for that
| However I think the only feature that is incompatible
| with non-code projects is `--clean comments` (cleaning code comments)

* Is `ConteXo` better in token consumption than other tools?
| It depends on the task, the project (context), and the software you use
| when the software gives agents the correct `tools`
| LLMs often only look for the info they need
| and the consumed tokens are significantly lower than copying ALL your code
| but in long sessions or large projects
| that same file exploration, because it is decided by the LLMs,
| can consume many thinking tokens
| `ConteXo` should not be seen as a replacement, but as a complement
| Sometimes the task is simple and the files are easy to find and provide enough information
| But if you are going to work on a big task involving the whole project
| it is more convenient to save the LLM the work of thinking what the hell to do and where to go
| and simply pass it the whole `ConteXo` and that is it...

# Errata:
There are things I do not know and have not tested.
* I have tested on large projects, but because of how it works internally it seems that
  all `STDOUT` ends up entirely in RAM at a certain
  moment, so in theory memory should die on large
  projects, however surprisingly it has not happened to me, honestly I have not
  thought about it enough, maybe `Bun` is doing more magic than
  expected or I simply did not test with a project large enough
* The encoder is heavy for some computers, use it with caution
* Today the CLI already rejects mixing `--stdout-maxlines` and `--stdout-maxchars`,
  and also `--page-lines` / `--page-char` require their corresponding limit
* `ConteXo` has no default limits configured, so if your `LLM`
  simply decides to run the command as-is without options, it could fill its `context length`
* Linux is still the most tested; I generate releases for Windows and macOS,
  but I have not validated them as much as Linux

# Future Features (TODO):
_the `[ ]` mean I will do it, the `[?]` mean "I don't know xD"_

- [ ] Toonify:
| Convert Data Formats like `JSON` into `TOON` files to save tokens
| (obviously informing the LLM of this change)

- [ ] Skills:
| Add Skills so any agent can use this tool

- [?] Treesitter:
| I do not know if I like the idea...
| But it would be interesting to be able to pass the Treesitter schema of an entire project
| In theory it should consume few tokens and give good general context for the project
| But I saw that working with Treesitters is not that pleasant for the developer
| (ummm... a perfect job for a slave LLM)

- [?] LSP:
| * Attach LSP messages in the files
| * Use definitions and symbols that the LSP provides
| * Use `lsp-hover` artificially on symbols chosen by the user through flags
