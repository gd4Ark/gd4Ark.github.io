---
title: 每周轮子之 server-only：一个空包背后的“毒药”
pubDatetime: 2025-12-24
permalink: /post/weekly-npm-packages-03.html
tags:
  - 每周轮子
description: server-only 如何通过下毒在 RSC 中防止服务端代码泄露
---

## 前言

三年前写过两篇[《每周轮子》](https://4ark.me/tags/%E6%AF%8F%E5%91%A8%E8%BD%AE%E5%AD%90/)系列文章，讲如何从零实现一个日常都在用的 npm 包。其中的乐趣就是看看自己实现和别人有什么不一样，同时也能开阔视野。

现在迎来第三篇，这次我们将目光转向 React Server Components（说到转，旧手机可以找…

毕竟众所周知，这个月初 Next.js 圈子大型翻车现场，先后爆出几个 CVE，最出名的当属 [CVE-2025-55182](https://github.com/msanft/CVE-2025-55182)，据闻我们的大善人 Cloudflare 两周崩两次也是因为它，逼得我几次在群里嘴臭。

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20251224160352209.png?imageMogr2/format/webp)

（PHP 有一个很经典的漏洞叫作 PHP Object Injection）

当我知道这个 CVE 时，上 fofa 随便挑选一位幸运倒霉蛋进行测试，很容易就利用上了：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20251224164423842.jpg?imageMogr2/format/webp)

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20251224171523442.png?imageMogr2/format/webp)

结果没过几天，又来一个 [CVE-2025-55183](https://github.com/kimtruth/CVE-2025-55183-poc)，这是一个会泄露 RSC 组件源码的漏洞，说到源码泄露，这就要引出本文的主角了：server-only。

几乎所有最佳实践都告诉我们：在服务端代码顶部加上 `import 'server-only'`，可以避免源码泄露。

今天突发奇想，想看看它是怎么实现的。

## v1 Runtime Check

按照惯性思维，如果让我实现一个 server-only，我第一反应是写个运行时检查。既然代码不能在浏览器跑，那我就检测 window 对象嘛。

```js
// 我脑补的 server-only
if (typeof window !== "undefined") {
  throw new Error("❌ 严重安全错误：服务端模块泄露到了客户端！");
}
```

这看起来很合理，对吧？

但这完全是错的。

Dan 在 [How imports work in RSC](https://overreacted.io/how-imports-work-in-rsc/) 里讲得很清楚：哪怕你声明 'use server'，但只要构建工具（Webpack/Turbopack）看到你 import 了，它就会把代码打包进去。

也就是说，用上面这种方式，虽然页面报错了，但你的服务端代码依然存在于浏览器下载的 JS 文件里。只要别人右键查看源码，依然泄露。

典型“脱裤子放屁”——甚至更离谱，因为你觉得你安全了。

## v2 Poison Pill

既然 Runtime 检查太晚了，我们必须在 Build Time（构建时）拦截它。

那 server-only 是怎么做的，如果你点开它的 npm 页面，你会发现它什么都没有，没有 README.md 甚至没有 git repo，你甚至都不知道它的作者是谁。

然后我打开 code 一看就这么简单：

```bash
server-only
├── index.js
├── empty.js
└── package.json
```

（这不比传说中的 is-odd 还简陋？）

里面的文件就是：

```js
// index.js
throw new Error(
  "This module cannot be imported from a Client Component module. " +
    "It should only be used from a Server Component."
);

// empty.js
// 没错这个就是空的
```

细究之后才发现，这是一种毒药模式，简单说就是利用 Node.js 的条件导出实现一个精分 npm 包：

```json
{
  "name": "server-only",
  "description": "This is a marker package to indicate that a module can only be used in Server Components.",
  "files": ["index.js", "empty.js"],
  "main": "index.js",
  "exports": {
    ".": {
      "react-server": "./empty.js",
      "default": "./index.js"
    }
  }
}
```

`react-server` 是什么？很明显它不是 Node.js 的规范，而是 React 团队定义的一种规范，代表了 RSC 的运行时环境。

这也是给所有第三方库用的一种标准，所以在 Next.js (或者其他 RSC 框架) 的构建时，它实现会跑两条 Pipelines：

1. Server Bundle：在这个流水线下，所有 import 都会优先寻找 package.json 里的 react-server 入口。
2. Client Bundle：正常跑

当 server-only 这个包被服务端引入，它就是一个空文件，被客户端引入它就报错，这就是毒药。

## 还有高手？

我在研究过程中，顺藤摸瓜看了下 Next.js 仓库里的 Issue [#71071](https://github.com/vercel/next.js/issues/71071)，发现事情还没这么简单。

### 1. 作者之谜

这个包最早的出处来自这个 [PR](https://github.com/vercel/next.js/pull/44861/files#diff-852969592b5abf5d5ef83d2b0c6d2e82cc2a4c4abb7e1a2a36cbde20f5544e36)，其实这个包只是 Next.js 内部使用，所以它什么都没有。

### 2. Tree-shaking 的漏网之鱼

你可能会问：如果我只引入了类型呢？

```ts
// ClientComponent.tsx
import type { UserType } from "./db-schema"; // 引用了 server-only 的文件
```

结论是：安全的。现代构建工具足够聪明，import type 会在编译阶段被移除，根本不会触发 server-only 的解析逻辑。

但是，如果你写成这样：

```ts
import { UserType, dbInstance } from "./db-schema";
```

即使你在代码里完全没用到 dbInstance，只是想用一下 UserType，构建工具依然会去解析这个文件，然后触发 server-only 的报错。

### 3. npm 包作者应有的觉悟

以前我们开发一个 npm 包，package.json 里写个 main 和 module 就完事了。但在 RSC 时代，如果你开发的库（比如一个数据库 ORM 客户端）不希望被误用到前端，你必须手动加上 react-server 的导出条件。

但如果你很不幸使用了一个没跟上节奏的 npm 包，那你得自觉地贴上 `import 'server-only'`。
