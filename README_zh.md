# ConteXo
> 一个把你全部代码直接甩给 LLM 的 CLI。

*ConteXo* 会通过 STDOUT 吐出你的全部代码，专门为让 LLM 读取而设计。
它提供多种文本控制配置，避免你的 LLM 被 token 撑爆。
这个工具尤其适合你不想折腾，只想一次性把
全部代码都交给 LLM 的场景。

# 为什么？

我觉得很多为了获取上下文而做的“代码探索”项目，最后都会变成
过度工程，而且不是所有带 LLM 的软件都内置了适合做这件事的好工具。
为什么不干脆把所有代码连同路径一起 COPY 和 PASTE 过去就完了？
这基本就是 `ConteXo`，让你直接复制粘贴，或者让 LLM 使用 `bash`
这个 tool（现在很多都有）来执行这个命令。

> 看 FAQ，了解 `ConteXo` 和其他工具相比是否更适合你

# 可视化示例
> 这只是一个示意例子
> （显然这些边距和其他装饰并不存在）

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

# 特性

* LLM 友好：
    这个 CLI 的目标，是在不假设 LLM 知道这款 CLI 存在的前提下，
    直接把它需要的信息给到它。
    默认会附带一切必要内容，例如：
    绝对路径和相对路径、有关 ignore 的有用概览、读取错误、
    警告和额外信息等……
* Summary：
    普通输出本身就会在开头包含 summary 部分。
    使用 `--summary` 会得到简化/可视化视图，不含 context 或 skippedlist。
    有用的统计：
    - 经过过滤和截断后的最终规范输出的行数与字符数
      （分页前）
    - 文件数最多的顶级目录
    - 按行数和字符数统计最长的文件
    - 最长的行
    - 如果使用 `--compare-model`，还会显示近似的 `tokens`、`usage` 和 `cost usd`
* 细粒度截断：
    你可以分别截断每一行、每个文件，或总 `stdout`
    使用规范 flags `--line-maxchars`、`--file-maxlines`、`--file-maxchars`、
    `--stdout-maxlines` 和 `--stdout-maxchars`
    描述性示例：
        “_截断任何超过 100 个字符的行，再截断超过 200 行的文件，并且文件也不能超过 3000 个字符，另外总输出也不能超过 100000 个字符_”
* Clean：你可以省略空白、空行和代码注释。
* 分页：
    如果你为总 `stdout` 设置了按行数或字符数的总限制，就可以分页。
    `--stdout-maxlines` 和 `--stdout-maxchars` 互斥。
    如果由 LLM 来执行 `ConteXo`，它会被告知还有更多页。
    这很有用，因为大多数 LLM 软件在每次 `tool execution`
    都有按行数或字符数的限制。
* Control Files：
    自动递归读取 `.gitignore` 和 `.ignore`（可用 `--disable-ignorefile` 关闭）。
    提供忽略目录或文件的 flags（`--ignore`）、按 regex 忽略（`--ignore-regex`）
    以及按 root-relative glob 过滤（`--pattern`）。
    `skippedlist` 会尽量提供简短且忠实的概览：显示来自 ignorefiles 的忽略项、
    被 `--ignore` 实际忽略的条目、`--ignore-regex` 匹配结果的摘要，
    以及当 `--pattern` 排除未匹配路径时的正式提示。
    也可选择跟随 symbolic links 和 mounts（带循环防护），或不跟随它们
* Number Line：
    `--number-line` (`-n`) 会给每一行输出加上线号前缀。
* Encoding 和与模型比较
    使用 `anomalyco/models.dev`（本地）与更新后的模型比较 token，
    这样你就能估算你的 `context` 占用了多少上下文窗口，以及大概要花多少钱。

# 安装

> 目前 Linux 测试最多，但 release 也会生成 macOS 和 Windows 的二进制文件。
* 在 `Releases` 中下载预编译二进制文件
linux 示例：
```bash
curl -fsSL "https://github.com/kelvinauta/ConteXo/releases/latest/download/contexo-linux-x64" -o "$HOME/.local/bin/contexo" && chmod +x "$HOME/.local/bin/contexo"
```
* 从源码编译
克隆这个仓库，安装依赖，并用 Bun 编译。
> targets 见：https://bun.com/docs/bundler/executables#supported-targets
示例：
```bash
bun install
bun run build:binary -- --target bun-linux-x64
install -m 755 ./contexo /usr/local/bin/contexo
```

如果你想生成带 checksums 的 release 资产：
```bash
bun run build:release
```

如果你正在改这个项目，想快速验证当前测试集：
```bash
bun run test:low
bun run test:medium
bun run test:high
```

# 使用指南

这份指南只说明 `--help` 里没有写到的信息
> 快速指南请用 `contexo --help`

## Summary

我建议总是先用 `--summary`，因为这能让你配置自己要传给 LLM 的上下文。
定义：`contexo [<path>] --summary [...options]`
```bash
# examples
contexo --summary
contexo some/path --summary
contexo some/path --summary --ignore some/dir --ignore other/dir
```
普通输出本身已经在开头包含 summary；`--summary` 只是切换到
简化/可视化模式，并隐藏 `context` + `skippedlist`。
如果你只想隐藏 summary，用 `--nosummary` 或 `--hide summary`。
如果你只想保留 context，通常会想用 `--hide summary,skippedlist`。

`summary` 总是在所有配置都完成后才计算，所以
它能让你在真正发送给 LLM 之前先看到会传多少内容。

> Tip: 如果 LLM 能感知自己的限制（比如 `anomalyco/opencode`），`LLM` 自己就能找到最优配置。

输出示例：
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
可以看到，这个命令会给出项目整体“重量”的有用信息，
也会提示哪些文件可能太重了。
在这个例子里，`scc-data/graphql.graphql` 有超过一百万个字符，如果它不是有价值的文件，
我们就可以选择忽略它。
如果再次执行 `contexo --summary --ignore scc-data/graphql.graphql`，
得到的计算结果就不会再把这个文件算进去。

> 如果你同时使用 `--compare-model`，还会出现 `ENCODING` 部分
> 显示近似的 tokens、context、usage 和 cost。

## Clean
经常执行 `contexo --clean all` 很有用；这会清理掉：
- 重复空白（双空格，并保留缩进）
- 空行 `^\s*$`
- 代码注释（块注释和行内注释）
不过你可能不想删掉注释；
例如在 typescript 中，很多块注释因为使用 `ts-doc` 会带有有价值的信息，
所以你可能想去掉行内注释，但保留块注释
那么你可以这样：`--clean "blankline,spaceunless,comments:line"`
也就是说，`--clean all` 和 `--clean "blankline,spaceunless,comments:line,comments:block"` 完全一样

## 过滤与忽略

`ConteXo` 在输出上下文前可以大幅裁掉噪音：

- `--pattern`：按 root-relative glob 过滤。可重复，也可接受 CSV。
- `--ignore`：添加显式忽略项。
- `--ignore-regex`：添加 regex 忽略项。
- `.gitignore` 和 `.ignore`：会自动按子树递归应用。
- `--disable-ignorefile`：禁用读取 `.gitignore` / `.ignore`。

示例：
```bash
contexo . --pattern "src/**/*.ts"
contexo . --pattern "src/**/*.ts" --pattern "scripts/*.ts,src/*.py"
contexo . --ignore dist --ignore node_modules
contexo . --ignore-regex "\\.min\\.(js|css)$"
```

## Models
如果你想把输出与某个模型的 `price per 1M token` 和 `context length` 比较，
可以使用 `contexo --models`；这会列出 `anomalyco/models.dev` 提供的可用模型，
格式为 `provider/model`
你也可以直接按 provider 过滤：
`contexo --models openai`

用于比较的规范 flag 是 `--compare-model`。
现在要把你的总上下文与某个模型比较，执行：
`contexo --summary --compare-model "openai/gpt-4o"`

输出示例（片段）：
```
  ENCODING
    encoder      o200k_base
    compare      openai/gpt-4o
    tokens       ~4_365
    context      128_000
    usage        ~3.41%
    cost usd     ~0.010913
```
> `ENCODING` 部分只会在使用 `--compare-model <provider>/<model>` 时出现
> 关于 encoder（负责 tokenization 的组件），你可以用 `--enc` 修改
> 但显式传入时需要 `--compare-model` 或 `--model`
> 要理解的一点是这里只使用开源 encoder，因此计算出的 token 只是近似值。
> `--model` 仍然作为兼容 alias 存在，但文档使用的是 `--compare-model`。
* 内部行为：
只是让你知道一下，为了能在本地工作，这个命令在第一次执行时会
克隆：`github.com/anomalyco/models.dev` 到 `/tmp/contexo-models-cache/`
如果现有仓库已超过 24 小时，会尝试更新

## 限制
这部分可能会让人困惑，所以我来解释一下。
存在 3 个 `scopes`；每个 `scope` 都可以应用一个限制和一种截断类型。
* scopes
    它们是你可以截断的对象（每个 scope 独立，并有自己的规则）
    line：`--line-maxchars`
    file：`--file-maxlines` 和 `--file-maxchars`
    stdout：`--stdout-maxlines` 和 `--stdout-maxchars`
    每个 scope 都接受一个数字，或形如 `max:N[,cut:mode][,mark:text]` 的 `TRUNCOPTS`
* 截断类型
    分别是 `start`、`middle` 和 `end`（默认）
    这表示会在哪里截断。
    视觉示例：
    - start  : `...cate in start`
    - middle : `trun... in middle`
    - end    : `truncate in e...`
    `middle` 在线这一层面特别有用。
    因为它会保留开头和结尾的上下文，而很多时候
    有用的信息就在这两端
* mark
    全局 `--mark` 非常重要；它能让 LLM 知道某些内容被截断了。
    你也可以在某个具体 scope 的 `TRUNCOPTS` 里定义 `mark:`。
    默认是 `...`，在截断类型为 `end` 时通常效果不错
    但在其他截断方式下可能会让 LLM 困惑，这种情况下我推荐使用更明确的标记
    例如：`contexo --line-maxchars "max:100,cut:middle,mark:...[TRUNCATED]..."`
* 示例：
    ```bash
    contexo \
        --line-maxchars "max:200,cut:middle" \
        --file-maxlines "max:500,cut:end" \
        --file-maxchars "max:3000" \
        --stdout-maxlines 2000
    ```
* Extras：
    - `--stdout-maxlines` 和 `--stdout-maxchars` 只能在末尾截断
      即 `end`，因为否则会和后面要讲的分页逻辑不兼容
    - `--stdout-maxlines` 和 `--stdout-maxchars` 互斥
    - `--page-lines` 需要 `--stdout-maxlines`
    - `--page-char` 需要 `--stdout-maxchars`
    - `--limit-files`：限制最多扫描多少文件
    - `--limit-nested`：限制递归扫描深度
    - `mark` 的长度也会计入限制
    - 这个 README 始终使用当前规范的 flags 名称
* 为什么同时有 chars 和 lines 限制？
    很多 LLM 软件都有各种固定限制，用来控制
    不要吃掉太多 token，或者避免 provider 出错。
    所以它们可能按字符数和/或按行数限制。
    这就是为什么 `ConteXo` 允许你使用一种或另一种限制
    取决于它运行的环境。
    例如，在 `opencode` 中（截至这份 README 编写时）
    每次 `tool execute` 的限制通常是固定的 `2000` 行，而且不可配置
    它们被硬编码在代码里，不过好处是 agents 知道
    这个限制，因为 `opencode` 会在内部告诉它们
    所以在这个具体场景下，使用 `--stdout-maxlines` 会更有用。

## 分页

分页有 2 个版本，每次执行只该使用其中一个：

- `--page-lines <number>`：当启用 `--stdout-maxlines` 时切换页面
- `--page-char <number>`：当启用 `--stdout-maxchars` 时切换页面

分页只有在启用了总限制并且真的超出该限制时才有作用。
发生这种情况时，`ConteXo` 会在可用预算内加入诸如 `...bylines:[page 1/2]`
或 `...bychars:[page 1/2]` 这样的标记，
另外还会通过 `stderr` 提醒存在不止一页。
如果你请求超出范围的页码，它会显示最后一页并发出 warning。

* 示例：
假设你使用的 LLM 软件不允许发送超过 1000 个字符的消息
（这就挺坑的），那么：
首先你可以执行 `contexo --summary` 来知道你的上下文占了多少字符，
假设是 1500，那么你可以这样做：
`contexo --stdout-maxchars 750 --page-char 1` 然后复制输出。
粘贴过去并告诉你的 LLM（这是第 1 页，共 2 页，马上给你第二页）
`contexo --stdout-maxchars 750 --page-char 2` 复制、粘贴、提问，皆大欢喜！

# FAQ

* `ConteXo` 只是给整个完整项目用的吗？
| 不是！你可以传任何你想要的 path，实际上让 LLM
| 用这个工具去探索某些文件夹是个好主意
| `contexo <path>`
| 甚至还可以在那个 path 内再用 `--pattern "src/**/*.ts"` 过滤

* `ConteXo` 只是给代码项目用的吗？
| 不是，但它主要确实是为这个设计的
| 不过我觉得唯一和非代码项目不兼容的功能
| 是 `--clean comments`（清理代码注释）

* `ConteXo` 在 token 消耗上比其他工具更好吗？
| 这取决于任务、项目（上下文）以及你使用的软件
| 当软件给 agents 提供了正确的 `tools` 时
| LLM 往往只会找它真正需要的信息
| 消耗的 token 会明显少于复制你全部代码
| 但在长会话或大型项目中
| 这种文件探索本身既然由 LLM 决定
| 也可能消耗很多思考 token
| `ConteXo` 不该被看成替代品，而是补充品
| 有时候任务简单，文件也容易找到，而且已经能提供足够信息
| 但如果你要做的是一个涉及整个项目的大任务
| 更方便的做法是别让 LLM 费劲去想到底该做什么、该去哪儿
| 直接把整个 `ConteXo` 扔给它就行了……

# 勘误：
有些事情我还不了解，也还没测试过它们的实际表现。
* 我在大项目上测试过，但从内部工作方式来看，似乎
  所有 `STDOUT` 在某个时刻最终都会完整驻留在 RAM 中，
  所以理论上在大项目里内存应该会撑爆，
  但奇怪的是这并没有发生，说实话我还没
  认真想明白，也许 `Bun` 做的魔法比我预期的更多，
  也可能只是我还没拿足够大的项目去测
* encoder 对某些电脑来说比较重，谨慎使用
* 现在 CLI 已经会拒绝混用 `--stdout-maxlines` 和 `--stdout-maxchars`，
  而且 `--page-lines` / `--page-char` 也要求有对应的限制
* `ConteXo` 默认没有配置任何限制，所以如果你的 `LLM`
  直接不带选项执行这个命令，可能会把它的 `context length` 填满
* Linux 仍然是测试最多的平台；我会发布 Windows 和 macOS 版本，
  但没有像 Linux 那样验证得那么多

# 未来特性（TODO）：
_`[ ]` 表示我会做，`[?]` 表示“我也不知道 xD”_

- [ ] Toonify:
| 把 `JSON` 之类的数据格式转换成 `TOON` 文件，以节省 token
| （当然会把这个变化告知 LLM）

- [ ] Skills:
| 添加 Skills，让任何 agent 都能使用这个工具

- [?] Treesitter:
| 我也不确定自己是否喜欢这个想法……
| 但如果能把整个项目的 Treesitter 结构传给它，会很有意思
| 理论上这应该只消耗很少的 token，并且能提供不错的项目整体上下文
| 但我看到和 Treesitters 打交道对开发者来说并不算愉快
| （ummm... 简直是给奴隶 LLM 的完美工作）

- [?] LSP:
| * 把 LSP 消息附加到文件里
| * 使用 LSP 提供的 definitions 和 symbols
| * 对用户通过 flags 选中的 symbols，人为使用 `lsp-hover`
