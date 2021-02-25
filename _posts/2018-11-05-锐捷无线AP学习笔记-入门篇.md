---
title: 锐捷无线AP学习笔记 - 入门篇
categories:
  - 网络
tags:
  - 网络
abbrlink: d69467be
date: 2018-11-05 23:01:43
---

## 前言

### 版本说明

我的AP型号为： RG-AP220-SE

系统版本为： RGOS 11.1(5)B8 

### 需求

本次实训目的是创建一个热点，需求如下：

- 创建一个 SSID 为 `ruijie` 的WLAN
- 能够自动获取IP地址（DHCP）
- 为 WLAN 添加一种加密方式

## 正文

### 准备

首先，我们要先把AP切换到胖模式

```shell
Ruijie# ap-mode fat
```

可以用以下命令查看AP当前的模式

```shell 
Ruijie# show ap-mode
```

接着开启一下无线广播转发

```shell 
Ruijie(config)# data-plane wireless-broadcast enable
```

好了，现在就可以开始我们的实例了。

### 创建 WLAN

创建一个 VLAN

```shell 
Ruijie(config)# vlan 1
Ruijie(config-vlan)# ex
```

以太网接口封装 VLAN

```shell 
Ruijie(config)# int gigabitEthernet 0/1
Ruijie(config-if-GigabitEthernet 0/1)# encapsulation dot1Q 1 // 对应 vlan
Ruijie(config-if-GigabitEthernet 0/1)# ex
```

设置一下AP的管理地址（管理地址与网关处于相同网段下）

```shell 
Ruijie(config)# int bVI 1
Ruijie(config-if-BVI 1)# ip address 10.10.34.250 255.255.255.0
Ruijie(config-if-BVI 1)# ex
```

> 注：此时，在你本机上 ping 这个地址，是可以通的（若不能 ping 通，且配置正确，请看文章结尾）。

定义 SSID

```shell 
Ruijie(config)# dot11 wlan 1
Ruijie(dot11-wlan-config)# vlan 1
Ruijie(dot11-wlan-config)# broadcast-ssid
Ruijie(dot11-wlan-config)# ssid ruijie
Ruijie(dot11-wlan-config)# ex
```

创建射频卡子接口

```shell 
Ruijie(config)# int dot11radio 1/0.1
Ruijie(config-subif-Dot11radio 1/0.1)# encapsulation dot1Q 1 // 对应 vlan
Ruijie(config-subif-Dot11radio 1/0.1)# ex
```

SSID 和 射频卡进行关联

```shell 
Ruijie(config)# int dot11radio 1/0
Ruijie(config-if-Dot11radio 1/0)# wlan-id 1 // 对应 wlan-id
Ruijie(config-if-Dot11radio 1/0)# ex
```

> 注： 这时 AP 已经发出了无线信号，你可以在手机上搜索得到。

设置 AP 的默认路由（也就是这个局域网的网关）

```shell 
Ruijie(config)# ip route 0.0.0.0 0.0.0.0 10.10.34.254
```

> 注：做这一步之前，最好确认一下 AP 是否与默认路由相通

这时，通过手动配置静态 IP，是可以成功连接 WLAN 的。

### DHCP服务

通常来说，一个网络环境下会有专门的 DHCP 服务器，所以不需要 AP 来分配地址。

然而，我这里并没有 DHCP 服务器，那就只能靠 AP 来分配了。

首先，开启 DHCP 服务

```shell 
Ruijie(config)# service dhcp
```

排除地址，low - high

```shell 
Ruijie(config)# ip dhcp excluded-address 10.10.34.8 10.10.34.254
```

> 注：我把 8 - 254 的 IP 排除了，所以剩下的范围就是 1 - 7。 

配置地址池，名字为 test，以及地址段、网关、DNS

```shell 
Ruijie(config)# ip dhcp pool test
Ruijie(dhcp-config)# network 10.10.34.0 255.255.255.0
Ruijie(dhcp-config)# default-router 10.10.34.254
Ruijie(dhcp-config)# dns-server 8.8.8.8
```

这时，手机上是可以通过 DHCP方式 获取到 IP 地址的。

## WLAN 加密

常见的 WLAN 加密方式分为三种：

- WEP 加密
- PSK 接入认证
- 802.1x 接入认证

关于加密方式详细的介绍，请看：[手册 WLAN 安全节章](http://www.ruijiery.com/uploadfile/2016/0621/20160621124933455.pdf) 。

配置加密方式都需要进入到相关的 wlan-id 下

```shell 
Ruijie(config)# wlansec 1 // 对应 wlan-id
```

### WEP 方式

```shell 
Ruijie(config-wlansec)# security static-wep-key encryption 40 ascii 1 12345
Ruijie(config-wlansec)# security static-wep-key authentication  shellare-key
```

> 注： 密码长度可选为 （40 | 103），40 = 5个，103 = 13个 

### PSK 接入认证 (WPA)

```shell 
Ruijie(config-wlansec)# security wpa enable
Ruijie(config-wlansec)# security wpa ciphers aes enable
Ruijie(config-wlansec)# security wpa akm psk enable
Ruijie(config-wlansec)# security wpa akm psk set-key ascii 123456789
```

> 注：密码不得少于 8 个 字符

### PSK 接入认证 (WPA2)

```shell 
Ruijie(config-wlansec)# security rsn enable
Ruijie(config-wlansec)# security rsn ciphers aes enable
Ruijie(config-wlansec)# security rsn akm psk enable
Ruijie(config-wlansec)# security rsn akm psk set-key ascii 123456789
```

> 注：密码不得少于 8 个 字符

### **802.1x** 接入认证  

```shell 
Ruijie(config-wlansec)#security wpa enable
Ruijie(config-wlansec)#security wpa ciphers aes enable
```

## 说一下遇到的问题

### 问题

在这次实训中，我用到 vlan 1，一切正常。

但是，当我使用另外的 vlan （vlan 10）时，发现在本机并不能 ping 通 AP 的管理地址。

这个时候，AP 不能与网关连通，所以无法正确配置 DHCP 服务器（手动配置静态没有问题）。

### 看法

初步看来，可能是因为我机房的二层交换机的所有接口都在 vlan 1下，且没有配置为 trunk 模式，故不能 ping 通。

但是我不知道这个交换机的密码，所以无法取证。

如果你也遇到这个问题，且有靠谱的解决方案，请联系我，谢谢。

## 参考链接

- http://www.ruijiery.com/uploadfile/2016/0621/20160621124933455.pdf

- https://blog.csdn.net/u012318074/article/details/52599540

- https://wenku.baidu.com/view/ab3addf8af1ffc4ffe47ac93.html

- https://wenku.baidu.com/view/fcc1dda9d0d233d4b14e6973.html

