---
title: uni-app 与原生小程序混合开发方案
pubDatetime: 2025-10-15
tags:
  - 前端
  - uni-app
description: "探索并实践 uni-app 与原生小程序的混合开发方案，包括将原生页面集成到 uni-app 项目中，以及将 uni-app 项目作为分包集成到原生项目中两种方案的具体实现。"
---

## 前言

在过去两年里，我接手维护了多个原生语法开发的微信小程序项目。由于新项目均采用 uni-app 开发，这些原生项目无法复用我们在 uni-app 生态积累的工具库、业务组件和 Hooks 等基础设施。

为了解决技术栈割裂的问题，探索并实践了多种混合开发方案，本文将分享相关的技术方案与实践经验。

## 项目现状分析

或许会好奇，为什么不直接选择用 uni-app 对项目进行全面重构呢？

其实，除了精力有限，更重要的原因在于：

- 线上存在众多活动页，这些页面相对独立且变动频率低，重构它们的收益并不高
- 项目已有功能较为复杂，后续开发需求主要是新增页面，而不是对现有功能进行大规模改造

综上，采用混合开发的渐进式方案，无疑更加高效且具性价比。目前项目主要面临两类需求场景：

- 项目主框架用 uni-app 重构，但需要继续复用原有的众多子页面（如各类活动页）
- 老项目已趋于稳定，仅需在其基础上新增某些复杂且相对独立的模块

uni-app 官方文档提供了几种与原生小程序混合开发的[技术方案](https://uniapp.dcloud.net.cn/hybrid.html#uni-app-%E5%92%8C%E5%8E%9F%E7%94%9F%E5%B0%8F%E7%A8%8B%E5%BA%8F%E6%B7%B7%E5%90%88%E5%BC%80%E5%8F%91%E9%97%AE%E9%A2%98)：

- 方式 1：把原生小程序转换为 uni-app 源码。有各种转换工具
- 方式 2：把原生小程序的代码变成小程序组件，进而整合到 uni-app 项目下
- 方式 3：原生开发的小程序仍保留，部分新功能使用 uni-app 开发

然而，这些方案无法完全满足我们的业务需求。鉴于涉及的项目较多，决定设计一套更具通用性和可扩展性的混合开发方案，以方便快速适配应用。

## uni-app 项目复用原生小程序页面

这种方案核心思路是：将原生小程序页面搬到到 uni-app 项目的构建产物中，并注册页面。

为了提升开发效率，需要将这个过程自动化。所以，开发 Vite 插件来做这件事情最适合不过了。

假设项目结构如下：

```bash
.
├── src/                # uni-app 项目主目录
│   ├── pages/          # uni-app 页面
│   ├── components/     # uni-app 组件
│   └── ...
├── miniprogram/        # 原生微信小程序代码目录
│   ├── components/     # 需要复用的原生组件
│   ├── pages/          # 需要复用的原生页面
│   └── ...
├── vite.config.ts      # Vite 配置文件
└── ...
```

该 Vite 插件需要实现以下核心功能：

- 构建阶段：将 miniprogram 目录中的目标文件自动同步到 dist 构建目录
- 资源管理：将原生项目的公共模块（如工具库、依赖包等）统一迁移至独立的 shared 命名空间，并自动更新相关模块的引用路径，避免与 uni-app 构建产物发生冲突
- 配置更新：自动维护 app.json 配置文件，处理页面路由注册和全局组件声明
- 开发体验：实现文件系统监听，当检测到 miniprogram 目录的文件变更时，自动触发增量构建

伪代码实现，大概流程就是这样：

```js
function uniWxCopyPlugin(options) {
  let publicBasePath = '' // Vite 的 base 配置
  let configPath = ''     // 最终输出目录
  let isDev = false      // 是否开发环境

  return {
    name: 'vite-plugin-uni-wx-copy',

    // Vite 配置解析完成后执行
    configResolved(config) {
      // 判断是否为微信小程序环境
      if (config.define['process.env.UNI_PLATFORM'] !== '"mp-weixin"') {
        return
      }

      publicBasePath = config.base
      isDev = config.mode === 'development'
    },

    // 构建完成后执行
    writeBundle(options) {
      const p = options.dir // 构建输出目录

      // 如果没有输出目录或 base 配置，则不执行
      if (!p || !publicBasePath) {
        return
      }

      // 计算最终输出目录
      configPath = resolve(publicBasePath, p)

      // 1. 复制原生组件到共享目录
      copy(
        'miniprogram/components' ->
        configPath + '/shared/components'
      )

      // 2. 复制页面
      copy(
        'miniprogram/pages/index' ->
        configPath + '/pages/index'
      )

      // 3. 替换页面中的组件引用路径
      replace(
        file: configPath + '/pages/**/*.json',
        from: '/components/',
        to: '/shared/components/'
      )

      // 4. 开发模式下监听文件变化
      if (isDev) {
        watch('miniprogram/**/*', (changedFile) => {
          if (changedFile.includes('pages/')) {
            copy(
              changedFile ->
              configPath + '/' + changedFile
            )
          }
          else if (changedFile.includes('components/')) {
            copy(
              changedFile ->
              configPath + '/shared/' + changedFile
            )
            replace(
              file: configPath + '/pages/**/*.json',
              from: '/components/',
              to: '/shared/components/'
            )
          }
        })
      }
    }
  }
}
```

有了这个插件，在每个项目通过配置，就能快速实现混合开发：

```js
import uni from "@dcloudio/vite-plugin-uni";
import { defineConfig } from "vite";
import uniWxCopy from "vite-plugin-uni-wx-copy";

export default defineConfig({
  plugins: [
    uni(),
    uniWxCopy({
      rootDir: "../miniprogram",
      // 复制共享资源
      copy: [
        {
          sources: ["components", "static", "utils"],
          dest: "shared/",
          shared: true,
        },
      ],
      // 主包页面
      pages: ["pages/index", "pages/page1", "pages/page2"],
      // 分包配置
      subPackages: [
        {
          root: "subpackages",
          pages: ["detail"],
        },
      ],
      // 重写 app.json 以添加全局组件
      rewrite: [
        {
          file: "app.json",
          write: code => {
            const appJson = JSON.parse(code);
            appJson.usingComponents = {
              ...appJson.usingComponents,
              "app-btn": "/shared/components/app-btn/app-btn",
            };
            return JSON.stringify(appJson, null, 2);
          },
        },
      ],
    }),
  ],
});
```

还需要解决一个关键问题：原生小程序页面与 uni-app 主体之间的状态共享，包括环境配置、用户信息等运行时数据。

由于不同项目的业务场景各不相同，我们采用了一种可定制的状态共享方案：

1. 利用小程序全局实例 `getApp()` 作为跨技术栈的通信桥梁，在 uni-app 项目中实现状态管理和更新的核心逻辑
2. 在构建过程中，通过字符串匹配，将原生项目中的方法替换成 `getApp()` 提供的统一接口

举个例子，将原本的鉴权方法改成通过 getApp 使用 uni-app 提供的：

```js
// auth.getUserInfo( -> auth.getApp().getUserInfo(
{
  replaceRules: {
    from: /auth.getUserInfo\(/g,
    to: 'getApp().getUserInfo(',
    files: [
      ...pages.map(page => path.join(configPath, page, '**/*.js')),
      ...shared.sources.map(dir => path.join(configPath, shared.dest, dir, '**/*.js')),
    ],
  },
}
```

再举个例子，动态修改原生项目的开发环境：

```js
{
  rewrite: [
    {
      file: "shared/config/index.js",
      write: code => {
        // eslint-disable-next-line no-param-reassign
        code = code.replace(
          /export const DEV =(.+)/,
          `export const DEV = ${mode === "development" ? "true" : "false"}`
        );

        return code;
      },
    },
  ];
}
```

有兴趣可以看看这个插件：[vite-plugin-uni-wx-copy](https://github.com/gd4Ark/vite-plugin-uni-wx-copy)

## uni-app 项目集成到原生小程序

这种方案核心思路是：将 uni-app 项目的构建产物集成到原生小程序项目中，并注册页面。

没错，就是与上面的方案反过来，这也是得益于 uni-app 提供了一个打包方式：混合分包。

简单说就是将一个 uni-app 项目打包成小程序的一个分包，满足以下场景：

- 既可以实现将功能集成到现有的小程序项目中，同时支持分发到 APP、H5 等
- 微信小程序单个分包限制为 2M，可按需拆分多个分包，且不影响其它平台分发

假设目录结构如下：

```bash
.
├── miniprogram/          # 原生微信小程序项目目录
│   ├── app.js
│   ├── app.json
│   └── ...
└── uni-app-project/     # uni-app 项目目录
    ├── src/
    ├── vite.config.ts
    └── ...
```

在 uni-app 项目的 `package.json` 中配置分包构建命令（根据情况决定是否需要多个分包）：

```json
{
  "scripts": {
    "dev": "run-p 'dev:**'",
    "build": "run-p 'build:**'",
    "dev:pkg-a": "uni -p pkg-a --subpackage=pkg-a",
    "build:pkg-a": "uni build -p pkg-a --subpackage=pkg-a",
    "dev:pkg-b": "uni -p pkg-b --subpackage=pkg-b",
    "build:pkg-b": "uni build -p pkg-b --subpackage=pkg-b"
  },
  "uni-app": {
    "scripts": {
      "pkg-a": {
        "title": "pkg-a",
        "env": {
          "UNI_PLATFORM": "mp-weixin"
        },
        "define": {
          "MP-PKG-A": true
        }
      },
      "pkg-b": {
        "title": "pkg-b",
        "env": {
          "UNI_PLATFORM": "mp-weixin"
        },
        "define": {
          "MP-PKG-B": true
        }
      }
    }
  }
}
```

在 uni-app 项目的 pages.json 中使用条件编译配置分包页面：

```json
{
  "pages": [
    // #ifdef MP-PKG-A
    {
      "path": "pages/index/index"
    },
    // #endif
    // #ifdef MP-PKG-B
    {
      "path": "pages/detail/index"
    }
    // #endif
  ]
}
```

该 Vite 插件需要实现以下核心功能：

- 构建阶段：将 uni-app 的构建产物放到原生小程序项目中
- 开发体验：uni-app 热更新时，更新差异部分

伪代码实现，大概流程就是这样：

```js
function uniSubpackageCopyPlugin(options) {
  return {
    name: "vite-plugin-uni-subpackage-copy",
    // 在其他插件之后执行
    enforce: "post",

    // 构建完成后执行
    async writeBundle(output) {
      // 1. 如果配置了重写规则，先处理文件重写
      if (options.rewrite) {
        for (const rule of options.rewrite) {
          // 读取文件
          const content = readFile(rule.file);
          // 使用重写函数处理内容
          const newContent = rule.write(content);
          // 写入新内容
          writeFile(rule.file, newContent);
        }
      }

      // 2. 使用 rsync 将分包文件从 uni-app 构建目录同步到原生项目
      rsync({
        from: options.subpackageDir, // uni-app 分包构建目录
        to: options.rootDir, // 原生项目目录
        // 保持文件属性，递归同步，压缩传输
        flags: "avz",
        // 删除目标目录中源目录没有的文件
        delete: true,
      });
    },
  };
}
```

在 uni-app 项目的 vite.config.ts 中配置插件：

```js
import uni from "@dcloudio/vite-plugin-uni";
import { defineConfig } from "vite";
import uniSubpackageCopy from "vite-plugin-uni-subpackage-copy";

export default defineConfig({
  plugins: [
    uni(),
    process.env.UNI_PLATFORM === "mp-weixin" &&
      uniSubpackageCopy({
        rootDir: "../miniprogram",
        subpackageDir: process.env.UNI_SUBPACKAGE,
      }),
  ],
});
```

有兴趣可以看看这个插件：[vite-plugin-uni-subpackage-copy](https://github.com/gd4Ark/vite-plugin-uni-subpackage-copy)
