---
title: 解决 Windows 中设置静态 IP 却始终变回 DHCP 获取问题
categories:
  - 系统
tags:
  - 系统
abbrlink: 28baf5fd
date: 2018-11-13 22:45:06
---

<div class="excerpt">
    不知道为什么，我们学校的工作室里每一台电脑都存在这样一个 `BUG`，当你设置了静态 `IP` 后，点击确定，打开 `ipconfig` 查看，`IP` 已经设置上了，然而当你再次打开配置 `IP` 的界面时，却惊讶地发现，他居然神奇地变回了自动获取，这时你重新配置了一个`IP`，`ipconfig`再一看，居然有两个 `IP` 。
</div>


<!-- more -->

## 问题描述

不知道为什么，我们学校的工作室里每一台电脑都存在这样一个 `BUG`，当你设置了静态 `IP` 后，点击确定，打开 `ipconfig` 查看，`IP` 已经设置上了，然而当你再次打开配置 `IP` 的界面时，却惊讶地发现，他居然神奇地变回了自动获取，这时你重新配置了一个`IP`，`ipconfig`再一看，居然有两个 `IP` 。

## 解决

当我使用中文去Google搜索时，并没有得到能够解决问题的答案，然后我把关键词转换成英文，发现了这个帖子：

https://support.managed.com/kb/a433/bug-ip-addresses-do-not-save-and-always-reset-to-dhcp.aspx

并且成功的解决了我的问题。

以下是解决方法：

1. 打开 `运行`，输入 `regedit`，进入注册表
2. 找到 `HKEY_LOCAL_MACHINE \SYSTEM\CurrentControlSet\Control\Network`
3. 删除 `config`
4. 打开 `运行`，输入 `ncpa.cpl`，进入网络连接
5. 本地连接 - 右键 - 属性 - 确定

