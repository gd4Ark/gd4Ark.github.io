---
title: CSS题目系列（2） - 实现一个固定比例盒子
categories:
  - 前端
tags:
  - 前端
abbrlink: c6e0afe2
date: 2018-11-26 22:55:06
---

<div class="excerpt">
    <img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/006mS5wEgy1fxl6othpvtg31af0pxgtv.gif" />
</div>

<!-- more -->

## 描述

在开发过程中，会有这么一个情况，需要将一个盒子的尺寸定义为固定比例，且尺寸需根据视图的尺寸来进行缩放，也就是响应式，常见的多如有矩形、圆形等。

下面我将使用下面的例子为大家进行讲解：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/006mS5wEgy1fxl6othpvtg31af0pxgtv.gif)



## 正文

其实实现这个效果，有多种方法，下面逐一介绍。

### 1、垂直方向的padding

相信大家对`padding`都不陌生，但你知道他是如何取值的吗？

看一下[MDN](https://developer.mozilla.org/zh-CN/docs/Web/CSS/padding)中对`padding`给出的解释：

> ### 取值
>
> 指定一个，两个，三个或四个下列的值：
>
> - `<长度>`
>
>   可指定非负的固定宽度. See [`<length>`](https://developer.mozilla.org/zh-CN/docs/Web/CSS/length) for details
>
> - `<百分比>`
>
>   相对于包含块的宽度
>
> - **指定一个值时 该值指定四个边的内边距**
> - **指定两个值时 第一个值指定上下两边的内边距 第二个指定左右两边的内边距**
> - **指定三个值时 第一个指定上边的内边距** **.第二个指定左右两边 第三个指定下边**
> - **指定四个值时分别为上 右 下 左（顺时针顺序）**

也就是说，**给`padding`的值设定为百分比时，将根据父容器的宽度来计算。**

现在假设我们有一个`div`，我们希望它的尺寸能根据`body`（它的父容器）的宽度来实现固定比例：

```html
<div class="box"></div>
```

样式部分

```css
.box{
    width:50%;
    padding-bottom:50%;
}
```

> 其实这里的`padding-bottom`换成`padding-top`也一样可以实现。

没错，就这么简单，我们已经实现了文章开头所展示的效果。

但是我们使用这种方法的时候需要注意几点：

1. 不需要设定`height`，最好就是手动设定为`0`。
2. 子元素需要设定为绝对定位（父容器为相对定位），否则子元素将被`padding`挤出去。

#### 其它比例

前面实现的是一个正方形比例的，那如果我想要是`16:9`的呢？

那我们将根据一个公式：`width * x / y`计算，如下：

```css
.box{
	width:50%;
	padding-bottom: calc( 50% * 9 / 16 );
	/* 或者 */
	padding-bottom : 28.125%;
}
```

###  2、视窗单位

> 视窗是你的浏览器实际显示内容的区域——换句话说是你的不包括工具栏和按钮的网页浏览器。这些单位是`vw`,`vh`,`vmin`和`vmax`。它们都代表了浏览器（视窗）尺寸的比例和窗口大小调整产生的规模改变。

也就是说，**网页的宽度是`100vw`，取一半就是`50vw`，无论怎么缩放都是一半，而且这个一半不止可以用在`width`上。**

所以：

```html
<div class="box"></div>
```

```css
.box{
    width:50vw;
    height:50vw;
}
```

一个正方形就出来了，简单吗？？？

#### 其它比例

跟上面一样，通过公式可以得到：

``` css
.box{
	width:50vw;
	padding-bottom: calc( 50vw * 9 / 16 );
	/* 或者 */
	padding-bottom : 28.125vw;
}
```

## 参考链接

- https://www.w3cplus.com/css/aspect-ratio.html
- https://www.zhangxinxu.com/wordpress/2012/09/new-viewport-relative-units-vw-vh-vm-vmin/
- https://blog.csdn.net/qq_36367494/article/details/79266037

## 结束语

通过以上两种方法，以后实现固定比例的盒子是不是变得简单起来了？
