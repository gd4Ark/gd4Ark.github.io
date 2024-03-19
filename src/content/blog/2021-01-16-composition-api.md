---
title: 从 Composition API 源码分析 getCurrentInstance() 为何返回 null
tags:
  - 前端
  - Vue
  - 源码解析
permalink: /post/87ba8d8b.html
pubDatetime: 2021-01-16 22:39:55
---

## 前言

如果同学们已经开始使用 Composition API，那么我们可能都会遇到类似的问题，那就是有时候我们调用 `getCurrentInstance()` ，它返回的居然是 `null` ，举个例子：

```html
<template>
  <div>
    <p>{{ count }}</p>
    <button @click="increase">Increase</button>
  </div>
</template>

<script>
  import {
    defineComponent,
    ref,
    getCurrentInstance
  } from '@vue/composition-api'

  function useIncrease() {
    const count = ref(0)

    function increase() {
      count.value++

      // 假设我们还要访问当前实例来做些什么
      getCurrentInstance().doSomething // 但 getCurrentInstance() 返回的是 null
    }

    return {
      count,
      increase
    }
  }

  export default defineComponent({
    setup() {
      const { count, increase } = useIncrease()

      return {
        count,
        increase
      }
    }
  })
</script>
```

或许有些同学已经知道，只要我们把该方法的调用摆到外面，那它就能正常工作了：

```diff
function useIncrease() {
+  const vm = getCurrentInstance()
  const count = ref(0)

  function increase() {
    count.value++

-   getCurrentInstance().doSomething
+   vm.doSomething // 这时能够正常访问
  }

  return {
    count,
    increase,
  }
}
```

另外其实不止 `getCurrentInstance()` ，还有诸如： `useStore` 、 `useRouter` 这些跟 Vue 实例沾边的都会有这个问题，不过本文只讨论 `getCurrentInstance()`，至于其它这些我不太清楚，所以不敢乱下结论。

我之前对此一直没怎么深究，满足于知道这样做能使它正常工作就足够了。但是，当我今天看到这篇文章《[使用 Vue3 的 CompositionAPI 来优化代码量](https://juejin.cn/post/6917592199140458504)》的时候，里面也提到了一样的问题，只是这位同学认为像 `getCurrentInstance()` 方法只能在 `setup()` 中调用，而无法在外部的 `hooks` 方法中调用时，我意识到这个问题必须得讲清楚，否则会造成很多误解。

但当我想在评论区提醒一波时，我发现其实我也不清楚背后的缘由，索性就趁此机会，好好了解一下为什么会有这么神奇的事情。毕竟，只知道能工作的解决方法是不够的，还要知道它为什么会这样。

但 Google 一番，发现没有对这个问题做太多解读（难道这件事不值得疑惑吗？），从 Composition API 官方仓库的 [issue](https://github.com/vuejs/composition-api/issues/455) 中，也只是给出了与上面类似的解决方案，但并没有说为什么要这样，对此我就更加疑惑了。

所以，本文就来分析一下，到底为什么在不同的位置调用 `getCurrentInstance()` 得到的结果会不一样呢？

## 太长不读

为了不浪费同学们宝贵的时间，我先把重点放到前面，首先是到底什么时候才能访问通过 `getCurrentInstance()` 当前实例：

1. 只要在 `setup()` 内部调用的任何方法，都能获取到当前实例，无论函数调用栈有多深
2. 但只能在同步代码中才能访问，其它的诸如 `setTimeout`、 `DOM 事件` 、 `Promise` 这类异步代码均无法访问（建议再回头看看上面的例子

无法访问的原因是：

1. Composition API 会在调用组件的 `setup()` 前，先拿一个变量存放当前实例，以供调用 `getCurrentInstance()` 时返回，源码：[mixin.ts#L95](https://github.com/vuejs/composition-api/blob/master/src/mixin.ts#L95) 和 [instance.ts#L116](https://github.com/vuejs/composition-api/blob/master/src/utils/instance.ts#L116)
2. 执行完 `setup()` 以后，会把用于存放当前实例的变量值恢复到以前的模样（也就是 `null` ），源码：[instance.ts#L126](https://github.com/vuejs/composition-api/blob/master/src/utils/instance.ts#L126)
3. 所以，当 Composition API 内部执行到我们组件的 `setup()` 时，所有的同步代码都能访问到当前实例，但那些异步代码再去访问时，它已经恢复成 `null` 了。

好了，就是这么简单，相信同学们下次再遇到这种问题时，就不会疑惑为什么 `getCurrentInstance()` 会返回 `null` ，因为我们知道背后的运行逻辑。

结论说完了，下面开始分享一下我分析这个问题的整个过程，也希望能对同学们有一些启发。

## 分析过程

想知道问题的所在，最直接的方法就是看源码，但是直接 clone 项目下来从头看，显然不及通过打断点来得高效，毕竟我们现在的目的还不是学习它的源码设计，只是想知道它其中一部分的运行逻辑。

我们用下面的代码来做例子：

```html
<script>
  import { defineComponent, getCurrentInstance } from '@vue/composition-api'

  export default defineComponent({
    setup() {
      debugger
      console.log(getCurrentInstance())

      setTimeout(() => {
        debugger
        console.log(getCurrentInstance())
      })
    }
  })
</script>
```

可以看到，我们在两处调用的地方之前都加了一个断点， 先看看它们执行起来有何不同。

第一次调用的内部是这样的，这时候它能够访问：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/image.png)

而第二次调用的内部是这样的，这时候它已经变成了 `null` ：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20210116224432.png)

可以看到 `getCurrentInstance()` 的内部非常简单，只是将 `currentInstance` 给返回出来了，而这个变量显然是在外部定义的，那为什么两次调用，它的值就发生了变化呢？

我们留意到断点进来的文件是：vue-composition-api.esm.js，那我们直接在 `node_modules` 下打开这个文件，先搜索一下有哪些地方修改了 `currentInstance` 这个变量，根据上图就能看到是通过 `setCurrentInstance()` 方法来修改，于是我们搜索一下这个方法的调用：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20210116224450.png)

可以看到一共有四处（其中一处是定义），但是光靠肉眼看也很难看出来什么，所以还是老方法，在每个调用之前加一个断点（是的，我们可以直接修改 `node_modules` 下的代码来进行调试），然后我们发现第一次调用是在 `activateCurrentInstance` ：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20210116224510.png)

这时候我们仔细看看这个方法的内部，就能看出些端倪：

1. 上图显示 `preVm` 是一个 `null`
2. 而 `vm` 是一个 Vue 的实例
3. 执行完 `fn(vm)` 后，又将 `preVm` 传入到 `setCurrentInstance()` 去了

所以，我们看看这个 `fn(vm)` 内部是什么，搜索 `activateCurrentInstance()` 的调用，发现一个很可疑的地方：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20210116224526.png)

很明显这里就是执行组件 `setup()` 函数的地方，再结合上图来看，我们得出结论：

1. 在执行组件 `setup()` 函数前，先把当前实例存放起来
2. 然后执行组件 `setup()` 函数时， `setup()` 函数内部自然就能通过 `getCurrentInstance()` 访问当前实例了
3. 等执行完 `setup()` 后，又将 `currentInstance` 重置回 null 去了（注意是同步执行 `setup()`
4. 后面 `setup()` 内部的异步代码再去调用 `getCurrentInstance()` ，其实已经是 `null` 了

如果还不太理解的同学，建议先补一下 JavaScript 的：事件循环、同步、异步、宏任务、微任务这些概念。

## 总结

至此，整个分析过程就结束了，你可能也会觉得很简单，我觉得你上你也行，所以不要觉得这些底层库的运行原理很难捉摸，出了问题也先别一味抱怨或者尝试各种 HACK，为何不直接看看它的运行逻辑呢？

所以，大胆 debug 吧，少年。
