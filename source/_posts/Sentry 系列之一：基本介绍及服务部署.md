---
title: Sentry 系列之一：基本介绍及服务部署
categories:
    - 网络
    - 前端
tags:
    - 网络
    - 前端
abbrlink: 89f6fa6d
date: 2020-11-18 21:37:33
---

<div class="excerpt">
    Sentry 是什么？中文翻译过来是「哨兵」的意思，没错，它是程序的哨兵，它可以监控我们在生产环境中项目的运行状态，一旦某段代码运行报错、或者发生异常，会第一时间将报错的信息：页面路由、异常文件、请求方式等一些非常详细的信息以消息或者邮件的方式通知我们，告诉我们：程序出错了。而我们可以从详细的报错信息中快速分析问题所在，从而快速地修复 Bug。
</div>

<!-- more -->

## 简介

[Sentry](https://sentry.io/welcome/) 是什么？中文翻译过来是「哨兵」的意思，没错，它是程序的哨兵，它可以监控我们在生产环境中项目的运行状态，一旦某段代码运行报错、或者发生异常，会第一时间将报错的信息：页面路由、异常文件、请求方式等一些非常详细的信息以消息或者邮件的方式通知我们，告诉我们：程序出错了。而我们可以从详细的报错信息中快速分析问题所在，从而快速地修复 Bug。

> 本文首发于知乎：https://zhuanlan.zhihu.com/p/287941396

## 为什么是 Sentry？

是的，在市场上有许多供应商提供类似的一体化解决方案，国外有 [BugSnag](https://www.bugsnag.com/)、 [RollBar](https://rollbar.com/)，国内有 [oneapm](https://www.oneapm.com/)、[fundebug](https://www.fundebug.com/)，那为什么我们偏偏选择 Sentry 呢？

因为 Sentry 是 100% [开源](https://sentry.io/_/open-source/)的，我们可以使用它的 [SaaS](https://sentry.io/welcome/) 版的，除此之外我们也可以[私有化部署](#Fnztq)。

另外 Sentry 支持主流的编程语言，可以通过 [这里](https://docs.sentry.io/platforms/) 查看所有支持的语言。

通过下面这张图可以看出，Sentry 在前端的近两年[发展趋势](https://www.npmtrends.com/@sentry/browser-vs-rollbar-browser-vs-airbrake-js-vs-trackjs-vs-bugsnag-js-vs-raygun4js-vs-bugsnag-vs-rollbar)，以及与其它竞争者对比：
![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201118214321.png)

可以看到 Sentry 的 npm 下载量基本是稳步上升，同时引入 Sentry 包体积还很小，打包后只有 20k：
![](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20201118214351.png)
而如果是在 Nuxt 项目，还可以直接使用 Nuxt 的 [Sentry 集成模块](https://github.com/nuxt-community/sentry-module)，接入到项目极其方便快捷。

## 如何私有化部署？

Sentry 支持私有化部署，可以使用 Docker、Docker-compose、K8s 的方式部署在自己的服务器上。

关于私有化部署的方法这里给出参考文档，如有需要可以看看：

-   [Self-Hosted Sentry](https://develop.sentry.dev/self-hosted/)
-   [Sentry 10 helm charts](https://github.com/sentry-kubernetes/charts)

要注意的是，sentry 的 root url 只支持域名，不能写 path。

则机器上需要部署不止一个服务、并且不想使用端口访问 sentry 时，需要申请多一个（子）域名，使用反向代理一下。

下面是 Nginx 相关配置。

```bash
     server {
       listen 443;
       server_name your-domain.com;
       location / {
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_pass http://localhost:9000;
       }
     }
```

## 总结

Sentry 是一个开箱即用、兼容性较好、功能强悍、并且生态圈非常完善的监控工具，你值得拥有。

那还等什么，赶紧行动吧！

## 参考文档

-   [Real-Time Error Reporting — Catch Every Bug or Error](https://medium.com/better-programming/real-time-error-reporting-catch-every-bug-or-error-4c3df3b9a49d)
-   [Sentry 自动化异常提醒](https://learnku.com/articles/4235/sentry-automation-exception-alert)
