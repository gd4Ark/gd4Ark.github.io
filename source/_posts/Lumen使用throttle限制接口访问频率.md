---
title: Lumen 使用 throttle 限制接口访问频率
categories:
  - 后端
tags:
  - 后端
abbrlink: 618b271f
date: 2019-01-18 18:22:31
---

<div class="excerpt">
    今天碰到过这样一个情况，我需要限制用户请求某个`API`接口的频率，比如登录、反馈等提交操作，经过一番搜索+折腾，总算是实现了。
</div>


<!-- more -->

## 前言

今天碰到过这样一个情况，我需要限制用户请求某个`API`接口的频率，比如登录、反馈等提交操作，经过一番搜索+折腾，总算是实现了。

> 在`Laravel 5.2`的新特性中增加了一个`throttle`中间件，通过它可以在路由层限制`API`访问的频率。例如限制频率为1分钟50次，如果一分钟内超过了这个限制，它就会响应：429: Too Many Attempts。

但我在项目中使用的是`Lumen`框架（它只有`Laravel`中的一部分功能），它并没有集成这个中间件，所以本文主要是讲述如何在`Lumen`框架中加入`throttle `中间件。

## 开始

首先我们要在`app\Http\Middleware`中新建`ThrottleRequests.php`文件。

并且把以下链接中的代码拷贝到这个文件中：

https://github.com/illuminate/routing/blob/master/Middleware/ThrottleRequests.php

接着修改文件中的命名空间：

```php
namespace App\Http\Middleware;
```

### 标记同一用户端请求

因为`Lumen`框架缺失部分功能，我们需要修改`ThrottleRequests.php`中的`resolveRequestSignature`方法：

```php
protected function resolveRequestSignature($request){
    return sha1(
        $request->method() .
        '|' . $request->server('SERVER_NAME') .
        '|' . $request->path() .
        '|' . $request->ip()
    );
}
```

### 抛出响应

`throttle`超过限制时抛出的是`Illuminate\Http\Exceptions\ThrottleRequestsException`，同样`Lumen`框架缺少这个文件，需要自己定义一下，在`app/Exceptions`中新建`ThrottleException.php`，写入以下代码：

```php
<?php

namespace App\Exceptions;

use Exception;

class ThrottleException extends Exception{
    protected $isReport = false;

    public function isReport(){
        return $this->isReport;
    }
}
```

在`app/Exceptions/Handler.php`捕获该抛出异常，在`render`方法增加以下判断：

```php
if ($exception instanceof ThrottleException) {
	return response([
        'code' => $exception->getCode(),
        'msg' => $exception->getMessage()
	], 429);
}
```

修改`ThrottleRequests.php`文件中的`buildException`方法：

```php
protected function buildException($key, $maxAttempts){
	$retryAfter = $this->getTimeUntilNextRetry($key);
	$headers = $this->getHeaders(
        $maxAttempts,
        $this->calculateRemainingAttempts($key, $maxAttempts, $retryAfter),
        $retryAfter
    );
    // 修改了这一行
  	return new ThrottleException('Too Many Attempts.', 429);
}
```

> 需在文件头部中添加这一行：`use App\Exceptions\ThrottleException;`

### 注册中间件

在`bootstrap/app.php`中注册：

```php
$app->routeMiddleware([
     'throttle' => App\Http\Middleware\ThrottleRequests::class,
]);
```

到这里我们就加入成功了，接着在路由中添加中间件即可：

```php
 $router->group(['middleware' => ['throttle:10,2']],function() use ($router){

	$router->post('feedback','UserController@addFeedback');

});
```

其中`throttle:10,2`表示的是2分钟内访问10次。

