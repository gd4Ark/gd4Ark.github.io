---
title: 每周轮子之 husky：统一规范团队 Git Hooks
pubDatetime: 2022-05-30
permalink: /post/weekly-npm-packages-02.html
tags: 
  - 每周轮子
---

## 需求
本文是每周轮子计划的第二篇，本周我们来实现一个被广泛使用的工具，那就是鼎鼎大名的 husky，几乎所有现代前端项目、以及 Node.js 项目都会接入这个工具，它的用途主要是统一管理项目中的 Git Hooks 脚本，不熟悉该工具的同学也不要紧，下面我们先来简单介绍一下 husky，它到底解决了什么问题，我们为什么需要使用 husky。

大部分公司都会采用 Git 来对项目进行代码的版本控制，其好处相信大家都知道，这里就不再赘述，通常为了保证项目的代码质量、以及更好地进行团队之间的协作，我们都会在提交代码时做一些额外的工作，包括：检查 commit message 的规范性、统一代码风格、进行单元测试等等。

而这些工作自然不能完全依靠项目成员的自觉性，毕竟人都会犯错，所以这些工作都得交给自动化工具来处理。

因此，大部分版本控制系统都会提供一个叫做钩子（Hooks）的东西，Git 自然也不例外，Hooks 可以让我们在特定的重要动作发生时触发自定义脚本，通常分为客户端和服务端，而我们接触的大部分 Hooks 都是客户端的，也就是在我们本机上执行的。

下面我们简单介绍一下如何在 Git 中使用 Hooks，我们只需要在项目的 `.git/hooks` 目录中创建一个**与某个 hook 同名的可执行脚本**即可，比如我们想要阻止一切提交，并将 commit message 打印到终端：
```bash
# .git/hooks/commit-msg

#!/usr/bin/env bash

INPUT_FILE=$1

START_LINE=$(head -n1 $INPUT_FILE)

echo "当前提交信息为：$START_LINE"

echo "阻止此次提交！！！"

exit 1
```

这里先别纠结这段脚本代码是如何做到的，只需清楚我们可以利用 Git Hooks 做到这一点，实际上我们可以在这里做任何操作，比如检查 commit message 的规范性。

讲完如何使用 Git Hooks，那我们就得讲讲这种方式存在哪些不足。

在 [Git 文档](https://git-scm.com/book/zh/v2/%E8%87%AA%E5%AE%9A%E4%B9%89-Git-Git-%E9%92%A9%E5%AD%90)中对客户端钩子有这么一段话：
> 需要注意的是，克隆某个版本库时，它的客户端钩子并不随同复制。 如果需要靠这些脚本来强制维持某种策略，建议你在服务器端实现这一功能。 

简单来说就是，我们上面添加的这个 `commit-msg` Hook，只能在我们自己的机器上，不能被加入到版本控制中推送到远端，也就意味着我们无法同步这些 Hooks 脚本。

而 husky 主要就是为了解决这个问题，除此之外还提供了更加简便的方式来使用 Git Hooks，而无须采用上面那种方式。

先来介绍一下大家所熟知的 husky 用法，首先要安装这个工具，可以使用全局安装，但一般更推荐在项目本地安装：

```bash
npm install husky -D
```

然后我们在 `package.json` 中添加以下代码：

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "yarn test"
    }
  }
}
```

以上这种方式是 husky v4 版本之前的配置方式，相信大部分同学都对这种方式很熟悉了，而在最新版本 husky（v7 之后） 已经不支持这样使用，而是采用命令行配置的方式：

```bash
npx husky add .husky/pre-commit "lint-staged"
npx husky add .husky/pre-push "yarn test"
```

它的配置方式之所以会有如此翻天覆地的变化是有原因的，不过说来话长，我们下面会讲到，这里先按下不表。

本文就带领大家从 0 到 1 造一个 husky，我们先从第一种使用方式开始，然后一步步来看为什么 husky 在新版本会选择改变它的配置方式。

让我们开始吧！

## 实践

### v4 以前的版本

我们先来以最 low 的方式实现它，第一步是对 `package.json` 进行配置，以便测试：

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "echo hello husky!"
    }
  }
}
```

然后读取 `package.json`：

```js
// husky.js
const pkg = require('./package.json')

function husky() {
  if (!pkg?.husky?.hooks) {
    return
  }

  if (typeof pkg.husky.hooks !== 'object') {
    return
  }

  const hooks = pkg.husky.hooks

  console.log(hooks)
}

husky()
```

现在我们现在已经能拿到 hooks 相关的配置，然后我们把相关的脚本内容写入到对应的 hooks 可执行文件：

```js
for (const [name, value] of Object.entries(hooks)) {
  const script = `#!/bin/sh\n${value}\n`

  fs.writeFileSync(`./.git/hooks/${name}`, script, { mode: '751' })
}
```

执行一下：

```bash
node husky.js
```

然后我们就可以看到 `.git/hooks` 下面多了一个 `pre-commit` 可执行文件：

```bash
> cat pre-commit

#!/bin/sh
echo hello husky!
```

 这时候进行 commit 也可以看到输出：

```bash
> git commit -m "test"

hello husky!
```

这时候我们已经完成了 husky 大部分的功能，但是这里还存在这么一个问题：**如果现在我去修改 `package.json`  中的 husky 配置，hooks 文件如何同步更新？**

举个例子，如果现在把 `package.json` 改成这样：

```diff
{
  "husky": {
    "hooks": {
-     "pre-commit": "echo hello husky!"
+     "pre-commit": "echo hello husky2!"
    }
  }
}
```

然后进行 commit，它输出的仍然是 hello husky!，实际上如果我们不是手动执行写入 hooks 文件这个操作，甚至连第一步都做不到，可是回想上面 husky 的使用方式，我们只需要安装 husky 后进行配置即可，并不需要手动执行什么命令。

那 Huksy 是如何做到这一点的呢？动动你聪明的小脑瓜，有没有解决方案呢？

我们先来分析一下为什么无法做到自动同步更新 hooks，归根到底就是因为无法检测修改 `package.json` 后自动执行写入 hooks 操作，那我们不妨换一种思路：**不用在修改 `package.json` 时执行写入操作，而是在执行 hooks 时去执行 `package.json` 中对应的 `hooks`。**

可能有点拗口，换句话说就是我们在一开始就把所有的 hooks 预注册了，然后在每一个 hooks 脚本中做同一件事：寻找 `package.json` 中对应的 hooks 并执行。

可能会觉得有点奇技淫巧 ，但也不失为一种曲线救国的方式，而事实上在 husky v4 之前还真的是这么做的。

那我们如何在一开始就注册所有 hooks 呢？

翻了一下 npm 的文档，发现有一个 `install` 钩子，它会在 `npm install` 后执行。

首先我们的项目结构如下：

```bash
.
├── husky-test
│   ├── husky
│   │   ├── husky.js
│   │   └── package.json
│   └── package.json
```

在 `husky/package.json` 添加以下代码：

```bash
{
  "name": "husky",
  "version": "1.0.0",
  "license": "MIT",
  "scripts": {
    "install": "node husky"
  }
}
```

然后在 `husky-test` 安装这个 npm 包：

```bash
{
  "name": "husky-test",
  "version": "1.0.0",
  "license": "MIT",
  "dependencies": {
    "husky": "./husky"
  }
}
```

这时候执行 `npm install` 会运行 `husky/husky.js` ，我们就可以在这个文件中预注册所有的 hooks，不过在此之前我们先梳理一下整体实现逻辑：

1. 我们要在 `husky.js` 中预注册所有的 hooks，可以在这个[文档](https://git-scm.com/docs/githooks)中参考所有的 hooks。
2. 我们要在所有的 hooks 中写入脚本内容，使其可以在被执行时寻找 `package.json` 中对应的 hook，并将其执行结果返回。
   1. 因为 hooks 的 exit code 非 0 时要中断本次操作。

因此，经过梳理后，我们的目录结构调整如下：

```bash
.
├── husky                   // husky 包
│   ├── package.json     
│   ├── husky.js            // install 入口
│   ├── installer           // 初始化，预注册 hooks
│   │   └── index.js     
│   ├── runner              // 寻找对应的 hook 并执行
│   │   └── index.js     
│   └── sh                  // 所有 hooks 统一调用脚本
│       └── husky.sh     
└── package.json            // 测试
```

我们在 `husky.js` 中调用 install 进行初始化操作：

```js
const install = require('./installer')

install()
```

然后在 `installer/index.js` 中预注册 hooks：

```js
// installer/index.js
const fs = require('fs')
const cp = require('child_process')
const path = require('path')

const hookList = [
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'pre-commit',
  'pre-merge-commit',
  'prepare-commit-msg',
  'commit-msg',
  'post-commit',
  'pre-rebase',
  'post-checkout',
  'post-merge',
  'pre-push',
  'post-update',
  'push-to-checkout',
  'pre-auto-gc',
  'post-rewrite',
  'sendemail-validate'
]

function git(args, cwd = process.cwd()) {
  return cp.spawnSync('git', args, { stdio: 'pipe', encoding: 'utf-8', cwd })
}

function getGitRoot() {
  return git(['rev-parse', '--show-toplevel']).stdout.trim()
}

function getGitHooksDir() {
  const root = getGitRoot()

  return path.join(root, '.git/hooks')
}

function getHookScript() {
  return `#!/bin/sh

. "$(dirname "$0")/husky.sh"
`
}

function writeHook(filename, script) {
  fs.writeFileSync(filename, script, 'utf-8')
  fs.chmodSync(filename, 0o0755)
}

function createHook(filename) {
  const hookScript = getHookScript()

  writeHook(filename, hookScript)
}

function createHooks(gitHooksDir) {
  getHooks(gitHooksDir).forEach(createHook)
}

function getHooks(gitHooksDir) {
  return hookList.map((hookName) => path.join(gitHooksDir, hookName))
}

function getMainScript() {
  const mainScript = fs.readFileSync(
    path.join(__dirname, '../../sh/husky.sh'),
    'utf-8'
  )

  return mainScript
}

function createMainScript(gitHooksDir) {
  fs.writeFileSync(path.join(gitHooksDir, 'husky.sh'), getMainScript(), 'utf-8')
}

export default function install() {
  const gitHooksDir = getGitHooksDir()

  createHooks(gitHooksDir)
  createMainScript(gitHooksDir)
}
```

做完这一步的结果是在安装 husky 时，会自动创建 hooks、并将 `husky.sh` 复制到 `.git/hooks` 中，所有 hooks 都会调用 `husky,sh`：

```bash
#!/bin/sh

. "$(dirname "$0")/husky.sh"
```

在 `husky.sh` 中主要是做一件事，调用 `runner/index`：

```bash
# sh/husky.sh
gitParams="$*"
hookName="$(basename "$0")"

npm husky-run $hookName "$gitParams"
```

`husky-run` 是我们自定义的一个命令，需要在 `package.json` 中先注册：

```diff
// husky/package.json
{
  "name": "husky",
  "version": "1.0.0",
  "license": "MIT",
  "bin": {
+   "husky-run": "./runner/index.js"
  },
  "scripts": {
    "install": "node husky"
  }
}
```

所以实际上就是调用 `runner/index`，我们要在这个文件中寻找对应的 hook 并执行：

```bash
#!/usr/bin/env node

const { spawnSync } = require('child_process')
const { cosmiconfigSync } = require('cosmiconfig')

function getConf(dir) {
  const explorer = cosmiconfigSync('husky')
  const { config = {} } = explorer.search(dir) || {}

  const defaults = {
    skipCI: true
  }

  return { ...defaults, ...config }
}

function getCommand(cwd, hookName) {
  const config = getConf(cwd)

  return config && config.hooks && config.hooks[hookName]
}

function runner(
  [, , hookName = '', husky_GIT_PARAMS],
  { cwd = process.cwd() } = {}
) {
  const command = getCommand(cwd, hookName)

  const env = {}

  if (husky_GIT_PARAMS) {
    env.husky_GIT_PARAMS = husky_GIT_PARAMS
  }

  if (command) {
    return runCommand(cwd, hookName, command, env)
  }

  return 0
}

function runCommand(cwd, hookName, cmd, env) {
  const { status } = spawnSync('sh', ['-c', cmd], {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit'
  })

  if (status !== 0) {
    const noVerifyMessage = [
      'commit-msg',
      'pre-commit',
      'pre-rebase',
      'pre-push'
    ].includes(hookName)
      ? '(add --no-verify to bypass)'
      : '(cannot be bypassed with --no-verify due to Git specs)'

    console.log(`husky > ${hookName} hook failed ${noVerifyMessage}`)
  }

  if (status === 127) {
    return 1
  }

  return status || 0
}

async function run() {
  try {
    const status = await runner(process.argv)
    process.exit(status)
  } catch (err) {
    console.log('husky > unexpected error', err)
    process.exit(1)
  }
}

run()
```

我们来测试一下，在 `package.json` 添加如下配置：

```diff
{
  "name": "husky-test",
  "version": "1.0.0",
  "license": "MIT",
  "dependencies": {
    "husky": "./husky"
  },
+  "husky": {
+    "hooks": {
+      "pre-commit": "echo 123 && exit 1"
+    }
  }
}
```

然后进行一次 commit，得到结果：

```bash
> git commit -m "test"

123
husky > pre-commit hook failed (add --no-verify to bypass)
```

OK，到这里我们除了一些代码上的健壮性问题以外，已经把大部分 husky v4 版本的核心功能都给实现了。

不过我们已经能够对 husky 的实现方式给摸透，各位同学认为这样的实现方式好不好呢？

其实 husky 的这种通过预注册所有 hooks 的方式一直被人诟病，详见 [#260](https://github.com/typicode/husky/issues/260) 。

其实 husky 的维护者也知道这种方式属实不妥，不过由于当时 Git 的 hooks 机制，只能一直顶着骂名维护下去。

终于，在 Git v2.9 的版本升级中，正式支持通过配置 core.hooksPath 自定义项目的 hooks 的存放路径，也即意味着可将 hooks 加入版本控制，于是 husky 二话不说地进行了重构，用了一种全新的实现方式来做这件事，也就是我们今天看到的 husky v5 以后的版本（截止目前最新的 v8 版本）。

同时 husky 因为配置方式的缘故，使其仅局限于 node.js 项目，为了提高 husky 的使用范围，最新版本决定采用 CLI 配置的方式，参见：[Why husky has dropped conventional JS config](https://blog.typicode.com/husky-git-hooks-javascript-config/)。

因此，最新版本的 husky 实现代码与前面版本截然不同，下面我们继续从 0 到 1 开始实现 husky。

### v4 以后的版本

我们再把最新版本的 husky 使用方式介绍一遍：

```bash
# 初始化
npm set-script prepare "husky install"
npm run prepare

# 配置 hook
npx husky add .husky/pre-commit "npm test"
git add .husky/pre-commit
```

可以发现最新版本的 husky 无需利用 npm 的 install 钩子，毕竟已经不再局限于 node.js 项目，所以初始化操作需要另寻僻径，在 husky 文档中给出的解决方案是利用 npm 的 prepare 钩子，其可以执行 npm publish 和 不带参数的 npm install 时执行。

同时 husky 一共支持以下命令：

1. husky install：安装，主要是配置 Git 的 core.hooksPath
2. husky uninstall：卸载，主要是恢复对 Git 的 core.hooksPath 的修改
4. husky set：新增 hook
4. husky add：给已有的 hook 追加命令

因此，它的实现方式并不难，这里我直接张贴核心源码过来，首先是 CLI 的入口：

```typescript
// Get CLI arguments
const [, , cmd, ...args] = process.argv
const ln = args.length
const [x, y] = args

// Set or add command in hook
const hook = (fn: (a1: string, a2: string) => void) => (): void =>
  // Show usage if no arguments are provided or more than 2
  !ln || ln > 2 ? help(2) : fn(x, y)

// CLI commands
const cmds: { [key: string]: () => void } = {
  install: (): void => (ln > 1 ? help(2) : h.install(x)),
  uninstall: h.uninstall,
  set: hook(h.set),
  add: hook(h.add),
  ['-v']: () =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
    console.log(require(p.join(__dirname, '../package.json')).version),
}

// Run CLI
try {
  // Run command or show usage for unknown command
  cmds[cmd] ? cmds[cmd]() : help(0)
} catch (e) {
  console.error(e instanceof Error ? `husky - ${e.message}` : e)
  process.exit(1)
}
```

#### install 安装初始化

安装初始化主要做以下事情：

1. 拷贝 `husky.sh` 到项目中，其主要工作是添加 debug 开关以及支持 `.huskyrc` 配置文件，最后将其添加到 `.gitignore`。
2. 将 Git 的 core.hooksPath 修改为项目目录的 `.husky`，后续添加的 hooks 都将存放在此目录。

```typescript
// src/index.ts

export function install(dir = '.husky'): void {
  if (process.env.HUSKY === '0') {
    l('HUSKY env variable is set to 0, skipping install')
    return
  }

  // Ensure that we're inside a git repository
  // If git command is not found, status is null and we should return.
  // That's why status value needs to be checked explicitly.
  if (git(['rev-parse']).status !== 0) {
    return
  }

  // Custom dir help
  const url = 'https://typicode.github.io/husky/#/?id=custom-directory'

  // Ensure that we're not trying to install outside of cwd
  if (!p.resolve(process.cwd(), dir).startsWith(process.cwd())) {
    throw new Error(`.. not allowed (see ${url})`)
  }

  // Ensure that cwd is git top level
  if (!fs.existsSync('.git')) {
    throw new Error(`.git can't be found (see ${url})`)
  }

  try {
    // Create .husky/_
    fs.mkdirSync(p.join(dir, '_'), { recursive: true })

    // Create .husky/_/.gitignore
    fs.writeFileSync(p.join(dir, '_/.gitignore'), '*')

    // Copy husky.sh to .husky/_/husky.sh
    fs.copyFileSync(p.join(__dirname, '../husky.sh'), p.join(dir, '_/husky.sh'))

    // Configure repo
    const { error } = git(['config', 'core.hooksPath', dir])
    if (error) {
      throw error
    }
  } catch (e) {
    l('Git hooks failed to install')
    throw e
  }

  l('Git hooks installed')
}
```

#### uninstall 卸载

卸载的工作就更简单了，只需要恢复对 Git 的 core.hooksPath 的配置即可：

```typescript
export function uninstall(): void {
  git(['config', '--unset', 'core.hooksPath'])
}
```

#### set 添加 hook

添加 hook 只需要创建对应的 hook 脚本文件，并写入内容：

```typescript
export function set(file: string, cmd: string): void {
  const dir = p.dirname(file)
  if (!fs.existsSync(dir)) {
    throw new Error(
      `can't create hook, ${dir} directory doesn't exist (try running husky install)`,
    )
  }

  fs.writeFileSync(
    file,
    `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
${cmd}
`,
    { mode: 0o0755 },
  )

  l(`created ${file}`)
}
```

#### add 追加 hook 命令

add 命令是对已有的 hook 文件追加脚本文件，

```typescript
export function add(file: string, cmd: string): void {
  if (fs.existsSync(file)) {
    fs.appendFileSync(file, `${cmd}\n`)
    l(`updated ${file}`)
  } else {
    set(file, cmd)
  }
}
```

## 结语


本文带领大家从 0 到 1 实现了 v4 以及最新版本的 husky，相信大家看完后对 husky 的实现方式也有了一定的了解，在以后的工作中使用它将会更加地得心应手，但如果你所在的项目中不是使用 Git，而是其它版本控制工具，也可以尝试基于 husky 改造，比如本人就曾尝试将 husky 改造使其[支持 Mercurial](https://github.com/gd4Ark/husky/pull/1)。
