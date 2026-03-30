# ConteXo
> CLI ताकि तुम अपना सारा कोड सीधे अपने LLM के सामने फेंक सको।

*ConteXo* तुम्हारा सारा कोड `STDOUT` पर उगल देता है, खास तौर पर इस तरह बनाया गया है कि कोई LLM उसे पढ़ सके।
इसमें टेक्स्ट नियंत्रण की कई सेटिंग्स हैं ताकि तुम अपने LLM को टोकनों से जाम न कर दो।
यह टूल खास तौर पर तब काम आता है जब तुम्हें कोई झंझट नहीं चाहिए और तुम बस
अपना पूरा कोड एक ही बार में LLM को देना चाहते हो।

# WHY?

मेरा मानना है कि context पाने के लिए बने कई "code exploration" प्रोजेक्ट आखिरकार
overengineering बन जाते हैं, और ऊपर से हर LLM software में इसके लिए अच्छे tools भी नहीं आते।
फिर क्यों न बस सारा कोड उसके path addresses के साथ COPY और PASTE कर दिया जाए?
असल में `ConteXo` यही है: ताकि तुम copy-paste कर सको, या LLM से कह सको कि वह `bash` tool इस्तेमाल करे
(जो आजकल बहुतों के पास होती है) और यह command चलाए

> यह देखने के लिए FAQ पढ़ो कि `ConteXo` दूसरी tools के मुकाबले कब बेहतर है

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
    यह CLI इस तरह बनाई गई है कि LLM को वही जानकारी दे जो उसे चाहिए, बिना यह माने कि LLM इस CLI को जानता है।
    यह डिफॉल्ट रूप से ज़रूरी सब कुछ देती है, जैसे:
    absolute और relative paths, relevant ignores का उपयोगी overview और read errors,
    warnings और extra info, आदि...
* Summary:
    सामान्य output में शुरुआत में summary sections पहले से शामिल होती हैं।
    `--summary` के साथ तुम्हें context और skippedlist के बिना एक summarized/visual view मिलती है।
    उपयोगी stats:
    - filters और truncations के बाद final canonical output की lines और characters की संख्या
      (pagination से पहले)
    - सबसे ज़्यादा files वाले top directories
    - lines और characters के हिसाब से सबसे लंबी top files
    - longest lines
    - अगर तुम `--compare-model` इस्तेमाल करते हो, तो approximate `tokens`, `usage` और `cost usd` भी
* ग्रैन्युलर ट्रन्केशन:
    तुम हर line, file, या कुल `stdout` को अलग-अलग truncate कर सकते हो
    canonical flags `--line-maxchars`, `--file-maxlines`, `--file-maxchars`,
    `--stdout-maxlines` और `--stdout-maxchars` का इस्तेमाल करके
    वर्णनात्मक उदाहरण:
        "_100 characters से लंबी किसी भी line को truncate करना, और 200 lines से बड़ी files को truncate करना, और साथ ही files को 3000 characters से ज़्यादा न होने देना, और साथ ही कुल output को 100000 characters से ज़्यादा न होने देना_"
* Clean: तुम whitespace, खाली lines, और code comments हटा सकते हो।
* Paginacion:
    अगर तुमने `stdout` की कुल limit lines या characters में सेट की है, तो तुम pagination कर सकते हो।
    `--stdout-maxlines` और `--stdout-maxchars` mutually exclusive हैं।
    अगर LLM ही `ConteXo` चला रहा है, तो उसे बताया जाता है कि और pages मौजूद हैं।
    यह उपयोगी है क्योंकि ज़्यादातर LLM software में हर `tool execution` पर lines या characters की limits होती हैं
* Control Files:
    `.gitignore` और `.ignore` को अपने-आप और recursively पढ़ता है (`--disable-ignorefile` से बंद किया जा सकता है)।
    folders या files ignore करने के लिए flags (`--ignore`), regex से ignore करने के लिए (`--ignore-regex`)
    और root-relative globs से filter करने के लिए (`--pattern`)।
    `skippedlist` एक संक्षिप्त और faithful overview देने की कोशिश करती है: ignorefiles से आए ignores दिखाती है,
    `--ignore` से ignore हुई वास्तविक entries, `--ignore-regex` matches के summaries
    और जब `--pattern` non-matching paths को बाहर कर देता है तो एक formal notice भी।
    symbolic links और mounts को follow करने (circular prevention सहित) या न follow करने के विकल्प
* Number Line:
    `--number-line` (`-n`) हर emitted line के आगे उसका line number जोड़ता है।
* Encoding और मॉडलों से तुलना
    updated models के साथ tokens compare करने के लिए `anomalyco/models.dev` (locally) का उपयोग करता है
    ताकि यह निकाला जा सके कि तुम्हारा `context` context window का कितना हिस्सा "वज़न" रखता है और लगभग कितना खर्च आएगा।

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

# Guia de uso

यह guide सिर्फ वही जानकारी साफ़ करती है जो `--help` में नहीं है
> तेज़ guide के लिए `contexo --help`

## Summary

मैं हमेशा `--summary` से शुरुआत करने की सलाह देता हूँ, क्योंकि इससे तुम वह context configure कर पाते हो जो तुम भेज रहे हो।
def: `contexo [<path>] --summary [...options]`
```bash
# examples
contexo --summary
contexo some/path --summary
contexo some/path --summary --ignore some/dir --ignore other/dir
```
सामान्य output में शुरुआत में summary पहले से शामिल होती है; `--summary` बस mode बदलकर
summary/visual कर देता है और `context` + `skippedlist` छिपा देता है।
अगर तुम सिर्फ summary छिपाना चाहते हो, तो `--nosummary` या `--hide summary` इस्तेमाल करो।
अगर तुम सिर्फ context रखना चाहते हो, तो आम तौर पर `--hide summary,skippedlist` चाहोगे।

`summary` हमेशा सभी configurations के आखिर में calculate की जाती है, इसलिए
तुम पहले ही देख सकते हो कि LLM को कितना भेजा जाएगा।

> Tip: अगर LLM अपनी limits से खुद वाकिफ़ है (जैसे `anomalyco/opencode` में), तो वही `LLM` अपनी optimal configuration ढूंढ सकता है।

उदाहरण output:
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
जैसा देखा जा सकता है, यह command हमें हमारे project के कुल "वज़न" के बारे में उपयोगी जानकारी देती है
और यह संकेत भी देती है कि कौन-सी files ज़रूरत से ज़्यादा भारी हो सकती हैं।
इस उदाहरण में `scc-data/graphql.graphql` में दस लाख से ज़्यादा characters हैं; अगर यह कोई कीमती file नहीं है
तो हम इसे ignore करने का फैसला कर सकते हैं।
अगर हम `contexo --summary --ignore scc-data/graphql.graphql` फिर चलाएं, तो
जो calculation मिलेगा वह उस file को शामिल किए बिना होगा

> अगर तुम `--compare-model` भी इस्तेमाल करते हो, तो `ENCODING` section भी दिखाई देगा
> जिसमें approximate tokens, context, usage और cost होंगे।

## Clean
अक्सर `contexo --clean all` चलाना उपयोगी होता है; यह इन सबको साफ़ करता है:
- repeated whitespace (double spaces, और indentation को बनाए रखता है)
- खाली lines `^\s*$`
- code comments (block और inline)
लेकिन हो सकता है कि तुम comments हटाना न चाहो;
उदाहरण के लिए typescript में कई block comments `ts-doc` की वजह से कीमती जानकारी रखते हैं
इसलिए हो सकता है कि तुम line comments हटाना चाहो, लेकिन block comments नहीं
तब तुम यह कर सकते हो: `--clean "blankline,spaceunless,comments:line"`
यह भी ध्यान रहे कि `--clean all` और `--clean "blankline,spaceunless,comments:line,comments:block"` बिल्कुल एक ही चीज़ हैं

## फ़िल्टरिंग और ignores

`ConteXo` context emit करने से पहले बहुत शोर काट सकता है:

- `--pattern`: root-relative glob से filter करता है। इसे दोहराया जा सकता है और CSV भी ले सकता है।
- `--ignore`: explicit ignores जोड़ता है।
- `--ignore-regex`: regex-based ignores जोड़ता है।
- `.gitignore` और `.ignore`: अपने-आप और subtree के हिसाब से recursively लागू होते हैं।
- `--disable-ignorefile`: `.gitignore` / `.ignore` पढ़ना बंद करता है।

उदाहरण:
```bash
contexo . --pattern "src/**/*.ts"
contexo . --pattern "src/**/*.ts" --pattern "scripts/*.ts,src/*.py"
contexo . --ignore dist --ignore node_modules
contexo . --ignore-regex "\\.min\\.(js|css)$"
```

## Models
अगर तुम output की तुलना किसी model के `price per 1M token` और `context length` से करना चाहते हो
तो तुम `contexo --models` इस्तेमाल कर सकते हो; इससे तुम्हें उपलब्ध models की सूची मिलेगी
जो `anomalyco/models.dev` `provider/model` format में देता है
तुम provider से सीधे filter भी कर सकते हो:
`contexo --models openai`

compare करने की canonical flag है `--compare-model`.
अब अपने कुल context की किसी model से तुलना करने के लिए चलाओ:
`contexo --summary --compare-model "openai/gpt-4o"`

उदाहरण output (section):
```
  ENCODING
    encoder      o200k_base
    compare      openai/gpt-4o
    tokens       ~4_365
    context      128_000
    usage        ~3.41%
    cost usd     ~0.010913
```
> `ENCODING` section सिर्फ तब दिखाई देता है जब तुम `--compare-model <provider>/<model>` इस्तेमाल करते हो
> encoder (यानी tokenization के लिए ज़िम्मेदार हिस्सा) को तुम `--enc` से बदल सकते हो
> लेकिन जब तुम इसे explicitly देते हो, तो `--compare-model` या `--model` चाहिए
> यह समझना ज़रूरी है कि सिर्फ open source encoders इस्तेमाल होते हैं, इसलिए निकाले गए tokens सिर्फ approximate होते हैं।
> `--model` compatibility alias के तौर पर अभी भी मौजूद है, लेकिन documentation `--compare-model` का उपयोग करती है।
* Internal behavior:
सिर्फ जानकारी के लिए: local में काम करने के लिए command पहली execution पर
`github.com/anomalyco/models.dev` को `/tmp/contexo-models-cache/` में clone करता है
अगर existing repo 24 घंटे से ज़्यादा पुराना हो तो उसे update करने की कोशिश करता है

## Limites
यह थोड़ा भ्रमित कर सकता है, इसलिए मैं इसे समझाता हूँ।
3 `scopes` होते हैं; हर `scope` पर एक limit और एक truncation type लगाया जा सकता है।
* scopes
    ये वे elements हैं जिन्हें तुम truncate कर सकते हो (हर scope अलग और अपने नियमों के साथ)
    line: `--line-maxchars`
    file: `--file-maxlines` और `--file-maxchars`
    stdout: `--stdout-maxlines` और `--stdout-maxchars`
    हर scope एक number या `TRUNCOPTS` लेता है जिसका रूप `max:N[,cut:mode][,mark:text]` होता है
* truncation के प्रकार
    ये `start`, `middle` और `end` (default) हैं
    इसका मतलब है truncation कहां होगी।
    दृश्य उदाहरण:
    - start  : `...cate in start`
    - middle : `trun... in middle`
    - end    : `truncate in e...`
    `middle` lines में बेहद उपयोगी है।
    क्योंकि यह शुरुआत और अंत का context बचाए रखता है, जहां अक्सर
    उपयोगी जानकारी होती है
* mark
    global `--mark` बहुत महत्वपूर्ण है; इससे LLM समझ पाता है कि कुछ truncate किया गया है।
    तुम किसी खास scope के `TRUNCOPTS` के अंदर भी `mark:` define कर सकते हो।
    default रूप से यह `...` होता है और आम तौर पर तब अच्छा काम करता है जब truncation type `end` हो
    लेकिन दूसरी truncations में यह LLM के लिए भ्रमित कर सकता है; ऐसे मामलों में मैं कुछ explicit recommend करता हूँ
    जैसे: `contexo --line-maxchars "max:100,cut:middle,mark:...[TRUNCATED]..."`
* उदाहरण:
    ```bash
    contexo \
        --line-maxchars "max:200,cut:middle" \
        --file-maxlines "max:500,cut:end" \
        --file-maxchars "max:3000" \
        --stdout-maxlines 2000
    ```
* Extras:
    - `--stdout-maxlines` और `--stdout-maxchars` सिर्फ आखिर में truncate कर सकते हैं
      `end`, क्योंकि आगे देखी जाने वाली pagination logic के साथ कुछ और compatible नहीं होगा
    - `--stdout-maxlines` और `--stdout-maxchars` mutually exclusive हैं
    - `--page-lines` के लिए `--stdout-maxlines` चाहिए
    - `--page-char` के लिए `--stdout-maxchars` चाहिए
    - `--limit-files`: scan की जाने वाली files की अधिकतम संख्या सीमित करता है
    - `--limit-nested`: recursive scan (depth) सीमित करता है
    - `mark` की लंबाई भी limit निकालने में गिनी जाती है
    - यह README हमेशा flags के मौजूदा canonical names का उपयोग करती है
* chars और lines की limits क्यों?
    बहुत सा LLM software हर तरह की fixed limits रखता है ताकि
    बहुत ज़्यादा tokens खर्च न हों या providers की failures से बचा जा सके।
    इसलिए वे characters और/या lines की संख्या से limit कर सकते हैं।
    इसी वजह से `ConteXo` तुम्हें एक या दूसरे limit type के साथ काम करने देता है
    उस environment के हिसाब से जहां यह चल रहा है।
    उदाहरण के लिए, `opencode` में (इस README के लिखे जाने तक)
    हर `tool execute` की limit आम तौर पर `2000` fixed, non-configurable lines होती है
    वे code में hardcoded हैं, लेकिन अच्छी बात यह है कि agents इस limit से वाकिफ़ होते हैं
    क्योंकि `opencode` उन्हें यह अंदरूनी रूप से बताता है
    इसलिए इस खास मामले में `--stdout-maxlines` के साथ काम करना ज़्यादा उपयोगी है।

## Paginacion

Pagination के 2 versions हैं और हर execution में तुम्हें सिर्फ एक ही इस्तेमाल करना चाहिए:

- `--page-lines <number>`: जब `--stdout-maxlines` सक्रिय हो, तो page बदलता है
- `--page-char <number>`: जब `--stdout-maxchars` सक्रिय हो, तो page बदलता है

Pagination तभी काम करती है जब total limit सक्रिय हो और वह limit पार हो जाए।
जब ऐसा होता है, `ConteXo` उपलब्ध budget के भीतर `...bylines:[page 1/2]`
या `...bychars:[page 1/2]` जैसे markers जोड़ता है,
और साथ ही `stderr` पर यह भी बताता है कि एक से ज़्यादा pages मौजूद हैं।
अगर तुम out-of-range page मांगते हो, तो यह आख़िरी page दिखाएगा और warning emit करेगा।

* Ejemplo:
मान लो कि तुम्हारा LLM software तुम्हें 1000 characters से लंबा message भेजने नहीं देता
(जो बहुत खराब है), तब:
पहले तुम `contexo --summary` चला सकते हो ताकि पता चले कि तुम्हारा context कितने characters लेता है,
मान लो वह 1500 है, तो तुम कुछ ऐसा कर सकते हो:
`contexo --stdout-maxchars 750 --page-char 1` और output copy करो।
उसे paste करो और अपने LLM से कहो (यह 2 में से page 1 है, अभी दूसरी भेजता हूँ)
`contexo --stdout-maxchars 750 --page-char 2` copy करो, paste करो, अपना सवाल पूछो, सब खुश!

# FAQ

* `ConteXo` क्या सिर्फ पूरे project के लिए है?
| नहीं! तुम जो path चाहो दे सकते हो; बल्कि किसी LLM से कहना अच्छी बात है
| कि वह इस tool के साथ कुछ खास folders explore करे
| `contexo <path>`
| या उस path के अंदर भी `--pattern "src/**/*.ts"` से filter करे

* `ConteXo` क्या सिर्फ code projects के लिए है?
| नहीं, लेकिन यह मुख्य रूप से उसी के लिए बनाया गया है
| फिर भी मुझे लगता है कि non-code projects के साथ असंगत होने वाली एकमात्र feature
| `--clean comments` है (code comments साफ़ करना)

* क्या token consumption के मामले में `ConteXo` दूसरी tools से बेहतर है?
| यह task, project (context), और तुम कौन-सा software इस्तेमाल करते हो, इस पर निर्भर करता है
| जब software agents को सही `tools` देता है
| तब अक्सर LLM सिर्फ वही जानकारी ढूंढते हैं जो उन्हें चाहिए
| और consumed tokens, तुम्हारा पूरा code copy करने की तुलना में, काफ़ी कम होते हैं
| लेकिन लंबे sessions या बड़े projects में
| files की यही exploration, क्योंकि यह LLM के फैसलों पर निर्भर होती है,
| बहुत सारे thinking tokens खा सकती है
| `ConteXo` को replacement नहीं, बल्कि complement की तरह देखना चाहिए
| कभी-कभी task सरल होता है और files आसानी से मिल जाती हैं और पर्याप्त जानकारी दे देती हैं
| लेकिन अगर तुम्हें पूरे project को शामिल करने वाला बड़ा काम करना है
| तो LLM को यह सोचने की मेहनत बचाना बेहतर है कि आखिर क्या करना है और कहां जाना है
| बस उसे पूरा `ConteXo` दे दो और काम खत्म...

# टिप्पणियाँ / Errata:
कुछ चीज़ें ऐसी हैं जिनके बारे में मुझे पता नहीं है और जिनका behavior मैंने test नहीं किया है।
* मैंने बड़े projects पर test किया है, लेकिन अंदरूनी कामकाज को देखकर लगता है कि
  किसी बिंदु पर पूरा `STDOUT` RAM में पूरी तरह मौजूद हो जाता है,
  इसलिए सिद्धांततः बड़े projects में memory खत्म हो जानी चाहिए, लेकिन हैरानी की बात है कि ऐसा मेरे साथ नहीं हुआ; सच कहूं तो मैंने इस पर काफ़ी नहीं सोचा,
  शायद `Bun` उम्मीद से ज़्यादा जादू कर रहा है या फिर मैंने इतना बड़ा project test ही नहीं किया
* Encoder कुछ computers पर भारी पड़ सकता है; सावधानी से इस्तेमाल करो
* आज CLI पहले से ही `--stdout-maxlines` और `--stdout-maxchars` को साथ मिलाने से मना करता है,
  और साथ ही `--page-lines` / `--page-char` को उनकी corresponding limit चाहिए
* `ConteXo` में default limits configured नहीं हैं, इसलिए अगर तुम्हारा `LLM`
  बस बिना options के command चला दे, तो यह अपना `context length` भर सकता है
* Linux अब भी सबसे ज़्यादा test किया गया है; मैं Windows और macOS के लिए releases बनाता हूँ,
  लेकिन उन्हें Linux जितना validate नहीं किया है

# भविष्य की फीचर्स (TODO):
_`[ ]` का मतलब है कि मैं यह करूंगा, और `[?]` का मतलब है "पता नहीं xD"_

- [ ] Toonify:
| token बचाने के लिए `JSON` जैसे Data Formats को `TOON` files में बदलना
| (ज़ाहिर है, LLM को इस बदलाव की जानकारी देते हुए)

- [ ] Skills:
| ऐसे Skills जोड़ना ताकि कोई भी agent इस tool का इस्तेमाल कर सके

- [?] Treesitter:
| पता नहीं मुझे यह idea पसंद है या नहीं...
| लेकिन पूरे project का Treesitter schema पास करना दिलचस्प होगा
| सिद्धांत रूप में यह कम tokens लेगा और project का अच्छा general context देगा
| लेकिन मैंने देखा कि Treesitters के साथ काम करना developer के लिए उतना सुखद नहीं होता
| (ummm... एक slave LLM के लिए perfect काम)

- [?] LSP:
| * files में LSP messages जोड़ना
| * LSP द्वारा दिए गए definitions और symbols का इस्तेमाल करना
| * user द्वारा flags से चुने गए symbols पर artificial तरीके से `lsp-hover` इस्तेमाल करना
