---
title: CSS题目系列（4） - 文字穿透遮罩层
categories:
  - 前端
tags:
  - 前端
abbrlink: 105732a8
date: 2018-11-26 22:58:06
---

<div class="excerpt">
    <img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/006mS5wEgy1fxlh53ze9sj31es0lmq6s.jpg" />
</div>



<!-- more -->


## 描述

在我刚开始学习前端开发不久的时候，曾在一个网站看到过一个效果，当时费尽脑筋，又是`Canvas`、又是`SVG`，还是无法实现（其实`SVG`好像是有办法可以实现的，但当时觉得麻烦就没弄）。

效果就是这样的：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/006mS5wEgy1fxlh53ze9sj31es0lmq6s.jpg)

这个效果的难点在于，如何让文字穿透过遮罩层，但是这样好像很难。

直到最近，我看到了张鑫旭大神的一篇[文章](https://www.zhangxinxu.com/wordpress/2011/04/%E5%B0%8Ftipcss3%E4%B8%8B%E7%9A%84%E6%B8%90%E5%8F%98%E6%96%87%E5%AD%97%E6%95%88%E6%9E%9C%E5%AE%9E%E7%8E%B0/)，文中讲述了如何给文字添加背景颜色（也可以是背景图片），顿时醍醐灌顶，想到了这样一个解决方案：

1. 里外两个层，尺寸一样，设置同一个背景图片。
2. 外层通过伪元素实现遮罩。
3. 里层绝对定位，将背景添加到文字上。

可能我文字表达地不是很清晰，下面用代码讲解一下。

## 正文

如果你点进了上面张鑫旭大神的那篇文章，你就知道主要是两行：

1. `-webkit-text-fill-color: transparent`
2. `-webkit-background-clip: text`

简单说一下作用：

`-webkit-text-fill-color: transparent`

> 将文字颜色变成透明，但是经过尝试，发现使用`color：transparent`效果也一样，应该是浏览器为向后兼容所拟定的一个新属性，因为如果不支持文字添加背景，但又通过`color：transparent`将文字变成了透明，文字就显示不出来了。

`-webkit-background-clip: text`

> 背景被裁剪为文字的前景色。

那么，下面我们试一下实现，这里只展示主要代码。

```html
<div class="container">
	<h1>I ❤ CSS</h1>
</div>
```

样式部分

```css
.container,h1{
    background:url("https://gd4ark.github.io/CSS-Carousel/image/2.jpg");
    background-size: 100% 100%;
}
.container h1,
.container::after{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
.container{
    position: relative;
    width: 100%;
    height: 100vh;
}
.container::after{
    content: '';
    background: rgba(0,0,0,0.8);
}
h1{
    z-index: 2;
    -webkit-text-fill-color: transparent;
    -webkit-background-clip: text;
}
```

在线查看，可以修改文字哦： [链接](https://gd4ark.github.io/blog_demos/2018-11-26/02.html)

完整代码：[链接](https://github.com/gd4Ark/blog_demos/blob/master/2018-11-26/02.html)

## 后记

没错，这个困扰我多年的效果就是这么简单，果然还是懂得少，哪知道张鑫旭大神早在`2011`年就给出了答案。



