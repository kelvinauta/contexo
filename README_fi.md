# ConteXo
> CLI, jolla voit heittää kaiken koodisi suoraan LLM:n naamaan.

*ConteXo* sylkee kaiken koodisi `STDOUT`:iin, nimenomaan niin että LLM voi lukea sen.
Siinä on useita tekstin hallinta-asetuksia, jotta et tuki LLM:ääsi tokeneilla.
Tämä työkalu on hyödyllinen etenkin silloin, kun et halua mitään säätöä ja haluat vain antaa
koko koodisi LLM:lle yhdellä kertaa.

# MIKSI?

Mielestäni monet "koodin tutkimiseen" tarkoitetut kontekstityökalut päätyvät
ylisuunnitteluksi, ja lisäksi kaikkeen LLM-ohjelmistoon ei ole integroitu hyviä työkaluja
tätä varten. Miksei vain KOPIOIDA ja LIITETÄ koko koodia polkuineen ja siinä kaikki?
se on käytännössä `ConteXo`:a, jotta voit kopioida ja liittää, tai voit pyytää LLM:ää käyttämään `bash`-työkalua
(joka nykyään löytyy monista) tämän komennon ajamiseen

> katso FAQ:sta onko `ConteXo` parempi kuin muut työkalut

# Visual Example
> Tämä on vain havainnollistava esimerkki
> (ilmiselvästi marginaaleja ja muita koristeita ei oikeasti ole)

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

# Ominaisuudet

* LLM-ystävällinen:
    CLI on tehty antamaan LLM:lle sen tarvitsema tieto ilman oletusta, että LLM tuntee tämän CLI:n.
    Se antaa oletuksena kaiken tarvittavan, kuten:
    absoluuttiset ja suhteelliset polut, hyödyllisen yleiskuvan relevanteista ignoreista ja lukuvirheistä,
    varoituksia ja lisätietoa jne...
* Summary:
    normaali tuloste sisältää jo summary-osiot alussa.
    `--summary`:lla saat tiivistetyn/visuaalisen näkymän ilman contextia tai skippedlistiä.
    hyödylliset statsit:
    - lopullisen kanonisen outputin rivien ja merkkien määrä suodatusten ja katkaisujen jälkeen
      (ennen sivutusta)
    - top-hakemistot, joissa on eniten tiedostoja
    - top-pisimmät tiedostot riveissä ja merkeissä
    - longest lines
    - jos käytät `--compare-model`, myös likimääräiset `tokens`, `usage` ja `cost usd`
* Granulaarinen katkaisu:
    voit katkaista jokaisen rivin, tiedoston tai koko `stdout`in erikseen
    käyttäen kanonisia lippuja `--line-maxchars`, `--file-maxlines`, `--file-maxchars`,
    `--stdout-maxlines` ja `--stdout-maxchars`
    kuvaava esimerkki:
        "_katkaise mikä tahansa rivi, joka ylittää 100 merkkiä, ja katkaise yli 200 rivin tiedostot, ja lisäksi ettei tiedosto ylitä 3000 merkkiä, ja lisäksi ettei kokonaisuus ylitä 100000 merkkiä_"
* Clean: voit jättää pois välilyöntejä, tyhjiä rivejä ja koodikommentteja.
* Sivutus:
    Voit sivuttaa, jos asetit `stdout`in kokonaisrajan riveillä tai merkeillä.
    `--stdout-maxlines` ja `--stdout-maxchars` sulkevat toisensa pois.
    Jos LLM itse suorittaa `ConteXo`n, sille kerrotaan että sivuja on lisää.
    Tämä on hyödyllistä, koska useimmissa LLM-ohjelmistoissa on rajoja riveille tai merkeille
    jokaisessa `tool execution`:ssa
* Control Files:
    `.gitignore`- ja `.ignore`-tiedostojen automaattinen ja rekursiivinen luku (poistettavissa `--disable-ignorefile`:lla).
    Liput kansioiden tai tiedostojen ohittamiseen (`--ignore`), regexillä ohittamiseen (`--ignore-regex`)
    ja root-relative glob-suodatukseen (`--pattern`).
    `skippedlist` yrittää antaa lyhyen ja uskollisen yleiskuvan: näyttää ignorefilen ignoret,
    `--ignore`:n oikeasti ohittamat merkinnät, `--ignore-regex`:n osumien yhteenvedot
    ja muodollisen huomautuksen kun `--pattern` sulkee pois polkuja, jotka eivät matchaa.
    Vaihtoehdot symbolic linkien ja mountien seuraamiseen (ympyröiden esto) tai olemaan seuraamatta niitä
* Number Line:
    `--number-line` (`-n`) lisää jokaisen emittoidun rivin eteen sen rivinumeron.
* Encoding ja vertailu malleihin
    Käyttää `anomalyco/models.dev`:iä (paikallisesti) verratakseen tokeneita ajantasaisiin malleihin
    ja laskeakseen kuinka suuren osan konteksti-ikkunasta `kontekstisi` "painaa" ja mitä se maksaa suunnilleen.

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

# Käyttöopas

Tämä opas vain selventää tietoa, jota ei ole `--help`:ssä
> Pikaopas: `contexo --help`

## Summary

Suosittelen aina aloittamaan `--summary`:lla, koska näin voit säätää välitettävää kontekstia.
def: `contexo [<path>] --summary [...options]`
```bash
# examples
contexo --summary
contexo some/path --summary
contexo some/path --summary --ignore some/dir --ignore other/dir
```

Normaali tuloste sisältää jo summaryn alussa; `--summary` vain vaihtaa
tiivistelmä-/visuaalitilaan ja piilottaa `context` + `skippedlist`.
Jos haluat vain piilottaa summaryn, käytä `--nosummary` tai `--hide summary`.
Jos haluat jättää näkyviin vain contextin, yleensä haluat `--hide summary,skippedlist`.

`summary` lasketaan aina kaikkien asetusten lopussa, joten
sen avulla näet paljonko syötät LLM:lle ennen kuin teet sen.

> Vinkki: jos LLM on tietoinen omista rajoistaan (kuten `anomalyco/opencode`:ssa), sama `LLM` voi etsiä optimaalisen asetuksensa.

Esimerkkituloste:
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
Kuten näkyy, tämä komento antaa hyödyllistä tietoa projektimme kokonais-"painosta"
ja antaa vihjeitä siitä, mitkä tiedostot voivat olla liian raskaita.
tässä esimerkissä `scc-data/graphql.graphql` sisältää yli miljoona merkkiä; jos se ei ole arvokas tiedosto,
voimme päättää ohittaa sen.
Jos ajaisimme uudestaan `contexo --summary --ignore scc-data/graphql.graphql`, saatu laskelma
tehtäisiin ilman kyseistä tiedostoa

> Jos käytät lisäksi `--compare-model`, näkyviin tulee myös `ENCODING`-osio
> jossa on likimääräiset tokenit, context, usage ja cost.

## Clean
usein on hyödyllistä ajaa `contexo --clean all`; tämä siivoaa sekä:
- toistuvat välilyönnit (kaksoisvälit ja säilyttää sisennyksen)
- tyhjät rivit `^\s*$`
- koodikommentit (lohko- ja rivikommentit)
Silti voi olla että et halua poistaa kommentteja;
esimerkiksi typescriptissä monissa lohkokommenteissa on arvokasta tietoa `ts-doc`:in takia,
joten voi olla että haluat poistaa rivikommentit mutta et lohkokommentteja
silloin voit: `--clean "blankline,spaceunless,comments:line"`
tästä huolimatta `--clean all` ja `--clean "blankline,spaceunless,comments:line,comments:block"` ovat täsmälleen sama asia

## Suodatus ja ignoret

`ConteXo` voi leikata todella paljon kohinaa ennen kuin se emittoi kontekstin:

- `--pattern`: suodattaa root-relative globilla. Voidaan toistaa ja voi myös ottaa CSV:tä.
- `--ignore`: lisää eksplisiittisiä ignoreja.
- `--ignore-regex`: lisää regex-ignoreja.
- `.gitignore` ja `.ignore`: niitä sovelletaan automaattisesti ja rekursiivisesti alipuittain.
- `--disable-ignorefile`: poistaa `.gitignore` / `.ignore` -luvun käytöstä.

Esimerkkejä:
```bash
contexo . --pattern "src/**/*.ts"
contexo . --pattern "src/**/*.ts" --pattern "scripts/*.ts,src/*.py"
contexo . --ignore dist --ignore node_modules
contexo . --ignore-regex "\\.min\\.(js|css)$"
```

## Models
Jos haluat verrata tulostetta mallin `price per 1M token`-hintaan ja `context length`:iin
voit käyttää `contexo --models`; tämä antaa listan saatavilla olevista malleista,
joita `anomalyco/models.dev` tarjoaa, muodossa `provider/model`
Voit myös suodattaa suoraan providerin mukaan:
`contexo --models openai`

Kanoninen lippu vertailuun on `--compare-model`.
Nyt jos haluat verrata koko kontekstiasi malliin, ajat:
`contexo --summary --compare-model "openai/gpt-4o"`

Esimerkkituloste (osio):
```
  ENCODING
    encoder      o200k_base
    compare      openai/gpt-4o
    tokens       ~4_365
    context      128_000
    usage        ~3.41%
    cost usd     ~0.010913
```
> `ENCODING`-osio näkyy vain, kun käytät `--compare-model <provider>/<model>`
> Encoderista (tokenoinnista vastaava) voit vaihtaa sen `--enc`:llä
> mutta kun annat sen eksplisiittisesti, se vaatii `--compare-model` tai `--model`
> On tärkeää ymmärtää, että käytetään vain open source -encodereita, joten lasketut tokenit ovat vain arvio.
> `--model` on yhä olemassa yhteensopivuusaliaksena, mutta dokumentaatio käyttää `--compare-model`.
* Sisäinen toiminta:
vain että tiedät, jotta tämä toimii paikallisesti, komento ensimmäisellä ajolla
kloonaa: `github.com/anomalyco/models.dev` hakemistoon `/tmp/contexo-models-cache/`
yrittää päivittää jos olemassa oleva repo on yli 24 tuntia vanha

## Rajat
Tämä voi olla hämmentävää, joten selitän sen.
On olemassa 3 `scopea`; jokaiseen `scopeen` voidaan asettaa raja ja katkaisutyyppi.
* scopet
    ovat elementit, joita voit katkaista (jokainen scope erikseen ja omilla säännöillään)
    línea: `--line-maxchars`
    file: `--file-maxlines` ja `--file-maxchars`
    stdout: `--stdout-maxlines` ja `--stdout-maxchars`
    jokainen scope hyväksyy numeron tai `TRUNCOPTS`:n muodossa `max:N[,cut:mode][,mark:text]`
* katkaisutyypit
    ne ovat `start`, `middle` ja `end` (oletus)
    tämä tarkoittaa mistä kohtaa katkaistaan.
    visuaaliset esimerkit:
    - start  : `...cate in start`
    - middle : `trun... in middle`
    - end    : `truncate in e...`
    `middle` on äärimmäisen hyödyllinen riveillä.
    koska se säilyttää alun ja lopun kontekstin, joissa usein
    on hyödyllistä tietoa
* mark
    Globaali `--mark` on ERITTÄIN tärkeä; se kertoo LLM:lle että jotain on katkaistu.
    Voit myös määrittää `mark:`-asetuksen tietyn scopen `TRUNCOPTS`:n sisällä.
    oletuksena se on `...` ja yleensä toimii hyvin kun katkaisutyyppi on `end`
    mutta muissa katkaisuissa se voi hämmentää LLM:ää, silloin suosittelen jotain eksplisiittistä
    kuten: `contexo --line-maxchars "max:100,cut:middle,mark:...[TRUNCATED]..."`
* Esimerkkejä:
    ```bash
    contexo \
        --line-maxchars "max:200,cut:middle" \
        --file-maxlines "max:500,cut:end" \
        --file-maxchars "max:3000" \
        --stdout-maxlines 2000
    ```
* Extras:
    - `--stdout-maxlines` ja `--stdout-maxchars` voivat katkaista vain lopusta
      `end`, koska muuten se olisi yhteensopimaton sivutuslogiikan kanssa, jonka näemme myöhemmin
    - `--stdout-maxlines` ja `--stdout-maxchars` sulkevat toisensa pois
    - `--page-lines` vaatii `--stdout-maxlines`
    - `--page-char` vaatii `--stdout-maxchars`
    - `--limit-files`: rajoittaa korkeintaan skannattavien tiedostojen määrää
    - `--limit-nested`: rajoittaa rekursiivista skannausta (syvyys)
    - myös `mark`:n pituus lasketaan mukaan rajaa muodostettaessa
    - tämä README käyttää aina lippujen nykyisiä kanonisia nimiä
* miksi chars- ja lines-rajat?
    paljon LLM-ohjelmistoa käyttää kaikenlaisia kiinteitä rajoja hallitakseen
    ettei syötetä liikaa tokeneita tai vältetään providerien virheitä.
    siksi ne voivat rajoittaa merkkien ja/tai rivien määrää.
    juuri siksi `ConteXo` antaa sinun työskennellä joko yhden tai toisen rajan kanssa
    riippuen ympäristöstä, jossa sitä suoritetaan.
    Esimerkiksi `opencode`:ssa (tämän README:n kirjoitushetkellä)
    jokaisen `tool execute`:n raja on yleensä `2000` kiinteää EI-KONFIGUROITAVAA riviä
    ne on kovakoodattu lähdekoodiin, vaikka hyvä puoli on että agentit ovat tietoisia
    tästä rajasta koska `opencode` kertoo siitä niille sisäisesti
    Siksi juuri tässä tapauksessa on hyödyllisempää käyttää `--stdout-maxlines`:a.

## Sivutus

Sivutuksesta on 2 versiota ja per suoritus sinun tulee käyttää vain yhtä:

- `--page-lines <number>`: vaihtaa sivua kun `--stdout-maxlines` on aktivoitu
- `--page-char <number>`: vaihtaa sivua kun `--stdout-maxchars` on aktivoitu

Sivutukset toimivat vain kun kokonaisraja on aktivoitu ja tuo raja ylittyy.
Kun niin tapahtuu, `ConteXo` lisää merkintöjä kuten `...bylines:[page 1/2]`
tai `...bychars:[page 1/2]` käytettävissä olevan budjetin sisään,
ja lisäksi ilmoittaa `stderr`:in kautta että sivuja on enemmän kuin yksi.
Jos pyydät sivun alueen ulkopuolelta, se näyttää viimeisen ja emittoi warningin.

* Esimerkki:
Oletetaan että käyttämäsi LLM-ohjelmisto ei anna lähettää yli 1000 merkin viestiä
(mikä on ihan perseestä), silloin:
ensin voit ajaa `contexo --summary` tietääksesi kuinka monta merkkiä kontekstisi vie,
oletetaan että se on 1500, silloin voit tehdä jotain kuten:
`contexo --stdout-maxchars 750 --page-char 1` ja kopioida tulosteen.
Liittää sen ja sanoa LLM:llesi (Tämä on sivu 1/2, lähetän heti toisen)
`contexo --stdout-maxchars 750 --page-char 2` kopioit, liität, kysyt kysymyksesi, kaikki onnellisia!

# FAQ

* Onko `ConteXo` vain koko projektia varten?
| Ei! voit antaa minkä polun haluat, itse asiassa on hyvä idea pyytää LLM:ää
| tutkimaan tällä työkalulla tiettyjä kansioita
| `contexo <path>`
| tai jopa suodattamaan tuon polun sisällä `--pattern "src/**/*.ts"`

* Onko `ConteXo` vain koodiprojekteille?
| Ei, mutta se on suunniteltu pääasiassa sitä varten
| Silti uskon että ainoa ominaisuus, joka on yhteensopimaton
| ei-koodiprojektien kanssa, on `--clean comments` (koodikommenttien siivous)

* Onko `ConteXo` tokenkulutuksessa parempi kuin muut työkalut?
| Riippuu tehtävästä, projektista (kontekstista) ja käyttämästäsi ohjelmistosta
| kun ohjelmisto antaa agenteille oikeat `tools`
| usein LLM:t etsivät vain tarvitsemansa tiedon
| ja kulutetut tokenit ovat merkittävästi pienemmät kuin KAIKEN koodisi kopioiminen
| mutta pitkissä sessioissa tai isoissa projekteissa
| tämä sama tiedostojen tutkiminen, koska se on LLM:ien päätös
| voi kuluttaa paljon ajattelutokeneita
| `ConteXo`:a ei pidä nähdä korvaajana vaan täydentäjänä
| Joskus tehtävä on yksinkertainen ja tiedostot on helppo löytää ja ne antavat riittävästi tietoa
| Mutta jos aiot työstää suurta tehtävää, joka koskee koko projektia
| On kätevämpää säästää LLM:ltä vaiva miettiä mitä ihmettä tehdä ja minne mennä
| ja vain antaa sille koko `ConteXo` ja siinä kaikki...

# Erratat:
On asioita, joita en tiedä enkä ole testannut niiden toimintaa.
* Olen testannut isoissa projekteissa, mutta sen perusteella miten tämä toimii sisällä näyttää siltä että
  koko `STDOUT` on jossain vaiheessa kokonaan RAM:ssa,
  joten teoriassa muistin pitäisi kuolla isoissa projekteissa,
  mutta yllättäen niin ei ole käynyt, en oikeastaan ole
  miettinyt sitä tarpeeksi, ehkä `Bun` tekee enemmän taikuutta kuin
  odotin tai sitten en vain testannut tarpeeksi isolla projektilla
* Encoder on raskas joillekin tietokoneille, käytä varoen
* Nykyään CLI jo estää `--stdout-maxlines` ja `--stdout-maxchars` sekoittamisen,
  ja lisäksi `--page-lines` / `--page-char` vaativat vastaavan rajansa
* `ConteXo`:lla ei ole oletusrajoja asetettuna, joten jos `LLM`:si
  vain päättää suorittaa komennon sellaisenaan ilman optioita, se voi täyttää oman `context length`:nsä
* Linux on yhä testatuin; teen releaset Windowsille ja macOS:lle,
  mutta en ole validoinut niitä yhtä paljon kuin Linuxia

# Tulevat ominaisuudet (TODO):
_`[ ]` tarkoittaa että teen sen, `[?]` tarkoittaa "en tiedä xD"_

- [ ] Toonify:
| Muuntaa dataformaatit kuten `JSON` `TOON`-tiedostoiksi tokenien säästämiseksi
| (tietenkin kertomalla LLM:lle tästä muutoksesta)

- [ ] Skills:
| Lisää Skillsit jotta mikä tahansa agentti voi käyttää tätä työkalua

- [?] Treesitter:
| En tiedä pidänkö ideasta...
| Mutta olisi kiinnostavaa voida syöttää sille koko projektin Treesitter-skeema
| Teoriassa sen pitäisi kuluttaa vähän tokeneita ja antaa hyvä yleiskonteksti projektista
| Mutta näin että Treesittereiden kanssa työskentely ei ole kehittäjälle kovin miellyttävää
| (ummm... täydellinen työ orja-LLM:lle)

- [?] LSP:
| * Liittää LSP-viestit tiedostoihin
| * Käyttää LSP:n tarjoamia määritelmiä ja symboleja
| * Käyttää keinotekoisesti `lsp-hover`:ia käyttäjän lippujen valitsemissa symboleissa
