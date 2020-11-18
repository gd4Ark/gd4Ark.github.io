---
title: Sentry 系列之二：在 Nuxt 项目中接入 SDK
categories:
  - 网络
  - 前端
tags:
  - 网络
  - 前端
abbrlink: 4e668f59
date: 2020-11-18 21:37:34
---

<div class="excerpt">
    本文介绍如何使用 Sentry 官方推荐的 NPM 安装方式来接入 SDK，其它安装方式可以看《Sentry 系列之三： 接入 SDK 的所有方式》，读者根据项目实际情况选择合适的安装方式。
</div>

<!-- more -->

## 前言

本文介绍如何使用 Sentry 官方推荐的 NPM 安装方式来接入 SDK，其它安装方式可以看[《Sentry 系列之三： 接入 SDK 的所有方式》](https://deepexi.yuque.com/docs/share/b1cc1ad8-1a71-4abf-b23d-79b6dc03b0a5)，读者根据项目实际情况选择合适的安装方式。

> 本文首发于知乎：https://zhuanlan.zhihu.com/p/287953226

## 接入步骤

### 1. 安装

```bash
yarn add @sentry/browser @sentry/integrations @sentry/tracing
```

### 2. 初始化

1. 在 src/plugins/sentry.js 下写入

```javascript
import Vue from 'vue'
import * as Sentry from '@sentry/browser'
import { Vue as VueIntegration } from '@sentry/integrations'
import { Integrations } from '@sentry/tracing'

Sentry.init({
    dsn: process.env.SENTRY_DSN, // 如果传空或不传则不会上报任何 Sentry 错误
    integrations: [
        new VueIntegration({
            Vue,
            tracing: true,
        }),
        new Integrations.BrowserTracing(),
    ],
})

export default (_, inject) => {
    inject('sentry', Sentry)
}
```

这里需要注意，如果是 docker 部署，在构建时会先注入一个环境变量占位符的话，需要这样做额外处理，否则 Sentry 会报无效的 dsn：

```javascript
const dsn = process.env.SENTRY_DSN || ''
Sentry.init({
    dsn: dsn.startsWith('__') ? '' : dsn, // 如果传空或不传则不会上报任何 Sentry 错误
})
```

2. 配置 nuxt.config.js

```diff
module.exports = {
  env: {
+  	SENTRY_DSN: process.env.SENTRY_DSN,
  },
	plugins: [
+		'@/plugins/sentry',
  ]
}
```

### 3. 配置环境变量

```yaml
# .env
SENTRY_DSN=your_dsn
```

### 4. 使用

现在已经可以监视 Window Error 和 Vue Error，你也可以这样手动去上报错误

```javascript
this.$sentry.captureException('sentry test')
```

然后就可以在 Dashboard 中看到这个错误信息。

**注意：到这里，已经完成 Sentry 接入，如果不需要上传 source-map，后文不用看了。**

## Source Map

由于生产环境的代码都是经过打包压缩的，所以如果没有上传 source-map，我们将很难定位问题对应的源代码位置，增加定位问题的难度，这时候开启 source-map 上传就很有帮助。

另外需要注意的是，要上传 source-map，需要配置 Sentry 的验证信息，参考链接：[configuration-values](https://docs.sentry.io/product/cli/configuration/#configuration-values)。

还有就是现在由于要上传 source-map，但浏览器显示 source-map 是很危险的，所以我们需要在上传完 source-map 后删除相关文件。

**注意**：如果你的应用是使用 docker 部署，需要支持一次构建多次运行（比如使用了 [dockerize-cli](https://github.com/FEMessage/dockerize-cli)），由于上传 source-map 是在 webpack 构建的时候上传的，因此不能在 docker run 时才确定上传 source-map 的验证信息，也就意味着无法使用 source-map 功能。**但是，亲测 sentry dsn 支持在每次 docker run 的时候配置。**

### 1. 安装

```bash
yarn add -D @sentry/webpack-plugin
```

### 2. 修改 webpack 配置

```javascript
const glob = require('glob')
const { removeSync } = require('fs-extra')
const SentryWebpackPlugin = require('@sentry/webpack-plugin')

module.exports = {
    build: {
        extend(config, { isDev, isClient }) {
            /**
             * Sentry Upload Source-Map
             * @FYR https://github.com/nuxt-community/sentry-module
             */
            if (!isDev && process.env.SENTRY_AUTH_TOKEN) {
                if (isClient) config.devtool = 'hidden-source-map'

                const path = config.output.publicPath

                config.plugins.push(
                    new SentryWebpackPlugin({
                        include: ['.nuxt/dist/client'],
                        ignore: ['node_modules', '.nuxt/dist/client/img'],
                        urlPrefix: path.startsWith('/') ? `~${path}` : path,
                        // 把 commit 信息上传到 sentry，并以 commit id 作为 release id
                        // 开启后，同一个 commit 上传会出错
                        setCommits: {
                            auto: true,
                        },
                    }),
                    // 构建完后删除 source map 文件
                    {
                        apply: (compiler) => {
                            compiler.hooks.done.tap('CleanJsMapPlugin', () => {
                                glob.sync(
                                    '.nuxt/dist/client/**/*.js.map',
                                ).forEach((f) => removeSync(f))
                            })
                        },
                    },
                )
            }
        },
    },
}
```

相关配置可以看：[https://github.com/getsentry/sentry-webpack-plugin](https://github.com/getsentry/sentry-webpack-plugin)

### 3. 配置环境变量

```yaml
# .env

# 如果不是自建 sentry 则的不需要配置，默认为：https://sentry.io/
SENTRY_URL=your-self-host-sentry/ # 一定要以 / 结尾

# 相关认证信息
SENTRY_AUTH_TOKEN=your_token
SENTRY_ORG=your_organization
SENTRY_PROJECT=your_project
```

### 4. 验证

这时候构建就可以看到上传 source-map 的过程，且构建完后 dist 目录没有 js.map 文件。

```bash
yarn build
```

如果有报错信息，就可以看到对应的源代码位置，如下图：
![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201118214440.png)

## 获取 DSN

1. 进入项目

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201118214503.png)

2. 进入这里

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201118214524.png)

3. 获取 dsn

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201118214539.png)

## 获取 AUTH TOKEN

1. 点击头像，进入 API keys

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201118214555.png)

2. 创建一个新的 token

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201118214613.png)

3. 选择以下权限（注意 project:write）

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201118214631.png)

4. 得到 token
