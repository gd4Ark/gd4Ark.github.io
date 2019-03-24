---
title: Laravel Eloquent 时间日期比较和分组
categories:
  - 后端
tags:
  - 后端
abbrlink: 3e85f2e1
date: 2019-02-12 15:03:56
---

<div class="excerpt">
    最近在做一个订单日收入模块的时候，涉及到日期比较和分组查询的问题，经过一番探索，总算是找到了解决方法，特地记录一下，以方便日后翻阅。
</div>


<!-- more -->


## 前言

最近在做一个订单日收入模块的时候，涉及到日期比较和分组查询的问题，经过一番探索，总算是找到了解决方法，特地记录一下，以方便日后翻阅。

## 正文

假设我们有一个`orders`表，数据如下：

|  id  | amout | created_at | updated_at |
| :--: | :---: | :--------: | :--------: |
|  1   |  100  | 2019-01-01 | 2019-01-01 |
|  2   |  100  | 2019-01-01 | 2019-01-01 |
|  3   |  200  | 2019-01-02 | 2019-01-02 |
|  4   |  200  | 2019-01-02 | 2019-01-02 |
|  5   |  300  | 2019-01-03 | 2019-01-03 |

然后我们有以下需求：

1. 获取每天的收入情况。
2. 查询某个日期段（或者是某天）的订单，并显示各天的收入情况。

### 获取每天的收入情况

其实这个问题的难点就在于如何按照日期来分组，我的解决方案如下：

```php
public function getIncome(Request $request){
	$list = Order::query() // 这里可以用 where 先限制一些条件
                ->select(
                    DB::raw('Date(created_at) as date'),
                    DB::raw('COUNT(id) as count'),
                    DB::raw('SUM(amount) as income')
                );
    return $list->groupBy('date')
                ->orderBy('date', 'DESC')
                ->get();
}
```

返回结果如下：

```json
[
  {
    "date": "2019-01-03",
    "count": 1,
    "income": 300
  },
  {
    "date": "2019-01-02",
    "count": 2,
    "income": 400
  },
  {
    "date": "2019-01-01",
    "count": 2,
    "income": 200
  }
]
```

### 获取某个日期段的各天收入情况

这里就涉及到日期比较了，因此我们可以使用`whereDate`方法。

**注** ：

> `whereDate`方法只能在 `Laravel 5.0`之后才能使用。
>
> 关于更多类似日期方法可以访问: [链接](https://www.cnblogs.com/huangshoushi/p/5875022.html)

我们需要接受两个参数：

```php
public function getIncome(Request $request){
	$list = Order::query() // 这里可以用 where 先限制一些条件
                ->select(
                    DB::raw('Date(created_at) as date'),
                    DB::raw('COUNT(id) as count'),
                    DB::raw('SUM(amount) as income')
                );
    if ($request->has('date')){
            $date = $request->input('date');
            $list = $list->whereDate('created_at','>=',$date[0])
                         ->whereDate('created_at','<=',$date[1]);
    }
    return $list->groupBy('date')
                ->orderBy('date', 'DESC')
                ->get();
}
```

返回结果：

```json
[
  {
    "date": "2019-01-02",
    "count": 2,
    "income": 400
  },
  {
    "date": "2019-01-01",
    "count": 2,
    "income": 200
  }
]
```

### 其他问题

#### 获取当天

获取当天可以这样：

```php
Order->whereDate('created_at', date("Y-m-d"));
```

#### 满足其他条件

假设我们还要当天总收入超过多少才行，我们可以这样：

```php
$list = $list->havingRaw('SUM(amount) ' . '>' . ' ' . $minAmount);
```

或者需要当订单数量超过多少：

```php
$list = $list->havingRaw('COUNT(id) ' . '>' . ' ' . $minCount);
```

## 写在最后

当然，我这个可能不是最佳方案，如果您有更好的方法，还请多多指教。