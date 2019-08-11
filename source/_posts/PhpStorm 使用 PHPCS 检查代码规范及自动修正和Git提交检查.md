---
title: PhpStorm 使用 PHPCS 检查代码规范及自动修正和Git提交检查
categories:
  - 团队开发
tags:
  - 后端
  - 团队开发
abbrlink: 6959bf0
date: 2019-07-27 00:20:15
---

<div class="excerpt">
在团队开发中，每个人的代码风格都不一样，为了日后方便更新和维护，必须考虑协作和编码规范。
本文就介绍如何在 PhpStorm 中配置 PSR2 代码规范检查和保存自动格式化修复，以及利用 Git Hook 对提交的代码进行检查。
</div>

<!-- more -->

## 写在前面

<div class="excerpt">
在团队开发中，每个人的代码风格都不一样，为了日后方便更新和维护，必须考虑协作和编码规范。

本文就介绍如何在 PhpStorm 中配置 PSR2 代码规范检查和保存自动格式化修复，以及利用 Git Hook 对提交的代码进行检查。

## 正文

### 安装PHP-CS

```
composer global require "squizlabs/php_codesniffer=*"
```

安装完成后会在全局依赖包目录生成 phpcbf 和 phpcs 文件

> 查看 composer 全局依赖包路径，下面会用到

```
composer global config bin-dir --absolute
```

### 配置 PhpStorm 使用 PSR-2 标准

#### 1. 代码风格

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/d8bf4d6423310685be6a4bdcd55ff64.png)

#### 2. 设置 PHP-CS 路径

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/150de5624de5b230c93bb636eb794e7.png)

#### 3. 代码检查

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/3eb78dc76568e3656798747eea83e8c.png)

> 如果没有下拉选项，可以点击旁边的刷新按钮

还有这个

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/d9c37df038c2cf0a6538ea4bc5630ca.png)

配置到这里后，打开一个 PHP 文件，就会在不符合 PSR-2 的代码下边加一条波浪线

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20190727141029.png)

使用 `Ctrl + Alt + L` 将会自动格式化成 PSR-2 的风格

### 集成 PHP-CS

经过上面的操作，Phpstorm 代码格式化的规则基本与 PHP-CS 的规则基本一致了，但也有一小部分不一致，所以后面还要用到 phpcs 和 phpcbf

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20190727141709.png)

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20190727141817.png)

#### 参数说明

Program：`phpcs/phpcbf` 路径

Arguments：

```
--standard=PSR2 $FileDir$/$FileName$ ## 当前文件
--standard=PSR2 $FileDir$ ## 当前文件夹
```

Working directory：`$ProjectFileDir$`

#### 使用方法

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20190727142731.png)

### 配置保存自动格式化和修复

##### 1. 为 phpcbf 添加快捷键

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20190727142957.png)

##### 2. 录制宏

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20190727143052.png)

步骤：

1. `Ctrl + Alt + L`
2. `Ctrl + Alt + Shift + P` （phpcbf 快捷键）
3. `Ctrl + S`
4. 按下编辑器右下角保存录制

##### 3. 为宏配置快捷键

先删除默认的保存快捷键 `Ctrl + S`，另外配置一个别的快捷键`Ctrl + Alt + Shift + S`

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20190727143522.png)

为宏配置快捷键

![img](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images/20190727143824.png)

### 利用 Git Hook 对提交的代码进行检查

#### 安装 GrumPHP

```
composer require --dev phpro/grumphp
```

安装完后会自动生成一个 `grumphp.yml`

请修改成：

```
parameters:
  git_dir: .
  bin_dir: vendor/bin
  tasks:
    phpcs:
      standard: PSR2
      ignore_patterns:
        - ./database/*
        - ./vendor/*
```

这样 `git commit` 的时候就会对提交的代码进行检查，只有符合 PSR-2 规范的代码才能通过。