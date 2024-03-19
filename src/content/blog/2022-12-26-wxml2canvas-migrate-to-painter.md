---
title: 我们如何从 Wxml2Canvas 迁移到 Painter
pubDatetime: 2022-12-26
permalink: /post/how-to-migrate-wxml2canvas-to-painter.html
tags: 
  - 前端
---

## 路漫漫其修远兮
糖纸苦 Wxml2Canvas 久矣！

长期以来，糖纸项目使用 [Wxml2Canvas](https://github.com/wg-front/wxml2canvas) 库来生成分享海报。这个库的功能就是将 Wxml 转换成 Canvas，并最终生成一张图片。但是，这个库非常不稳定，经常会出现各种奇怪的 BUG，只能说勉强能用。如果你想了解 Wxml2Canvas 给我们带来的痛苦，可以阅读这篇文章：[《一行 Object.keys() 引发的血案》](https://4ark.me/post/how-object-keys-work.html)。

因此，我们一直希望能找到一个更好的替代方案。在社区搜索后，我们发现 [Painter](https://github.com/Kujiale-Mobile/Painter) 非常不错。然而，它与 Wxml2Canvas 的使用方式有很大的差异，我们的项目中有二十多个地方使用了 Wxml2Canvas，所以迁移起来并不容易。但 2022 即将结束，我们希望能在最后时刻做点事情来让自己找回一丝慰藉，所以才有了这篇文章。

让我们来看看这两个库的使用方式有什么不同：

<img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202212270056681.png?imageMogr2/format/webp" alt="image-20221227005600071" style="zoom: 50%;" />

<img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202212270056939.png?imageMogr2/format/webp" alt="image-20221227005620310" style="zoom:50%;" />

Wxml2Canvas 使用方式相对直观，使用 Wxml 和 Wxss 实现，而 Painter 则使用 JSON 配置。如果要将项目迁移到 Painter，就需要手写大量的 JSON 配置，这需要相当多的工作量。

## 吾将上下而求索

俗话说得好：**只要思想不滑坡，办法总比困难多！**

那么，有没有一种方法可以让我们迁移到 Painter，同时又不用重写 JSON 配置呢？

让我们从不同的角度思考一下：Wxml2Canvas 可以直接将 Wxml 画到 Canvas 上，那么是否也可以将其转换成 JSON 配置呢？这样，我们就可以复用现有的 Wxml 代码，减少迁移的成本。

大致流程如下：

<img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202212272228830.png?imageMogr2/format/webp" alt="image-20221227222820467" style="zoom:50%;" />



总之，我们需要一个转换器来将 Wxml 转换为符合 Painter 使用的 JSON 配置，我愿称之为 Wxml2Json。

说干就干，我们可以直接照搬 Wxml2Canvas 的做法。首先获取最外层容器的尺寸，用来定义分享海报的宽高。然后，通过 wx.createSelectorQuery().selectAll() 获取所有需要绘制的节点和样式信息。接着，根据不同的节点类型设置对应的属性，最终输出一份 JSON 配置供 Painter 使用。

其核心方法是 `getWxml`，大致实现如下：

```js
getWxml({container, className} = {}) {
  const getNodes = new Promise(resolve => {
    query
      .selectAll(className)
      .fields(
        {
          id: true,
          dataset: true,
          size: true,
          rect: true,
          computedStyle: COMPOUTED_ELEMENT_STYLE,
        },
        res => {
          resolve(this.formatNodes(res))
        },
      )
      .exec()
  })

  const getContainer = new Promise(resolve => {
    query
      .select(container)
      .fields(
        {
          dataset: true,
          size: true,
          rect: true,
        },
        res => {
          resolve(res)
        },
      )
      .exec()
  })

  return Promise.all([getContainer, getNodes])
}
```

而 `formatNodes` 方法的职责就是根据需要绘制的节点类型进行格式转换：

```js
formatNodes(nodes) {
  return nodes
    .map(node => {
      const {dataset = {}} = node

      node = {...node, ...dataset}

      const n = _.pick(node, ['type', 'text', 'url'])

      n.css = this.getCssByType(node)

      return n
    })
    .filter(s => s && s.type)
}
```

有了这个转换器，我们的迁移工作只需要将 `new Wxml2Canvas` 替换成 `new Wxml2Json` ，然后将数据传入 Painter 中即可。因此，一天内完成所有 Wxml2Canvas 迁移到 Painter 的工作将不再是个梦。

## 山重水复疑无路

缝合结束，不出意外的话马上要出意外了，虽然大部分机型都表示情绪稳定，但成功路上注定不会一马平川。

果不其然，让全网「沸腾」的鸿蒙首当其冲，如下图所示：
<img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202212280057359.png?imageMogr2/format/webp" alt="image-20221228005732730" style="zoom: 20%; text-align: left; margin:0;" />

然后，测试小姐姐的 iPhone 12 也毫不甘落下风，上来就憋了个大招：微信闪退。

以上这两个页面都有一个共同点，就是生成的分享海报尺寸非常大，比如说这个：1170 × 17259。

我去线上看了一下，发现同一个页面上  Wxml2Canvas  却是稳定的，那这个 Painter 为什么这么拉胯？

开始找茬，分析两者的实现，终于发现了一些端倪：首先是  `wx.canvasToTempFilePath` 的参数不同：

<img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202212282240876.png?imageMogr2/format/webp" alt="image-20221228223957183" style="zoom:50%;" />

翻看 [wx.canvasToTempFilePath](https://developers.weixin.qq.com/miniprogram/dev/api/canvas/wx.canvasToTempFilePath.html) 文档，其中 `x`、`y` 默认值都是 0，问题不大。

主要问题在于 `width` 和 `height`，我们先来看看 `wx.canvasToTempFilePath` 这几个参数的作用：

- width，画布的宽度
- height，画布的高度
- destWidth，输出图片的宽度，默认值是 width × dpr
- destHeight，输出图片的高度，默认值是 height × dpr

然后再梳理一下这两个库中的参数值是多少：

- Wxml2Canvas
  - width：与外层容器的宽度、 canvas 宽度一致
  - height：与外层容器的高度、 canvas 高度一致
  - destWidth，width × dpr
  - destHeight，height × dpr
- Painter
  - width：外层容器的宽度 * dpr、 canvas 宽度一致
  - height：外层容器的宽度 * dpr、 canvas 高度一致
  - destWidth，与 canvas 宽度一致
  - destHeight， 与 canvas 高度一致

答案呼之欲出了，我来解释一下：

1. Painter 会将所有需要绘制的节点尺寸乘以设备的 dpr。假设我们要生成一张 375 x 800 的海报，其中包含一张 100 x 100 的图片，在当前设备的 dpr 为 3 的情况下，Painter 会创建一张 1125 x 2400 的画布，在画布上绘制一张 300 x 300 的图片。最终在保存图片时，输出的图片尺寸与画布大小完全一致。
2. Wxml2Canvas 在绘制时是创建一张 375 x 800 的画布，并在画布上绘制一张 100 x 100 的图片，但是在最终保存图片时，输出的图片尺寸是画布大小乘以 dpr。

看上去 Painter 的做法似乎并无不妥，因为画布大小和最终成品是 1:1 的；反观 Wxml2Canvas 却是 1:3，难道这样导出的图片不会影响清晰度吗？我们直接来做个实验，分别用 Painter 和 Wxml2Canvas 生成同一张分享海报，对比两张图片的不同，结果发现导出的图片无论尺寸还是文件大小都是一模一样的，如图所示：

![image-20221229181609765](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202212291816047.png?imageMogr2/format/webp)

## 柳暗花明又一村

既然如此，我们就可以直接将 Wxml2Canvas 的方案移植到 Painter，最终发现这样能 work：



<img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202212291328173.png?imageMogr2/format/webp" alt="image-20221229132803803" style="zoom:50%;" />

总而言之，尽管两者最终生成的成品尺寸是一样的，但是 Painter 设置的画布尺寸比 Wxml2Canvas 大了三倍，这样会使用更多的内存，而且微信官方文档也提到：设置过大的宽高会导致 Crash 的问题。

经过这一番操作，鸿蒙和 iPhone 12 也终于服帖了。然而，又有新的问题出现了。当某个页面生成并保存图片后，在滑动该页面时会明显感觉卡顿，对比一下 fps（帧率）的变化，确实离谱。
<img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202301032334581.png?imageMogr2/format/webp" alt="image-20230103233431180" style="zoom:100%;" />

这种卡顿是肉眼可见的，猜测可能是因为内存泄露造成。在真机上调试分析了一下内存占用情况，未进行生成海报时，CPU 占用率为 2%，内存占用为 872 MB：

![image-20230103235024011](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202301032351510.png?imageMogr2/format/webp)

当生成海报时，CPU 占用率快速飙升到 22%，内存占用 895 MB：

![image-20230103235506588](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202301032355858.png?imageMogr2/format/webp)

随后发现内存占用并没有下降，直到我们离开了当前页面时，占用率才有所下降。

![image-20230103235744395](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202301032358207.png?imageMogr2/format/webp)

既然如此，可以在生成海报之后立即对分享卡片的内存进行回收，最简单的方式就是使用 `wx:if` 控制。

```diff
<share-card 
+ wx:if="{{showShareCard}}"
  id='share-card'
/>
```

最后来晒晒战绩，迁移后生成时间缩短近 50%：

<img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202212300914569.png?imageMogr2/format/webp" style="zoom:50%;" />

综上所述，Wxml2Canvas 在稳定性和可维护性方面都有所欠缺，但也有值得 Painter 借鉴的地方。例如，Wxml2Canvas 的使用方式更直观，不需要设置过大的画布尺寸，从而避免了 Crash 的风险。因此，将两者缝合起来，以最小的成本提高糖纸生成分享海报的效率和稳定性，何乐而不为？
