---
title: 记一次因 HSTS 导致跨域问题的经历
categories:
  - 网络
  - 前端
tags:
  - 网络
  - 前端
abbrlink: bd31093c
date: 2020-10-17 12:56:49
---

<div class="excerpt">
    <p>生产上多次出现上面这个奇怪的跨域问题，但神奇的是强刷新后或者使用无痕模式打开就正常了。</p>
    到底是哪里出了问题呢？本文将一探究竟。
</div>

<!-- more -->
## 背景
> Access to XMLHttpRequest at 'http://a.com/api' from origin 'http://b.com' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: Redirect is not allowed for a preflight request.

![]()

生产上多次出现上面这个奇怪的跨域问题，但神奇的是强刷新后或者使用无痕模式打开就正常了。<br />到底是哪里出了问题呢？本文将一探究竟。<br />

<a name="T7LWX"></a>
## 先说结论
排查后发现，出现这个报错的原因是：**之前使用过 HTTPS 访问页面，所以也请求了 HTTPS 协议的 API，然后 API 的域名被记录在 `HSTS` 列表中，之后使用 HTTP 访问页面，而 API 请求却被重定向到 HTTPS，而因为预检请求(OPTIONS)不能被重定向，所以导致出现 CORS 错误。**<br />
<br />关于 CORS 更详细的介绍可以点击查看：[HTTP访问控制（CORS）](https://link.zhihu.com/?target=https%3A//developer.mozilla.org/zh-CN/docs/Web/HTTP/Access_control_CORS)<br />
<br />总得来说原因在于前后端 HTTP 和 HTTPS 混用导致的，正常的情况下如果统一为 HTTP 或者 HTTPS 则不会出现这个问题。<br />
<br />所以如果要开启 `HSTS` ，请确保前后端都开启，否则就会出现与本文一样的错误。<br />
<br />那么前端页面要开启 HSTS 的话，需要做哪些操作呢？需要在 web 服务器添加响应头 ，以 Nginx 为例：
```nginx
server {
    listen 443 ssl;
    server_name www.example.com;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

<br />如果是其他 web 服务器，可以到参考[这里](https://link.zhihu.com/?target=https%3A//www.techbrown.com/configure-hsts-apache-nginx-iis-lighttpd-web-servers/)。<br />
<br />这里还要注意：<br />

1. 即便关掉 HSTS 也需要等到 max-age 过期才会从 HSTS 列表清除，所以除非让用户手动清除，否则这段时间内还是会被重定向到 HTTPS。
1. 如果加了 includeSubDomains ，该网站的所有子域名都会被重定向到 HTTPS ，那会有什么影响呢？假设生产环境为 [http://a.com](http://a.com)，而测试环境为 [http://test.a.com](http://test.a.com)，当访问 [http://a.com](http://a.com) 后，即便在测试环境没有 HTTPS 的情况下也会被重定向


<br />好了，说完结论，那下面来讲讲我是如何使用 Chrome 自带的网络记录工具定位到此问题的。<br />

<a name="n8wDb"></a>
## 是缓存的问题？
既然强刷新或者使用无痕模式是正常的，那么就很有可能是因为缓存导致，对比会出现跨域和正常的请求头，发现两者有很大不同：<br />
<br />这是正常的 👇<br />

![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/image_1.png)这是出现跨域的 👇<br />![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/image_2.png)<br />可以看出下面这个会出现跨域的请求少了很多内容，而猜测会不会是因为缺少 CORS 相关的部分请求头，所以导致跨域呢？<br />
<br />~~根据关键词「跨域 无痕模式」在搜索引擎找到这篇《~~[~~原來 CORS 沒有我想像中的簡單~~](https://blog.techbridge.cc/2018/08/18/cors-issue/)~~》，其中说到是因为浏览器缓存的问题，使用 `crossorigin="anonymous"` 让每次发出的请求带上 origin header， 但是这个属性只适用于  `<img>`  、 `<script>` 等，于是我去寻找在 axios 请求库对应的属性~~，然并卵。<br />
<br />那么有没有可能问题根本不是出在前端发送请求上呢？<br />

<a name="8lHSO"></a>
## 使用 Chrome 排查网络问题
既然这样，那就来看看浏览器发送请求的过程中到底发生了什么，于是我通过 [chrome://net-export ]()记录会发生跨域的页面请求日志：<br />![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/image_3.png)<br />导出日志文件后，发现了一个很奇怪的点：<br />![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/image_4.png)<br />在上图可以看到，明明请求 HTTP 协议的 API，但是因为 `HSTS` ，将请求重定向到了 HTTPS 协议下。<br />
<br />简单来说一下 `HSTS` 是什么：

> HTTP Strict Transport Security（通常简称为HSTS）是一个安全功能，它告诉浏览器只能通过 HTTPS 访问当前资源，而不是 HTTP —— [MDN](https://developer.mozilla.org/zh-CN/docs/Security/HTTP_Strict_Transport_Security)

<br />就是说如果浏览器发现该网站开启了 `HSTS` ，则会自动把所有请求重定向到 HTTPS 下。<br />
<br />为了验证是不是因为这个原因，在无痕模式下也进行了一次记录，发现该日志下找不到 `HSTS` 的身影：<br />![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/image_5.png)<br />随后我又通过 Chrome 的 `HSTS` 设置页面进一步验证了两者的不同，打开 [chrome://net-internals/#hsts]() 查询发送跨域的请求域名：<br />
<br />出现跨域的浏览器窗口 👇<br />![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/image_6.png)<br />正常请求的浏览器窗口（无痕模式）👇<br />![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/image_7.png)<br />

<a name="CDmgs"></a>
## 都是 HSTS 惹的祸
没想到，竟然是因为 `HSTS` ，那为什么一个会有 `HSTS` 而另一个却没有呢？这时候我留意到出现跨域的页面使用的是 HTTP 访问，但其实是支持 HTTPS 的，所以我猜想会不会是：**之前使用过 HTTPS 访问页面，所以也请求了 HTTPS 的 API，然后 API 的域名被记录在 `HSTS` 列表中，之后使用 HTTP 访问页面，而 API 请求却被重定向到 HTTPS，所以导致跨域？**<br />
<br />为了验证上面的猜想，特地开了一个新的无痕模式，按照上面所说的步骤操作，完美复现跨域错误！<br />
<br />**更重要的是我在原本出现跨域的页面改为 HTTPS 访问，也正常请求了。**<br />

<a name="7Nc9R"></a>
## 为什么会出现这种情况？
为什么请求 API 会被自动重定向到 HTTPS，而请求页面却不会呢？<br />
<br />原来 `HSTS` 是根据响应头有没有 `strict-transport-security` 字段决定是否加入 `HSTS` 列表的，**经排查发现前端页面的响应头是没有这个字段的，但 API 响应头却有**。<br />
<br />页面响应头：<br />![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201017132900.png)
<br />API 响应头：<br />![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201017132926.png)
<a name="3pm3v"></a>

## 总结
如果出现奇怪的网络请求问题，可以尝试使用 Chrome 自带的网络请求分析工具，说不定会有收获。<br />

<a name="MB4GK"></a>

## 扩展阅读

- [排查 Chrome 网络问题](https://support.google.com/chrome/a/answer/6271171?hl=zh-Hans)
- [HTTP访问控制（CORS）](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Access_control_CORS)
- [HTTP Strict Transport Security](https://developer.mozilla.org/zh-CN/docs/Security/HTTP_Strict_Transport_Security)
- [浏览器跨域问题与服务器中的 CORS](https://juejin.im/post/6866942131777306631)