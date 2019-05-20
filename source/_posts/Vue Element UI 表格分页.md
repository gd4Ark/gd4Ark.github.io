---
title: Vue + Element UI + Lumen 实现通用表格功能 - 分页
categories:
  - 前端
  - 后端
tags:
  - 前端
  - 后端
abbrlink: 64f1da47
date: 2019-02-01 15:19:47
---

<div class="excerpt">
最近在做一个前后端分离的项目，前端使用 `Vue `+ `Element UI`，而后端则使用 `Lumen ` 做接口开发，其中分页是必不可少的一部分，本文就介绍如何基于以上环境做一个简单、可复用的分页功能。    
</div>


<!-- more -->


## 前言

最近在做一个前后端分离的项目，前端使用 `Vue `+ `Element UI`，而后端则使用 `Lumen ` 做接口开发，其中分页是必不可少的一部分，本文就介绍如何基于以上环境做一个简单、可复用的分页功能。

## 先说后端

后端做的事情不多，只需要接受几个参数，根据参数来获取数据即可。

需要获取的参数如下：

- `pageSize`（一页数据的数量）
- `pageIndex`（第几页的数据）

然后就可以根据这两个参数计算出偏移量，再从数据库中取出相应的数据。

假如现在给出的参数为：`pageSize=10`，`pageIndex = 2`，也就是说每一页要10条记录，要第二页。

计算偏移量的公式为：`pageSize * (pageIndex - 1)`。

基本代码如下：

```php
public function getUser(Request $request){
    $pageSize = $request->input('pageSize');
    $pageIndex = $request->input('pageIndex');
    $offset = $pageSize * ($pageIndex - 1);
    return User::offset($offset)
                ->limit($pageSize)
                ->get();
}
```

后端基本上只需要做这么多，就可以完成一个分页的功能了，但还是有几处地方需要改进一下：

- 给参数一个默认值
- 前端还需要知道整个表的数据的总数
- 把分页做成一个公用的函数

改进后的代码如下：

```php
private $default_page_size = 30;
private $default_page_index = 1;

// 公用分页
public function pagination($request, $list) {
	$pageSize = $request->input('pageSize', $this->default_page_size);
	$pageIndex = $request->input('pageIndex', $this->default_page_index);
	$offset = $pageSize * ($pageIndex - 1);
	$total = $list->count();
	$list = $list
            ->offset($offset)
            ->limit($pageSize);
	return [
		'list' => $list->get(),
		'total' => $total,
    ];
}

// 获取用户列表
public function getUser(Request $request) {
    $list = User::query();
    /*
    	这里可以做一些查询之类的操作
    */
    return $this->pagination($request, $list);
}
```

## 再说前端

前端相对于需要做的事情就比较多了，需要考虑几点：

- 获取数据时需要带上分页的参数
- 分页参数需要进行本地持久化，以免刷新页面回到第一页（后端设置的默认值）
- 同样要抽象出一个通用的分页组件

### 获取数据

这里我们用 `vuex`来管理状态，然后在请求时带上分页数据：

store.js：

> **注意**：
>
> - 这里为了方便展示代码，并没有使用模块化，项目中，最好将使用模块化方便管理。
> - 这里默认读者清楚 ES6 的语法

```javascript
export default new vuex.Store({
    state : {
        user : {
            list: [],
            total: 0,
            pageIndex: 1,
            pageSize: 10,
        }
    },
    mutations: {
		updateUser(state, data) {
			state.user = {
				...state.user,
				...data,
			}
		},  
    },
    actions: {
        async getUser({commit,state,getters}) {
            // $axios 只是我自己封装的一个函数 这里并不重要
            const res = await $axios.get('/user',getters.requestData(state.user))
            commit('updateUser',res);
    	},
    },
    getters:{
        requestData(state) {
            return (origin) => {
                const {
                    pageIndex,
                    pageSize,
                } = origin;
                const data = {
                    pageIndex,
                    pageSize,
                };
                return data;
            }
        },
    }
})
```

### 数据持久化

现在如何获取数据已经搞定了，数据持久化我使用 [vuex-localstorage](https://github.com/crossjs/vuex-localstorage)，安装后，只需要在上面代码的基础上添加：

```javascript
import createPersist from 'vuex-localstorage'
export default new vuex.Store({
    // 接着上面的
    plugins: [createPersist({
        namespace: 'studio-user',
        initialState: {},
        // ONE_WEEK
        expires: 7 * 24 * 60 * 60 * 1e3
    })]
})
```

### 公用分页组件

```html
<template>
  <el-Pagination
    background
    layout="total, sizes, prev, pager, next, jumper"
    :total="module.total"
    :current-page.sync="module.pageIndex"
    :page-sizes="module.pageSizes"
    :page-size.sync="module.pageSize"
    @current-change="handleCurrentChange"
    @size-change="handleSizeChange"
  >
  </el-Pagination>
</template>
<script>
export default {
  props: {
    module: Object
  },
  methods: {
    getData() {
      this.$emit("get-data");
    },
    handleCurrentChange() {
      this.getData();
    },
    handleSizeChange(val) {
      this.getData();
    }
  }
};
</script>
```

### 使用分页组件

```html
<template>
  <div class="container">
	<el-table
        :data="user.list"
        style="width: 100%;"
      >
        <el-table-column
          v-for="(item,index) in columns"
          :key="index"
          :prop="item.prop"
          :label="item.label"
          align="center"
        />
      </el-table>
      <pagination
        :module="user"
        @get-data="getData"
      />
  </div>
</template>
<script>
import Pagination from "@/common/components/Pagination";
import { mapActions, mapState } from "vuex";
export default {
  components: {
    Pagination,
  },
  data: () => ({
    columns: [
      {
        prop: "name",
        label: "姓名"
      },
      {
        prop: "性别",
        label: "sex"
      },
      {
        prop: "年龄",
        label: "age"
      },
    ]
  }),
  created() {
    this.getData();
  },
  methods: {
      ...mapActions({
          getData : "getUser",
      })   
  },
  computed: {
    ...mapState(["user"])
  }
};
</script>
```

## 后记

将一些常用的功能抽象出来，打造一个自己的工具库，从而使开发效率更高。

最后，安利一下文章开头说的项目：[清技背单词](https://github.com/gd4Ark/learn_english)，上面的代码就是从这个项目中`copy`出来后略作修改的。

感谢观看，希望我的文章能对您有一些帮助！