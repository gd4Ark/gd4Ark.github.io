---
title: Window上更方便的软件安装方式 — Chocolatey
categories:
  - 系统
tags:
  - 系统
abbrlink: 8159b49a
date: 2019-02-23 19:28:07
---

<div class="excerpt">
    在经历了多次重装系统、重新安装各种常用软件后，我突然萌生了一个想法，难道 Window 就没有一个像 Linux 一样可以使用一行命令安装软件的包管理器吗？
</div>

<!-- more -->

## 前言

在经历了多次重装系统、重新安装各种常用软件后，我突然萌生了一个想法，难道 Window 就没有一个像 Linux 一样可以使用一行命令安装软件的包管理器吗？

答案是：有的。

我分别使用了 Chocolatey 和 Scoop，得出的结论就是：

1. Chocolatey : 软件更多、速度快。
2. Scoop：可定制性较强、速度较慢（也有可能是我网络不好）。

不过这两款包管理器的使用都差不多，这里主要是介绍 Chocolatey，对其他包管理器感兴趣的可以自行查看。

## 安装使用

安装 Chocolatey 前，你需要对检查一下自身系统是否达到所需的要求。

- Windows 7+ / Windows Server 2003+
- PowerShell v2+
- .NET Framework 4+

如果已经满足要求，就可以打开命令行 copy 下面的命令执行。

```shell
@powershell -NoProfile -ExecutionPolicy unrestricted -Command "(iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))) >$null 2>&1" && SET PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin
```

如果没报红字错误，应该是安装成功了。

```shell
choco -v
# 0.10.11
```

接下来你可以打开下方的链接，查看一下可以安装的软件列表。

[https://chocolatey.org/packages](https://chocolatey.org/packages)

比如，安装 Git

```shell
choco install git
```

安装 Node

```shell
choco install nodejs.install
```

也可以加上`-y`，安装时就不需要等待确认了

```shell
choco install firefox -y
```

### 基本用法

1. 安装 `choco install baretail`
2. 升级 `choco upgrade  baretail`
3. 卸载 `choco uninstall baretail`
4. 搜索 `choco search something`
5. 列出已安装 `choco list -lo`

关于更多用法可点击以下链接查看：

https://chocolatey.org/docs

## 修改默认安装目录

但是，Chocolatey 安装的软件默认存放在 C 盘，对于我这种不太喜欢把软件装到 C 盘的人来说是不能忍的。

虽然 Chocolatey 自己提供了一个修改默认安装目录的命令，但是需要注册（收费），对于资金充裕的同学我还是建议使用这种方法。

这里我提供另外一个思路，既然他存到默认安装目录，那我们把这个默认安装目录改一下就好了。

比如我要默认存放到`E`盘，打开注册表，把 `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion` 下的：

1. `ProgramFilesDir`的值改为：`E:\Program Files`
2. `ProgramFilesDir (x86)`的值改为：`E:\Program Files (x86)`

## 最后

感谢观看！