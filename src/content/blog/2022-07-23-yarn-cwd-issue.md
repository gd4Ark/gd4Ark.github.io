---
title: 从一次 yarn 命令死循环说起
pubDatetime: 2022-07-23
permalink: /post/yarn-cwd-issue.html
tags: 
  - 前端
---

## 前言

最近有个想法，希望在一个 yarn workspace 项目中实现任意一个子包中安装依赖时，都执行一些类似于初始化、同步配置的动作。

然而在操作过程中遇到了一个关于 `yarn --cwd` 有趣的问题，特地记录下来，希望能对后来者有所帮助。

## 遇到什么问题呢

先交代一下我们项目的基本情况，它是一个通过 yarn workspace 管理的 monorepo 项目，使用的是 yarn v1.22.11 版本，目录结构大致如下：

```
monorepo
├── package.json
├── app-a
│   └── package.json
├── app-b
│   └── package.json
└── config
    └── package.json
```

其中 `app-a` 和 `app-b` 都使用了 `config` 这个共享包：

```json
"dependencies": {
  "@monorepo/config": "../config",
}
```

我们需要在根目录的 `package.json` 中的 `preinstall` 钩子做一些初始化操作：

```json
"scripts": {
  "preinstall": "./bin/init.sh",
}
```

此时我们在根目录执行 `yarn` 或者 `yarn add <pkg-name>`，都会触发 `preinstall` 这个钩子，但在 `app-a` 中执行 `yarn`是不会触发根目录的 `preinstall` 钩子的。

因此，我们需要分别在每个子包上都加上这行，也即在每个子包安装依赖时都执行一下根目录的 `preinstall` 命令：

```json
"scripts": {
  "preinstall": "yarn --cwd ../ preinstall",
}
```

于是，奇怪的事情就发生了，当我在 `app-a` 中执行 `yarn` 的时候，它停留在安装 `@monorepo/config` 的阶段，同时我的电脑明显变得卡顿，于是打开 `htop` 一看，好家伙，满屏都是：

```bash
4ark   40987  26.3  0.5 409250368  78624   ??  R  8:36下午   0:00.09 /usr/local/bin/node /usr/local/bin/yarn --cwd ../ preinstall
```

CPU 占用率直接达到 100%，吓得我赶紧 kill 掉这些进程：

```bash
ps aux | grep preinstall | awk '{print $2}' | xargs kill -9
```

## 分析原因

惊吓过后，来分析一下原因，很显然这段命令陷入了死循环，导致越来越多进程，于是尝试在每个子包中都手动执行一遍 `yarn --cwd ../ preinstall` 后，发现一切正常，那问题出在哪呢？

于是我再执行了一遍 `yarn`，并且用以下命令将进程信息复制出来，以便分析：

```bash
ps -ef | pbcopy
```

随后验证我刚刚的猜测，的确是这个命令在不断触发自己，导致死循环：

```
UID   PID  PPID   C STIME   TTY     TIME CMD
501 50399 50379   0  8:50下午 ??   0:00.10 /usr/local/bin/node /usr/local/bin/yarn --cwd ../ preinstall
501 50400 50399   0  8:50下午 ??   0:00.11 /usr/local/bin/node /usr/local/bin/yarn --cwd ../ preinstall
501 50401 50400   0  8:50下午 ??   0:00.11 /usr/local/bin/node /usr/local/bin/yarn --cwd ../ preinstall
501 50402 50401   0  8:50下午 ??   0:00.12 /usr/local/bin/node /usr/local/bin/yarn --cwd ../ preinstall
```

由于三个分包执行的命令都一样，不清楚是不是由于某个分包引起，于是修改一下命令以便区分：

```json
"scripts": {
  "preinstall": "echo app-a && yarn --cwd ../ preinstall",
}
```

随后发现问题是出现在 `config` 这个子包，于是我把这个子包的 `preinstall` 命令去掉，果然没有这个问题了，非常奇怪。

难道是 `--cwd ../` 这个路径有问题？验证一下，把命令改成这样：

```json
"scripts": {
  "preinstall": "pwd && yarn --cwd ../ preinstall",
}
```

发现 `pwd` 输出是这样子的：

```
/4ark/projects/monorepo/app-a/node_modules/@monorepo/config
```

从这里的输出我们发现了两个问题，第一个问题是：

- yarn workspace 共享包的 `preinstall` 被执行的时候，其实已经被拷贝到 `app-a` 的 `node_modules` 中，而不是在当前目录，因此 `--cwd ../` 并不指向项目根目录。

这一点比较好理解，毕竟 `config` 作为一个依赖包，确实应该被拷贝到应用的 `node_modules` 。

而第二个问题就不太理解了，为什么明明设置了 `--cwd ../`，却依然在当前目录执行呢？按照预期 cwd 的指向应该是：

```
/4ark/projects/monorepo/app-a/node_modules/@monorepo
```

难道是我对 cwd 参数的理解有偏差？看一下 yarn 的文档中对 cwd 描述：

> Specifies a current working directory, instead of the default `./`. Use this flag to perform an operation in a working directory that is not the current one.
>
> This can make scripts nicer by avoiding the need to `cd` into a folder and then `cd` back out.

从文档的描述来看，cwd 的作用不就是代替 `cd` 吗，但现在的结果看来 `yarn --cwd ../ preinstall` 并不等价于 `cd ../ && yarn preinstall` 。

这就不得不让人疑惑 cwd 的定位方式了，在网上搜寻一番没找到相关的讨论，那只能自己动手丰衣足食，直接从 yarn 源码中寻找答案。

## 分析源码

前面我们说到，我们使用的是 yarn v1.22.11，在 yarn 的 GitHub 仓库中发现 v1 版本的最新版本停留在 v1.23.0-0，那我们就从这个版本的源码来进行分析，首先克隆代码到本地：

```bash
git clone --depth=1 https://github.com/yarnpkg/yarn
```

然后安装依赖并运行起来：

```bash
yarn && yarn watch
```

这时候它就会自动监听代码修改然后重新编译，我们查看 `package.json` 发现 yarn 的 bin 主要是调用 ` ./bin/yarn.js`:

```json
"bin": {
  "yarn": "./bin/yarn.js",
  "yarnpkg": "./bin/yarn.js"
},
```

也就是我们直接执行 `bin/yarn.js` 的效果就如同执行 `yarn`，试一下查看版本：

```bash
> /Users/4ark/projects/yarn/bin/yarn -v
1.23.0-0
```

PS：当然你也可以在项目目录下使用 `npm link` 把它挂载到本地中。

接下就是一番调试，终于定位到可以回答我们疑问的代码，[在这里](https://github.dev/yarnpkg/yarn/blob/6db39cf0ff684ce4e7de29669046afb8103fce3d/src/cli/index.js#L37-L51)：

```js
function findProjectRoot(base: string): string {
  let prev = null;
  let dir = base;

  do {
    if (fs.existsSync(path.join(dir, constants.NODE_PACKAGE_JSON))) {
      return dir;
    }

    prev = dir;
    dir = path.dirname(dir);
  } while (dir !== prev);

  return base;
}

const cwd = command.shouldRunInCurrentCwd ? commander.cwd : findProjectRoot(commander.cwd);
```

可以看到 cwd 的定位方式是从当前目录寻找是否存在 `package.json`，若存在，则返回此目录，否则将目录经过 `path.dirname` 处理一遍，继续寻找，直到寻找到最外层。

那么这里最关键的是 `path.dirname` 的返回值，我们先看一下文档对于它的描述：

> The `path.dirname()` method returns the directory name of a `path`, similar to the Unix `dirname` command. Trailing directory separators are ignored,

就是返回一个路径中的目录部分，作用与 unix 下的 dirname 命令一致，通常是这么使用的：

```bash
> dirname /4ark/app/index.js
/4ark/app

> dirname /4ark/app/packages/index.js
/4ark/app/packages
```

是不是会肤浅地认为它的作用就是返回一个路径的上一级目录？如果传入的是一个绝对路径，确实可以这么肤浅地认为，然而当传入的是一个相对路径时，情况就不一样了：

```bash
> dirname ../app/index.js
../app

> dirname ../../
../

> dirname ../
问: 会返回什么呢？
```

答案是：`.`，也就是当前目录。

那这里就能回答我们之前的问题，为什么在 `node_module/@monorepo/config` 中使用 `yarn --cwd ../ preinstall` 却在当前目录执行，因为它的上一级 `node_modules/@monorepo` 不存在 `package.json`，所以经过 `dirname ../` 处理后 cwd 的指向就是当前目录。

如果对 node.js 中 `path.dirname` 的实现方式感兴趣，可以看这里 [path.js#L538-L554](https://github.com/jinder/path/blob/master/path.js#L538-L554)。

## 解决方案

摸清楚原因后，那解决这个问题也不是难事，只要我们把相对路径改成绝对路径，是不是就能解决这个问题了？

思考一下，其实 `yarn --cwd ../ preinstall`，把 `../` 改成绝对路径行不行呢？比如在本文的场景，`../` 其实就是项目的根目录，那我们完全可以通过别的方式获取到项目的根目录，比如 在 git 中：
```bash
git rev-parse --show-toplevel
```

所以，我们把命令改成这样，问题就迎刃而解了：

```diff
- yarn --cwd ../ preinstall
+ yarn --cwd $(git rev-parse --show-toplevel) preinstall
```

那就不得不提一下，其实在 yarn v2 中新增了一个 `--top-level`  属性，它的作用刚好就是为了解决这个问题。

## 结语

其实我们再回过头来想，在本文的例子中，根本不需要在 `config` 目录中添加 `preinstall` 这个钩子，因为它作为共享包，每次修改都必然要在其它使用这个包的地方，重新安装一次，所以只要确保这些地方会执行 `preinstall` 就可以了，那也就意味着不会出现本文遇到的问题。

不过，多踩坑也不是坏事，只要搞清楚背后的原因，问题也就不是问题。
