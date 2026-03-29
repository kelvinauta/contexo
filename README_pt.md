# ConteXo
> CLI para jogar na cara do seu LLM todo o seu codigo.

*ConteXo* cospe no STDOUT todo o seu codigo, pensado especificamente para um LLM ler.
Tem varias configuracoes de controle de texto para que voce nao entupa seu LLM de tokens.
Esta ferramenta e util sobretudo quando voce nao quer complicacao e so quer dar
absolutamente todo o seu codigo ao LLM de uma vez.

# WHY?

Acho que muitos projetos de "Exploracao de codigo" para obter contexto acabam virando
sobreengenharia, alem de que nem todo software com LLM vem integrado com boas ferramentas
para isso. Por que nao simplesmente COPIAR e COLAR todo o codigo com seus caminhos e pronto?
isso e basicamente `ConteXo`, para voce copiar e colar, ou pode pedir ao LLM para usar a tool `bash`
(que hoje em dia muitos tem) para usar este comando

> veja a FAQ para ver se `ConteXo` e melhor que outras ferramentas

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
    A CLI foi feita para dar ao LLM a informacao que ele precisa sem assumir que o LLM conhece esta CLI.
    Ela da tudo o que e necessario por padrao, como:
    caminhos absolutos e relativos, um overview util de ignores relevantes e erros de leitura,
    avisos e informacoes extras, etc...
* Summary:
    a saida normal ja inclui secoes de summary no inicio.
    com `--summary` voce obtem a visao resumida/visual sem contexto nem skippedlist.
    stats uteis:
    - quantidade de linhas e caracteres do output canonico final apos filtros e truncamentos
      (antes da paginacao)
    - top diretorios com mais arquivos
    - top arquivos mais longos em linhas e caracteres
    - longest lines
    - se usar `--compare-model`, tambem `tokens`, `usage` e `cost usd` aproximados
* Truncamento granular:
    voce pode truncar cada linha, arquivo ou `stdout` total separadamente
    usando as flags canonicas `--line-maxchars`, `--file-maxlines`, `--file-maxchars`,
    `--stdout-maxlines` e `--stdout-maxchars`
    exemplo descritivo:
        "_truncar qualquer linha que ultrapasse 100 caracteres, e truncar arquivos com mais de 200 linhas, e alem disso fazer com que os arquivos nao ultrapassem 3000 caracteres, e alem disso que o total nao passe de 100000 caracteres_"
* Clean: voce pode omitir espacos em branco, linhas vazias e comentarios de codigo.
* Paginacao:
    Voce pode paginar se definiu um limite total de `stdout` por linhas ou por numero de caracteres.
    `--stdout-maxlines` e `--stdout-maxchars` sao mutuamente excludentes.
    Se for o LLM quem executa `ConteXo`, ele e informado de que existem mais paginas.
    Isso e util porque a maioria dos softwares com LLM tem limites por linhas ou caracteres
    em cada `tool execution`
* Control Files:
    Leitura automatica e recursiva de `.gitignore` e `.ignore` (desativavel com `--disable-ignorefile`).
    Flags para ignorar pastas ou arquivos (`--ignore`), ignorar por regex (`--ignore-regex`)
    e filtrar por globs root-relative (`--pattern`).
    `skippedlist` tenta dar um overview breve e fiel: mostra ignores por ignorefiles,
    entradas reais ignoradas por `--ignore`, resumos de correspondencias por `--ignore-regex`
    e um aviso formal quando `--pattern` exclui caminhos que nao batem.
    Opcoes para seguir symbolic links e mounts (prevencao circular) ou nao segui-los
* Number Line:
    `--number-line` (`-n`) prefixa cada linha emitida com seu numero de linha.
* Encoding e comparar com Modelos
    Usa `anomalyco/models.dev` (localmente) para comparar os tokens com modelos atualizados
    e assim calcular quanto da janela de contexto "pesa" o seu `contexto` e quanto custara aproximadamente.

# Instalacao

> Linux e o mais testado atualmente, mas os releases tambem geram binarios para macOS e Windows.
* Baixe binarios precompilados em `Releases`
exemplo para linux:
```bash
curl -fsSL "https://github.com/kelvinauta/ConteXo/releases/latest/download/contexo-linux-x64" -o "$HOME/.local/bin/contexo" && chmod +x "$HOME/.local/bin/contexo"
```
* Compile a partir do codigo-fonte
Clone este repo, instale as dependencias e compile com Bun.
> targets em: https://bun.com/docs/bundler/executables#supported-targets
exemplos:
```bash
bun install
bun run build:binary -- --target bun-linux-x64
install -m 755 ./contexo /usr/local/bin/contexo
```

Se quiser gerar os assets de release com checksums:
```bash
bun run build:release
```

Se estiver mexendo no projeto e quiser validar rapidamente a suite atual:
```bash
bun run test:low
bun run test:medium
bun run test:high
```

# Guia de uso

Este guia so esclarece informacoes que nao estao em `--help`
> Para guia rapida `contexo --help`

## Summary

Aconselho sempre comecar usando `--summary`, pois isso permite configurar o contexto que voce esta passando.
def: `contexo [<path>] --summary [...options]`
```bash
# examples
contexo --summary
contexo some/path --summary
contexo some/path --summary --ignore some/dir --ignore other/dir
```
A saida normal ja inclui summary no inicio; `--summary` apenas muda para o modo
resumo/visual e oculta `context` + `skippedlist`.
Se quiser apenas ocultar summary, use `--nosummary` ou `--hide summary`.
Se quiser ficar so com o contexto, normalmente vai querer `--hide summary,skippedlist`.

`summary` e calculado sempre no final de todas as configuracoes, entao
permite ver quanto voce vai passar ao LLM antes de faze-lo.

> Tip: Se o LLM tiver consciencia dos proprios limites (como em `anomalyco/opencode`), o proprio `LLM` pode buscar sua configuracao ideal.

Exemplo de saida:
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
Como da para observar, este comando nos da informacoes uteis sobre o "peso" total do nosso projeto
e nos da pistas de quais arquivos podem estar pesando demais.
neste exemplo `scc-data/graphql.graphql` tem mais de um milhao de caracteres; se nao for um arquivo valioso
podemos optar por ignora-lo.
Se voltarmos a executar `contexo --summary --ignore scc-data/graphql.graphql`, o calculo
que ele dara sera sem considerar esse arquivo

> Se tambem usar `--compare-model`, aparecera tambem a secao `ENCODING`
> com tokens, context, usage e cost aproximados.

## Clean
com frequencia e util executar `contexo --clean all`; isso limpa tanto:
- espacos em branco repetidos (espaco duplo e respeita a indentacao)
- linhas vazias `^\s*$`
- comentarios de codigo (bloco e em linha)
No entanto, pode ser que voce nao queira remover os comentarios;
por exemplo, em typescript muitos comentarios de bloco tem informacao valiosa por usarem `ts-doc`
por isso pode ser interessante remover os comentarios de linha, mas nao os de bloco
entao voce pode: `--clean "blankline,spaceunless,comments:line"`
dito isso, `--clean all` e `--clean "blankline,spaceunless,comments:line,comments:block"` sao exatamente a mesma coisa

## Filtros e ignores

`ConteXo` pode cortar muito ruido antes de emitir contexto:

- `--pattern`: filtra por glob root-relative. Pode ser repetido e tambem aceita CSV.
- `--ignore`: adiciona ignores explicitos.
- `--ignore-regex`: adiciona ignores por regex.
- `.gitignore` e `.ignore`: sao aplicados automaticamente e de forma recursiva por subarvore.
- `--disable-ignorefile`: desativa a leitura de `.gitignore` / `.ignore`.

Exemplos:
```bash
contexo . --pattern "src/**/*.ts"
contexo . --pattern "src/**/*.ts" --pattern "scripts/*.ts,src/*.py"
contexo . --ignore dist --ignore node_modules
contexo . --ignore-regex "\\.min\\.(js|css)$"
```

## Models
Se voce tiver interesse em comparar a saida com o `price per 1M token` de um modelo e o `context length`
pode usar `contexo --models`; isso dara a lista de modelos disponiveis
que `anomalyco/models.dev` fornece, no formato `provider/model`
Tambem e possivel filtrar por provider diretamente:
`contexo --models openai`

A flag canonica para comparar e `--compare-model`.
Agora, para comparar seu contexto total com um modelo, execute:
`contexo --summary --compare-model "openai/gpt-4o"`

Exemplo de saida (secao):
```
  ENCODING
    encoder      o200k_base
    compare      openai/gpt-4o
    tokens       ~4_365
    context      128_000
    usage        ~3.41%
    cost usd     ~0.010913
```
> A secao `ENCODING` so aparece quando voce usa `--compare-model <provider>/<model>`
> Sobre o encoder (o responsavel por tokenizar), voce pode mudá-lo com `--enc`
> mas, quando passa explicitamente, ele exige `--compare-model` ou `--model`
> E importante entender que so sao usados encoders open source, por isso os tokens calculados sao apenas uma aproximacao.
> `--model` continua existindo como alias de compatibilidade, mas a documentacao usa `--compare-model`.
* Comportamento interno:
so para voce saber, para poder funcionar localmente, na primeira execucao o comando faz o seguinte.
clona: `github.com/anomalyco/models.dev` em `/tmp/contexo-models-cache/`
e tenta atualizar se o repo existente tiver mais de 24 horas

## Limites
Isso pode ser confuso, entao vou explicar.
Existem 3 `scopes`; em cada `scope` pode ser aplicado um limite e um tipo de truncamento.
* scopes
    sao os elementos que voce pode truncar (cada scope separadamente e com suas proprias regras)
    linha: `--line-maxchars`
    file: `--file-maxlines` e `--file-maxchars`
    stdout: `--stdout-maxlines` e `--stdout-maxchars`
    cada scope aceita um numero ou `TRUNCOPTS` com formato `max:N[,cut:mode][,mark:text]`
* tipos de truncamento
    sao `start`, `middle` e `end` (por padrao)
    isso significa onde sera truncado.
    exemplos visuais:
    - start  : `...cate in start`
    - middle : `trun... in middle`
    - end    : `truncate in e...`
    `middle` e extremamente util nas linhas.
    porque mantem o contexto do inicio e do fim, onde muitas vezes
    existe informacao util
* mark
    O `--mark` global e MUITO importante; ele permite que um LLM saiba que algo esta truncado.
    Tambem e possivel definir `mark:` dentro do `TRUNCOPTS` de um scope especifico.
    por padrao e `...` e geralmente funciona bem quando o tipo de truncamento e `end`
    mas em outros truncamentos pode ser confuso para o LLM; nesses casos recomendo algo explicito
    como: `contexo --line-maxchars "max:100,cut:middle,mark:...[TRUNCATED]..."`
* Exemplos:
    ```bash
    contexo \
        --line-maxchars "max:200,cut:middle" \
        --file-maxlines "max:500,cut:end" \
        --file-maxchars "max:3000" \
        --stdout-maxlines 2000
    ```
* Extras:
    - `--stdout-maxlines` e `--stdout-maxchars` so podem truncar no final
      `end` porque seria incompativel com a logica de paginacao que veremos mais adiante
    - `--stdout-maxlines` e `--stdout-maxchars` sao mutuamente excludentes
    - `--page-lines` exige `--stdout-maxlines`
    - `--page-char` exige `--stdout-maxchars`
    - `--limit-files`: limita a quantidade maxima de arquivos a escanear
    - `--limit-nested`: limita a varredura recursiva (profundidade)
    - o comprimento do `mark` tambem conta para gerar o limite
    - este README usa sempre os nomes canonicos atuais das flags
* por que limites de chars e lines?
    muito software com LLM tem todo tipo de limites fixos para controlar
    nao consumir tokens demais ou evitar falhas dos provedores.
    por isso podem limitar por caracteres e/ou por numero de linhas.
    e por isso que `ConteXo` permite trabalhar com um tipo de limite ou outro
    segundo o ambiente onde esta sendo executado.
    Por exemplo, em `opencode` (na data em que este README foi escrito)
    o limite de cada `tool execute` costuma ser `2000` linhas fixas NAO CONFIGURAVEIS
    hardcodeadas no codigo, embora o lado bom seja que os agentes tem consciencia
    desse limite porque `opencode` os informa internamente
    Portanto, nesse caso especifico, e mais util trabalhar com `--stdout-maxlines`.

## Paginacao

A paginacao vem em 2 versoes e por execucao voce deve usar apenas uma:

- `--page-lines <number>`: muda de pagina quando `--stdout-maxlines` esta ativo
- `--page-char <number>`: muda de pagina quando `--stdout-maxchars` esta ativo

As paginacoes so servem quando um limite total esta ativo e esse limite e ultrapassado.
Quando isso acontece, `ConteXo` adiciona marcadores como `...bylines:[page 1/2]`
ou `...bychars:[page 1/2]` dentro do orcamento disponivel,
e alem disso avisa por `stderr` que existe mais de uma pagina.
Se voce pedir uma pagina fora do intervalo, ele mostrara a ultima e emitira um warning.

* Exemplo:
Suponha que o software com LLM que voce usa nao deixe enviar uma mensagem com mais de 1000 caracteres
(o que e uma porcaria), entao:
primeiro voce pode executar `contexo --summary` para saber quantos caracteres seu contexto ocupa,
suponha que seja 1500, entao voce pode fazer algo como:
`contexo --stdout-maxchars 750 --page-char 1` e copiar a saida.
Colar e dizer ao seu LLM (Esta e a pagina 1 de 2, em seguida te passo a segunda)
`contexo --stdout-maxchars 750 --page-char 2` copia, cola, faz sua pergunta, todos felizes!

# FAQ

* `ConteXo` e so para um projeto inteiro?
| Nao! voce pode passar o path que quiser; na verdade e uma boa ideia pedir a um LLM
| que va explorando com esta ferramenta por certas pastas
| `contexo <path>`
| ou ate filtrar dentro desse path com `--pattern "src/**/*.ts"`

* `ConteXo` e so para projetos de codigo?
| Nao, mas sim, foi pensado principalmente para isso
| No entanto, acho que a unica feature que e incompativel
| com projetos que nao sao de codigo e `--clean comments` (limpar comentarios de codigo)

* `ConteXo` e melhor em consumo de Tokens do que outras ferramentas?
| Depende da tarefa, do projeto (contexto) e do software que voce usa
| quando o software da aos agentes as `tools` corretas
| com frequencia os LLM so procuram a informacao de que precisam
| e os tokens consumidos sao significativamente menores do que copiar TODO o seu codigo
| mas em sessoes longas ou projetos grandes
| essa mesma exploracao de arquivos, por ser decisao dos LLM
| pode consumir muitos tokens de pensamento
| `ConteXo` nao deve ser visto como substituto, e sim como complemento
| As vezes a tarefa e simples e os arquivos sao faceis de encontrar e fornecem informacao suficiente
| Mas, se voce vai trabalhar com uma tarefa grande que envolve o projeto inteiro
| E mais conveniente poupar ao LLM o trabalho de pensar que diabos fazer e aonde ir
| e simplesmente passar todo o `ConteXo` e pronto...

# Erratas:
Ha coisas que eu desconheco e nao testei o funcionamento.
* Testei em projetos grandes, mas, pelo jeito como funciona por dentro, parece que
  todo o `STDOUT` acaba ficando inteiro em RAM em determinado
  momento, entao em teoria a memoria deveria morrer em projetos
  grandes; no entanto, surpreendentemente isso nao aconteceu comigo, a verdade e que nao pensei
  o suficiente sobre isso, talvez `Bun` esteja fazendo mais magia do que o
  esperado ou simplesmente nao testei com um projeto grande o bastante
* O encoder e pesado para alguns computadores; use com cautela
* Hoje a CLI ja rejeita misturar `--stdout-maxlines` e `--stdout-maxchars`,
  e alem disso `--page-lines` / `--page-char` exigem seu limite correspondente
* `ConteXo` nao tem limites padrao configurados, por isso se o seu `LLM`
  simplesmente decidir executar o comando puro, sem opcoes, ele pode lotar seu `context length`
* Linux continua sendo o mais testado; eu gero releases para Windows e macOS,
  mas nao os validei tanto quanto Linux

# Futuras features (TODO):
_as `[ ]` significam que farei, as `[?]` significam "nao sei xD"_

- [ ] Toonify:
| Converter formatos de dados como `JSON` em arquivos `TOON` para economizar tokens
| (obviamente informando o LLM dessa mudanca)

- [ ] Skills:
| Adicionar Skills para que qualquer agente possa usar esta ferramenta

- [?] Treesitter:
| Nao sei se gosto da ideia...
| Mas seria interessante poder passar o esquema Treesitter de um projeto inteiro
| Em teoria isso deveria consumir poucos tokens e daria um bom contexto geral do projeto
| Mas vi que trabalhar com Treesitters nao e tao prazeroso para o desenvolvedor
| (ummm... um trabalho perfeito para um LLM escravo)

- [?] LSP:
| * Anexar mensagens de LSP nos arquivos
| * Usar definicoes e symbols que o LSP fornece
| * Usar artificialmente `lsp-hover` em symbols escolhidos pelo usuario por flags
