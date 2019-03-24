---
title: 解决 Laravel JWT 多表认证时获取不到当前认证用户的问题
categories:
  - 后端
tags:
  - 后端
abbrlink: 834cec76
date: 2019-01-29 14:47:02
---

<div class="excerpt">
    最近在做一个项目，需要多表认证，分别为`admin`和`user`表，我采用的`JWT`认证方式，但今天遇到了一个问题：使用`Auth::user()`返回`null`，也就是说无法获得当前认证的用户。
</div>

<!-- more -->

## 问题描述

最近在做一个项目，需要多表认证，分别为`admin`和`user`表，我采用的`JWT`认证方式，但今天遇到了一个问题：使用`Auth::user()`返回`null`，也就是说无法获得当前认证的用户。

网上搜索后，并没有找到直接的解决方案，然后经过几次尝试居然误打误撞地解决了，所以特地记录下来，希望遇到同样问题的人不要再在这问题上耗费太多时间。

**注意：**这里并不介绍`JWT`的工作原理和配置，如果想理解更多请参考以下文章：

- [JWT 完整使用详解](https://learnku.com/articles/10885/full-use-of-jwt)
- [JWT 扩展具体实现详解](https://learnku.com/articles/10889/detailed-implementation-of-jwt-extensions)

## 大致配置

先讲一下我的配置。

`auth.php`文件如下：

```php
return [

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'admin'),
    ],

    'guards' => [
        'admin' => [
            'driver' => 'jwt',                           #### 更改为JWT驱动
            'provider' => 'admins',
        ],
        'user' => [
            'driver' => 'jwt',                           #### 更改为JWT驱动
            'provider' => 'users',
        ],
    ],

    'providers' => [
        'admins' => [
            'driver' => 'eloquent',
            'model'  => \App\Admin::class,        #### 指定用于token验证的模型类
        ],
        'users' => [
            'driver' => 'eloquent',
            'model'  => \App\User::class,        #### 指定用于token验证的模型类
        ],
    ],

    'passwords' => [
        //
    ],

];

```

## 问题的根源

在`auth.php`中，我们有两个`guard`，而默认的`guard`指向的是`admin`，这时候如果是`user`经过的验证的话，是无法通过`Auth::user()`获取到当前认证用户信息的。

## 解决方法

解决方法很简单，只要使用`Auth::guard('user')`指明使用哪个`guard`即可，这里我是通过公用的控制器中的一个方法：

```php
public function getAuthUser($guard = 'admin'){
    return Auth::guard($guard)->user();
}
```

感谢观看！