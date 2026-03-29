# ConteXo
> CLI para lanzarle en la cara a tu LLM todo tu código.

*ConteXo* escupe por STDOUT todo tu código, específicamente pensado para que un LLM lo lea.
Tiene varias configuraciones de control de texto para que no atasques de tokens a tu LLM.
Esta herramienta es útil sobre todo cuando no quieres complicaciones y solo quieres darle
absolutamente todo tu código al LLM de una sola vez.

# WHY?

Creo que muchos proyectos de "Exploración de código" para obtener contexto terminan siendo
sobreingeniería, además de que no todo el software con LLM viene integrado con buenas herramientas
para ello. ¿Por qué no simplemente COPIAR y PEGAR todo el código con sus direcciones path y ya?
eso es básicamente `ConteXo`, para que copies y pegues o puedes pedirle al LLM que use la tool `bash`
(que hoy en día muchos lo tienen) para usar este comando

> mira la FAQ para ver si es mejor `ConteXo` vs otras herramientas

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
    La CLI está hecha para darle la info que el LLM necesita sin asumir que el LLM sabe de esta CLI.
    Le da todo lo necesario por defecto, como:
    rutas absolutas y relativas, un overview útil de ignores relevantes y errores de lectura,
    advertencias e info extra, etc...
* Summary:
    la salida normal ya incluye secciones de summary al inicio.
    con `--summary` obtienes la vista resumida/visual sin contexto ni skippedlist.
    stats útiles:
    - cantidad de líneas y caracteres del output canónico final tras filtros y truncados
      (antes de paginación)
    - top directorios con más archivos
    - top archivos más largos en líneas y caracteres
    - longest lines
    - si usas `--compare-model`, también `tokens`, `usage` y `cost usd` aproximados
* Granular Truncate:
    puedes truncar cada línea, archivo o `stdout` total por separado
    usando las flags canónicas `--line-maxchars`, `--file-maxlines`, `--file-maxchars`,
    `--stdout-maxlines` y `--stdout-maxchars`
    ejemplo descriptivo:
        "_truncar cualquier linea que exceda los 100 caracteres, y truncar archivos de más de 200 líneas, y además que los archivos no excedan los 3000 caracteres, y además que el total no exceda de 100000 caracteres_"
* Clean: puedes omitir espacios en blanco, líneas vacías y comentarios de código.
* Paginación:
    Puedes paginar si estableciste un límite total de `stdout` por líneas o por número de caracteres.
    `--stdout-maxlines` y `--stdout-maxchars` son mutuamente excluyentes.
    Si el LLM es quien ejecuta `ConteXo` este es informado que existe más páginas.
    Esto es útil porque la mayoría de software de LLM tienen límites por líneas o caracteres
    en cada `tool execution`
* Control Files:
    Lectura automática y recursiva de `.gitignore` y `.ignore` (desactivable con `--disable-ignorefile`).
    Flags para ignorar carpetas o archivos (`--ignore`), ignorar por regex (`--ignore-regex`)
    y filtrar por globs root-relative (`--pattern`).
    `skippedlist` intenta dar un overview breve y fiel: muestra ignores por ignorefiles,
    entradas reales ignoradas por `--ignore`, resúmenes de coincidencias por `--ignore-regex`
    y un aviso formal cuando `--pattern` excluye rutas que no matchean.
    Opciones para seguir symbolic links y mounts (prevención circular) o no seguirlas
* Number Line:
    `--number-line` (`-n`) prefija cada línea emitida con su número de línea.
* Encoding y comparar con Modelos
    Usa `anomalyco/models.dev` (en local) para comparar los tokens con modelos actualizados
    y así calcular cuánto de ventana de contexto "pesa" tu `contexto` y cuánto te costará aproximadamente.

# Instalación

> Linux es lo más testeado actualmente, pero los releases también generan binarios para macOS y Windows.
* Descarga binarios precompilados en `Releases`
ejemplo para linux:
```bash
curl -fsSL "https://github.com/kelvinauta/ConteXo/releases/latest/download/contexo-linux-x64" -o "$HOME/.local/bin/contexo" && chmod +x "$HOME/.local/bin/contexo"
```
* Compila desde el código fuente
Clona este repo, instala dependencias y compila con Bun.
> targets en: https://bun.com/docs/bundler/executables#supported-targets
ejemplos:
```bash
bun install
bun run build:binary -- --target bun-linux-x64
install -m 755 ./contexo /usr/local/bin/contexo
```

Si quieres generar los assets de release con checksums:
```bash
bun run build:release
```

Si estás tocando el proyecto y quieres validar rápido la suite actual:
```bash
bun run test:low
bun run test:medium
bun run test:high
```

# Guía de uso

Esta guía sólo aclara info no contenida en `--help`
> Para guía rápida `contexo --help`

## Summary

Aconsejo siempre empezar usando `--summary`, pues esto te permite configurar el contexto que estás pasando.
def: `contexo [<path>] --summary [...options]`
```bash
# examples
contexo --summary
contexo some/path --summary
contexo some/path --summary --ignore some/dir --ignore other/dir
```
La salida normal ya incluye summary al inicio; `--summary` simplemente cambia al modo
resumen/visual y oculta `context` + `skippedlist`.
Si solo quieres ocultar summary, usa `--nosummary` o `--hide summary`.
Si quieres quedarte solo con el contexto, normalmente querrás `--hide summary,skippedlist`.

`summary` se calcula siempre al final de todas las configuraciones, por lo que
te permite ver cuánto le pasarás al LLM antes de hacerlo.

> Tip: Si el LLM es consciente de sus propios límites (como en `anomalyco/opencode`), el mismo `LLM` puede buscar su configuración óptima.

Ejemplo de salida:
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
Como se puede observar, este comando nos da información útil sobre el "peso" total de nuestro proyecto
y nos da pistas de qué archivos pueden estar siendo demasiado pesados.
en este ejemplo `scc-data/graphql.graphql` tiene más de un millón de caracteres, si no es un archivo valioso
podemos elegir ignorarlo.
Si volviéramos a ejecutar `contexo --summary --ignore scc-data/graphql.graphql` el cálculo
que nos dará será sin considerar dicho archivo

> Si además usas `--compare-model`, aparecerá también la sección `ENCODING`
> con tokens, context, usage y cost aproximados.

## Clean
a menudo es útil ejecutar `contexo --clean all`; esto limpia tanto:
- espacios en blanco repetidos (doble espacio y respeta la identación)
- líneas vacías `^\s*$`
- comentarios de código (bloque y en línea)
Sin embargo puede que te interese no quitar los comentarios;
por ejemplo en typescript muchos comentarios de bloque tienen info valiosa por usar `ts-doc`
por lo que puede que te interese quitar los comentarios de línea pero no los de bloque
entonces puedes: `--clean "blankline,spaceunless,comments:line"`
dicho esto `--clean all` y `--clean "blankline,spaceunless,comments:line,comments:block"` son exactamente lo mismo

## Filtrado e ignores

`ConteXo` puede recortar muchísimo ruido antes de emitir contexto:

- `--pattern`: filtra por glob root-relative. Puede repetirse y también aceptar CSV.
- `--ignore`: añade ignores explícitos.
- `--ignore-regex`: añade ignores por regex.
- `.gitignore` y `.ignore`: se aplican automáticamente y de forma recursiva por subárbol.
- `--disable-ignorefile`: desactiva la lectura de `.gitignore` / `.ignore`.

Ejemplos:
```bash
contexo . --pattern "src/**/*.ts"
contexo . --pattern "src/**/*.ts" --pattern "scripts/*.ts,src/*.py"
contexo . --ignore dist --ignore node_modules
contexo . --ignore-regex "\\.min\\.(js|css)$"
```

## Models
Si te interesa comparar la salida con el `price per 1M token` de un modelo y el `context length`
puedes usar `contexo --models`; esto te dará la lista de modelos disponibles
que provee `anomalyco/models.dev`, en formato `provider/model`
También puedes filtrar por provider directamente:
`contexo --models openai`

La flag canónica para comparar es `--compare-model`.
Ahora para comparar tu contexto total con un modelo ejecutas:
`contexo --summary --compare-model "openai/gpt-4o"`

Ejemplo de salida (sección):
```
  ENCODING
    encoder      o200k_base
    compare      openai/gpt-4o
    tokens       ~4_365
    context      128_000
    usage        ~3.41%
    cost usd     ~0.010913
```
> La sección `ENCODING` solo aparece cuando usas `--compare-model <provider>/<model>`
> Sobre el encoder (el responsable de tokenizar) puedes cambiarlo con `--enc`
> pero cuando lo pasas explícitamente requiere `--compare-model` o `--model`
> Es importante entender que solo se usan encoders open source, por lo que los tokens calculados son apenas un aproximado.
> `--model` sigue existiendo como alias de compatibilidad, pero la documentación usa `--compare-model`.
* Comportamiento interno:
solo para que lo sepas, para poder funcionar localmente el comando lo que hace es en la primera ejecución.
clonar: `github.com/anomalyco/models.dev` en `/tmp/contexo-models-cache/`
intenta actualizar si el repo existente tiene más de 24 horas

## Límites
Esto podría ser confuso, por lo que lo explicaré.
Existen 3 `scopes`; a cada `scope` se le puede aplicar un límite y un tipo de truncado.
* scopes
    son los elementos que puedes truncar (cada scope por separado y con sus propias reglas)
    línea: `--line-maxchars`
    file: `--file-maxlines` y `--file-maxchars`
    stdout: `--stdout-maxlines` y `--stdout-maxchars`
    cada scope acepta un número o `TRUNCOPTS` con forma `max:N[,cut:mode][,mark:text]`
* tipos de truncado
    son `start`, `middle` y `end` (por defecto)
    esto significa dónde se truncará.
    ejemplos visuales:
    - start  : `...cate in start`
    - middle : `trun... in middle`
    - end    : `truncate in e...`
    el `middle` es extremadamente útil en las líneas.
    porque mantiene el contexto del principio y el final donde muchas veces
    existe información útil
* mark
    El `--mark` global es MUY importante; permite a un LLM saber que algo está truncado.
    También puedes definir `mark:` dentro del `TRUNCOPTS` de un scope concreto.
    por defecto es `...` y generalmente funciona bien cuando el tipo de truncado es `end`
    pero en otros truncados puede ser confuso para el LLM, en esos casos recomiendo algo explícito
    como: `contexo --line-maxchars "max:100,cut:middle,mark:...[TRUNCATED]..."`
* Ejemplos:
    ```bash
    contexo \
        --line-maxchars "max:200,cut:middle" \
        --file-maxlines "max:500,cut:end" \
        --file-maxchars "max:3000" \
        --stdout-maxlines 2000
    ```
* Extras:
    - `--stdout-maxlines` y `--stdout-maxchars` solo pueden truncar al final
      `end` porque sería incompatible con la lógica de paginación que veremos más adelante
    - `--stdout-maxlines` y `--stdout-maxchars` son mutuamente excluyentes
    - `--page-lines` requiere `--stdout-maxlines`
    - `--page-char` requiere `--stdout-maxchars`
    - `--limit-files`: limita la cantidad de archivos a escanear como máximo
    - `--limit-nested`: limita el escaneo recursivo (profundidad)
    - la longitud del `mark` también se cuenta para generar el límite
    - este README usa siempre los nombres canónicos actuales de las flags
* por qué limites de chars y lines?
    mucho software de LLM tiene todo tipo de límites fijos para controlar
    no comer demasiados tokens o evitar fallos de los proveedores.
    por lo que pueden limitar por caracteres y/o por número de líneas.
    es por eso que `ConteXo` te permite trabajar con un tipo de límite u otro
    según el entorno donde se ejecuta.
    Por ejemplo, en `opencode` (a la fecha de la redacción de este README)
    el límite de cada `tool execute` suele ser `2000` líneas fijas NO CONFIGURABLES
    están harcodeadas en el código, aunque lo bueno es que los agentes son conscientes
    de este límite porque `opencode` se los informa internamente
    Por lo tanto en este caso específico es más útil trabajar con `--stdout-maxlines`.

## Paginación

La paginación viene en 2 versiones y por ejecución solo debes usar una:

- `--page-lines <number>`: cambia de página cuando `--stdout-maxlines` está activado
- `--page-char <number>`: cambia de página cuando `--stdout-maxchars` está activado

Las paginaciones solo sirven cuando un límite total está activado y ese límite es excedido.
Cuando eso ocurre, `ConteXo` añade marcadores como `...bylines:[page 1/2]`
o `...bychars:[page 1/2]` dentro del presupuesto disponible,
y además avisa por `stderr` que existe más de una página.
Si pides una página fuera de rango, te mostrará la última y emitirá un warning.

* Ejemplo:
Supongamos que el software LLM que usas no te deja enviar un mensaje de más de 1000 caracteres
(lo cual es una poronga), entonces:
primero puedes ejecutar `contexo --summary` para saber cuantos caracteres ocupa tu contexto,
supongamos que es 1500, entonces puedes hacer algo como:
`contexo --stdout-maxchars 750 --page-char 1` y copiar la salida.
Pegarlo y decirle a tu LLM (Esta es la página 1 de 2, enseguida te paso la segunda)
`contexo --stdout-maxchars 750 --page-char 2` copias, pegas, haces tu pregunta, todos felices!

# FAQ

* `ConteXo` es solo para todo un proyecto completo?
| No! puedes pasar el path que quieras, de hecho es buena idea pedirle a un LLM
| que vaya explorando con esta herramienta por ciertas carpetas
| `contexo <path>`
| o incluso filtrar dentro de ese path con `--pattern "src/**/*.ts"`

* `ConteXo` es solo para proyectos de código?
| No, pero sí está pensado principalmente para eso
| Sin embargo creo que la única feature que es incompatible
| con proyectos de no código es `--clean comments` (limpiar comentarios de código)

* `ConteXo` es mejor en consumo de Tokens que otras herramientas?
| Depende la tarea, el proyecto (contexto) y el software que usas
| cuando el software le da a los agentes las `tools` correctas
| a menudo los LLM solo buscan la info que necesitan
| y los tokens consumidos son significativamente menores que copiar TODO tu código
| pero en sesiones largas o proyectos grandes
| esta misma exploración de archivos al ser decisión de los LLM
| pueden consumir muchos tokens de pensamiento
| `ConteXo` no debe ser visto como un reemplazo, si no como un complemento
| A veces la tarea es sencilla y los archivos son fáciles de encontrar y proveen suficiente información
| Pero si vas a trabajar con una tarea grande que involucra todo el proyecto
| Es más conveniente ahorrarle el trabajo de pensar al LLM qué rayos hacer y a dónde ir
| y simplemente pasarle todo el `ConteXo` y ya está...

# Erratas:
Hay cosas que desconozco y no he probado su funcionamiento.
* He probado en proyectos grandes, pero por como funciona por dentro parece que
  todo el `STDOUT` termina estando por completo en RAM en un determinado
  momento, por lo que en teoría la memoria debería morirse en proyectos
  grandes, sin embargo sorprendentemente no me ha ocurrido, la verdad no lo he
  reflexionado lo suficiente, tal vez `Bun` esté haciendo más magia de lo
  esperado o simplemente no probé con un proyecto lo suficientemente grande
* El encoder es pesado para algunas computadoras, usarlo con precaución
* Hoy el CLI ya rechaza mezclar `--stdout-maxlines` y `--stdout-maxchars`,
  y además `--page-lines` / `--page-char` requieren su límite correspondiente
* `ConteXo` no tiene límites por defecto configurados, por lo que si tu `LLM`
  simplemente decide ejecutar el comando tal cual sin opciones, podría llenar su `context length`
* Linux sigue siendo lo más testeado; genero releases para Windows y macOS,
  pero no los he validado tanto como Linux

# Futuras Feature (TODO):
_las `[ ]` significan que lo haré, las `[?]` significan "no sé xD"_

- [ ] Optimizar:
| Actualmente esta proquería puede consumir mucha RAM (por solo un par de segundos)
| y eso podría ser molesto en algunos dispositivos
| Simplemente voy a emitir por STREAM el STDOUT en vez de cargarlo en memoria
| Para `--summary` se emitirá el STREAM a un /dev/null (o algo así) para poder contar y hacer estadísticas
| Para `--nosummary` simplemente se emitirá por STREAM al stdout sin cargarlo todo en memoria
| Para emitir ambos (un summary + STDOUT) pues se hacen los dos anteriores
| (TODO: validar esta idea porque lo pensé mientras escribía...)

- [ ] Toonify:
| Convertir Data Formats como `JSON` en archivos `TOON` para ahorro de tokens
| (obviamente informando al LLM de este cambio)

- [ ] Skills:
| Añadir Skills para que cualquier agente pueda usar esta herramienta

- [?] Treesitter:
| No sé si me gusta la idea...
| Pero sería interesante poder pasarle el esquema Treesitter de todo un proyecto
| En teoría debería consumir pocos tokens y le daría un buen contexto general del proyecto
| Pero vi que trabajar con Treesitters no es tan placentero para el desarrollador
| (ummm... un trabajo perfecto para un LLM esclavo)

- [?] LSP:
| * Adjuntar mensajes de LSP en los archivos
| * Usar definiciones y symbols que el LSP provee
| * Usar artificialmente `lsp-hover` en symbols elegidos por el usuario por flags
