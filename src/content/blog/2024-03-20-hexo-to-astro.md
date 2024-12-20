---
title: 再见 Hexo，你好 Astro！
pubDatetime: 2024-03-20
tags:
  - 博客
description: 终于还是抵挡不住 Astro 的诱惑，抛弃了 Hexo，开始了新的折腾之旅！
---

## 引言

从 Hexo 到 Jekyll，再到 VuePress，最终又回到 Hexo，我一度以为这是我最后的归宿。然而，Astro 的出现，让我沉寂的心又悸动起来。

最近，Astro 可谓是火遍了整个博客圈。眼看着众多博主纷纷从 Hexo 或者其他平台迁移到 Astro，我原本并未放在心上。直到我怀着好奇点开了 Astro 的[主题页面](https://astro.build/themes/)，映入眼帘的 [AstroPaper](https://astro-paper.pages.dev) 主题令我惊叹不已。它竟然如此丝滑流畅，再点开 Astro [介绍页](https://astro.build/)一看，OK！这就立刻迁移到 Astro 平台。

## 迁移过程

迁移过程还算顺利，但为了满足个人需要，还是下了一些功夫，这里记录一下。

### 兼容旧链接

由于 Astro 的页面路径与 Hexo 不同，我需要做一些兼容处理，保证旧链接依然能够正常访问。

以前在 Hexo 中，我可以通过 `permalink` 字段自定义文章路径。然而，Astro 的文章路径是由 md 文件名决定的。例如，我之前一篇名为“2023 年度总结”的文章，其 `permalink` 设置为 post/2023-summary.html，但在 Astro 中，它的路径变为 posts/2024-01-01-2023-summary。

不过好在 Astro 处理起来并不复杂。只需创建一个名为 `post/[slug]/index.astro` 的页面，并在此页面中处理链接，将其与 md 文件中的 `permalink` 字段进行映射即可。

首先修改 `src/content/config.ts`，让它读取 md 文件的 permalink 字段：

```ts
const blog = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      ...
      permalink: z.string().optional(), // [!code ++]
    }),
});
```

然后在 src/pages/post/[slug]/index.astro 处理 permalink 的匹配即可，由于代码过长这里就不贴了，有兴趣点这里查看：[src/pages/post/[slug]/index.astro](https://github.com/gd4Ark/gd4Ark.github.io/blob/astro-paper/src/pages/post/%5Bslug%5D/index.astro)

### 文章目录

AstroPaper 主题本身不具备 TOC 功能，为了方便阅读，我参考 [Astro Cactus](https://astro-theme-cactus.netlify.app/) 主题，添加了一个 TOC 组件，方便阅读，看本篇文章右侧效果 👉

### Disqus 评论组件

AstroPaper 主题也没有评论组件，我参考[这篇文章](https://webdesign-sopelnik.de/en/blog/adding-comments-to-your-astro-blog-with-disqus/)，添加了 Disqus 评论组件。

### 代码高亮主题切换

Astro 使用 Shiki 作为代码高亮器，原生支持浅色和深色两种主题。然而，当我配置完成后，却发现切换到深色模式时代码高亮主题并未生效。经过排查，我发现 Astro 是直接将样式写到 code 标签的 style 属性中，而切换深色模式时并不会改变这些样式。因此，需要在 `base.css` 文件中手动覆写样式才能实现代码高亮主题的切换。

```css
html[data-theme="dark"] .astro-code,
html[data-theme="dark"] .astro-code span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  /* Optional, if you also want font styles */
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

此外，Shiki 还支持 transformers 样式（就是上面那种 diff 样式），需要额外配置样式才能生效。有兴趣参考 [src/styles/base.css](https://github.com/gd4Ark/gd4Ark.github.io/blob/astro-paper/src/styles/base.css)，这里不赘述。

### RSS

Astro 自带 RSS 插件，用就完事了。默认情况下，是不带全文的，如需全文输出，可使用 sanitize-html 和 markdown-it 进行解析和输出，具体方法可参考官方文档。

此外，AstroPaper 主题只有 /rss.xml 这种路径，而我之前的博客同时支持 /rss.xml 和 /atom.xml 两种路径。为了避免更新博客后订阅者（如果有的话..）无法正常收到文章更新，我将 `rss.xml.ts` 文件复制一份并命名为 `atom.xml.ts`。如果需要支持其他路径，同样方式处理即可。

## 整体感受

以前对 Hexo 主题的博客也做了不少定制化的工作，但改起来总觉得有点别扭的，可能是因为 ejs 或者 swig 引擎的缘故，Astro 使用类似 Vue 的语法，并提供了 Next.js 一样的路由和构建方式，让开发更加自然流畅。

而在用户体验上，得益于 View Transitions API 的加持，使切换页面更加流畅，无缝衔接。

总之，的确不错。如果你也喜欢折腾，那就快来试试 Astro 吧！
