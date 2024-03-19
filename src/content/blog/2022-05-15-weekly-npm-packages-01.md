---
title: 每周轮子之 only-allow：统一规范团队包管理器
pubDatetime: 2022-05-16
permalink: /post/weekly-npm-packages-01.html
tags: 
  - 每周轮子
---

## 需求

首先我们来提一个团队开发中很常见的需求：一般来说每个团队都会统一规定项目内只使用同一个包管理器，譬如 npm、yarn、pnpm 等，如果成员使用了不同的包管理器，则可能会因为 *lock file* 失效而导致项目无法正常运行，虽然这种情况一般都可以通过项目的上手文档来形容共识，但有没有更好的解决方案，比如在项目安装依赖时检测如果使用了不同的包管理器就抛出错误信息？

当然是可以的，pnpm 就有一个包叫做 [only-allow](https://www.npmjs.com/package/only-allow) ，连 [vite](https://github.com/vitejs/vite/blob/c7fc1d4a532eae7b519bd70c6eba701e23b0635a/package.json#L16) 都在使用它，所以本周我们就从 0 到 1 实现这个工具，以此对它的工作原理一探究竟。

## 实践

说干就干，我们先在 [npm 文档](https://docs.npmjs.com/cli/v8/using-npm/scripts#life-cycle-operation-order) 搜寻一番，发现有一个钩子叫做 `preinstall`：

> 可以在运行 npm instal 之前执行某个命令，当 exit code 非 0 时终止运行

所以第一步是在 `package.json` 中添加以下代码：

```json
"scripts": {
  "preinstall": "node check-npm.js"
}
```

接下来的问题就是：我们如何知道用户使用了哪一个包管理器？

我们知道 `process.env` 会包含当前脚本的运行环境，首先我们将它打印看看

分别使用 `yarn` 和 `npm install` 后，发现了以下几个相关字段的区别：

使用 `yarn` 安装：

```json
{
  npm_config_registry: 'https://registry.yarnpkg.com',
  npm_execpath: '/usr/local/lib/node_modules/yarn/bin/yarn.js',
  npm_config_user_agent: 'yarn/1.22.11 npm/? node/v16.13.2 darwin arm64',
}
```

使用 `npm` 安装：

```json
{
  npm_config_metrics_registry: 'https://registry.npmjs.org/',
  npm_execpath: '/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js',
  npm_config_user_agent: 'npm/8.5.5 node/v16.13.2 darwin arm64 workspaces/false',
}
```

以下是三者的解释：

1. npm_config_metrics_registry：npm 源，就是当我们安装 npm 包会从这个服务器上获取，可以通过 `npm config set registry` 或者     等工具进行配置。
1. npm_execpath：当前 npm 包管理器的执行目录，这个路径会根据你安装的方式而不同。
3. npm_config_user_agent：由包管理器设置的 UA，每个包管理器都不一样，比如 npm  [lib/utils/config/definitions.js#L2190](https://github.com/npm/cli/blob/8a49e3ab6499c6196c5d7a0f6dad3b345944b992/lib/utils/config/definitions.js#L2190)，因此我们可以使用这个信息来判断客户端。



因此我们可以通过 `process.env.npm_config_user_agent` 获取当前用户使用的包管理器，那么接下来的工作很简单了。



我们先写一个最 Low 的解决方案：

```js
const wantedPM = 'yarn'

const usedPM = process.env.npm_config_user_agent.split('/')[0]

if (usedPM !== wantedPM) {
  console.error(`You are using ${usedPM} but wanted ${wantedPM}`)

  process.exit(1)
}
```



至此，我们的核心功能就已经实现了，还不赶紧发到 GitHub 开源一波坐等 stars？



别急，我们来思考下这段代码存在哪些不足：

1. 应该由用户指定可以使用哪一个包管理器。
1. 这段代码的健壮性如何？



那我们再修改一波，首先是接收用户传递参数，指定使用的包管理器：

```json
"scripts": {
  "preinstall": "node check-npm.js yarn"
}
```

然后改为通过接收参数：

```diff
+ const argv = process.argv.slice(2)

+ const wantedPM = argv[0]
- const wantedPM = 'yarn'

const usedPM = process.env.npm_config_user_agent.split('/')[0]

if (usedPM !== wantedPM) {
  console.error(`You are using ${usedPM} but wanted ${wantedPM}`)

  process.exit(1)
}
```



还有第二个问题，这段代码的健壮性如何？譬如以下情况：

1. 用户不传或乱传参数怎么办？
2. 如果以后有新需求：除了要限制包管理器，还要限制到具体某个版本怎么办？



所以，我们再调整一波代码，检测传入的参数：

```js
const PACKAGE_MANAGER_LIST = ['npm', 'yarn', 'pnpm']

const argv = process.argv.slice(2)

if (argv.length === 0) {
  const name = PACKAGE_MANAGER_LIST.join('|')

  console.log(`Please specify the wanted package manager: only-allow <${name}>`)

  process.exit(1)
}

const wantedPM = argv[0]

if (!PACKAGE_MANAGER_LIST.includes(wantedPM)) {
  const name = PACKAGE_MANAGER_LIST.join(',')

  console.log(
    `"${wantedPM}" is not a valid package manager. Available package managers are: ${name}.`
  )

  process.exit(1)
}
```

然后，我们将获取 UA 的代码抽离出来，并使其可以获取版本，以便后续扩展：

```js
function getPackageManagerByUserAgent(userAgent) {
  if (!userAgent) {
    throw new Error(`'userAgent' arguments required`)
  }

  const spec = userAgent.split(' ')[0]
  const [name, version] = spec.split('/')

  return {
    name,
    version
  }
}
```

完整代码：

```js
const PACKAGE_MANAGER_LIST = ['npm', 'yarn', 'pnpm']

const argv = process.argv.slice(2)

if (argv.length === 0) {
  const name = PACKAGE_MANAGER_LIST.join('|')

  console.log(`Please specify the wanted package manager: only-allow <${name}>`)

  process.exit(1)
}

const wantedPM = argv[0]

if (!PACKAGE_MANAGER_LIST.includes(wantedPM)) {
  const name = PACKAGE_MANAGER_LIST.join(',')

  console.log(
    `"${wantedPM}" is not a valid package manager. Available package managers are: ${name}.`
  )

  process.exit(1)
}

const usedPM = getPackageManagerByUserAgent(
  process.env.npm_config_user_agent
).name

if (usedPM !== wantedPM) {
  console.error(`You are using ${usedPM} but wanted ${wantedPM}`)

  process.exit(1)
}

function getPackageManagerByUserAgent(userAgent) {
  if (!userAgent) {
    throw new Error(`'userAgent' arguments required`)
  }

  const spec = userAgent.split(' ')[0]

  const [name, version] = spec.split('/')

  return {
    name,
    version
  }
}
```

## 结语

很好，现在我们已经将这个 npm 包的功能给实现了：[only-allow](https://www.npmjs.com/package/only-allow)，可以看下它的源码：[bin.js](https://github.com/pnpm/only-allow/blob/master/bin.js)。



**不过发现了一个问题：**上面提到过 `preinstall`  钩子会在安装依赖时触发，但是经验证，npm 和 yarn 调用 `preinstall` 的时机不一样，npm 仅会在 `npm install` 时运行，而 `npm install <pkg-name>` 则不会，但 yarn 则会在 `yarn` 和 `yarn add <pkg-name>` 时都运行，所以如果想用这种方式限制 npm 使用者，可能无法达到预期，该问题在 2021 年[就有人提出](https://github.com/npm/rfcs/issues/325)，但目前仍未有解决方案出现。

