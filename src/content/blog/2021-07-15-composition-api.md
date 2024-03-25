---
title: composition-api 源码解析
pubDatetime: 2021-07-15
permalinks:
  - /post/composition-api-score-code.html
  - /post/composition-api-score-code
  - /posts/composition-api
tags:
  - 前端
  - Vue
  - 源码解析
---

## 版本说明

本文是针对 composition-api [v1.0.0-rc.6](https://github.com/vuejs/composition-api/releases/tag/v1.0.0-rc.6) 版本的一次源码解析，主要是想探析以下两点：

1. Vue 在安装 composition-api 时做了些什么？
2. Vue 在执行每个组件的 `setup` 方法时做了什么？

好了，废话不多说，我们直接开始。

## 一、安装过程

### 1. 检测是否已安装

```javascript
// src/install.ts

if (isVueRegistered(Vue)) {
  if (__DEV__) {
    warn(
      "[vue-composition-api] already installed. Vue.use(VueCompositionAPI) should be called only once."
    );
  }
  return;
}
```

首先是检查是否重复安装，如果是则在开发环境中发出警告，主要是调用了 `isVueRegistered` 方法来进行检测，下面是它的定义：

```javascript
// src/runtimeContext.ts

const PluginInstalledFlag = '__composition_api_installed__'

export function isVueRegistered(Vue: VueConstructor) {
  return hasOwn(Vue, PluginInstalledFlag)
}
```

通过检测 Vue 的 `__composition_api_installed__`   这个属性来 `composition-api` 是否已经安装。

那很明显后来真正安装 composition-api 时会设置这个属性。

### 2. 检测 Vue 版本

```javascript
if (__DEV__) {
  if (Vue.version) {
    if (Vue.version[0] !== "2" || Vue.version[1] !== ".") {
      warn(
        `[vue-composition-api] only works with Vue 2, v${Vue.version} found.`
      );
    }
  } else {
    warn("[vue-composition-api] no Vue version found");
  }
}
```

然后在开发环境中判断 Vue 的版本，必须是 2.x 的版本才能使用 composition-api。

### 3. 添加 setup 这个 option api

```javascript
Vue.config.optionMergeStrategies.setup = function (
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

接着通过 Vue 的 [自定义选项合并策略](https://cn.vuejs.org/v2/guide/mixins.html#自定义选项合并策略) 来添加 `setup` 这个 api。

ps：是否还有同学不知道我们可以自定义 Vue 的 options 呢？可以尝试利用这个 api 来实现一个 `asyncComputed` 和 `multiWatch` 来玩玩哦！

### 4. 设置已安装标记

```javascript
// src/runtimeContext.ts

const PluginInstalledFlag = '__composition_api_installed__'

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

上面提到过，就是在这里设置一个表示已经安装的标记。

### 5. 设置全局混合

```javascript
Vue.mixin({
  beforeCreate: functionApiInit,
  // ... other
});
```

然后添加一个全局的 `mixin` ，在每个组件的 `beforeCreate` 生命周期执行一下 `functionApiInit` 方法。

以上就是安装 composition-api 做的事，关于 `functionApiInit` 的内容我们在下一小节中详细讲解 。

## 二、执行 setup

我们知道  composition-api 主要是新增了一个 `setup` 选项，以及一系列 hooks，而 `steup` 也不是简单调用一下就完事，在这之前需要做一些事，比如传入的两个参数： `props` 、 `ctx` 是怎么来的，以及 `setup` 的返回值为何可以在 `template` 中使用等等。

前面讲了 compsition-api 会在每个组件的 `beforeCreate` 时执行一下 `functionApiInit` 方法 ：

```javascript
Vue.mixin({
  beforeCreate: functionApiInit,
  // ... other
});
```

下面是这个方法主要做的事。

### 1. 检测是否有 render

第一步是检测是否定义 `render` 方法，如果有 `render` 方法，则修改它内部。

```javascript
const vm = this
const $options = vm.$options
const { setup, render } = $options

if (render) {
  // keep currentInstance accessible for createElement
  $options.render = function (...args: any): any {
    return activateCurrentInstance(vm, () => render.apply(this, args))
  }
}
```

`activateCurrentInstance` 的作用就是设置当前实例，所以我们可以在 `render` 中通过 `getCurrentInstance` 访问到当前实例。

ps：值得说明的是即便我们写的是 `template` ，但到了目前这个阶段这里它已经被转换成 `render` 函数了。

### 2. 检测是否有 setup

如果没有定义 `setup` ，说明这个组件没有使用 `composition-api` ，这时候则直接跳过该组件：

```javascript
if (!setup) {
  return;
}
if (typeof setup !== "function") {
  if (__DEV__) {
    warn(
      'The "setup" option should be a function that returns a object in component definitions.',
      vm
    );
  }
  return;
}
```

### 3. 在 data 方法初始化 setup

如果存在 `setup` ，就会修改这个组件的 `data` 方法，在初始化真正的 `data` 方法之前先初始化一下 `setup` 方法：

```javascript
const {
    data
} = $options
// wrapper the data option, so we can invoke setup before data get resolved
$options.data = function wrappedData() {
    initSetup(vm, vm.$props)
    return typeof data === 'function' ?
        (data as(this: ComponentInstance, x: ComponentInstance) => object).call(
            vm,
            vm
        ) :
        data || {}
}
```

还记得 Vue 初始化 `data` 的时机是什么时候吗？答案是在 `beforeCreate` 和 `created` 之间，所以 `setup` 也是一样。

### 4. 初始化 setup

`initSetup` 方法内部还做了挺多事的，下面是这个方法的全貌，先简单瞄一眼，我们后面会一步步拆解：

```javascript
function initSetup(vm: ComponentInstance, props: Record < any, any > = {}) {
    const setup = vm.$options.setup!
        const ctx = createSetupContext(vm)
    // fake reactive for `toRefs(props)`
    def(props, '__ob__', createObserver())
    // resolve scopedSlots and slots to functions
    // @ts-expect-error
    resolveScopedSlots(vm, ctx.slots)
    let binding: ReturnType < SetupFunction < Data, Data >> | undefined | null
    activateCurrentInstance(vm, () => {
        // make props to be fake reactive, this is for `toRefs(props)`
        binding = setup(props, ctx)
    })
    if (!binding) return
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
    } else if (isPlainObject(binding)) {
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
    if (__DEV__) {
        assert(
            false,
            `"setup" must return a "Object" or a "Function", got "${Object.prototype.toString
        .call(binding)
        .slice(8, -1)}"`
        )
    }
}
```

#### 4.1. 初始化 context

这个 `ctx` 是 `setup` 中接受的第二个参数，这个对象里面的内容是怎么生成的呢？

```javascript
const ctx = createSetupContext(vm);
```

下面是 `createSetupContext` 所做的事，首先是定义 `ctx` 对象中所有的 `key` ：

```javascript
const ctx = {
    slots: {}
}
as SetupContext

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

接下来就是给这些属性利用 `Object.defineProperty` 做一层代理，当然它们都是只读的：

```javascript
propsPlain.forEach(key => {
  let srcKey = `$${key}`;
  proxy(ctx, key, {
    get: () => vm[srcKey],
    set() {
      warn(`Cannot assign to '${key}' because it is a read-only property`, vm);
    },
  });
});
```

另外两个 `propsReactiveProxy` 和 `methodReturnVoid` 也差不多，这里就略过了。

#### 4.2. 响应式 props

接着就是将 `props` 对象进行一遍 Observer：

```javascript
def(props, "__ob__", createObserver());

// src/reactivity/reactive.ts
export function createObserver() {
  return observe < any > {}.__ob__;
}
```

首先通过 `createObserver` 拿到一个把空对象经过 Vue. Observer 后的 `__ob__` 属性，也就是当前 `Observer` 实例对象，如果同学们对于 Vue Observer 的原理还不太熟悉，可以看这里 [数据对象的 ](http://caibaojian.com/vue-design/art/7vue-reactive.html#%E6%95%B0%E6%8D%AE%E5%AF%B9%E8%B1%A1%E7%9A%84-ob-%E5%B1%9E%E6%80%A7)，本文就不赘述了。

然后给 `props` 新增一个 `__ob_` 属性，指向前面拿到的这个 `__ob__` 。

#### 4.3. 解析 slots

接着就是把当前实例的 `slots` 给代理到前面定义的 `ctx.slots` 中，这时候它只是一个空对象：

```javascript
resolveScopedSlots(vm, ctx.slots);
```

下面是 `resolveScopedSlots` 的实现：

```javascript
export function resolveScopedSlots(
    vm: ComponentInstance,
    slotsProxy: {
        [x: string]: Function
    }
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

简单来说就是将父组件的 `slots` 数组（真正被使用的）代理到 `ctx.slots` 中，并且在这个 `slots` 数组有变化时 `ctx.slots` 也会相应地更新。

#### 4.4. 执行 setup

终于到了最重要的关头，开始执行 `setup` 了：

```javascript
activateCurrentInstance(vm, () => {
  // make props to be fake reactive, this is for `toRefs(props)`
  binding = setup(props, ctx);
});
```

`activateCurrentInstance` 之前讲过了，就是使组件的 `setup` 内部可以通过 `getCurrentInstance` 访问当前实例，相信真正使用过 `composition-api` 的同学们都知道这个方法的便利性了，但不知道同学们是否遇到过 `getCurrentInstance` 方法返回 `null` 值的情况呢？如果想知道为什么，可以看这篇文章：[《从 Composition API 源码分析 getCurrentInstance() 为何返回 null》](https://4ark.me/post/87ba8d8b.html)。

然后将前面得到的 `props` 和 `ctx` 传进去，最后将返回值赋值给 `binding` 。

#### 4.6. 处理 setup 返回值

处理返回值前需要先对它进行类型判断，有三种条件分支：

1. 为空，直接返回
1. 是一个函数，当成 `render` 方法处理
1. 是一个普通对象，做一系列转换

如果返回值是一个函数，则把它当成 `render` 方法处理，当然在这之前需要重新调用一下 `resolveScopedSlots` 检测 `slots` 的更新，并且调用 `activateCurrentInstance`  ：

```javascript
if (isFunction(binding)) {
  // keep typescript happy with the binding type.
  const bindingFunc = binding;
  // keep currentInstance accessible for createElement
  vm.$options.render = () => {
    // @ts-expect-error
    resolveScopedSlots(vm, ctx.slots);
    return activateCurrentInstance(vm, () => bindingFunc());
  };
  return;
}
```

ps：也可以直接在 `setup` 中返回 `JSX` 哦，因为 Babel 会把它变成一个函数。

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

## 总结

关于 composition-api 的安装和执行过程就讲完了，下面我们来简单总结一下，composition-api 在安装时会做以下事情：

1. 通过检查 Vue 的 `__composition_api_installed__` 属性来判断是否重复安装
2. 检查 Vue 版本是否 2.x
3. 使用合并策略添加 `setup` api
4. 标记安装
5. 利用全局混入来对 `setup` 进行初始化

而在执行 `setup` 时会做以下事情：

1. 检查当前组件是否使用 `render` 方法，如果有则在这之前标记当前实例，以便 `render` 方法内部可以通过 `getCurrentInstance` 方法访问到当前实例。
2. 检查当前组件有 `setup` api，没有则直接返回，否则在初始化 `data` 时先初始化一下 `setup`
3. 而初始化 `setup` 做的事就是构造 `setup` 接受的两个参数：props、ctx
4. 然后执行 `setup` ，根据它的返回值类型进行相应的处理

当然，compsition-api 真正的魅力在于 hooks，下次我就来讲讲 composition-api 的一系列 hooks 是如何实现的，这也能帮助我们更好地利用这些 hooks 方法来编写更优雅、可复用的代码。

本文就到此，感谢你的阅读。
