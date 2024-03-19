---
title: vue-router 源码解析
pubDatetime: 2021-07-16
permalink: /post/vue-router-score-code.html
tags: 
  - 前端
  - Vue
  - 源码解析
---

## 前言

本文是针对 vue-router [v3.5.2](https://github.com/vuejs/vue-router/releases/tag/v3.5.2) 版本的一次源码解析，由于水平有限，有些地方写得比较混乱，还望多多包涵。

希望本文能够给那些想阅读 vue-router 源代码却又不知从何上手的同学们给予一些帮助。

## 一、 new Router 时发生了什么？

对应源码在 [src/index.js](https://github1s.com/vuejs/vue-router/blob/HEAD/src/index.js)，下面讲一下它做了哪些操作：

### 1. 声明一些变量

```jsx
// 当前实例
this.app = null
// 存在多实例的话则保存
this.apps = []
// 传入的配置
this.options = options
// 存放已注册的一些导航守卫
this.beforeHooks = []
this.resolveHooks = []
this.afterHooks = []
// 创建 matcher
this.matcher = createMatcher(options.routes || [], this)
```

### 2. 创建 `matcher`

`createMatcher` 的源码位置在 [src/create-matcher.js](https://github1s.com/vuejs/vue-router/blob/HEAD/src/create-matcher.js)，这个方法的整体是这样的：

```jsx
export function createMatcher(
  routes: Array<RouteConfig>,
  router: VueRouter
): Matcher {
  const { pathList, pathMap, nameMap } = createRouteMap(routes)

  function addRoutes(routes) {}

  function addRoute(parentOrRoute, route) {}

  function getRoutes() {}

  function match(
    raw: RawLocation,
    currentRoute?: Route,
    redirectedFrom?: Location
  ): Route {}

  function redirect(record: RouteRecord, location: Location): Route {}

  function alias(
    record: RouteRecord,
    location: Location,
    matchAs: string
  ): Route {}

  function _createRoute(
    record: ?RouteRecord,
    location: Location,
    redirectedFrom?: Location
  ): Route {}

  return {
    match,
    addRoute,
    getRoutes,
    addRoutes
  }
}
```

这里主要是两点：

1. 根据传入的路由配置生成三张表：`pathList`、 `pathMap`、 `nameMap`，这样后面就可以更高效地访问路由表。
1. 返回一些方法，让它可以获取，操作这三张表。

### 3. 根据路由配置生成三张表

`createRouteMap` 的源码位置在 [src/create-route-map.js](https://github1s.com/vuejs/vue-router/blob/HEAD/src/create-route-map.js)，可以点开来对照看。

我们先不管其它逻辑，只关注它在第一次时是如何生成这三张表的，其核心逻辑是如下：

```jsx
routes.forEach((route) => {
  addRouteRecord(pathList, pathMap, nameMap, route, parentRoute)
})
```

这里给循环调用了 `addRouteRecord` 方法，它就在同一个文件中，总结一下它做了如下操作：

1.  首先检查是否有配置 `pathToRegexpOptions` 参数，这个属性值是路由高级匹配模式中（`path-to-regexp`）的参数。
1.  调用 `normalizePath` 将 `path` 标准化，比较重要的是这里会将子路由的 `path` 父路由的 `path` 拼接在一起。
1.  处理 `caseSensitive` 参数，它也是 `path-to-regexp` 中的参数。
1.  声明一个 `RouteRecord` ，主要代码：

```jsx
const record: RouteRecord = {
  path: normalizedPath,
  // 用于匹配该路由的正则
  regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
  // 该路由对应的组件，注意这里与 <router-view> 的 name 有关联
  components: route.components || { default: route.component },
  // 路由别名
  alias: route.alias
    ? typeof route.alias === 'string'
      ? [route.alias]
      : route.alias
    : []
  // other property
}
```

5.  如果该路由存在子路由，则递归调用 `addRouteRecord` 添加路由记录。
6.  将这条 `RouteRecord` 存入 `pathList` 。
7.  将这条记录以 `path` 作为 `key` 存入 `pathMap` 。
8.  如果存在 `alias` ，则用 `alias` 作为 `path` 再添加一条路由记录。
9.  如果存在 `name` ，则以 `name` 作为 `key` 存入 `nameMap`。

到这里，已经搞懂如何生成这三张表了。

### 4. 使用一些方法来操作这三张表

接着我们回到 `createMatcher` 方法内部，可以看到它返回的一些方法：

```jsx
export function createMatcher(
  routes: Array<RouteConfig>,
  router: VueRouter
): Matcher {
  // other code

  return {
    match,
    addRoute,
    getRoutes,
    addRoutes
  }
}
```

其内部无非就是根据这三张表来做一些匹配或者改动而已，后面也基本会提到，这里就先略过。
​

到这里 `createMatcher` 的操作就基本讲完了，下面我们回到 `new Router` 本身。

### 5. 检查 `mode` ，使用对应的路由模式

根据传入的路由配置创建一系列的数据表后，下面就要根据不同的 `mode` 来做不同的操作，核心代码如下：

```jsx
// 众所周知，hash 是默认值
let mode = options.mode || 'hash'

// 如果使用了 history 但不支持 pushState 的情况也需要回退到 hash
this.fallback =
  mode === 'history' && !supportsPushState && options.fallback !== false
if (this.fallback) {
  mode = 'hash'
}

// 非浏览器环境(比如SSR)，则使用 abstract
if (!inBrowser) {
  mode = 'abstract'
}

this.mode = mode

// 根据不同的 mode 构建不同的 history
switch (mode) {
  case 'history':
    this.history = new HTML5History(this, options.base)
    break
  case 'hash':
    this.history = new HashHistory(this, options.base, this.fallback)
    break
  case 'abstract':
    this.history = new AbstractHistory(this, options.base)
    break
  default:
    if (process.env.NODE_ENV !== 'production') {
      assert(false, `invalid mode: ${mode}`)
    }
}
```

关于三种 mode 有何不同下面会讲。

到这里， `new Router()` 的整个过程就基本讲完了。

## 二、 use Router 时发生了什么？

我们知道仅仅通过 `new Router()` 来构造一个 vue-router 实例后，还需要通过 `Vue.use(router)` 才能真正在项目中使用它，下面就来讲讲这过程到底发生了什么？

### 1. Vue.use 源码

在这之前，我们先来看看 Vue.use 做了哪些操作，它的源码在 [src/core/global-api/use.js](https://github1s.com/vuejs/vue/blob/HEAD/src/core/global-api/use.js)：

```jsx
import { toArray } from '../util/index'

export function initUse(Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins =
      this._installedPlugins || (this._installedPlugins = [])
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    const args = toArray(arguments, 1)
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
  }
}
```

代码不长，就是接受一个 `plugin` ，这个 `plugin` 要么是一个函数，要么就是一个有 `install` 方法的对象，然后 Vue 会调用这方法，并且将当前 Vue 作为参数传入，以便插件对 Vue 来进行扩展，最后将 `plugin` 传入 `installedPlugins` 中，防止重复调用。

### 2. 安装 Router

然后我们看看在 Vue 安装 VueRouter 时，VueRouter 会做哪些操作，它的源码在 [src/install.js](https://github1s.com/vuejs/vue-router/blob/HEAD/src/install.js)：

```jsx
import View from './components/view'
import Link from './components/link'

export let _Vue

export function install(Vue) {
  // 防止重复执行
  if (install.installed && _Vue === Vue) return
  install.installed = true

  // 把 Vue 存起来并 export 供其它文件使用
  _Vue = Vue

  const isDef = (v) => v !== undefined

  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    // router-view 才有 registerRouteInstance 属性
    if (
      isDef(i) &&
      isDef((i = i.data)) &&
      isDef((i = i.registerRouteInstance))
    ) {
      i(vm, callVal)
    }
  }

  // 注册一个全局 mixin
  Vue.mixin({
    beforeCreate() {
      // 初始化
      if (isDef(this.$options.router)) {
        this._routerRoot = this
        this._router = this.$options.router
        // 调用 router.init()，后面会讲
        this._router.init(this)
        // 使 _router 变成响应式
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 如果已经初始化，继承父组件的 _routerRoot
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      // 注册实例，实际上是挂载 <router-view>
      registerInstance(this, this)
    },
    destroyed() {
      // 离开时卸载
      registerInstance(this)
    }
  })

  // 把 $router 和 $route 挂载到 Vue 原型上，这样就能在任意 Vue 实例中访问
  Object.defineProperty(Vue.prototype, '$router', {
    get() {
      return this._routerRoot._router
    }
  })

  Object.defineProperty(Vue.prototype, '$route', {
    get() {
      return this._routerRoot._route
    }
  })

  // 全局组件
  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)

  // 利用 Vue 合并策略新增几个相关的生命周期
  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter =
    strats.beforeRouteLeave =
    strats.beforeRouteUpdate =
      strats.created
}
```

我们看到它调用了 `router.init()` 这个方法，它的源码在 [src/index.js](https://github1s.com/vuejs/vue-router/blob/HEAD/src/index.js)：

```jsx
init (app: any /* Vue component instance */) {
	    // 开发环境下检查是否已安装
    process.env.NODE_ENV !== 'production' &&
      assert(
        install.installed,
        `not installed. Make sure to call \`Vue.use(VueRouter)\` ` +
          `before creating root instance.`
      )

    // 保存当前 app 实例
    this.apps.push(app)

    // 当前 app 销毁时需要在 apps 中移除，由 issue #2639 提出
    app.$once('hook:destroyed', () => {
      // clean out app from this.apps array once destroyed
      const index = this.apps.indexOf(app)
      if (index > -1) this.apps.splice(index, 1)
      // ensure we still have a main app or null if no apps
      // we do not release the router so it can be reused
      if (this.app === app) this.app = this.apps[0] || null

      if (!this.app) this.history.teardown()
    })

    // 防止重复调用
    if (this.app) {
      return
    }

    this.app = app

    // 当前的 history，由之前 new Router 时根据不同 mode 来创建
    const history = this.history

    // 在浏览器环境下初始化时根据当前路由位置做路由跳转
    if (history instanceof HTML5History || history instanceof HashHistory) {
      const handleInitialScroll = routeOrError => {
        const from = history.current
        const expectScroll = this.options.scrollBehavior
        const supportsScroll = supportsPushState && expectScroll

        if (supportsScroll && 'fullPath' in routeOrError) {
          handleScroll(this, routeOrError, from, false)
        }
      }
      const setupListeners = routeOrError => {
        history.setupListeners()
        handleInitialScroll(routeOrError)
      }
      // 切换路由的方法，这个方法后面会讲
      history.transitionTo(
        history.getCurrentLocation(),
        setupListeners,
        setupListeners
      )
    }

    // 监听路由变化，在所有 app 实例中设置当前路由
    // 所以我们一直可以通过 this.$route 拿到当前路由
    history.listen(route => {
      this.apps.forEach(app => {
        app._route = route
      })
    })
  }
```

相信现在对安装 VueRouter 时的大致流程已经很清楚了，我们还看到了它会调用一些很重要的方法，这些方法会从后面的问题中继续深入探讨。

## 三、 切换路由时发生了什么

下面我们看看 vue-router 在切换路由时做了哪些操作，首先回想一下我们平时使用 vue-router 时有哪些操作可以切换路由？

#### 切换路由的几种方式

我们可以通过以下方式切换不同的路由：

1. 手动触发 URL 更新
1. 点击 `router-link`
1. 通过 `this.$router` 的 `push` 、`replace` 等方法

##### 1. 手动触发 URL 更新

只要我们更新了 `URL` ，vue-router 都会相应执行切换路由的逻辑，能更新 `URL` 操作有以下：

- 如支持 `history` api
  - history.pushState
  - history.replaceState
  - history.back
  - history.go
- `location.href = 'xxx'`
- `location.hash = 'xxx'`

vue-router 是如何监听这些操作的呢？其实只要监听 `popstate` 或者 `hashchange` 就可以了，不过这部分留到后面讲 `history` 实现时再仔细讲，这里先略过。

##### 2. 通过 `router-link` 切换

还有就是通过 `router-link` 组件的方式来切换，这个组件相信大家已经很熟悉了，它的源码在 [src/components/link.js](https://github1s.com/vuejs/vue-router/blob/HEAD/src/components/link.js)，我们直接看最关键的部分：
​

```jsx
// 事件处理，不一定是 click，取决于用户传入的 event
const handler = (e) => {
  // 判断用户触发该事件时的行为，具体看下面的 guardEvent 方法
  if (guardEvent(e)) {
    // 使用不同的方式来切换路由
    if (this.replace) {
      router.replace(location, noop)
    } else {
      router.push(location, noop)
    }
  }
}

// 注册事件
const on = { click: guardEvent }
if (Array.isArray(this.event)) {
  this.event.forEach((e) => {
    on[e] = handler
  })
} else {
  on[this.event] = handler
}

function guardEvent(e) {
  // 不处理有媒体键的情况
  // 比如 a 标签可以通过按住 shift 点击链接在新窗口打开，这时候原本的窗口不做任何处理
  if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return
  // 调用了 preventDefault 也不处理
  if (e.defaultPrevented) return
  // 如果是 button，并且不是使用左键单击也不处理
  if (e.button !== undefined && e.button !== 0) return
  // 如果给 a 标签设置了 _blank 也不处理
  if (e.currentTarget && e.currentTarget.getAttribute) {
    const target = e.currentTarget.getAttribute('target')
    if (/\b_blank\b/i.test(target)) return
  }
  // 取消默认行为，这里要判断是因为在诸如 weex 环境中没有该方法
  if (e.preventDefault) {
    e.preventDefault()
  }
  return true
}
```

很明显， `router-link` 本质上也是通过 router 的方法来切换路由，那下面就来看看 router 的方法。

##### 3. 通过 router 的方法切换

通过 router 方法来切换路由主要是三个：

1. `push`
1. `replace`
1. `go`

当然还有其它的，比如 `resolve` ，但这个方法并不是切换路由，但只是把对应路由信息返回过来，这里就不谈了。

其实不同的 `mode` 它们的实现是不一样的，这里我们就拿最常用的 `hash` 模式来讲，其它 `mode` 的方法实现会在后面将不同的 `mode` 的差异时讨论。

下面是这些方法在 `hash` 模式下的实现：

```jsx
push(location: RawLocation, onComplete ? : Function, onAbort ? : Function) {
    const {
        current: fromRoute
    } = this
    this.transitionTo(
        location,
        (route) => {
            pushHash(route.fullPath)
            handleScroll(this.router, route, fromRoute, false)
            onComplete && onComplete(route)
        },
        onAbort
    )
}
replace(location: RawLocation, onComplete?: Function, onAbort?: Function) {
  const { current: fromRoute } = this
  this.transitionTo(
    location,
    (route) => {
      replaceHash(route.fullPath)
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    },
    onAbort
  )
}
go(n: number) {
  window.history.go(n)
}
```

可以看到，除了 `go` 之外（它是通过事件监听器），都是在调用 `transitionTo` 这个方法，下面我们就看看这个方法的内部。

#### 切换过程

##### 1. 调用 transitionTo 方法

前面我们得知切换路由实际上都在调用 `transitionTo` ，它是一个 `History` 基类的方法，三种 `mode` 都是共用的同一个，下面是它的实现：

```jsx
transitionTo(location: RawLocation, onComplete ? : Function, onAbort ? : Function) {
  let route
  // 这里要 try 一下是因为 match 方法内部会在有 redirect 属性时调用它
  // 但用户提供的 redirect 方法可能会发生报错，所以这里需要捕获到错误回调方法
  // 具体看 issues #3201
  try {
    // 这是根据当前位置匹配路由，下面会讲
    route = this.router.match(location, this.current)
  } catch (e) {
    this.errorCbs.forEach((cb) => {
      cb(e)
    })
    // 依然要抛出异常，让用户得知
    throw e
  }
  // 记录之前的路由，后面会用到
  const prev = this.current
  // 这个才是真正切换路由的方法，下面会讲
  this.confirmTransition(
    // 传入准备切换的路由
    route,
    // 切换之后的回调
    () => {
      // 更新到当前路由信息 (current)，下面会讲
      this.updateRoute(route)
      // 执行用户传入的 onComplete回调
      onComplete && onComplete(route)
      // 更新浏览器地址栏上的 URL
      this.ensureURL()
      // 执行注册的 afterHooks
      this.router.afterHooks.forEach((hook) => {
        hook && hook(route, prev)
      })

      if (!this.ready) {
        this.ready = true
        // 执行用户传入的 onReady 回调
        this.readyCbs.forEach((cb) => {
          cb(route)
        })
      }
    },
    // 发生错误的回调
    (err) => {
      // 执行用户传入的 onAbort 回调
      if (onAbort) {
        onAbort(err)
      }
      // 执行用户传入的 onError 回调
      if (err && !this.ready) {
        // Initial redirection should not mark the history as ready yet
        // because it's triggered by the redirection instead
        // https://github.com/vuejs/vue-router/issues/3225
        // https://github.com/vuejs/vue-router/issues/3331
        if (!isNavigationFailure(err, NavigationFailureType.redirected) || prev !== START) {
          this.ready = true
          this.readyErrorCbs.forEach((cb) => {
            cb(err)
          })
        }
      }
    }
  )
}
```

在上面这段方法中我们得知，要切换路由首先调用 `match` 方法来匹配到待切换的路由，下面我们看看实现。

##### 2. 调用 `match` 方法匹配路由

在 `transitionTo` 中调用的是 `router` 的 `match` 方法：

```jsx
match (raw: RawLocation, current?: Route, redirectedFrom?: Location): Route {
	return this.matcher.match(raw, current, redirectedFrom)
}
```

而它实际上是调用了 `matcher` 的 `match` 方法，这个方法我们之前在 [创建 match](#_2-创建-matcher) 这一小节有提到过，下面是它的实现：

```jsx
function match(
  // 待切换的路由，取值为 字符串 或者 Location 对象
  raw: RawLocation,
  // 当前的路由
  currentRoute?: Route,
  // 使用重定向方式切换时才会传入
  redirectedFrom?: Location
): Route {
  // 将待切换的路由转换成一个标准的 Location 对象
  // 例如：path 补全、合并 params 等
  const location = normalizeLocation(raw, currentRoute, false, router)
  // 待切换路由的 name
  const { name } = location

  if (name) {
    // 有 name 属性的时候直接通过 nameMap 获取，根本无需遍历，非常高效
    const record = nameMap[name]
    if (process.env.NODE_ENV !== 'production') {
      warn(record, `Route with name '${name}' does not exist`)
    }
    // 该路由不存在，创建一个空的路由记录
    if (!record) return _createRoute(null, location)
    // 获取可以从父路由中继承的 param 参数
    const paramNames = record.regex.keys
      .filter((key) => !key.optional)
      .map((key) => key.name)

    //  params 需要为对象
    if (typeof location.params !== 'object') {
      location.params = {}
    }
    // 继承父路由的 param 参数
    if (currentRoute && typeof currentRoute.params === 'object') {
      for (const key in currentRoute.params) {
        if (!(key in location.params) && paramNames.indexOf(key) > -1) {
          location.params[key] = currentRoute.params[key]
        }
      }
    }
    // 将 path 和 param 合并为 URL
    location.path = fillParams(
      record.path,
      location.params,
      `named route "${name}"`
    )
    // 创建路由记录
    return _createRoute(record, location, redirectedFrom)
  } else if (location.path) {
    // 如果是通过 path 跳转，则需要通过遍历 pathList 匹配对应的路由
    location.params = {}
    for (let i = 0; i < pathList.length; i++) {
      const path = pathList[i]
      const record = pathMap[path]
      // 检查路径与当前遍历到的路由是否匹配，该方法下面会讲
      if (matchRoute(record.regex, location.path, location.params)) {
        return _createRoute(record, location, redirectedFrom)
      }
    }
  }
  // 找不到匹配的则创建一条空的路由记录
  return _createRoute(null, location)
}
```

如果是通过 `path` 的方式跳转，由于 `path` 可能会携带一些 `params` 的信息，前面我们已经提到过[初始化路由](#一、-new-router-时发生了什么)信息时，会为每条路由生成一个正则表达式，所以这里就可以根据这个正则来检查是否符合当前路由，也就是上面提到 `matchRoute` 作用，下面是它的实现：

```jsx
function matchRoute(regex: RouteRegExp, path: string, params: Object): boolean {
  const m = path.match(regex)

  if (!m) {
    // 不匹配则直接退出
    return false
  } else if (!params) {
    // 如果匹配并且该路由没有声明 param 参数，则匹配成功
    return true
  }
  // 将使用正则匹配到的 param 参数放入 params 对象中
  for (let i = 1, len = m.length; i < len; ++i) {
    const key = regex.keys[i - 1]
    if (key) {
      // Fix #1994: using * with props: true generates a param named 0
      params[key.name || 'pathMatch'] =
        typeof m[i] === 'string' ? decode(m[i]) : m[i]
    }
  }

  return true
}
```

到这里，关于如何匹配对应的路由已经讲完了，下面我们讲讲匹配到之后它还会做什么？

##### 3. 调用 confirmTransition 方法

前面我们在 [1. 调用 transitionTo 方法](#_1-调用-transitionto-方法) 时讲到它拿到匹配的路由之后，就会调用 `confirmTransition` 方法，下面是它的实现：

```jsx
// 因为待跳转路由有可能是一个异步组件，所以设计成有回调的方法
confirmTransition(route: Route, onComplete: Function, onAbort?: Function) {
  // 跳转前的的路由（from）
  const current = this.current
  // 待跳转的路由（to）
  this.pending = route
  // 错误时的回调
  const abort = (err) => {
    // changed after adding errors with
    // https://github.com/vuejs/vue-router/pull/3047 before that change,
    // redirect and aborted navigation would produce an err == null
    if (!isNavigationFailure(err) && isError(err)) {
      if (this.errorCbs.length) {
        this.errorCbs.forEach((cb) => {
          cb(err)
        })
      } else {
        warn(false, 'uncaught error during route navigation:')
        console.error(err)
      }
    }
    onAbort && onAbort(err)
  }
  const lastRouteIndex = route.matched.length - 1
  const lastCurrentIndex = current.matched.length - 1
  // 判断是否相同路径
  if (
    isSameRoute(route, current) &&
    // in the case the route map has been dynamically appended to
    lastRouteIndex === lastCurrentIndex &&
    route.matched[lastRouteIndex] === current.matched[lastCurrentIndex]
  ) {
    // 依旧切换
    this.ensureURL()
    // 报一个重复导航的错误
    return abort(createNavigationDuplicatedError(current, route))
  }
  // 通过 from 和 to的 matched 数组拿到新增、更新、销毁的部分，以便执行组件的生命周期
  // 该方法下面会仔细讲
  const { updated, deactivated, activated } = resolveQueue(
    this.current.matched,
    route.matched
  )
  // 一个队列，存放各种组件生命周期和导航守卫
  // 这里的顺序可以看回前面讲的完整的导航解析流程，具体实现下面会讲
  const queue: Array<?NavigationGuard> = [].concat(
    // in-component leave guards
    extractLeaveGuards(deactivated),
    // global before hooks
    this.router.beforeHooks,
    // in-component update hooks
    extractUpdateHooks(updated),
    // in-config enter guards
    activated.map((m) => m.beforeEnter),
    // async components
    resolveAsyncComponents(activated)
  )
  // 迭代器，每次执行一个钩子，调用 next 时才会进行下一项
  const iterator = (hook: NavigationGuard, next) => {
    // 在当前导航还没有完成之前又有了一个新的导航。
    // 比如，在等待导航守卫的过程中又调用了 router.push
    // 这时候需要报一个 cancel 错误
    if (this.pending !== route) {
      return abort(createNavigationCancelledError(current, route))
    }
    // 执行当前钩子，但用户传入的导航守卫有可能会出错，需要 try 一下
    try {
      // 这就是路由钩子的参数：to、from、next
      hook(route, current, (to: any) => {
        // 我们可以通过 next('/login') 这样的方式来重定向
        // 如果传入 false 则中断当前的导航，并将 URL 重置到 from 路由对应的地址
        if (to === false) {
          // next(false) -> abort navigation, ensure current URL
          this.ensureURL(true)
          abort(createNavigationAbortedError(current, route))
        // 如果传入 next 的参数是一个 Error 实例
        // 则导航会被终止且该错误会被传递给 router.onError() 注册过的回调。
        } else if (isError(to)) {
          this.ensureURL(true)
          abort(to)
        } else if (
          // 判断传入的参数是否符合要求
          typeof to === 'string' ||
          (typeof to === 'object' &&
            (typeof to.path === 'string' || typeofto.name === 'string'))
        ) {
          // next('/') or next({ path: '/' }) -> redirect
          abort(createNavigationRedirectedError(current, route))
          // 判断切换类型
          if (typeof to === 'object' && to.replace) {
            this.replace(to)
          } else {
            this.push(to)
          }
        } else {
          // 不符合则跳转至 to
          // confirm transition and pass on the value
          next(to)
        }
      })
    // 出错时执行 abort 回调
    } catch (e) {
      abort(e)
    }
  }
  // 执行队列，下面仔细讲
  runQueue(queue, iterator, () => {
    // wait until async components are resolved before
    // extracting in-component enter guards
    const enterGuards = extractEnterGuards(activated)
    const queue = enterGuards.concat(this.router.resolveHooks)
    runQueue(queue, iterator, () => {
      if (this.pending !== route) {
        return abort(createNavigationCancelledError(current, route))
      }
      this.pending = null
      onComplete(route)
      if (this.router.app) {
        this.router.app.$nextTick(() => {
          handleRouteEntered(route)
        })
      }
    })
  })
}
```

##### 4. 构造导航守卫队列

我们知道在切换路由时需要执行一系列的导航守卫和路由相关的生命周期，下面就讲讲它的实现，其实也是在 `confirmTransition` 这个方法中。
​

第一步就是构造队列，关于它们执行的顺序可以看回文档。

```jsx
// 一个队列，存放各种组件生命周期和导航守卫
// 注意：这里只是完整迭代导航解析流程中的 2~6 步
const queue: Array<?NavigationGuard> = [].concat(
  // 调用此次失活的部分组件的 beforeRouteLeave
  extractLeaveGuards(deactivated),
  // 全局的 before 钩子
  this.router.beforeHooks,
  // 调用此次更新的部分组件的 beforeRouteUpdate
  extractUpdateHooks(updated),
  // 调用此次激活的路由配置的 beforeEach
  activated.map((m) => m.beforeEnter),
  // 解析异步组件
  resolveAsyncComponents(activated)
)
```

还记得前面我们讲了 `updated, deactivated, activated` 这三个数组是从 `resolveQueue` 方法中获取：

```jsx
const { updated, deactivated, activated } = resolveQueue(
  this.current.matched,
  route.matched
)
```

下面是它的实现：

```jsx
function resolveQueue(
  current: Array<RouteRecord>,
  next: Array<RouteRecord>
): {
  updated: Array<RouteRecord>,
  activated: Array<RouteRecord>,
  deactivated: Array<RouteRecord>
} {
  let i
  const max = Math.max(current.length, next.length)
  for (i = 0; i < max; i++) {
    if (current[i] !== next[i]) {
      break
    }
  }
  return {
    updated: next.slice(0, i),
    activated: next.slice(i),
    deactivated: current.slice(i)
  }
}
```

实现原理很简单，只需要对比 `current` 和 `next` 的 `match` 数组，就能拿到以下数组：

1. `updated`：有交集的部分
1. `activated`：next 有并且 current 没有的部分
1. `deactivated`：current 有并且 next 没有的部分

下面是队列中各项的实现

1. 调用 `extractLeaveGuards(deactivated)` 执行销毁的组件 `beforeRouteLeave` 生命周期：

```jsx
function extractLeaveGuards(deactivated: Array<RouteRecord>): Array<?Function> {
  // 最后一个参数为 true 是因为这个生命周期要倒序执行，先执行子路由的再执行父路由的
  return extractGuards(deactivated, 'beforeRouteLeave', bindGuard, true)
}
```

2. 调用全局的 `beforeHooks` ，其实也就是存放用户通过 `beforeEach` 注册的数组：

```jsx
beforeEach (fn: Function): Function {
  return registerHook(this.beforeHooks, fn)
}
```

3. 调用 `extractUpdateHooks(updated)` 执行更新的组件：

```jsx
function extractUpdateHooks(updated: Array<RouteRecord>): Array<?Function> {
  return extractGuards(updated, 'beforeRouteUpdate', bindGuard)
}
```

4. 调用所有激活组件的 `beforeEnter` 生命周期：

```jsx
activated.map((m) => m.beforeEnter)
```

5. 调用 `resolveAsyncComponents(activated)` 来解析异步组件：

```javascript
export function resolveAsyncComponents(matched: Array<RouteRecord>): Function {
  // 返回一个队列钩子函数
  return (to, from, next) => {
    // 用于标记是否异步组件
    let hasAsync = false
    // 待加载的组件数量
    let pending = 0
    // 是否加载错误
    let error = null

    // 这个方法下面会讲，主要作用是依次遍历传入的 matched 数组相关的 component
    flatMapComponents(matched, (def, _, match, key) => {
      // 判断是否异步组件
      if (typeof def === 'function' && def.cid === undefined) {
        hasAsync = true
        pending++

        // webpack 加载这个异步组件的 chunk 后执行
        const resolve = once((resolvedDef) => {
          if (isESModule(resolvedDef)) {
            resolvedDef = resolvedDef.default
          }
          // 将它变成一个 vue 组件
          // save resolved on async factory in case it's used elsewhere
          def.resolved =
            typeof resolvedDef === 'function'
              ? resolvedDef
              : _Vue.extend(resolvedDef)
          // 把解析好的组件更新到当前路由记录中
          match.components[key] = resolvedDef
          pending--
          // 如果已经加载完则调用 next 进入下一个队列
          if (pending <= 0) {
            next()
          }
        })

        // webpack 加载这个异步组件失败后执行
        const reject = once((reason) => {
          // 报个错
          const msg = `Failed to resolve async component ${key}: ${reason}`
          process.env.NODE_ENV !== 'production' && warn(false, msg)
          if (!error) {
            error = isError(reason) ? reason : new Error(msg)
            next(error)
          }
        })

        let res
        try {
          // 这里是调用 webpack 方法加载这个组件，返回的是一个 Promise
          res = def(resolve, reject)
        } catch (e) {
          reject(e)
        }
        if (res) {
          // 这里才真正加载这个组件
          if (typeof res.then === 'function') {
            res.then(resolve, reject)
          } else {
            // new syntax in Vue 2.3
            const comp = res.component
            if (comp && typeof comp.then === 'function') {
              comp.then(resolve, reject)
            }
          }
        }
      }
    })

    // 不是异步则直接 next
    if (!hasAsync) next()
  }
}
```

异步加载这一块其实涉及比较多，深入讲的话还要讲 `webpack` ，所以这里只讲大概的流程，以后有机会的话再深入讲解。

可以看到执行导航守卫都是通过调用一个 `extractGuards` 方法，下面是它的实现：

```jsx
// records: routerRecord 数组
// name 钩子的名字
// bind 就是 bindGuard 方法，下面会讲
// reverse 是否倒序执行
function extractGuards(
  records: Array<RouteRecord>,
  name: string,
  bind: Function,
  reverse?: boolean
): Array<?Function> {
  const guards = flatMapComponents(records, (def, instance, match, key) => {
    const guard = extractGuard(def, name)
    if (guard) {
      return Array.isArray(guard)
        ? guard.map((guard) => bind(guard, instance, match, key))
        : bind(guard, instance, match, key)
    }
  })
  return flatten(reverse ? guards.reverse() : guards)
}
```

在仔细讲这个方法内部逻辑前，要先搞清楚这三个方法的内部： `extractGuard` 、 `bindGuard` 、 `flatMapComponents` ：

`extractGuard` 很简单，其实就是获取 vue 组件实例中特定的生命周期：

```jsx
function extractGuard(
  def: Object | Function,
  key: string
): NavigationGuard | Array<NavigationGuard> {
  if (typeof def !== 'function') {
    // extend now so that global mixins are applied.
    def = _Vue.extend(def)
  }
  return def.options[key]
}
```

`bindGuard` 的作用就是返回一个函数，这个函数会调用组件特定生命周期，给后续执行队列时调用：

```jsx
// guard：某个生命周期钩子
// instance：执行的 vue 实例
function bindGuard(guard: NavigationGuard, instance: ?_Vue): ?NavigationGuard {
  if (instance) {
    // 这时只是返回这个方法，没有立即调用
    return function boundRouteGuard() {
      // 调用这个钩子
      return guard.apply(instance, arguments)
    }
  }
}
```

而 `flatMapComponents` 顾名思义就是跟组件相关的，它的作用是依次遍历传入的 `matched` 数组相关的组件，并调用传入的回调的返回值作为自己的返回值，所以它的返回值是调用者决定的：

```jsx
function flatMapComponents(matched, fn) {
  return flatten(
    matched.map(function (m) {
      return Object.keys(m.components).map(function (key) {
        return fn(m.components[key], m.instances[key], m, key)
      })
    })
  )
}
```

所以现在再回过头来看 `extractGuards` 就很清晰了，它的作用就是通过 `flatMapComponents` 遍历所有 `match` 数组中的组件，并通过 `extractGuard` 拿到这些组件的特定生命周期，然后通过 `bindGuard` 返回一个可以调用这个生命周期的函数，然后利用 `flatten` 将它们扁平化，根据 `reverse` 决定是否倒序返回这些函数数组。

最后这些函数全部放在 `queue` 中，这就是构造整个队列的过程了。

##### 5. 执行队列

构造完队列，下面就要开始执行这个队列了，在这之前我们先来看看 `runQueue` 的实现：

```jsx
export function runQueue(
  queue: Array<?NavigationGuard>,
  fn: Function,
  cb: Function
) {
  const step = (index) => {
    if (index >= queue.length) {
      cb()
    } else {
      if (queue[index]) {
        fn(queue[index], () => {
          step(index + 1)
        })
      } else {
        step(index + 1)
      }
    }
  }
  step(0)
}
```

其实也不复杂，首先从 0 开始按顺序遍历 `queue` 中的每一项，在调用 `fn` 时作为第一个参数传入，当使用者调用了第二个参数的回调时，才进入下一次项，最后遍历完 `queue` 中所有的项后，调用 `cb` 回到参数。

下面是执行这个队列的过程：

```jsx
// 执行队列
// queue 就是上面那个队列
// iterator 传入 to、from、next，只有执行 next 才会进入下一项
// cb 回调函数，当执行完整个队列后调用
runQueue(queue, iterator, () => {
  // wait until async components are resolved before
  // extracting in-component enter guards
  const enterGuards = extractEnterGuards(activated)
  const queue = enterGuards.concat(this.router.resolveHooks)
  runQueue(queue, iterator, () => {
    if (this.pending !== route) {
      return abort(createNavigationCancelledError(current, route))
    }
    this.pending = null
    onComplete(route)
    if (this.router.app) {
      this.router.app.$nextTick(() => {
        handleRouteEntered(route)
      })
    }
  })
})
```

`iterator` 的定义在 [1. 调用 transitionTo 方法](#_1-调用-transitionto-方法) 这一小节中已经有提到了，这里拷贝一份过来：

```jsx
// 迭代器，每次执行一个钩子，调用 next 时才会进行下一项
const iterator = (hook: NavigationGuard, next) => {
  // 在当前导航还没有完成之前又有了一个新的导航。
  // 比如，在等待导航守卫的过程中又调用了 router.push
  // 这时候需要报一个 cancel 错误
  if (this.pending !== route) {
    return abort(createNavigationCancelledError(current, route))
  }
  // 执行当前钩子，但用户传入的导航守卫有可能会出错，需要 try 一下
  try {
    // 这就是路由钩子的参数：to、from、next
    hook(route, current, (to: any) => {
      // 我们可以通过 next('/login') 这样的方式来重定向
      // 如果传入 false 则中断当前的导航，并将 URL 重置到 from 路由对应的地址
      if (to === false) {
        // next(false) -> abort navigation, ensure current URL
        this.ensureURL(true)
        abort(createNavigationAbortedError(current, route))
        // 如果传入 next 的参数是一个 Error 实例
        // 则导航会被终止且该错误会被传递给 router.onError() 注册过的回调。
      } else if (isError(to)) {
        this.ensureURL(true)
        abort(to)
      } else if (
        // 判断传入的参数是否符合要求
        typeof to === 'string' ||
        (typeof to === 'object' &&
          (typeof to.path === 'string' || typeofto.name === 'string'))
      ) {
        // next('/') or next({ path: '/' }) -> redirect
        abort(createNavigationRedirectedError(current, route))
        // 判断切换类型
        if (typeof to === 'object' && to.replace) {
          this.replace(to)
        } else {
          this.push(to)
        }
      } else {
        // 不符合则跳转至 to
        // confirm transition and pass on the value
        next(to)
      }
    })
    // 出错时执行 abort 回调
  } catch (e) {
    abort(e)
  }
}
```

但是我们留意到这里其实是嵌套执行了两次 `runQueue` ，这是因为我们前面构造的 `queue` 只是 vue-router 完整的导航解析流程中的 第 2~6 步，而接下来就要执行第 7~9 步：

```jsx
// 这时候异步组件已经解析完成
// 下面是构造 beforeRouteEnter 和 beforeResolve 守卫的队列
const enterGuards = extractEnterGuards(activated)
const queue = enterGuards.concat(this.router.resolveHooks)
runQueue(queue, iterator, () => {
  if (this.pending !== route) {
    return abort(createNavigationCancelledError(current, route))
  }
  this.pending = null
  // 这里是调用 transitionTo 传入的 onComplete 回调
  // 在这里会做一些更新路由、URL、调用 afterHooks、onReady 等回调，下面就讲
  onComplete(route)
  if (this.router.app) {
    // 下次更新 DOM 时触发 handleRouteEntered
    this.router.app.$nextTick(() => {
      // TODO 不太明白这个方法的内部
      handleRouteEntered(route)
    })
  }
})
```

##### 6. 执行 `confirmTransition` 后的操作

到这里 `confirmTransition` 方法就已经执行完了，最后会调用 `transitionTo` 传入的 `onComplete` 方法，之前就有提到：

```jsx
// 更新到当前路由信息 (current)，下面会讲
this.updateRoute(route)
// 执行用户传入的 onComplete回调
onComplete && onComplete(route)
// 更新浏览器地址栏上的 URL
this.ensureURL()
// 执行注册的 afterHooks
this.router.afterHooks.forEach((hook) => {
  hook && hook(route, prev)
})

if (!this.ready) {
  this.ready = true
  // 执行用户传入的 onReady 回调
  this.readyCbs.forEach((cb) => {
    cb(route)
  })
}
```

这里主要做了几步：更新当前路由、调用传入的 `onComplete` 、更新 `URL` 、调用 `afterHooks` 、 `onReady` 钩子。

而如果 `confirmTransition` 执行失败的话，则会执行传入的 `onAbort` ：

```jsx
if (onAbort) {
  onAbort(err)
}
if (err && !this.ready) {
  // Initial redirection should not mark the history as ready yet
  // because it's triggered by the redirection instead
  // https://github.com/vuejs/vue-router/issues/3225
  // https://github.com/vuejs/vue-router/issues/3331
  if (
    !isNavigationFailure(err, NavigationFailureType.redirected) ||
    prev !== START
  ) {
    this.ready = true
    this.readyErrorCbs.forEach((cb) => {
      cb(err)
    })
  }
}
```

主要是调用传入的 `onAbort` 回调，执行 `onError` 钩子。

到这里整个 `transitionTo` 方法的执行过程已经讲完了，导航守卫和一些钩子函数也已经全部执行完毕。
​

##### 7. 更新路由信息

接着我们看看它是如何更新当前路由信息的，也就是 `updateRoute` 方法：

```javascript
updateRoute(route: Route) {
    this.current = route
    this.cb && this.cb(route)
}
```

首先是更新一下 `current` 的指向，接着调用 `cb` 这个回调函数并且将当前路由传入，那这个 `cb` 是什么东西呢？它是在 `listen` 方法中被赋值的：

```javascript
listen(cb: Function) {
    this.cb = cb
}
```

而哪里调用了这个 `listen` 方法呢？我们看回之前在 [2. 安装 Router](#_2-安装-router) 时初始化那里的一段代码：

```javascript
// 监听路由变化，在所有 app 实例中设置当前路由
// 所以我们一直可以通过 this.$route 拿到当前路由
history.listen((route) => {
  this.apps.forEach((app) => {
    app._route = route
  })
})
```

所以到这里，我们通过 `this.$route` 拿到的路由就已经变成跳转的路由了。
​

##### 8. 更新 URL

接着就是更新 `URL` 了，在 `transitionTo` 这里它是先调用了 `onComplete` 方法，然后再调用 `ensureURL` 方法来更新浏览器上的 `URL` ，对应源码：

```javascript
// 执行用户传入的 onComplete回调
onComplete && onComplete(route)
// 更新浏览器地址栏上的 URL
this.ensureURL()
```

由于我们这里是以 `hash` 模式来展开的，所以我们看看它的 `push` 方法里传入的 `onComplete` 方法：

```javascript
push(location: RawLocation, onComplete ? : Function, onAbort ? : Function) {
    const {
        current: fromRoute
    } = this
    this.transitionTo(
        location,
        (route) => {
            pushHash(route.fullPath)
            handleScroll(this.router, route, fromRoute, false)
            onComplete && onComplete(route)
        },
        onAbort
    )
}
```

而 `pushHash` 这里实际到后面已经可以更新 `URL` ：

```javascript
// 位于：src/util/push-state.js
export function pushState(url?: string, replace?: boolean) {
  saveScrollPosition()
  // try...catch the pushState call to get around Safari
  // DOM Exception 18 where it limits to 100 pushState calls
  const history = window.history
  try {
    if (replace) {
      // preserve existing history state as it could be overriden by the user
      const stateCopy = extend({}, history.state)
      stateCopy.key = getStateKey()
      history.replaceState(stateCopy, '', url)
    } else {
      history.pushState(
        {
          key: setStateKey(genStateKey())
        },
        '',
        url
      )
    }
  } catch (e) {
    window.location[replace ? 'replace' : 'assign'](url)
  }
}

function pushHash(path) {
  if (supportsPushState) {
    pushState(getUrl(path))
  } else {
    window.location.hash = path
  }
}
```

所以后面再执行 `ensureURL` 时就不需要再更新一遍了：

```javascript
ensureURL(push ? : boolean) {
    const current = this.current.fullPath
    if (getHash() !== current) {
        push ? pushHash(current) : replaceHash(current)
    }
}
```

难道这个 `ensureURL` 就是多此一举吗？也不是，在其他地方调用就会更新 `URL` 的，比如 `transitionTo` 检查是否跳转至相同路径：

```javascript
if (
  isSameRoute(route, current) &&
  // in the case the route map has been dynamically appended to
  lastRouteIndex === lastCurrentIndex &&
  route.matched[lastRouteIndex] === current.matched[lastCurrentIndex]
) {
  this.ensureURL()
  return abort(createNavigationDuplicatedError(current, route))
}
```

这里更新了 `URL` 以后，还会调用 `handleScroll` 来滚动相关的操作，如：保存当前滚动位置、根据传入的 `scrollBehavior` 设置当前滚动位置，不过这里就不展开讲了。

另外，更新 `URL` 这部分行为也是根据不同的路由模式有所区别，后面的章节会详情讲解。

##### 9. 渲染对应的路由视图

除了更新 `URL` 以外，我们还要渲染当前路由对应的视图，那这又是如何做到的呢？我们知道 vue-router 是通过一个叫 `router-view` 的组件来渲染，下面看看它的实现，它的源码在：[src/components/view.js](https://github1s.com/vuejs/vue-router/blob/HEAD/src/components/view.js)，我们先粗略看一下它的 `render` 方法：

```javascript
render(_, {
    props,
    children,
    parent,
    data
}) {
    // used by devtools to display a router-view badge
    data.routerView = true

    // directly use parent context's createElement() function
    // so that components rendered by router-view can resolve named slots
    const h = parent.$createElement
    const name = props.name
    // 拿到当前路由
    const route = parent.$route
    // 缓存路由视图，keepAlive 时会用到
    const cache = parent._routerViewCache || (parent._routerViewCache = {})

    // determine current view depth, also check to see if the tree
    // has been toggled inactive but kept-alive.
    let depth = 0
    let inactive = false
    while (parent && parent._routerRoot !== parent) {
        const vnodeData = parent.$vnode ? parent.$vnode.data : {}
        if (vnodeData.routerView) {
            depth++
        }
        if (vnodeData.keepAlive && parent._directInactive && parent._inactive) {
            inactive = true
        }
        parent = parent.$parent
    }
    data.routerViewDepth = depth

    // 这里是渲染已经缓存的视图
    if (inactive) {
        const cachedData = cache[name]
        const cachedComponent = cachedData && cachedData.component
        if (cachedComponent) {
            // #2301
            // pass props
            if (cachedData.configProps) {
                fillPropsinData(
                    cachedComponent,
                    data,
                    cachedData.route,
                    cachedData.configProps
                )
            }
            return h(cachedComponent, data, children)
        } else {
            // render previous empty view
            return h()
        }
    }

    // 拿到对应的视图组件
    const matched = route.matched[depth]
    const component = matched && matched.components[name]

    // render empty node if no matched route or no config component
    if (!matched || !component) {
        cache[name] = null
        return h()
    }

    // cache component
    cache[name] = {
        component
    }

    // attach instance registration hook
    // this will be called in the instance's injected lifecycle hooks
    data.registerRouteInstance = (vm, val) => {
        // val could be undefined for unregistration
        const current = matched.instances[name]
        if ((val && current !== vm) || (!val && current === vm)) {
            matched.instances[name] = val
        }
    }

    // also register instance in prepatch hook
    // in case the same component instance is reused across different routes
    ;
    (data.hook || (data.hook = {})).prepatch = (_, vnode) => {
        matched.instances[name] = vnode.componentInstance
    }

    // register instance in init hook
    // in case kept-alive component be actived when routes changed
    data.hook.init = (vnode) => {
        if (
            vnode.data.keepAlive &&
            vnode.componentInstance &&
            vnode.componentInstance !== matched.instances[name]
        ) {
            matched.instances[name] = vnode.componentInstance
        }

        // if the route transition has already been confirmed then we weren't
        // able to call the cbs during confirmation as the component was not
        // registered yet, so we call it here.
        handleRouteEntered(route)
    }

    const configProps = matched.props && matched.props[name]
    // save route and configProps in cache
    if (configProps) {
        extend(cache[name], {
            route,
            configProps
        })
        fillPropsinData(component, data, route, configProps)
    }

    // 渲染组件
    return h(component, data, children)
}
```

可以看到 `router-view` 是通过 `$route` 变量来获取当前组件的，而在前面 [7. 更新路由信息](#_7-更新路由信息) 时有提到会更新 `_route` 变量，而它在 [2. 安装 Router](#_2-安装-router) 时就已经用 `$route` 包装成响应式了，这里自然也就可以渲染对应的组件了。

## 四、 动态添加路由实现

我们在开发时可能会遇到一些比较复杂的场景，需要动态添加路由，最常见的例子就是根据后端返回的不同用户角色去配置不同的前端路由，那下面就讲讲它在 vue-router 内部是如何实现的。
​

我们只需要使用 `router.addRoute` 方法就能新增一条路由记录，之前我们在讲 [2. 创建 matcher](#_2-创建-matcher) 有看到这个方法的定义，下面是它的实现：

```javascript
function addRoute(parentOrRoute, route) {
  // 判断是否有传入父路由，有则取，无则 undefined
  const parent =
    typeof parentOrRoute !== 'object' ? nameMap[parentOrRoute] : undefined
  // 插入一条路由，由于这里可能只会传入一个参数，所以需要判断一下
  createRouteMap([route || parentOrRoute], pathList, pathMap, nameMap, parent)

  // 有父路由并且父路由存在别名的情况下，需要给这个别名路由也新增一条子路由
  if (parent) {
    createRouteMap(
      // $flow-disable-line route is defined if parent is
      parent.alias.map((alias) => ({
        path: alias,
        children: [route]
      })),
      pathList,
      pathMap,
      nameMap,
      parent
    )
  }
}
```

这里比较重要的是调用 `createRouteMap` 来创建路由，它的实现之前在 [3. 根据路由配置生成三张表](#_3-根据路由配置生成三张表) 有提到，不过当时只关注它如何生成三张表，在现在这种情况下调用它的区别在于：

```javascript
// 这三张表都无需新增，直接拿之前的
const pathList: Array<string> = oldPathList || []
const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)
```

好了，可以看到新增一条路由规则十分简单，只需要对 `pathList` 、 `pathMap` 、 `nameMap` 进行改动就好了。

## 五、 三种路由模式的实现

vue-router 的核心逻辑已经讲得差不多了，就剩下三种路由模式之间的差异，这一小节就来仔细讲讲它们各自的内部实现。
​

#### 相同的部分

我们知道三种路由模式都是 `History` 的派生类，源码位置在 [src/history/base.js](https://github1s.com/vuejs/vue-router/blob/HEAD/src/history/base.js)，我们先来看看它们一些比较重要的公用方法：

- onReady
- onError
- transitionTo
- confirmTransition
- updateRoute

其实这些方法在前文中已经或多或少有提到了，其余的那些也只是做一些更新变量的操作，这里也不谈了。

其实还有一个非常重要的就是构造函数，它主要是做一些实例变量的初始化，这里混个眼熟就好：

```javascript
constructor(router: Router, base: ? string) {
    this.router = router
    this.base = normalizeBase(base)
    // start with a route object that stands for "nowhere"
    this.current = START
    this.pending = null
    this.ready = false
    this.readyCbs = []
    this.readyErrorCbs = []
    this.errorCbs = []
    this.listeners = []
}
```

下面我们就讲讲它们不同的地方。

#### hash 模式

hash 应该是最常用的一种模式了，它也是浏览器环境下的默认模式，至于它的特点相信大家也很熟悉了，就是利用 `URL` 中的 `hash` 值来做路由，这种模式兼容性是最好的。
​

##### 初始化

我们先来看看它在初始化时会做哪些操作：

```javascript
constructor(router: Router, base: ? string, fallback : boolean) {
    super(router, base)
    // check history fallback deeplinking
    if (fallback && checkFallback(this.base)) {
        return
    }
    ensureSlash()
}
```

代码不多，首先是检查是否因为回退而使用 hash 模式，如果是的话则调用 `checkFallback` 检查它的返回值，如果为 `true` 则不调用 `ensureSlash` 。
​

下面是 `checkFallback` 的实现：

```javascript
function checkFallback(base) {
  // 这个方法位于 src/history/html5.js，用于获取 URL 中的路径部分
  // http://a.com/user/routes => /user/routes
  // http://a.com/#/user/routes => /#/user/routes
  const location = getLocation(base)
  // 检查是否以 /## 开头，如果不是，则重定向至以 /## 开头
  if (!/^\/#/.test(location)) {
    // http://a.com/user/routes => http://a.com/#/user/routes
    window.location.replace(cleanPath(base + '/#' + location))
    return true
  }
}
```

也就是说当我们使用了 `history` 模式但由于不支持需要回退到 `hash` 模式时，它会自动重定向到符合 `hash` 模式下的 `url` ，接着再执行 `ensureSlash` 方法。

下面是 `ensureSlash` 方法的实现：

```javascript
// http://a.com/#/user/routes => /user/routes
function getHash(): string {
  // We can't use window.location.hash here because it's not
  // consistent across browsers - Firefox will pre-decode it!
  let href = window.location.href
  const index = href.indexOf('#')
  // empty path
  if (index < 0) return ''

  href = href.slice(index + 1)

  return href
}

function replaceHash(path) {
  if (supportsPushState) {
    replaceState(getUrl(path))
  } else {
    window.location.replace(getUrl(path))
  }
}

function ensureSlash(): boolean {
  const path = getHash()
  if (path.charAt(0) === '/') {
    return true
  }
  replaceHash('/' + path)
  return false
}
```

很简单，就是判断一下 `hash` 部分是否以 `/` 开头，如果不是则要重定向到以 `/` 开头的 `URL` 。
​

这样就能解释我们在使用 vue-router 开发项目时，为什么打开调试页面 [http://localhost:8080](http://localhost:8080) 后会自动把 url 修改为 [http://localhost:8080/#/](http://localhost:8080/#/) 了。

##### push 和 replace

`hash` 模式的 `push` 方法我们在 [三、 切换路由时发生了什么](#三、-切换路由时发生了什么) 这一小节已经提到过了，其实 `replace` 也是大同小异，下面是这两个方法的实现：

```javascript
push(location: RawLocation, onComplete ? : Function, onAbort ? : Function) {
    const {
        current: fromRoute
    } = this
    this.transitionTo(
        location,
        route => {
            pushHash(route.fullPath)
            handleScroll(this.router, route, fromRoute, false)
            onComplete && onComplete(route)
        },
        onAbort
    )
}

replace(location: RawLocation, onComplete ? : Function, onAbort ? : Function) {
    const {
        current: fromRoute
    } = this
    this.transitionTo(
        location,
        route => {
            replaceHash(route.fullPath)
            handleScroll(this.router, route, fromRoute, false)
            onComplete && onComplete(route)
        },
        onAbort
    )
}
```

`replace` 方法跟 `push` 方法不同的地方是它调用的是 `replaceHash` 而不是 `pushHash` ，下面是 `replaceHash` 方法的实现：

```javascript
function replaceHash(path) {
  if (supportsPushState) {
    replaceState(getUrl(path))
  } else {
    window.location.replace(getUrl(path))
  }
}

// 以下方法在 src/util/push-state.js 中
export function pushState(url?: string, replace?: boolean) {
  saveScrollPosition()
  // try...catch the pushState call to get around Safari
  // DOM Exception 18 where it limits to 100 pushState calls
  const history = window.history
  try {
    if (replace) {
      // preserve existing history state as it could be overriden by the user
      const stateCopy = extend({}, history.state)
      stateCopy.key = getStateKey()
      history.replaceState(stateCopy, '', url)
    } else {
      history.pushState(
        {
          key: setStateKey(genStateKey())
        },
        '',
        url
      )
    }
  } catch (e) {
    window.location[replace ? 'replace' : 'assign'](url)
  }
}

export function replaceState(url?: string) {
  pushState(url, true)
}
```

所以它们在更新 `URL` 时的区别在于调用的是 `push` 还是 `replace` 方法。
​

##### go

而 `go` 方法就更直接了，实际上就是调用 `history.go` 这个方法：

```javascript
go(n: number) {
    window.history.go(n)
}
```

不知道大家会不会疑惑，这里没有调用 `transitionTo` 方法， `vue-router` 是如何知道需要更新路由的呢？
​

这就是就得不得说一下 `setupListeners` 这个方法了。

##### setupListeners

还记得在 [三、 切换路由时发生了什么](#三、-切换路由时发生了什么) 这一小节的 `init` 方法里有这么一段代码：

```javascript
// 在浏览器环境下初始化时根据当前路由位置做路由跳转
if (history instanceof HTML5History || history instanceof HashHistory) {
  const handleInitialScroll = (routeOrError) => {
    const from = history.current
    const expectScroll = this.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll && 'fullPath' in routeOrError) {
      handleScroll(this, routeOrError, from, false)
    }
  }
  const setupListeners = (routeOrError) => {
    history.setupListeners()
    handleInitialScroll(routeOrError)
  }
  // 切换路由的方法，这个方法后面会讲
  history.transitionTo(
    history.getCurrentLocation(),
    setupListeners,
    setupListeners
  )
}
```

在 `history` 或者 `hash` 模式下初始化时也会调用一下 `transitionTo` ，而这里传入的 `onComplete` 回调就会调用 `setupListeners` 方法，为什么要这么做呢？我们直接看 `setupListeners` 里面是什么：

```javascript
setupListeners() {
    if (this.listeners.length > 0) {
        return
    }

    const router = this.router
    const expectScroll = router.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
        this.listeners.push(setupScroll())
    }

    const handleRoutingEvent = () => {
        const current = this.current
        // 检查当前 URL 是否符合 hash 模式的规则，如果符合会直接重定向一下
        // 由于重定向后还是会再触发一下当前方法，这次就没必要执行了
        if (!ensureSlash()) {
            return
        }
        this.transitionTo(getHash(), (route) => {
            if (supportsScroll) {
                handleScroll(this.router, route, current, true)
            }
            if (!supportsPushState) {
                replaceHash(route.fullPath)
            }
        })
    }
    const eventType = supportsPushState ? 'popstate' : 'hashchange'
    window.addEventListener(eventType, handleRoutingEvent)
    this.listeners.push(() => {
        window.removeEventListener(eventType, handleRoutingEvent)
    })
}
```

主要是做了两件事情：

1. 监听 `popstate` 或者 `hashchange` 事件，触发时会执行一下 `transitionTo`​
1. 在 `listeners` 中存入两个回调：处理滚动相关、取消监听第 1 点中的事件

也就是说 vue-router 除了调用 `push` 或者 `replece` 这些方法以外，它也支持通过其它方式来切换路由，只要这个操作会触发 `popstate` 或者 `hashchange` 事件，比如下面这些方式：

- 如支持 `history` api
  - history.pushState
  - history.replaceState
  - history.back
  - history.go
- `location.hash = '#/a'`

当然这个事件监听器会在应用实例销毁时取消监听，避免产生副作用：

```javascript
teardown() {
    // clean up event listeners
    // https://github.com/vuejs/vue-router/issues/2341
    this.listeners.forEach(cleanupListener => {
        cleanupListener()
    })
    this.listeners = []
    // reset current history route
    // https://github.com/vuejs/vue-router/issues/3294
    this.current = START
    this.pending = null
}
```

#### history 模式

`history` 模式是基于 HTML5 History API 实现的，不过在生产环境上使用它还需要在服务器上配置路由转发才行，不过这仍是大部分项目的选择，毕竟这样比较好看，不像 hash 模式这么奇葩。

##### 初始化

我们看看 `history` 模式在初始化时会做哪些操作：

```javascript
constructor(router: Router, base: ? string) {
    super(router, base)
    // getLocation 方法在前面已经讲过，主要用于获取 URL 中的路径部分
    this._startLocation = getLocation(this.base)
}
```

只是初始化了一个 `_startLocation` 变量，这个变量的作用后面会讲到。
​

##### push 和 replace、go

其实 `history` 模式的这几个方法与 `hash` 模式是一模一样的，区别是它们在调用 `pushState` 时传入的 `URL` 不一样而已，关于 `pushState` 方法的定义前面已经讲过了。

##### setupListeners

`setupListeners` 与 `hash` 模式也是大同小异，区别在于它在判断 `URL` 与当前路由是否一致时有点不同：

```diff
const handleRoutingEvent = () => {
  const current = this.current

-  if (!ensureSlash()) {
-    return
-  }
+  const location = getLocation(this.base)
+  if (this.current === START && location === this._startLocation) {
+    return
+  }

  this.transitionTo(location, (route) => {
    if (supportsScroll) {
      handleScroll(router, route, current, true)
    }
  })
}
```

#### abstract 模式

`abstract` 我们可能用得比较少，它主要是用在 `node` 环境下，也就是说在该模式下不会调用一切与浏览器相关的 `api` ，那它就只能用别的地方去维护当前 `URL` 与路由历史，由于不是很长，我直接放在一起讲了：

```javascript
export class AbstractHistory extends History {
  index: number
  stack: Array<Route>

  constructor(router: Router, base: ?string) {
    super(router, base)
    // 堆栈，用于维护路由历史
    this.stack = []
    // 当前所在路由在 stack 中的索引
    this.index = -1
  }

  push(location: RawLocation, onComplete?: Function, onAbort?: Function) {
    this.transitionTo(
      location,
      (route) => {
        // 将当前跳转的路由存入栈中，index + 1
        this.stack = this.stack.slice(0, this.index + 1).concat(route)
        this.index++
        onComplete && onComplete(route)
      },
      onAbort
    )
  }

  replace(location: RawLocation, onComplete?: Function, onAbort?: Function) {
    this.transitionTo(
      location,
      (route) => {
        // 将当前跳转的路由替换之前路由所在的位置，index 不变
        this.stack = this.stack.slice(0, this.index).concat(route)
        onComplete && onComplete(route)
      },
      onAbort
    )
  }

  go(n: number) {
    const targetIndex = this.index + n
    if (targetIndex < 0 || targetIndex >= this.stack.length) {
      return
    }
    const route = this.stack[targetIndex]
    this.confirmTransition(
      route,
      () => {
        const prev = this.current
        // 将跳转至的路由索引指向 index
        this.index = targetIndex
        this.updateRoute(route)
        this.router.afterHooks.forEach((hook) => {
          hook && hook(route, prev)
        })
      },
      (err) => {
        if (isNavigationFailure(err, NavigationFailureType.duplicated)) {
          this.index = targetIndex
        }
      }
    )
  }

  getCurrentLocation() {
    const current = this.stack[this.stack.length - 1]
    return current ? current.fullPath : '/'
  }

  ensureURL() {
    // noop
  }
}
```

本文完，感谢阅读。
