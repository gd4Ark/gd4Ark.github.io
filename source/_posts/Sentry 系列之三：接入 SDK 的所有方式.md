---
title: Sentry 系列之三：接入 SDK 的所有方式
categories:
  - 网络
  - 前端
tags:
  - 网络
  - 前端
abbrlink: '73892983'
date: 2020-11-18 21:37:35
---

<div class="excerpt">
    本文介绍 Sentry 官方文档上的所有接入 SDK 的方式，希望读者看完后能够根据项目实际情况选择合适的接入方式。
</div>

<!-- more -->

## 前言

本文介绍 Sentry 官方文档上的所有接入 SDK 的方式，希望读者看完后能够根据项目实际情况选择合适的接入方式。

> 本文首发于知乎：https://zhuanlan.zhihu.com/p/287965015

其实 Nuxt 社区有一个 Sentry 的集成模块 [@nuxtjs/sentry](https://www.npmjs.com/package/@nuxtjs/sentry)，但实际使用后，发现存在以下问题：

1. 需要安装 Sentry CLI，导致安装依赖过程漫长
    1. 其实这个包只有在需要上传 source-map 时才用到，然而 [@nuxtjs/sentry](https://www.npmjs.com/package/@nuxtjs/sentry) 无论如何都需要安装这个包
2. 不够灵活，不好扩展
    1. 集成模块虽然可以帮助我们减少很多工作，但始终不如直接使用官方接入方式灵活
    1. Sentry 配置都是在 `nuxt.config.js` 中，所以不太好扩展

鉴于此，不再打算使用第三方包，而是直接使用 Sentry 官方提供的接入方式。

下面就来介绍一下 Sentry 官方文档上的所有接入 SDK 的方式。

## 先说总结

该总结仅供参考，不代表个人立场，还请根据项目实际情况选择。

NPM：

-   官方推荐使用方式
-   打包进 bundle，影响打包体积，但无须担心网络加载 SDK 问题

CDN：

-   减少 bundle 体积，但可能需要考虑网络环境而导致加载 SDK 不成功的问题
-   如果使用 CDN，请先看看 Lazy Loading 是否更合适

Lazy Loading：

-   开始只加载 1k 左右的加载器 SDK，需要用到 Sentry 的时候才加载主 SDK
-   只针对主 SDK 懒加载，其它扩展（如 integrations）还是要用 NPM 或 CDN 的方式接入
-   加载主 SDK 前只能监视全局错误和未处理的 Promise 问题，如果会导致错过一些错误

## 接入方式

### NPM

#### 安装

```bash
yarn add @sentry/browser @sentry/integrations @sentry/tracing
```

#### 使用

```javascript
import Vue from 'vue'
import * as Sentry from '@sentry/browser'
import { Vue as VueIntegration } from '@sentry/integrations'
import { Integrations } from '@sentry/tracing'

Sentry.init({
    dsn: '_dsn_',
    integrations: [
        new VueIntegration({
            Vue,
            tracing: true,
        }),
        new Integrations.BrowserTracing(),
    ],

    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,
})
```

#### 总结

这是 Sentry 首推的安装方式，直接打包到 bundle 也无需担心因网络环境或广告拦截器的情况导致无法加载 SDK 的情况。

### CDN

#### 安装

```html
<script
    src="https://browser.sentry-cdn.com/5.27.3/bundle.tracing.min.js"
    integrity="sha384-L3tHj4nHK/1p8GjYGsCd8gVcdnsl8Gx4GbI0xwa76GI9O5Igwsd9RxET9DJRVAhP"
    crossorigin="anonymous"
></script>
<script
    src="https://browser.sentry-cdn.com/5.27.3/vue.min.js"
    integrity="sha384-2N7Ym5Xq2tbEGuDRYVYY1fmAj2zZgR38wcPnX8nFwtOqL7Cjk0avM2R0GJ/ywIxq"
    crossorigin="anonymous"
></script>
```

#### 使用

```javascript
Sentry.init({
    dsn: '_dsn_',
    integrations: [
        new Sentry.Integrations.Vue({
            Vue,
            tracing: true,
        }),
        new Sentry.Integrations.BrowserTracing(),
    ],

    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,
})
```

#### 总结

相较 NPM 接入的方式，需要担心的就是可能会因网络环境或广告拦截器的情况导致无法加载。

文档还提到，如果要使用 CDN，不妨考虑换成 Lazy Loading 的方式，原话看[这里](https://docs.sentry.io/platforms/javascript/guides/vue/install/cdn/)。

### Lazy Loading

#### 安装

```html
<script
    src="https://js.sentry-cdn.com/examplePublicKey.min.js"
    crossorigin="anonymous"
></script>
```

#### 使用

简单来说就是我们请求一个由 sentry-dashboard 提供的加载器 SDK（gzip 后 1k 左右），里面已经帮我们做了 init dsn 等配置，但是它不会立刻请求完整的 SDK，而是当有错误方式时再请求（也可以强制让它请求）。

可以在 sentry-dashboard 中的 Settings -> Projects -> Client Keys (DSN) 看到 script 链接以及设置 SDK 的版本：
![image.png](https://cdn.nlark.com/yuque/0/2020/png/486863/1604902690278-fd337ca2-fb24-4430-82c5-78d0c1677daf.png#align=left&display=inline&height=160&margin=%5Bobject%20Object%5D&name=image.png&originHeight=320&originWidth=1176&size=31421&status=done&style=none&width=588)
前面说了，它会帮我们 init() 传入 dsn，如果想要增加其它配置，我们就要在 onLoad 里再去调用一遍 init，它会合并选项：

```javascript
Sentry.onLoad(() => {
    Sentry.init({
        tracesSampleRate: 1.0,
    })
})
```

但是 onLoad 只会在真正加载 Sentry 时才会执行，让它加载完整 SDK 有以下几种方式：

-   被动
    -   第一次报错时
-   手动
    -   Sentry.forceLoad()
    -   data-lazyno = true（在 script 标签

#### 总结

Lazy Loading 的局限是在加载完整 SDK 之前，Sentry 只能监视全局错误和未处理的 Proimse 问题，这有可能导致我们错过一些错误。

还有就是 Lazy Loading 只针对 bundle.tracing，如果我们有使用其它扩展，比如 Integrations.Vue 这些，还是要通过 NPM 或者 CDN 的方式接入这些扩展。

## 参考文档

-   [https://docs.sentry.io/platforms/javascript/guides/vue/install/](https://docs.sentry.io/platforms/javascript/guides/vue/install/)
