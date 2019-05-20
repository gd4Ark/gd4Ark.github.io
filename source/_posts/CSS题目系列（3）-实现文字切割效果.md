---
title: CSS题目系列（3）- 实现文字切割效果
categories:
  - 前端
tags:
  - 前端
abbrlink: bdd845bb
date: 2018-11-26 22:57:06
---

<div class="excerpt">
    <img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/9892fa7fgy1fzrd0pb21lj211y0lc4nr.jpg" />
</div>


<!-- more -->

## 描述

有一天逛 [Codepen](https://codepen.io/) 的时候，看到这么一个效果：将文字上下切开两半。

点进去看了一下代码，发现原理很简单，大概就是通过伪类使用`attr()`函数获取内容，然后进行定位。

你可以点下方链接查看效果：

https://gd4ark.github.io/blog-demos/2018-11-26/01.html

## 正文

先让两个伪元素获取到属性的值，并且将位置调好。

```html
<h1 data-content="I Love CSS">I Love CSS</h1>
```

样式部分

```css
h1 {
    position: relative;
    color: transparent;
}

h1::before,
h1::after {
    /* 通过 attr 获取属性的值 */
    content: attr(data-content);
    position: absolute;
    left: 0;
    width: 100%;
    overflow: hidden;
    color: #CC3333;
}

/* 切割部分 */
h1::before {
    /* 上对齐 */
    top: 0;
    height: 50%;
}

/* 剩余部分 */
h1::after {
    /* 下对齐 */
    bottom: 0;
    height: 50%;
}
```

这时候的效果是这样的，所以我们要把剩余部分的文字进行底部对齐。

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/006mS5wEgy1fxlfhxdtoyj30xa0h474y.jpg)

这里使用`flex`布局对齐，剩余部分改为：

```css
/* 剩余部分 */
h1::after{
    bottom: 0;
    height: 50%;
    display: flex;
    align-items: flex-end;
}
```

这时候：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/006mS5wEgy1fxlfobhqnbj30wj0eyaap.jpg)

到现在，就已经做好，只要在切割部分上应用动画，即可实现炫酷的切割效果：

```css
/* 切割部分 */
h1::before{
    animation: action 5s 1s ease alternate infinite;
}
@keyframes action{
    0%{
        transform: translateX(0px);
    }
    30%{
        transform: translateX(-5vw);
    }
    60%{
        transform: translateX(0px);
    }
    100%{
        transform: translateX(5vw);
    }
}
```



完整代码：https://github.com/gd4Ark/blog-demos/blob/master/2018-11-26/01.html



## 后记

不得不说那些大神们的脑洞真是大，如果没见过这个效果之前，我是无论如何都想不到可以如此简单的实现这么炫酷的切割效果。
