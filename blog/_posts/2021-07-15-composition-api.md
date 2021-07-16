---
title: composition-api 源码解析
date: 2021-07-15
permalink: /post/composition-api-score-code
tags:
  - 前端
  - Vue
  - 源码解析
---

## 版本说明

本文是针对 composition-api [v1.0.0-rc.6](https://github.com/vuejs/composition-api/releases/tag/v1.0.0-rc.6) 版本的一次源码解析。

## 一、安装过程

### 1. 检测是否已安装

```javascript
// src/install.ts

if (isVueRegistered(Vue)) {
  if (__DEV__) {
    warn(
      '[vue-composition-api] already installed. Vue.use(VueCompositionAPI) should be called only once.'
    )
  }
  return
}
```

调用了 `isVueRegistered` 方法，下面是它的定义：

```javascript
// src/runtimeContext.ts

const PluginInstalledFlag = '__composition_api_installed__'

export function isVueRegistered(Vue: VueConstructor) {
  return hasOwn(Vue, PluginInstalledFlag)
}
```

通过检测 Vue 的 `__composition_api_installed__`   这个属性来 `composition-api` 是否已经安装。

### 2. 检测 Vue 版本

```javascript
if (__DEV__) {
  if (Vue.version) {
    if (Vue.version[0] !== '2' || Vue.version[1] !== '.') {
      warn(
        `[vue-composition-api] only works with Vue 2, v${Vue.version} found.`
      )
    }
  } else {
    warn('[vue-composition-api] no Vue version found')
  }
}
```

### 3. 添加 setup 这个 option api

```javascript
Vue.config.optionMergeStrategies.setup = function(
  parent: Function,
  child: Function
) {
  return function mergedSetupFn(props: any, context: any) {
    return mergeData(
      typeof parent === 'function' ? parent(props, context) || {} : undefined,
      typeof child === 'function' ? child(props, context) || {} : undefined
    )
  }
}
```

### 4. 设置已安装标记

```javascript
// src/runtimeContext.ts

export function setVueConstructor(Vue: VueConstructor) {
  // @ts-ignore
  if (__DEV__ && vueConstructor && Vue.__proto__ !== vueConstructor.__proto__) {
    warn('[vue-composition-api] another instance of Vue installed')
  }
  vueConstructor = Vue
  Object.defineProperty(Vue, PluginInstalledFlag, {
    configurable: true,
    writable: true,
    value: true
  })
}
```

### 5. 设置全局混合

```javascript
Vue.mixin({
  beforeCreate: functionApiInit
  // ... other
})
```

以上就是安装 compositionAPI 时大概做的事，下面针对各种细节问题再进行深入探讨。

## 二、执行 setup

我们知道  compositionAPI 主要是新增了一个 `setup` 选项，以及一系列 api，而 `steup` 也不是简单调用一下就完事，在这之前需要做一些事情，比如传入的两个参数：`props`、`ctx` 是怎么来的，比如如何处理 `setup` 返回的东西等等。

现在我们看看执行 `setup` 时发生的事情，前面讲了安装时会在 `beforeCreate` 时执行一下 `functionApiInit` 方法 ：

```javascript
Vue.mixin({
  beforeCreate: functionApiInit
  // ... other
})
```

下面是这个方法中做的事情。

### 1. 检测是否有 render

第一步是检测是否定义 `render` 方法，如果有 `render` 方法，则修改它内部。

```javascript
const vm = this
const $options = vm.$options
const { setup, render } = $options

if (render) {
  // keep currentInstance accessible for createElement
  $options.render = function(...args: any): any {
    return activateCurrentInstance(vm, () => render.apply(this, args))
  }
}
```

`activateCurrentInstance` 的作用就是设置实例，这样才可以通过 `getCurrentInstance` 访问到当前实例，所以这时候我们可以在 `render` 中通过这个方法来获取当前实例。

注意：就算我们写的是 `template`，但到了 `compositionAPI` 这里它已经被转换成 `render` 函数了。

### 2. 检测是否有 setup

如果没有定义 `setup` ，则直接收工：

```javascript
if (!setup) {
  return
}
if (typeof setup !== 'function') {
  if (__DEV__) {
    warn(
      'The "setup" option should be a function that returns a object in component definitions.',
      vm
    )
  }
  return
}
```

### 3. 在 data 方法初始化 setup

如果存在 `setup` ，就会修改 `data` 方法，在初始化真正的 `data` 方法之前先初始化一下 `setup`方法：

```javascript
const { data } = $options
// wrapper the data option, so we can invoke setup before data get resolved
$options.data = function wrappedData() {
  initSetup(vm, vm.$props)
  return typeof data === 'function'
    ? (data as (this: ComponentInstance, x: ComponentInstance) => object).call(
        vm,
        vm
      )
    : data || {}
}
```

还记得 Vue 初始化 `data` 的时机是什么时候吗？没错，是在 `beforeCreate` 和 `created` 之间，所以同样的 `setup` 也是一样。

### 4. 初始化 setup

`initSetup` 方法内部还做了挺多事情的，下面一步步拆解。

#### 4.1. 初始化 context

`ctx` 是 `setup` 中的第二个参数，这个对象里面的内容是怎么生成的呢？

```javascript
const ctx = createSetupContext(vm)
```

下面是 `createSetupContext` 所做的事情，首先是定义 `ctx` 对象中所有的 `key` ：

```javascript
const ctx = { slots: {} } as SetupContext

const propsPlain = [
  'root',
  'parent',
  'refs',
  'listeners',
  'isServer',
  'ssrContext',
]
const propsReactiveProxy = ['attrs']
const methodReturnVoid = ['emit']
```

就下来就是给这些属性利用 `Object.defineProperty` 做一层代理，当然它们都是只读的：

```javascript
propsPlain.forEach((key) => {
  let srcKey = `$${key}`
  proxy(ctx, key, {
    get: () => vm[srcKey],
    set() {
      warn(`Cannot assign to '${key}' because it is a read-only property`, vm)
    }
  })
})
```

另外两个也差不多，这里就略过了。

#### 4.2. 响应式 props

接着就是将 `props` 对象进行 Observer：

```javascript
def(props, '__ob__', createObserver())

// src/reactivity/reactive.ts
export function createObserver() {
  return observe < any > {}.__ob__
}
```

首先通过 `createObserver` 拿到一个把空对象经过 Vue.Observer 后的 `__ob__` 属性，其实就是当前 `Observer` 实例对象，关于 Vue Observer 原理这里不深入讲，可以看这里 [数据对象的 ](http://caibaojian.com/vue-design/art/7vue-reactive.html#%E6%95%B0%E6%8D%AE%E5%AF%B9%E8%B1%A1%E7%9A%84-ob-%E5%B1%9E%E6%80%A7)。

然后给 `props` 新增一个 `__ob_` 属性，指向前面拿到的这个 `__ob__` ，这样做的目的后面再说。

#### 4.3. 解析 slots

接着就是当前实例的 `slots` 给代理到前面定义的 `ctx.slots` 中，这时候它只是一个空对象：

```javascript
resolveScopedSlots(vm, ctx.slots)
```

下面是 `resolveScopedSlots` 的实现：

```javascript
export function resolveScopedSlots(
  vm: ComponentInstance,
  slotsProxy: { [x: string]: Function }
): void {
  const parentVNode = (vm.$options as any)._parentVnode
  if (!parentVNode) return

  const prevSlots = vmStateManager.get(vm, 'slots') || []
  const curSlots = resolveSlots(parentVNode.data.scopedSlots, vm.$slots)
  // remove staled slots
  for (let index = 0; index < prevSlots.length; index++) {
    const key = prevSlots[index]
    if (!curSlots[key]) {
      delete slotsProxy[key]
    }
  }

  // proxy fresh slots
  const slotNames = Object.keys(curSlots)
  for (let index = 0; index < slotNames.length; index++) {
    const key = slotNames[index]
    if (!slotsProxy[key]) {
      slotsProxy[key] = createSlotProxy(vm, key)
    }
  }
  vmStateManager.set(vm, 'slots', slotNames)
}
```

简单来说就是将父组件那边找到有在使用的 `slots` 数组代理到 `ctx.slots` 去，并且在这个 `slots` 数组有变化时 `ctx.slots` 也会相应地更新。

#### 4.4. 执行 setup

终于到了最重要的关头，执行 `setup` 了：

```javascript
activateCurrentInstance(vm, () => {
  // make props to be fake reactive, this is for `toRefs(props)`
  binding = setup(props, ctx)
})
```

`activateCurrentInstance` 之前讲过了，就是使在 `setup` 内部可以通过 `getCurrentInstance` 访问当前实例。

然后将前面得到的 `props` 和 `ctx` 传进去，这时候我们声明的 `setup` 方法就可以通过这两个参数来做一些别的事情，最后将返回值赋值给 `binding` 。

#### 4.6. 处理 setup 返回值

处理返回值前需要先对它进行类型判断，有三种分支：

1. 为空，直接返回
1. 是一个函数，当成 `render` 方法处理
1. 是一个普通对象，做一系列转换

如果返回值是一个函数，则把它当成 `render` 方法处理，当然在这之前需要重新调用一下 `resolveScopedSlots` 以防 `slots` 有更新，并且调用 `activateCurrentInstance` 就不说了  ：

```javascript
if (isFunction(binding)) {
  // keep typescript happy with the binding type.
  const bindingFunc = binding
  // keep currentInstance accessible for createElement
  vm.$options.render = () => {
    // @ts-expect-error
    resolveScopedSlots(vm, ctx.slots)
    return activateCurrentInstance(vm, () => bindingFunc())
  }
  return
}
```

PS：在 `setup` 直接返回 `jsx` 也是可以的哦，因为 babel 会把它变成一个函数。

但通常我们是在 `setup` 返回一个对象，然后可以直接在 `template` 中使用这个这些值，所以我们看看返回值是一个对象的情况：

```javascript
else if (isPlainObject(binding)) {
  if (isReactive(binding)) {
    binding = toRefs(binding) as Data
  }

  vmStateManager.set(vm, 'rawBindings', binding)
  const bindingObj = binding

  Object.keys(bindingObj).forEach((name) => {
    let bindingValue: any = bindingObj[name]

    if (!isRef(bindingValue)) {
      if (!isReactive(bindingValue)) {
        if (isFunction(bindingValue)) {
          bindingValue = bindingValue.bind(vm)
        } else if (!isObject(bindingValue)) {
          bindingValue = ref(bindingValue)
        } else if (hasReactiveArrayChild(bindingValue)) {
          // creates a custom reactive properties without make the object explicitly reactive
          // NOTE we should try to avoid this, better implementation needed
          customReactive(bindingValue)
        }
      } else if (isArray(bindingValue)) {
        bindingValue = ref(bindingValue)
      }
    }
    asVmProperty(vm, name, bindingValue)
  })

  return
}
```

首先如果返回的对象是经过 `reactive` 的，则要调用 `toRefs` 将它的子属性变成 `ref` 包装过的，然后调用 `vmStateManager.set` 将这些属性存放起来，以供别的地方使用。

然后遍历这个对象，经过一系列类型判断和处理后，将它的子属性设置为当前实例的变量，这样我们就可以在 `templte` 或者通过 `this.xxx` 去访问这些变量。

这里的类型处理简单总结一下就是：

1.  如果属性值是一个函数，则这个函数被调用时已经 `this` 就是当前实例
1.  如果属性值一个非对象非函数的值，则会自动经过 `ref` 包装
1.  如果属性值是一个普通对象且有子属性值为经过 `reactive` 后的数组，则要将这个普通对象也要转换为经过 `reactive` 包装才行，所以我们在开发时要避免如下情况：

```javascript
setup() {
  return {
   	obj: {
      arr: reactive([1, 2, 3, 4])
    }
  }
}
```

最后，在开发环境下判断返回值不是对象是抛出一个错误。到此 `setup` 函数的执行就完了。

## 三、getCurrentInstance 方法

我们知道通过 `getCurrentInstance` 方法可以拿到当前，甚至不需要直接在 `setup` 方法内，只要使用 `getCurrentInstance` 的地方是在 `setup` 调用即可。

关于这个问题以前写过一篇[《从 Composition API 源码分析 getCurrentInstance() 为何返回 null》](https://4ark.me/posts/composition-api/)，这里就不赘述了。
