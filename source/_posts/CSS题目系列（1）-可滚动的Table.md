---
title: CSS题目系列（1） - 可滚动的Table
categories:
  - 前端
tags:
  - 前端
abbrlink: abb77fd2
date: 2018-11-25 17:06:50
---

<div class="excerpt">
    <img src="https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/006mS5wEgy1fxkejbopq1j30e907c0sp.jpg"/>
</div>


<!-- more -->


## 描述

在开发中，有这样一个需求，`Table`的表头不动，表身可以滚动，效果请点击以下链接查看：

https://gd4ark.github.io/blog-demos/2018-11-25/01.html

## 正文

假设我们有一个这样结构的表格：

```html
<table>
    <thead>
        <tr>
            <th>Position</th>
            <th>Name</th>
            <th>Score</th>
            <th>Time</th>
        </tr>
    </thead>
    <tbody>
        <!-- 这里为了方便展示 只显示一行 -->
        <tr>
            <td>0</td>
            <td>张三</td>
            <td>15</td>
            <td>30</td>
        </tr>
    </tbody>
</table>
```

设置表身样式：

```css
table tbody {
	display: block;
	height: 200px;            
	overflow-y: auto;
}
```

这时候，表身已经实现了滚动，但是有个问题，`td`缩在了一堆，如下：

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/006mS5wEgy1fxkejbopq1j30e907c0sp.jpg)

加上这个就好了：

```css
table thead,
tbody tr {
	display: table;
	table-layout: fixed; /* 使用表格固定算法 必须配合上面一起使用 */
	width: 100%;
}
```

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/006mS5wEgy1fxkejbopq1j30e907c0sp.jpg)

完整代码：https://github.com/gd4Ark/blog-demos/blob/master/2018-11-25/01.html

## 后记

刚刚开始写文章，很多地方写的不够好，望谅解，我会慢慢改进的。
