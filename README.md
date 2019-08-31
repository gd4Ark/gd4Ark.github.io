## 我的个人博客

基于 Hexo [Polarbear](https://github.com/frostfan/hexo-theme-polarbear) 主题改造，进行了如下扩展：

1. 添加文章目录
2. 首页文章列表显示摘要
3. 使用 Hexo-abbrlink 进行文章链接持久化
4. 文章底部自动添加版权信息
5. 支持评论插件（ Gitment 和 Gitalk）
6. 加入了另一个代码高亮插件：Code-prettify
7. 一些样式的优化
8. 增加友情链接

## 预览

在线预览：[4ark’ Blog](https://4ark.me)

![](https://i.loli.net/2019/06/20/5d0afcac1804e11572.png)

## 一些问题

### 1. 添加文章摘要

在`md`文件中这样添加：

```markdown
/* 文章信息 */

<div class="excerpt">
    这里写你的文章摘要，只会在首页展示，进入文章页后自动隐藏。
</div>

<!-- more -->

/* 文章内容 */
```

### 2. 评论插件

在`themes\polarbear\_config.yml`下可以找到配置信息。

## 安装使用（Installation）

```shell
git clone https://github.com/gd4Ark/gd4Ark.github.io.git
npm install
```

## 最后

如果觉得我的项目还不错的话👏 ，就给个 star ⭐ 鼓励一下吧~