---
title: vuex 源码解析
pubDatetime: 2021-07-15
permalink: /post/vuex-score-code.html
tags: 
  - 前端
  - Vue
  - 源码解析
---

## 版本说明

本文是针对 vuex [v3.6.2](https://github.com/vuejs/vuex/releases/tag/v3.6.2) 版本的一次源码解析，主要是想研究以下几点：

1. vuex 的初始化过程
2. vuex 的数据状态如何存放
3. 调用一个 mutation 时做了什么
4. mapState、mapActions 这些绑定函数的实现

## 一、初始化过程

我们平时使用 vuex 的时候需要先通过 new 一个 `Vuex.Store` 来创建一个 store，下面我们就看看在构造一个 store 时需要经过哪些操作，我们先来看看它的构造函数，它的源码在 [src/store.js](https://github1s.com/vuejs/vuex/blob/HEAD/src/store.js)：

```javascript
let Vue // bind on install

export class Store {
  constructor(options = {}) {
    // Auto install if it is not done yet and `window` has `Vue`.
    // To allow users to avoid auto-installation in some cases,
    // this code should be placed here. See #731
    if (!Vue && typeof window !== 'undefined' && window.Vue) {
      install(window.Vue)
    }

    if (__DEV__) {
      assert(Vue, `must call Vue.use(Vuex) before creating a store instance.`)
      assert(
        typeof Promise !== 'undefined',
        `vuex requires a Promise polyfill in this browser.`
      )
      assert(
        this instanceof Store,
        `store must be called with the new operator.`
      )
    }

    const { plugins = [], strict = false } = options

    // store internal state
    this._committing = false
    this._actions = Object.create(null)
    this._actionSubscribers = []
    this._mutations = Object.create(null)
    this._wrappedGetters = Object.create(null)
    this._modules = new ModuleCollection(options)
    this._modulesNamespaceMap = Object.create(null)
    this._subscribers = []
    this._watcherVM = new Vue()
    this._makeLocalGettersCache = Object.create(null)

    // bind commit and dispatch to self
    const store = this
    const { dispatch, commit } = this
    this.dispatch = function boundDispatch(type, payload) {
      return dispatch.call(store, type, payload)
    }
    this.commit = function boundCommit(type, payload, options) {
      return commit.call(store, type, payload, options)
    }

    // strict mode
    this.strict = strict

    const state = this._modules.root.state

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    installModule(this, state, [], this._modules.root)

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    resetStoreVM(this, state)

    // apply plugins
    plugins.forEach((plugin) => plugin(this))

    const useDevtools =
      options.devtools !== undefined ? options.devtools : Vue.config.devtools
    if (useDevtools) {
      devtoolPlugin(this)
    }
  }
}
```

代码不是很长，下面我们逐段分析一下这个构造函数中做了哪些操作。

### 1. 自动安装

```javascript
let Vue // bind on install

export class Store {
  constructor(options = {}) {
    // Auto install if it is not done yet and `window` has `Vue`.
    // To allow users to avoid auto-installation in some cases,
    // this code should be placed here. See #731
    if (!Vue && typeof window !== 'undefined' && window.Vue) {
      install(window.Vue)
    }
  }
}

export function install(_Vue) {
  if (Vue && _Vue === Vue) {
    if (__DEV__) {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}
```

`new Store` 的时候如果还未安装，并且已经有全局引入 Vue 的情况下，就会自动安装，但如果已经安装，则无需再次安装。

安装的时候会执行一下 `applyMixin` ，它的源码位在 [src/mixin.js](https://github1s.com/vuejs/vuex/blob/HEAD/src/mixin.js)：

```javascript
export default function (Vue) {
  const version = Number(Vue.version.split('.')[0])

  if (version >= 2) {
    Vue.mixin({
      beforeCreate: vuexInit
    })
  } else {
    // override init and inject vuex init procedure
    // for 1.x backwards compatibility.
    const _init = Vue.prototype._init
    Vue.prototype._init = function (options = {}) {
      options.init = options.init ? [vuexInit].concat(options.init) : vuexInit
      _init.call(this, options)
    }
  }

  /**
   * Vuex init hook, injected into each instances init hooks list.
   */

  function vuexInit() {
    const options = this.$options
    // store injection
    if (options.store) {
      this.$store =
        typeof options.store === 'function' ? options.store() : options.store
    } else if (options.parent && options.parent.$store) {
      this.$store = options.parent.$store
    }
  }
}
```

其实就是只做了一件事：将 store 挂载到 `$store` ，所以我们可以在 `vue` 组件中通过 `$store` 访问到 store。

### 2. 异常检测

如果是在开发环境的话，就会做一些检查：

```javascript
if (__DEV__) {
  assert(Vue, `must call Vue.use(Vuex) before creating a store instance.`)
  assert(
    typeof Promise !== 'undefined',
    `vuex requires a Promise polyfill in this browser.`
  )
  assert(this instanceof Store, `store must be called with the new operator.`)
}
```

### 3. 初始化内部变量

然后定义了一系列内部变量，这些变量后面都会讲到的：

```javascript
const { plugins = [], strict = false } = options

// store internal state
this._committing = false
this._actions = Object.create(null)
this._actionSubscribers = []
this._mutations = Object.create(null)
this._wrappedGetters = Object.create(null)
this._modules = new ModuleCollection(options)
this._modulesNamespaceMap = Object.create(null)
this._subscribers = []
this._watcherVM = new Vue()
this._makeLocalGettersCache = Object.create(null)

// bind commit and dispatch to self
const store = this
const { dispatch, commit } = this
this.dispatch = function boundDispatch(type, payload) {
  return dispatch.call(store, type, payload)
}
this.commit = function boundCommit(type, payload, options) {
  return commit.call(store, type, payload, options)
}

// strict mode
this.strict = strict

const state = this._modules.root.state
```

这里有几点比较值得关注的，下面来逐一讲讲。

#### 3.1. 构造 modules

```javascript
this._modules = new ModuleCollection(options)
```

它会通过 new 一个 ModuleCollection 并传入 options 得到 modules，ModuleCollection 内部会递归注册所有的子模块。

最终返回一个类似如下的数据结构：

```javascript
{
    runtime: false,
    state: {},
    _children: {
        subModule1: Module {
            runtime: false,
            _children: {
                …},
            _rawModule: {
                …},
            state: {
                …}
        },
        subModule2: Module {
            runtime: false,
            _children: {
                …},
            _rawModule: {
                …},
            state: {
                …}
        }
    },
    _rawModule: {
        modules: {
            subModule1: {
                state: {
                    …},
                mutations: {
                    …}
            }
            subModule2: {
                state: {
                    …},
                mutations: {
                    …}
            }
        },
    },
    namespaced: false
}
```

不过这里先不用太纠结，大概知道就好。

#### 3.2. 包装 dispatch 和 commit

```javascript
// bind commit and dispatch to self
const store = this
const { dispatch, commit } = this
this.dispatch = function boundDispatch(type, payload) {
  return dispatch.call(store, type, payload)
}
this.commit = function boundCommit(type, payload, options) {
  return commit.call(store, type, payload, options)
}
```

这里之所以要把 `dispatch` 和 `commit` 方法包装一下，是为了确保无论如何调用这两个方法， `this` 始终指向 store 实例。

因为在 js 中，不管是有意或者无意，能够改变 `this` 指向的操作太多了，所以 `vuex` 考虑到了这一点。

### 4. 初始化 module

接着就会使用前面得到的 `_module`   来初始化 module，传入的是 `_module.root` ：

```javascript
// init root module.
// this also recursively registers all sub-modules
// and collects all module getters inside this._wrappedGetters
installModule(this, state, [], this._modules.root)
```

同样它只需要传入 root 模块，方法内会去检测如果存在子模块则会递归调用去初始化所有子模块。

下面是 `installModule` 的实现：

```javascript
function installModule(store, rootState, path, module, hot) {
  const isRoot = !path.length
  const namespace = store._modules.getNamespace(path)

  // register in namespace map
  if (module.namespaced) {
    if (store._modulesNamespaceMap[namespace] && __DEV__) {
      console.error(
        `[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join(
          '/'
        )}`
      )
    }
    store._modulesNamespaceMap[namespace] = module
  }

  // set state
  if (!isRoot && !hot) {
    const parentState = getNestedState(rootState, path.slice(0, -1))
    const moduleName = path[path.length - 1]
    store._withCommit(() => {
      if (__DEV__) {
        if (moduleName in parentState) {
          console.warn(
            `[vuex] state field "${moduleName}" was overridden by a module with the same name at "${path.join(
              '.'
            )}"`
          )
        }
      }
      Vue.set(parentState, moduleName, module.state)
    })
  }

  const local = (module.context = makeLocalContext(store, namespace, path))

  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })

  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key
    const handler = action.handler || action
    registerAction(store, type, handler, local)
  })

  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })

  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
}
```

#### 4.1 初始化 root 模块

由于这个方法是会递归调用的，我们先来看看它在初始化根模块时会执行的逻辑，首先它会调用 `makeLocalContext` 构造出属于当前模块的一个上下文，也就是我们平时在 `action` 中获取的那个 `ctx` 参数：

```javascript
const local = (module.context = makeLocalContext(store, namespace, path))
```

接着会处理当前模块的 `mutations` 、 `actions` 、 `getters` ，以及如果有子模块的话就递归调用 `installModule` 对子模块进行相同的处理：

```javascript
module.forEachMutation(function (mutation, key) {
  var namespacedType = namespace + key
  registerMutation(store, namespacedType, mutation, local)
})

module.forEachAction(function (action, key) {
  var type = action.root ? key : namespace + key
  var handler = action.handler || action
  registerAction(store, type, handler, local)
})

module.forEachGetter(function (getter, key) {
  var namespacedType = namespace + key
  registerGetter(store, namespacedType, getter, local)
})

module.forEachChild(function (child, key) {
  installModule(store, rootState, path.concat(key), child, hot)
})
```

#### 4.2. 初始化子模块

而对于子模块，会额外执行一些其它逻辑：

```javascript
// set state
if (!isRoot && !hot) {
  var parentState = getNestedState(rootState, path.slice(0, -1))
  var moduleName = path[path.length - 1]
  store._withCommit(function () {
    if (process.env.NODE_ENV !== 'production') {
      if (moduleName in parentState) {
        console.warn(
          '[vuex] state field "' +
            moduleName +
            '" was overridden by a module with the same name at "' +
            path.join('.') +
            '"'
        )
      }
    }
    Vue.set(parentState, moduleName, module.state)
  })
}
```

这里主要是将子模块的 `state` 设置到父模块的 `state` 中去，这也是为什么我们可以通过这种方式来获取子模块的 `state` ：

```javascript
console.log(this.$store.state)

// 输出
{
    subModule1: {
        count1: 0
    },
    subModule2: {
        count2: 0
    }
}
```

#### 4.3. 初始化命名空间模块

对于使用命名空间的情况，在这基础上还会执行额外的操作：

```javascript
var namespace = store._modules.getNamespace(path);

// register in namespace map
if (module.namespaced) {
    if (store._modulesNamespaceMap[namespace] && (process.env.NODE_ENV !== 'production')) {
        console.error(("[vuex] duplicate namespace " + namespace + " for the namespaced module " + (path.join('/')));
        }
        store._modulesNamespaceMap[namespace] = module;
    }
```

首先通过 `getNamespace` 拿到命名空间的名称，其实就是在模块名后面加一个 `/` ，比如： `subModule/` ，当然如果没有开启 `namespaced` ，拿到的其实是空字符串。然后将它作为 `key` 存入 `_modulesNamespaceMap` 中，有什么作用后面会讲到。

#### 4.4. 初始化 mutation、action、getter

对于所有模块，初始化   `mutation` 、 `action` 、 `getter` 都是一样的。

```javascript
module.forEachMutation((mutation, key) => {
  const namespacedType = namespace + key
  registerMutation(store, namespacedType, mutation, local)
})
```

首先将每个 `mutation` 的 `key` 与当前模块的命名空间名称拼接在一起，然后调用 `registerMutation` 将整个 store、拼接后的 mutation key、mutation 方法、还有当前模块上下文传入，下面是 `registerMutation` 实现：

```javascript
function registerMutation(store, type, handler, local) {
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler(payload) {
    handler.call(store, local.state, payload)
  })
}
```

其实就是将这些 `mutation` 通通传入 store.\_\_mutations 这个数组中，不过这里你可能会好奇为什么 `_mutations[type]` 是一个数组，这是因为可能会不同模块中（没开启命名空间的情况）存在多个同名的 mutation，这时候需要调用所有同名的 mutation，其实 action 也是这样的。

这里的初始化仅仅只是包装一层使它们与命名空间的 key 关联在一起、以及在调用时自动传入一些模块上下文的参数而已。 同样的， `action` 和 `getter` 初始化过程都差不多，都是经过包装过存入 `_actions` 和 `_wrappedGetters` 中，当然由于 `action` 是支持异步的，所以需要额外处理一下 `Promise` 。

### 5. 初始化 state

初始化完 module 以后就会处理 `state` 里的数据，使它变成响应式，同时处理前面经过包装的 `getter` ，使它变成类似于 `computed` 意义的东西：

```javascript
// initialize the store vm, which is responsible for the reactivity
// (also registers _wrappedGetters as computed properties)
resetStoreVM(this, state)
```

下面是 `resetStoreVM` 的实现：

```javascript
function resetStoreVM(store, state, hot) {
  const oldVm = store._vm

  // bind store public getters
  store.getters = {}
  // reset local getters cache
  store._makeLocalGettersCache = Object.create(null)
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  forEachValue(wrappedGetters, (fn, key) => {
    // use computed to leverage its lazy-caching mechanism
    // direct inline function use will lead to closure preserving oldVm.
    // using partial to return function with only arguments preserved in closure environment.
    computed[key] = partial(fn, store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  const silent = Vue.config.silent
  Vue.config.silent = true
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent

  // enable strict mode for new vm
  if (store.strict) {
    enableStrictMode(store)
  }

  if (oldVm) {
    if (hot) {
      // dispatch changes in all subscribed watchers
      // to force getter re-evaluation for hot reloading.
      store._withCommit(() => {
        oldVm._data.$$state = null
      })
    }
    Vue.nextTick(() => oldVm.$destroy())
  }
}
```

#### 5.1. 处理 state

原来 `vuex` 是直接 new 一个 Vue 实例来实现状态响应式，不过这样做无可厚非，毕竟 `vuex` 本来就是 Vue 专用：

```javascript
// silent 是取消 Vue 所有的日志与警告
// use a Vue instance to store the state tree
// suppress warnings just in case the user has added
// some funky global mixins
const silent = Vue.config.silent
Vue.config.silent = true
store._vm = new Vue({
  data: {
    $$state: state
  },
  computed
})
Vue.config.silent = silent
```

#### 5.2. 处理 getters

而 `getter` 的本质就是一个 `computed` ：

```javascript
// bind store public getters
store.getters = {}
// reset local getters cache
store._makeLocalGettersCache = Object.create(null)
const wrappedGetters = store._wrappedGetters
const computed = {}
forEachValue(wrappedGetters, (fn, key) => {
  // use computed to leverage its lazy-caching mechanism
  // direct inline function use will lead to closure preserving oldVm.
  // using partial to return function with only arguments preserved in closure environment.
  computed[key] = partial(fn, store)
  Object.defineProperty(store.getters, key, {
    get: () => store._vm[key],
    enumerable: true // for local getters
  })
})
```

### 6. 调用所有 plugin

这个没什么好说的，就是把所有插件都调用一遍，传入 `this` ：

```javascript
// apply plugins
plugins.forEach((plugin) => plugin(this))
```

### 7. devtools

最后是一些 vue devtools 相关的代码：

```javascript
const useDevtools =
  options.devtools !== undefined ? options.devtools : Vue.config.devtools
if (useDevtools) {
  devtoolPlugin(this)
}

// src/plugins/devtool.js
const target =
  typeof window !== 'undefined'
    ? window
    : typeof global !== 'undefined'
    ? global
    : {}
const devtoolHook = target.__VUE_DEVTOOLS_GLOBAL_HOOK__

export default function devtoolPlugin(store) {
  if (!devtoolHook) return

  store._devtoolHook = devtoolHook

  devtoolHook.emit('vuex:init', store)

  devtoolHook.on('vuex:travel-to-state', (targetState) => {
    store.replaceState(targetState)
  })

  store.subscribe(
    (mutation, state) => {
      devtoolHook.emit('vuex:mutation', mutation, state)
    },
    {
      prepend: true
    }
  )

  store.subscribeAction(
    (action, state) => {
      devtoolHook.emit('vuex:action', action, state)
    },
    {
      prepend: true
    }
  )
}
```

以上就是初始化 vuex 的整个过程了，不过有些地方只是粗略讲了一下，下面针对各种细节再深入探讨。

## 二、调用 mutation 过程

下面讲讲调用某个  mutation 时会发生什么，比如我们使用如下代码调用：

```javascript
this.$store.commit('subModule1/increment')
```

首先会进入之前讲过的包装后的 `commit` ，它确保无论怎么调用 `this` 始终指向当前 store 实例：

```javascript
this.commit = function boundCommit(type, payload, options) {
  return commit.call(store, type, payload, options)
}
```

然后会调用真正的 `commit` 方法：

```javascript
commit(_type, _payload, _options) {
    // check object-style commit
    const {
        type,
        payload,
        options
    } = unifyObjectStyle(
        _type,
        _payload,
        _options
    )
    const mutation = {
        type,
        payload
    }
    const entry = this._mutations[type]
    if (!entry) {
        if (__DEV__) {
            console.error(`[vuex] unknown mutation type: ${type}`)
        }
        return
    }
    this._withCommit(() => {
        entry.forEach(function commitIterator(handler) {
            handler(payload)
        })
    })
    this._subscribers
        .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
        .forEach((sub) => sub(mutation, this.state))
    if (__DEV__ && options && options.silent) {
        console.warn(
            `[vuex] mutation type: ${type}. Silent option has been removed. ` +
            'Use the filter functionality in the vue-devtools'
        )
    }
}
```

前面讲过可能会存在多个同名的 mutation，所以这里依次调用它们，但是为什么要先经过 `_withCommit` 方法呢？看它的实现：

```javascript
_withCommit(fn) {
    const committing = this._committing
    this._committing = true
    fn()
    this._committing = committing
}
```

如果开启了严格模式，它会监听 state 值的变更，只要不是通过 mutation 内部来修改 state 值就会报错：

```javascript
function enableStrictMode(store) {
  store._vm.$watch(
    function () {
      return this._data.$$state
    },
    () => {
      if (__DEV__) {
        assert(
          store._committing,
          `do not mutate vuex store state outside mutation handlers.`
        )
      }
    },
    {
      deep: true,
      sync: true
    }
  )
}
```

## 三、mapState、mapActions 这些绑定函数的实现

先来看看这四个方法的定义，它们的源码都在 src/helpers.js 中：

```javascript
export const mapState = normalizeNamespace((namespace, states) => {}
export const mapMutations = normalizeNamespace((namespace, mutations) => {}
export const mapGetters = normalizeNamespace((namespace, getters) => {}
export const mapActions = normalizeNamespace((namespace, actions) => {}
```

它们都先经过一个叫 `normalizeNamespace` 的方法处理，顾名思义这个方法是解析命名空间的，我们知道 `mapXXX` 这些方法可以接受一个或者两个参数，正常情况下第一个参数为 state module 的命名空间，第二个参数则是需要获取的内容，但是也支持只传入第一个参数，则这时候命名空间为 root。

所以这个方法的实现就简单了，只需要判断第一个参数是否为字符串，如果是的话则把它当成 map 处理，否则正常处理，并且在最后加上一个 `/` ，这个在前面初始化命名空间模块时就有提到。

```javascript
function normalizeNamespace(fn) {
  return (namespace, map) => {
    if (typeof namespace !== 'string') {
      map = namespace
      namespace = ''
    } else if (namespace.charAt(namespace.length - 1) !== '/') {
      namespace += '/'
    }
    return fn(namespace, map)
  }
}
```

其实这四个方法的实现都大同小异，这里就只记录 `mapState` 的实现：

```js
export const mapState = normalizeNamespace((namespace, states) => {
  const res = {}
  if (__DEV__ && !isValidMap(states)) {
    console.error(
      '[vuex] mapState: mapper parameter must be either an Array or an Object'
    )
  }
  normalizeMap(states).forEach(({ key, val }) => {
    res[key] = function mappedState() {
      let state = this.$store.state
      let getters = this.$store.getters
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapState', namespace)
        if (!module) {
          return
        }
        state = module.context.state
        getters = module.context.getters
      }
      return typeof val === 'function'
        ? val.call(this, state, getters)
        : state[val]
    }
    // mark vuex getter for devtools
    res[key].vuex = true
  })
  return res
})
```

其核心原理就是将传入的 `states` 进行序列化，然后在当前命名空间对应的模块中获取到这些值，其中还要判断一下是否为函数，是的话则调用该函数并且传入当前模块中的 `state` 和 `getters` ，将函数的返回存入对象中，最后返回。

## 参考链接

- [vuex 源码解析](https://liyucang-git.github.io/2019/07/21/vuex%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/)
