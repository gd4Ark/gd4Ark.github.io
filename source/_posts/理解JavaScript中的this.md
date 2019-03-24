---
title: 理解 JavaScript 中的 this
categories:
  - 前端
tags:
  - 前端
abbrlink: 8b423d03
date: 2019-01-16 17:21:24
---

<div class="excerpt">
    理解`this`是我们要深入理解 JavaScript 中必不可少的一个步骤，同时只有理解了 `this`，你才能更加清晰地写出与自己预期一致的 JavaScript 代码。
</div>


<!-- more -->

## 前言

理解`this`是我们要深入理解 JavaScript 中必不可少的一个步骤，同时只有理解了 `this`，你才能更加清晰地写出与自己预期一致的 JavaScript 代码。

本文是这系列的第三篇，往期文章：

1. [理解 JavaScript 中的作用域](https://juejin.im/post/5c386bd96fb9a04a03796f93)
2. [理解 JavaScript 中的闭包](https://juejin.im/post/5c3893bc6fb9a049d37f530f)

## 什么是 this

### 消除误解

在解释什么是`this`之前，需要先纠正大部分人对`this`的误解，常见的误解有：

1. 指向函数自身。
2. 指向它所在的作用域。

> 关于为何会误解的原因这里不多讲，这里只给出结论，有兴趣可以自行查询资料。

`this` 在任何情况下都不指向函数的词法作用域。你不能使用 `this` 来引用一个词法作用域内部的东西。

### this 到底是什么

排除了一些错误理解之后，我们来看看 `this`到底是一种什么样的机制。

`this`是在运行时（`runtime`）进行绑定的，**而不是在编写时绑定的**，它的上下文（对象）取决于函数调用时的各种条件。`this`的绑定和函数声明的位置没有任何关系，**只取决于函数的调用方式**。

当一个函数被调用时，会创建一个活动记录(有时候也称为执行上下文)。这个记录会包含函数在哪里被调用(调用栈)、函数的调用方法、传入的参数等信息。**`this `就是记录的其中一个属性**，会在函数执行的过程中用到。（PS:所以`this`并不等价于执行上下文）

## this 全面解析

前面 我们排除了一些对于 `this`的错误理解并且明白了每个函数的`this`是在调用时被绑定的，完全取决于函数的调用位置。

### 调用位置

通常来说，寻找调用位置就是寻找“函数被调用的位置“，其中最重要的是要分析调用栈（就是为了到达当前执行位置所调用的所有函数）。我们关心的调用位置就在当前正在执行的函数的前一个调用中。

下面我们来看看到底什么是调用栈和调用位置：

```javascript
function foo(){
    // 当前调用栈是：foo
    // 因此，当前调用位置是全局作用域
    console.log("foo");
    bar(); // <-- bar的调用位置
}
function bar(){
    // 当前调用栈是foo -> bar
    console.log("bar");
}
foo(); // <-- foo 的调用位置
```

> 你可以把调用栈想象成一个函数调用链， 就像我们在前面代码段的注释中所写的一样。但是这种方法非常麻烦并且容易出错。 另一个查看调用栈的方法是使用浏览器的调试工具。 绝大多数现代桌面浏览器都内置了开发者工具，其中包含 JavaScript 调试器。

### 绑定规则

在找到调用位置后，则需要判定代码属于下面四种绑定规则中的哪一种，然后才能对`this`进行绑定。
**注意:** `this`绑定的是上下文**对象**,**并不是函数自身也不是函数的词法作用域**

#### 默认绑定

这是最常见的函数调用类型：**独立函数调用**：

对函数直接使用而不带任何修饰的函数引用进行调用，简单点一个函数直接是`func()`这样调用，不同于通过对象属性调用例如`obj.func()`，也没有通过new关键字`new Function()`，也没有通过`apply`、`call`、`bind`强制改变`this`指向。

当被用作独立函数调用时（不论这个函数在哪被调用，不管全局还是其他函数内），`this`默认指向到`Window`。（**注意：在严格模式下`this`不再默认指向全局，而是`undefined`**）。

示例代码：

```javascript
function foo(){
    console.log(this.name);
}
var name = "window";
foo(); // window
```

#### **隐式绑定**

函数被某个对象拥有或者包含，也就是函数被作为对象的属性所引用，例如`obj.func()`，此时`this`会绑定到该对象上，这就是隐式绑定。

示例代码：

```javascript
var obj = {
    name : "obj",
    foo : function(){
        console.log(this.name);
    }
}
obj.foo(); // obj
```

**隐式丢失**：

大部分的`this`绑定问题就是被“隐式绑定”的函数会丢失绑定对象，也就是说它会应用“默认绑定”，从而把`this`绑定到`Window`或`undefined`上，这取决于是否是严格模式。

最常见的情况就是把对象方法作为回调函数进行传递时：

```javascript
var obj = {
    name : "obj",
    foo : function(){
        console.log(this.name);
    }
}
var name = "window";
setTimeout(obj.foo,1000); // 一秒后输出 window
```

#### **显式绑定**

我们可以通过`apply`、`call`、`bind`方法来显示地修改`this`的指向。

关于这三个方法的定义（它们第一个参数都是接受`this`的绑定对象）：

1. `apply`：调用函数，第二个参数传入一个参数数组。
2. `call`：调用函数，其余参数正常传递。
3. `bind`：返回一个已经绑定`this`的函数，其余参数正常传递。

比如我们可以使用`bind`方法解决上一节“隐式丢失”中的例子：

```javascript
var obj = {
    name : "obj",
    foo : function(){
        console.log(this.name);
    }
}
var name = "window";
setTimeout(obj.foo.bind(obj),1000); // 一秒后输出 obj
```

### new 绑定

使用 new 来调用函数，或者说发生构造函数调用时，会自动执行下面的操作：

1. 创建(或者说构造)一个全新的对象。
2. 这个新对象会被执行[[原型]]连接。
3. 这个新对象会绑定到函数调用的`this`。
4. 如果函数没有返回其他对象，那么`new`表达式中的函数调用会自动返回这个新对象。

示例代码：

```javascript
function foo(a) { 
  this.a = a;
}
var bar = new foo(2); 
console.log( bar.a ); // 2
```

### 优先级

直接上结论:

> new绑定=显示绑定>隐式绑定>默认绑定

**判断this：**
 现在我们可以根据优先级来判断函数在某个调用位置应用的是哪条规则。可以按照下面的顺序来进行判断：

1. 使用new绑定，`this`绑定的是新创建的对象。

   ```javascript
   var bar = new foo();
   ```

2. 通过`call`之类的显式绑定，`this`绑定的是指定的对象。

   ```javascript
   var bar = foo.call(obj2);
   ```

3. 在某个上下文对象中调用(隐式绑定)，this 绑定的是那个上下文对象。

   ```javascript
   var bar = obj1.foo();
   ```

4. 如果都不是的话，使用默认绑定。`this`绑定到`Window`或`undefined`上，这取决于是否是严格模式。

   ```javascript
   var bar = foo();
   ```

   对于正常的函数调用来说，理解了这些知识你就可以明白 this 的绑定原理了。

### this词法

ES6 中介绍了一种无法使用上面四条规则的特殊函数类型：**箭头函数**。

**箭头函数不使用 this 的四种标准规则，而是根据外层(函数或者全局)作用域来决定 this。**(而传统的this与函数作用域没有任何关系,它只与调用位置的上下文对象有关)。

**重要:**

- 箭头函数最常用于回调函数中，例如事件处理器或者定时器.
- 箭头函数可以像`bind` 一样确保函数的`this`被绑定到指定对象
- 箭头函数用更常见的词法作用域取代了传统的`this `机制。

示例代码：

```javascript
var obj = {
    name : "obj",
    foo : function(){
        setTimeout(()=>{
            console.log(console.log(this.name)); // obj
        },1000);
    }
}
obj.foo();
```

这在 ES6 之前是这样解决的：

```javascript
var obj = {
    name : "obj",
    foo : function(){
        var self = this;
        setTimeout(function(){
            console.log(console.log(self.name)); // obj
        },1000);
    }
}
obj.foo();
```

## 总结

总之如果要判断一个运行中函数的`this `绑定，就需要找到这个函数的直接调用位置。找到之后就可以顺序应用下面这四条规则来判断`this`的绑定对象。

1. 由new调用？绑定到新创建的对象。
2. 由call或者apply(或者bind)调用？绑定到指定的对象。
3. 由上下文对象调用？绑定到那个上下文对象。
4. 默认:在严格模式下绑定到`undefined`，否则绑定到全局对象。

ES6 中的箭头函数并不会使用四条标准的绑定规则，而是根据当前的词法作用域来决定 `this`，具体来说，箭头函数会继承外层函数调用的 `this `绑定(无论 `this `绑定到什么)。这其实和 ES6 之前代码中的 `self = this` 机制一样。


