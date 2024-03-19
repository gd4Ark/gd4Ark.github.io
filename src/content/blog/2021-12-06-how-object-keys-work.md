---
title: 一行 Object.keys() 引发的血案
pubDatetime: 2021-12-06
permalink: /post/how-object-keys-work.html
tags: 
  - 前端
  - JavaScript
  - V8
---

## 故事背景

有一天上线后大佬在群里反馈了一个问题，他刚发的动态在生成分享卡片的时候，卡片底部的小程序码丢失了，然而其他小伙伴都表示在自己手机上运行正常。事实上大佬也说除了这条动态以外，其它都是正常的。

说明这个 BUG 需要特定的动态卡片 + 特定的设备才能复现，所幸坐我对面的小姐姐手机与大佬是同款，也能复现 BUG，避免了作为社恐的我要去找大佬借手机测试的尴尬。

先交代一下项目背景，这是一个微信小程序项目，其中生成分享卡片功能用到的是一个叫 [wxml2canvas](https://github.com/wg-front/wxml2canvas) 的库，然而该库目前看上去已经「年久失修」，上面所说的 BUG 就是因为这个库，本文主要对其进行「鞭尸」之余，顺便分享一下排查该 BUG 的过程、以及如何从 ECMAScript 规范中找到关于 `Object.keys()` 返回顺序的规范定义，最后介绍一下在 V8 引擎中是如何处理对象属性的。

希望大家在阅读本文后，不会再因为搞不懂  `Object.keys()` 输出的顺序而犯错导致产生莫名其妙的 BUG。

## TL;DR

> 浪费读者的时间是可耻的。———— 鲁迅

本文很长，如果你不想阅读整篇文章，可以阅读这段摘要；如果你打算阅读整篇文章，那么你完全可以跳过本段。

如果阅读摘要时未能帮助你理解，可以跳转到对应章节进行详细阅读。

摘要：

1. 这个 BUG 是如何产生的？

- `wxml2canvas` 在绘制的时候，会根据一个叫做 `sorted` 的对象对它的 keys 进行遍历，该对象的 key 为节点的 top 值，value 为节点元素；问题就是出在这里，该库作者误以为 `Object.keys()` 总是会按照实际创建属性的顺序返回，**然而当 key 为正整数的时候**，返回顺序就不符合原本的预期了，会出现了绘制顺序错乱，从而导致这个 BUG 的产生。
- 源码：[src/index.js#L1146](https://github.com/wg-front/wxml2canvas/blob/master/src/index.js#L1146) 和 [src/index.js#L829](https://github.com/wg-front/wxml2canvas/blob/master/src/index.js#L829)

2. 如何解决这个 BUG

- 由于对象的 key 是一个数字，那么 key 有可能会是整数，也有可能是浮点数。但是预期行为是希望  `Object.keys()` 按照属性实际创建的顺序返回，那只要将所有 key 都强制转换为浮点数就好了。

3. `Object.keys()` 是按照什么顺序返回值的？
- `Object.keys()` 返回顺序与遍历对象属性时的顺序一样，调用的是 `[[OwnPropertyKeys]]()` 内部方法。
- 根据 [ECMAScript 规范](https://262.ecma-international.org/6.0/#sec-ordinary-object-internal-methods-and-internal-slots-ownpropertykeys)，在输出 keys 时会**先将所有 key 为数组索引类型（正整数）从小到大的顺序排序，然后将所有字符串类型（包括负数、浮点数）的 key 按照实际创建的顺序来排序**。

4. V8 内部是如何处理对象属性的？
- V8 在存储对象属性时，为了提高访问效率，会分为**常规属性(properties)** 和 **排序属性(elements)**
  - **排序属性(elements)** ，就是数组索引类型的属性（也就是正整数类型）。
  - **常规属性(properties)** ，就是字符串类型的属性（也包括负数、浮点数）。
  - 以上两种属性都会存放在线性结构中，称为**快属性**。
  - 然而这样每次查询都有一个间接层，会影响效率，所以 V8 引入**对象内属性(in-object-properties)**  。
- V8 会为每一个对象关联一个隐藏类，用于记录该对象的形状，相同形状的对象会共用同一个隐藏类。
    - 当对象添加、删除属性的时候，会创建一个新的对应的**隐藏类**，并重新关联。
- **对象内属性**会将部分**常规属性**直接放在对象第一层，所以它访问效率是最高的。
    - 当**常规属性**的数量**少于对象初始化时的属性数量**时，**常规属性**会直接作为**对象内属性**存放。
- 虽然**快属性**访问速度快，但是从线性结构中添加或删除时执行效率会非常低，因此如果属性特别多、或出现添加和删除属性时，就会将**常规属性**从线性存储改为字典存储，这就是**慢属性**。

可以看一下这两张图帮助理解：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/object-keys.jpeg)
<p style="text-align:center;">V8 常规属性和排序属性</p>

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/v8-object-keys.jpeg)
<p style="text-align:center;">V8 对象内属性、快属性和慢属性</p>
<p style="text-align:center;"><a href="https://time.geekbang.org/column/intro/100048001">图片出处：《图解 Google V8》 —— 极客时间</a></p>

## 如何解决该 BUG

由于是特定的动态 + 特定的设备才能复现问题，可以很轻易地排除掉网络原因，通过在 `wxml2canvas` 输出绘制的节点列表，也能看到小程序码相关的节点。

既然 `wxml2canvas` 已经接收到小程序码的节点，却没有绘制出来，那么问题自然就出在 `wxml2canvas`  内部，不过已经见怪不怪了，在我加入项目以后就已经多次因为这操蛋的 `wxml2canvas` 出现各种问题而搞得头皮发麻，有机会一定要替换掉这个库，但由于已经有很多页面在依赖这个库，现在也只能硬着头皮上。

首先怀疑是小程序码节点的坐标位置不太对，通过对比，发现位置相差不大，排除该原因。

然后对比所有节点的绘制顺序，发现了一个不太寻常的点，在复现 BUG 的手机上，绘制小程序码节点的时机是比较靠前的，但由于它在卡片底部，所以在正常情况下，应该是比较靠后才对。

于是通过查看相关代码，果然发现了其中的玄机：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/WechatIMG100.jpeg)

在绘制的时候，通过遍历 `sorted` 对象，从上往下、从左到右依次绘制，但是通过对比两台手机的 `Object.keys()`，发现了它们的输出是不一样的，这时候我就明白怎么回事了。

先来说说这个 `sorted` 对象，它是一个 key 为节点 top 值，value 为所有相同 top 值（同一行）的元素数组。

下面是生成它的代码：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/Snipaste_2021-12-08_00-07-16.png)

问题就发生在前面所说的 `Object.keys()` 这里，我们先来看个 🌰：

```js
const sorted = {}

sorted[300] = {}
sorted[200] = {}
sorted[100] = {}

console.log(Object.keys(sorted)) // 输出什么呢？
```

相信大部分同学都知道答案是：[‘100', '200', '300’]。

如果在有浮点数的情况呢？

```js
const sorted = {}

sorted[300] = {}
sorted[100] = {}
sorted[200] = {}
sorted[50.5] = {}

console.log(Object.keys(sorted)) // 这次又输出什么呢？
```

会不会有同学以为答案是：['50.5', ‘100', '200', '300’] 呢？

但正确的答案应该是：[‘100', '200', '300’,’50.5’]。

所以我合理地猜测 `wxml2canvas` 的作者就是犯了这样的错误，他可能以为 `Object.keys`  会根据 key 从小到大的顺序返回，因此满足从上往下绘制的逻辑。但是他却没有考虑浮点数的情况，所以当某个节点 top 值为整数的时候，会比其他 top 值为浮点数的节点更早地绘制，导致绘制后面的节点时覆盖了前面的节点。

于是，当我把代码改成这样后，分享卡片的小程序码就正常绘制出来了：

```diff
  Object
  .keys(sorted)
+ .sort((a, b)=> a - b)
  .forEach((top, topIndex) => {
    //  do something
  }
```

OK，搞定收工。

**测试小姐姐**：慢着！影响到其它地方了。

我一看，果然。于是再次经过对比，发现原来大部分情况下，top 值都会是浮点数，而本次出 BUG 的卡片小程序码只是非常凑巧地为整数，导致绘制顺序不对。

我才发现 `wxml2canvas` 原本的逻辑是想根据 `sorted` 创建的顺序来绘制，但是没有考虑 key 为整数的情况。

所以，最后这样修改解决问题：

```diff
_sortListByTop (list = []) {
    let sorted = {};

    // 粗略地认为2px相差的元素在同一行
    list.forEach((item, index) => {
-       let top = item.top;
+       let top = item.top.toFixed(6); // 强制添加小数点，将整数转为浮点数
        if (!sorted[top]) {
            if (sorted[top - 2]) {
                top = top - 2;
            }else if (sorted[top - 1]) {
                top = top - 1;
            } else if (sorted[top + 1]) {
                top = top + 1;
            } else if (sorted[top + 2]) {
                top = top + 2;
            } else {
                sorted[top] = [];
            }
        }
        sorted[top].push(item);
    });

    return sorted;
}
```

很显然，是因为 `wxml2canvas` 作者对 `Object.keys()` 返回顺序的机制不了解，才导致出现这样的 BUG。

不知道是否也有同学犯过同样的错误，为避免再次出现这样的情况，非常有必要深入、全面地介绍一下 `Object.keys()` 的执行机制。 

所以接下来就跟随我一探究竟吧。

## 深入理解 Object.keys()

可能会有同学说： `Object.keys()` 又不是什么新出的 API， Google 一下不就行了，何必大费周章写一篇文章来介绍呢？

的确通过搜索引擎可以很快就能知道 `Object.keys()` 的返回顺序是怎样的，但是很多都只流于表面，甚至我还见过这样片面的回答：数字排前面，字符串排后面。

所以这次我想试着追本溯源，通过第一手资料来获取信息，轻易相信口口相传得来的信息，都极有可能是片面的、甚至是错误的。

PS：其实不光技术，我们在对待其它不了解的事物都应保持同样的态度。 

我们先来看看在 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/keys) 上关于 `Object.keys()` 的描述：

> `Object.keys()` 方法会返回一个由一个给定对象的自身可枚举属性组成的数组，数组中属性名的排列顺序和正常循环遍历该对象时返回的顺序一致 。

emmm... 并没有直接告诉我们输出顺序是什么，不过我们可以看看上面的 [Polyfill](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/keys#polyfill) 是怎么写的：

```js
if (!Object.keys) {
  Object.keys = (function () {
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function (obj) {
      if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) throw new TypeError('Object.keys called on non-object');

      var result = [];

      for (var prop in obj) {
        if (hasOwnProperty.call(obj, prop)) result.push(prop);
      }

      if (hasDontEnumBug) {
        for (var i=0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) result.push(dontEnums[i]);
        }
      }
      return result;
    }
  })()
};
```

其实就是利用 `for...in` 来进行遍历，接下来我们可以再看看关于 [for...in](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/for...in) 的文档，然而里面也没有告诉我们顺序是怎样的。

既然 MDN 上没有，那我们可以直接看 ECMAScript 规范，通常 MDN 上都会附上关于这个 API 的规范链接，我们直接点开最新（Living Standard）的那个，下面是关于 Object.keys 的[规范定义](https://tc39.es/ecma262/#sec-object.keys)：

>
> When the keys function is called with argument *O*, the following steps are taken:
>
> 1.  Let *obj* be ? [ToObject](https://tc39.es/ecma262/#sec-toobject)(*O*).
> 1.  Let *nameList* be ? [EnumerableOwnPropertyNames](https://tc39.es/ecma262/#sec-enumerableownpropertynames)(*obj*, key).
> 1.  Return [CreateArrayFromList](https://tc39.es/ecma262/#sec-createarrayfromlist)(*nameList*).

对象属性列表是通过 ` EnumerableOwnPropertyNames` 获取的，这是它的[规范定义](https://tc39.es/ecma262/#sec-enumerableownpropertynames)：

> The abstract operation EnumerableOwnPropertyNames takes arguments O (an Object) and kind (key, value, or key+value). It performs the following steps when called:
>
> 1. Let ownKeys be ? O.[[OwnPropertyKeys]]().
>
> 2. Let properties be a new empty List.
>
> 3. For each element key of ownKeys, do
>     a. If Type(key) is String, then
>     1. Let desc be ? O.[[GetOwnProperty]](key).
>     2. If desc is not undefined and desc.[[Enumerable]] is true, then
>         a. If kind is key, append key to properties.
> 		b. Else,
>           1. Let value be ? Get(O, key).
>           2. If kind is value, append value to properties.
>           3. Else
>               i. Assert: kind is key+value.
>               ii. Let entry be ! CreateArrayFromList(« key, value »).
>               iii. Append entry to properties.
>                 
> 4. Return properties.

**敲黑板！** 这里有个细节，请同学们多留意，后面会考。

我们接着探索，`OwnPropertyKeys` 最终返回的 `OrdinaryOwnPropertyKeys`：

> The [[OwnPropertyKeys]] internal method of an ordinary object O takes no arguments. It performs the following steps when called:
> 1. Return ! [OrdinaryOwnPropertyKeys(O)](https://tc39.es/ecma262/#sec-ordinaryownpropertykeys).

重头戏来了，关于 keys 如何排序就在 `OrdinaryOwnPropertyKeys` 的[定义](https://tc39.es/ecma262/#sec-ordinaryownpropertykeys)中：

> The abstract operation OrdinaryOwnPropertyKeys takes argument O (an Object). It performs the following steps when called:
> 
> 1. Let keys be a new empty List.
> 2. For each own property key P of O such that P is an array index, in ascending numeric index order, do
>     a. Add P as the last element of keys.
> 3. For each own property key P of O such that Type(P) is String and P is not an array index, in ascending chronological order of property creation, do
>     a. Add P as the last element of keys.
> 4. For each own property key P of O such that Type(P) is Symbol, in ascending chronological order of property creation, do
>     a. Add P as the last element of keys.
> 5. Return keys.

到这里，我们已经知道我们想要的答案，这里总结一下：

1. 创建一个空的列表用于存放 keys
2. 将所有**合法的数组索引**按升序的顺序存入
3. 将所有**字符串类型索引**按属性创建时间以升序的顺序存入
4. 将所有 **`Symbol` 类型索引**按属性创建时间以升序的顺序存入
5. 返回 keys

这里顺便也纠正一个普遍的误区：有些回答说将所有属性为数字类型的 key 从小到大排序，其实不然，还必须要符合**「合法的数组索引」**，也即只有**正整数**才行，负数或者浮点数，一律当做字符串处理。

PS：严格来说对象属性没有数字类型的，无论是数字还是字符串，都会被当做字符串来处理。

我们结合上面的规范，来思考一下下面这段代码会输出什么：

```js
const testObj = {}

testObj[-1] = ''
testObj[1] = ''
testObj[1.1] = ''
testObj['2'] = ''
testObj['c'] = ''
testObj['b'] = ''
testObj['a'] = ''
testObj[Symbol(1)] = ''
testObj[Symbol('a')] = ''
testObj[Symbol('b')] = ''
testObj['d'] = ''

console.log(Object.keys(testObj))
```

请认真思考后，在这里核对你的答案是否正确：
<details>
  <summary>查看结果</summary>
  
  ```json
  ['1', '2', '-1', '1.1', 'c', 'b', 'a', 'd']
  ```
  
  是否与你想象的一致？你可能会奇怪为什么没有 `Symbol` 类型。

  还记得前面敲黑板让同学们留意的地方吗，因为在 `EnumerableOwnPropertyNames` 的规范中规定了返回值只应包含字符串属性（上面说了数字其实也是字符串）。

  所以 Symbol 属性是不会被返回的，可以看 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames) 上关于 `Object.getOwnPropertyNames()` 的描述。

  如果要返回 Symbol 属性可以用 [Object.getOwnPropertySymbols()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertySymbols)。
</details>



看完 ECMAScript 的规范定义，相信你不会再搞错 `Object.keys()` 的输出顺序了。但是你好奇 V8 是如何处理对象属性的吗，下一节我们就来讲讲。

## V8 是如何处理对象属性的

在 V8 的官方博客上有一篇文章[《Fast properties in V8》](https://v8.dev/blog/fast-properties)（[中译版](https://blog.crimx.com/2018/11/25/v8-fast-properties/)），非常详细地向我们解释了 V8 内部如何处理 JavaScript 的对象属性，强烈推荐阅读。

另外再推荐一下极客时间上的课程《[图解 Google V8](https://time.geekbang.org/column/intro/100048001)》（毕竟本文借用了里面的图片，怎么好意思不推荐）。

本节内容主要参考这两个地方，下面我们来总结一下。

首先，V8 为了提高对象属性的访问效率，将属性分为两种类型：

  - **排序属性(elements)** ，就是符合数组索引类型的属性（也就是正整数）。

  - **常规属性(properties)** ，就是字符串类型的属性（也包括负数、浮点数）。

所有的**排序属性**都会存放在一个线性结构中，线性结构的特点就是支持通过索引随机访问，所以能加快访问速度，对于存放在线性结构的属性都称为**快属性**。

**常规属性**也会存放在另一个线性结构中，可以看下面这张图帮助理解：

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/object-keys.jpeg)
<p style="text-align:center;">V8 排序属性和常规属性</p>

但是**常规属性**还需要做一些额外的处理，这里我们要先介绍一下什么是**隐藏类**。

由于 JavaScript 在运行时是可以修改对象属性的，所以在查询的时候会比较慢，可以看回上面那张图，每次访问一个属性的时候都需要经过多一层的访问，而像 C++ 这类静态语言在声明对象之前需要定义这个对象的结构（形状），经过编译后每个对象的形状都是固定的，所以在访问的时候由于知道了属性的偏移量，自然就会比较快。

V8 采用的思路就是将这种机制应用在 JavaScript 对象中，所以引入了**隐藏类**的机制，你可以简单的理解**隐藏类**就是描述这个对象的形状、包括每个属性对应的位置，这样查询的时候就会快很多。

关于**隐藏类**还有几点要补充：

1. 对象的第一个字段指向它的**隐藏类**。
1. 如果两个对象的形状是完全相同的，会共用同一个**隐藏类**。
2. 当对象添加、删除属性的时候，会创建一个新的对应的**隐藏类**，并重新指向它。
2. V8 有一个转换树的机制来创建隐藏类，不过本文不赘述，有兴趣可以看[这里](https://v8.dev/blog/fast-properties#hiddenclasses-and-descriptorarrays)。

解释完隐藏类，我们再回头来讲讲**常规属性**，通过上面那张图我们很容易发现一个问题，那就是每次访问一个属性的时候，都需要经过一个间接层才能访问，这无疑降低了访问效率，为了解决这个问题，V8 又引入了一个叫做**对象内属性**，顾名思义，它会将某些属性直接存放在对象的第一层里，它的访问是最快的，如下图所示：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/%E4%B8%8B%E8%BD%BD.jpeg)
<p style="text-align:center;">V8 对象内属性</p>

但要注意，**对象内属性**只存放**常规属性**，排序属性依旧不变。而且需要常规属性的数量**小于**某个数量的时候才会直接存放**对象内属性**，那这个数量是多少呢？

答案是取决于**对象初始化时的大小**。

PS：有些文章说是少于 10 个属性时才会存放对象内属性，**别被误导了**。

除了**对象内属性**、**快属性**以外，还有一个**慢属性**。

为什么会有**慢属性**呢？**快属性**虽然访问很快，但是如果要从对象中添加或删除大量属性，则可能会产生大量时间和内存开销来维护**隐藏类**，所以在**属性过多或者反复添加、删除属性时**会将**常规属性**的存储方式从线性结构变成字典，也就是降级到**慢属性**，而由于**慢属性**的信息不会再存放在**隐藏类**中，所以它的访问会比**快属性**要慢，但是可以高效地添加和删除属性。可以通过下图帮助理解：

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/v8-object-keys.jpeg)
<p style="text-align:center;">V8 慢属性</p>

写到这里，我觉得自己对 V8 的快属性、慢属性这些知识已经非常了解，简直要牛逼到上天了。

但当我看到这段代码的时候：

```js
function toFastProperties(obj) {
    /*jshint -W027*/
    function f() {}
    f.prototype = obj;
    ASSERT("%HasFastProperties", true, obj);
    return f;
    eval(obj);
}
```

我的心情是这样的：

<img src="https://ozinparis.com/wp-content/uploads/2016/04/jon-snow-know-nothing-e1461048094110-1.jpg" style="text-align: left; margin-left: 0;" />

关于这段代码是如何能让 V8 使用对象**快属性**的可以看这篇文章：[开启 V8 对象属性的“fast”模式](https://zhuanlan.zhihu.com/p/25069272)。

另外也可以看一下这段代码：[to-fast-properties/index.js](https://github.com/sindresorhus/to-fast-properties/blob/main/index.js)。

## 写在最后

当在开发时遇到一个简单的错误，通常可以很快地利用搜索引擎解决问题，但如果只是面向 Google 编程，可能在技术上很难会有进步，所以我们不光要能解决问题，还要理解这个产生问题的背后的原因到底是什么，也就是知其然更知其所以然。

真的非常建议每个 JavaScript 开发者都应该去了解一些关于 V8 或其它 JavaScript 引擎的知识，无论你是通过什么途径（真的没有打广告），这样能保证我们在编写 JavaScript 代码时出现问题可以更加地得心应手。

最后，本文篇幅有限，部分细节难免会有遗漏，非常建议有兴趣深入了解的同学可以延伸阅读下面的列表。

感谢阅读。

## 延伸阅读

- [Fast properties in V8](https://v8.dev/blog/fast-properties)
    - [中译版](https://blog.crimx.com/2018/11/25/v8-fast-properties/)
- [《图解 Google V8》 —— 极客时间](https://time.geekbang.org/column/intro/100048001)
- [How is data stored in V8 JS engine memory?](https://blog.dashlane.com/how-is-data-stored-in-v8-js-engine-memory/)
- [V8 中的快慢属性与快慢数组](https://z3rog.tech/blog/2020/fast-properties.html)
- [开启 V8 对象属性的“fast”模式](https://zhuanlan.zhihu.com/p/25069272)
- [ECMAScript® 2015 Language Specification](https://262.ecma-international.org/6.0/)
- [Does JavaScript guarantee object property order? —— stackoverflow](https://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order)

