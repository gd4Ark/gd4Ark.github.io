---
title: ​​uni-app 彻底解决滚动穿透：支持嵌套弹窗的自动化控制方案
pubDatetime: 2025-10-29
tags:
  - 前端
  - uni-app
description: ""
---

## 前言

在应用开发过程中，“页面滚动穿透”这一问题常常会严重影响用户体验。

举个例子：当弹窗出现时，理应禁止底部页面滚动。但在微信小程序等平台，想要彻底解决滚动穿透的问题却并不简单。以往我们通常会在弹窗上加一个 `catchtouchmove="noop"`，或者用 `scroll-view` 把整个页面包裹起来。这样的方式不仅每个页面和弹窗组件都要单独处理，也容易忘记，非常繁琐。

本文将带来一种简单高效、即插即用的解决方案，能够彻底杜绝滚动穿透难题。

## 基本盘

我希望这个方案有一个大前提：必须是在开发时无感知，即插即用。

换句话说，我们在开发过程中无需过多操心，这一问题可以交由某个统一的机制自动处理。

先来看看解决这个问题的一个基本盘：page-meta，从微信基础库 2.9.0 开始，新增了 page-meta 组件，它是一个特殊的标签，有点类似 html 里的 header 标签。页面的背景色、原生导航栏的参数，都可以写在 page-meta 里。HBuilderX 2.6.3+ 支持了这个组件，并且全平台都实现了。

我们可以通过 page-meta 组件来动态修改页面的 overflow 属性，从而实现动态控制页面滚动。

既然如此，意味着我们只需要在页面所有的弹窗显示时，去通知页面修改这个属性，就能解决这个问题。

## 设计方案

实现目标是通过设计一个 Vue Hooks 让它统一处理这个滚动状态，理想的使用方式应该是这样：

在每个页面中添加这段代码：

```js
<page-meta :page-style="pageMetaStyle"></page-meta>

const { pageMetaStyle } = useLockPageScroll()
const { pageScrollLocked, pageMetaStyle } = useLockPageScroll()
```

在项目中所有弹窗组件中添加这段代码：

```js
const { setPageScrollLocked } = useLockPageScroll();

// 当打开弹窗时
setPageScrollLocked(true);
// 当关闭弹窗时
setPageScrollLocked(false);
```

在实际项目中，还有一些情况需要考虑：

1. 嵌套弹窗：只有当关闭所有弹窗时才会解锁页面滚动
2. 非常复杂的页面，比如多 tab，它们的滚动锁定应该是独立的，所以应该需要区分上下文
3. 每次新增页面都要添加这段模板代码，还是比较麻烦，因此将会通过 Vite 插件自动注入这些代码

## 实现细节

为了可以优雅解决这个问题，我们必须实现一个机制：
