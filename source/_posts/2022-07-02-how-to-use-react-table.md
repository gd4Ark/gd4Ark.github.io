---
title: 如何使用 react-table 搭建表格组件
date: 2022-07-02
permalink: /post/how-to-use-react-table.html
tags: 
  - react
---

## 前言

在日常开发中，特别是内部使用的[后台系统](https://kalacloud.com/blog/best-react-admin-dashboard)时，我们常常会需要用表格来展示数据，同时提供一些操作用于操作表格内的数据。简单的表格直接用原生 HTML table 就好，但如果要在 React 中实现一个功能丰富的表格，其实是非常不容易的。

在本站之前的文章[《最好的 6 个 React Table 组件详细亲测推荐》](https://kalacloud.com/blog/best-react-table-component) 中有提到过 [react-table](https://www.npmjs.com/package/react-table) 这个库，如果对这个库不太了解的同学可以先了解一下，这里不再赘述。

简而言之，react-table 是一个非常强大的库，它与常见的 table 组件不同，它不负责渲染 HTML 和 CSS，而是提供了一系列的 hooks 让我们可以灵活地构建功能强大的 table 组件。

因此使用 react-table 进行开发具有一定的难度，而本文将由浅入深地讲解如何在 React 项目中使用 react-table 实现各种常见的需求，例如：排序、筛选、分页等；同时还会结合一个完整的案例给大家讲解如何和 Material-UI 搭配使用。



相信本文后能够帮助你快速上手 react-table 的使用，让我们开始吧。

## 安装和使用

首先，让我们先来创建一个 React 项目：

```bash
npx create-react-app react-table-demo

cd react-table-demo
```

然后我们安装一下 react-table：

```bash
npm i react-table # npm
yarn add react-table # or yarn
```

接下来我们通过一个简单的示例，讲解如何在 React 项目中使用 react-table。

假设我们有一个订单表：

| 订单编号            | 姓名   | 收货地址                   | 下单日期    |
| ------------------- | ------ | -------------------------- | ----------- |
| 1596694478675759682 | 蒋铁柱 | 北京市海淀区西三环中路19号 | 2022-07-01' |
| 1448752212249399810 | 陈成功 | 湖北武汉武昌区天子家园     | 2022-06-27  |
| 1171859737495400477 | 宋阿美 | 湖北武汉武昌区天子家园     | 2022-06-21  |
| 1096242976523544343 | 张小乐 | 北京市海淀区北航南门       | 2022-06-30  |
| 1344783976877111376 | 马国庆 | 北京市海淀区花园桥东南     | 2022-06-12  |
| 1505069508845600364 | 小果   | 广州天河机场西侧停车场     | 2022-06-07  |

我们使用 react-table 时，需要通过一个叫做 `useTable` 的 hooks 来构建 table。

```js
import { useTable } from 'react-table'
```

而 `useTable` 接收两个必填的参数：

1. data：表格的数据
2. columns：表格的列

所以让我们先来定义这个订单表的 data 和 columns：

```js
import React, { useMemo } from 'react'

function App() {
  const data = useMemo(
    () => [
      {
        name: '蒋铁柱',
        address: '北京市海淀区西三环中路19号',
        date: '2022-07-01',
        order: '1596694478675759682'
      },
      {
        name: '陈成功',
        address: '湖北武汉武昌区天子家园',
        date: '2022-06-27',
        order: '1448752212249399810'
      },
      {
        name: '宋阿美',
        address: '湖北武汉武昌区天子家园',
        date: '2022-06-21',
        order: '1171859737495400477'
      },
      {
        name: '张小乐',
        address: '北京市海淀区北航南门',
        date: '2022-06-30',
        order: '1096242976523544343'
      },
      {
        name: '马国庆',
        address: '北京市海淀区花园桥东南',
        date: '2022-06-12',
        order: '1344783976877111376'
      },
      {
        name: '小果',
        address: '广州天河机场西侧停车场',
        date: '2022-06-07',
        order: '1505069508845600364'
      }
    ],
    []
  )

  const columns = useMemo(
    () => [
      {
        Header: '订单编号',
        accessor: 'order'
      },
      {
        Header: '姓名',
        accessor: 'name'
      },
      {
        Header: '收货地址',
        accessor: 'address'
      },
      {
        Header: '下单日期',
        accessor: 'date'
      }
    ],
    []
  )

  return (
    <div>
      <h1>React Table Demo —— 卡拉云(https://kalacloud.com)</h1>
      <Table columns={columns} data={data}></Table>
    </div>
  )
}
```

你可能会注意到这里我们使用 `useMeno` 来声明数据，这是因为 react-table 文档中说明传入的 data 和 columns 必须是 memoized 的，简单来说就是可以缓存的，仅当依赖项数组里面的依赖发生变化时才会重新计算，如果对 `useMemo` 不熟悉的同学建议直接看 [React 文档](https://zh-hans.reactjs.org/docs/hooks-reference.html#usememo)。

接着我们构建一个 Table 组件接受 columns 和 data，并传入到 `useTable` 中，它会返回一系列属性，我们就可以利用这些属性来构建 HTML table：

```js
function Table({ columns, data }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns,
    data,
  })

  return (
    <table {...getTableProps()}>
      <thead>
        {headerGroups.map((headerGroup) => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column) => (
              <th {...column.getHeaderProps()}>{column.render('Header')}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {rows.map((row, i) => {
          prepareRow(row)
          return (
            <tr {...row.getRowProps()}>
              {row.cells.map((cell) => {
                return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

展示效果如下：

![image-20220702180924562](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202207021811291.png)

由于是使用原生的 HTML table，因此是没有任何样式的， 这也是 react-table 的特点，好处是我们可以随意自定义我们想要的样式，比如我们引入  github-markdown-css：

```bash
npm i github-markdown-css
```

然后在项目中使用即可：

```diff
import React, { useMemo } from 'react'
import { useTable } from 'react-table'

import './App.css'
+ import 'github-markdown-css'

function App() {
  return (
-   <div>
+   <div className="markdown-body" style={{ padding: '20px' }}>
      <h1>React Table Demo —— 卡拉云(https://kalacloud.com)</h1>
      <Table columns={columns} data={data}></Table>
    </div>
  )
}
```

更改后的样式效果：

![image-20220702180856446](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202207021808023.png)

## 扩展功能

接下来我们给这个表格添加更多常见的功能：排序、筛选、分页等。

### 排序

如果只是想设置默认排序，我们可以通过配置 `initialState` 来实现：

```js
useTable({
  columns,
  data,
  initialState: {
    sortBy: [
      {
        id: 'order',
        desc: true
      }
    ]
  }
})
```

如果要实现手动排序，就需要通过  `useSortBy` 这个 hooks 实现：

```js
import { useTable, useSortBy } from 'react-table' 
```

然后在 `useTable` 中传入 `useSortBy`：

```diff
const {
  getTableProps,
  getTableBodyProps,
  headerGroups,
  rows,
  prepareRow,
} = useTable(
 {
   columns,
   data,
 },
+ useSortBy,
)
```

然后我们可以在 columns 中的某个列指定 `sortType` 属性，它接受 String 或 Function，对于 Function 的使用方式这里按下不表，而对于 String 类型，它可以接受以下三种：

1. alphanumeric：字母或数字进行排序（默认值）
2. basic：0 到 1 之间的数字排序
3. datetime：日期排序，值必须为 Date 类型

比如在我们这个例子中，我们希望可以允许对「订单编号」进行排序，那我们则修改：

```diff
const columns = useMemo(
  () => [
    {
      Header: '订单编号',
      accessor: 'order',
+     sortType: 'basic'
    },
    {
      Header: '姓名',
      accessor: 'name'
    },
    {
      Header: '收货地址',
      accessor: 'address'
    },
    {
      Header: '下单日期',
      accessor: 'date',
    }
  ],
  []
)

```

接着我们在表头相关的代码中添加排序相关的逻辑，并且根据当前列的排序情况分别显示对应的箭头，或者在没有任何排序时不显示：

```diff
<thead>
  {headerGroups.map((headerGroup) => (
  <tr {...headerGroup.getHeaderGroupProps()}>
    {headerGroup.headers.map((column) => (
-   <th {...column.getHeaderProps()}>
+   <th {...column.getHeaderProps(column.getSortByToggleProps())}>
      {column.render('Header')}
+     <span>
+       {column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}
+     </span>
    </th>
    ))}
  </tr>
  ))}
</thead>
```

展示效果如下：

![sort-demo-1](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202207021832361.gif)

通过上图我们可以发现了一个问题：即便我们没有对「姓名」这一列配置 `sortType`，却依然可以进行排序，这是因为一旦在 `useTable` 传入了 `useSortBy`，则默认所有列都可进行排序，如果我们需要对特定的列禁用排序，可以这样：

```diff
const columns = useMemo(
  () => [
    {
      Header: '订单编号',
      accessor: 'order',
      sortType: 'basic'
    },
    {
      Header: '姓名',
      accessor: 'name',
+     disableSortBy: true,
    },
    {
      Header: '收货地址',
      accessor: 'address'
    },
    {
      Header: '下单日期',
      accessor: 'date',
    }
  ],
  []
)
```

关于排序功能更多详细细节参见文档：[useSortBy](https://react-table-v7.tanstack.com/docs/api/useSortBy)。

### 筛选

我们可以通过 `useFilters` 来实现筛选功能：

```js
import { useTable, useFilters } from 'react-table'
```

同样地，需要在 `useTable` 中传入：

```diff
const {
  getTableProps,
  getTableBodyProps,
  headerGroups,
  rows,
  prepareRow,
} = useTable(
 {
   columns,
   data,
 },
+ useFilters,
)
```

PS：注意 `useFilters` 必须位于 `useSortBy` 前面，否则会报错。

然后在表头中渲染筛选输入框：

```diff
<th {...column.getHeaderProps()}>
 {column.render('Header')}
+ <div>{column.canFilter ? column.render('Filter') : null}</div>
</th>
```

这个筛选输入框的 UI 需要我们自定义，所以我们定义一个 `TextFilter` 组件：

```js
function TextFilter({ column: { filterValue, preFilteredRows, setFilter } }) {
  const count = preFilteredRows.length

  return (
    <input
      value={filterValue || ''}
      onChange={(e) => {
        setFilter(e.target.value || undefined)
      }}
      placeholder={`筛选 ${count} 条记录`}
    />
  )
}
```

这个组件接受三个参数：

- filterValue：用户输入的筛选值
- preFilteredRows：筛选前的行
- setFilter：用于设置用户筛选的值

定义完筛选组件后，我们还将 `TextFilter` 传入到一个 `defaultColumn` 中：

```js
const defaultColumn = React.useMemo(
 () => ({
   Filter: TextFilter,
 }),
 []
)
```

接着再把 `defaultColumn` 传入 `useTable`：

```diff
const {
  getTableProps,
  getTableBodyProps,
  headerGroups,
  rows,
  prepareRow,
} = useTable(
 {
   columns,
   data,
+  defaultColumn,
 },
 useFilters,
)
```

展示效果如下：
![filter-demo-1](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202207022110099.gif)

这里我们发现了一个问题：当点击筛选输入框时，会改变排序方式，这是因为改变排序的点击事件是放在 `<th>`，因此我们要阻止这个输入框的点击事件向外层冒泡：

```diff
- <div>
+ <div onClick={(e) => e.stopPropagation()}>
    {column.canFilter ? column.render('Filter') : null}
</div>
```

同样地，如果想要禁用某一个列的筛选，可以设置 `disableFilters`：

```diff
const columns = useMemo(
  () => [
    {
      Header: '订单编号',
      accessor: 'order',
      sortType: 'basic'
    },
    {
      Header: '姓名',
      accessor: 'name',
+     disableFilters: true,
    },
    {
      Header: '收货地址',
      accessor: 'address'
    },
    {
      Header: '下单日期',
      accessor: 'date',
    }
  ],
  []
)
```

关于筛选功能更多详细细节参见文档：[useFilters](https://react-table-v7.tanstack.com/docs/api/useFilters)。

### 分页

分页功能使用 `usePagination` 这个 hooks 实现：

```js
import { useTable, usePagination } from 'react-table' 
```

然后在 `useTable` 中添加分页相关的参数：

```diff
const {
   getTableProps,
   headerGroups,
   getRowProps,
-  rows 
+  state: { pageIndex, pageSize },
+  canPreviousPage,
+  canNextPage,
+  previousPage,
+  nextPage,
+  pageOptions,
+  page
 } = useTable(
   {
     columns,
     data,
+    initialState: { pageSize: 2 },
   },
+  usePagination,
 )
```

然后我们 `tbody` 中的 `rows` 将从 `page` 变量中获取：

```diff
<tbody {...getTableBodyProps()}>
- {rows.map((row) => {
+ {page.map((row) => {    
  prepareRow(row)
  return (
    <tr {...row.getRowProps()}>
      {row.cells.map((cell) => {
        return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
      })}
    </tr>
  )
})}
</tbody>
```

我们还需要构建一个分页器：

```js
function Pagination({
  canPreviousPage,
  canNextPage,
  previousPage,
  nextPage,
  pageOptions,
  pageIndex
}) {
  return (
    <div>
      <button onClick={() => previousPage()} disabled={!canPreviousPage}>
        上一页
      </button>{' '}
      <button onClick={() => nextPage()} disabled={!canNextPage}>
        下一页
      </button>
      <div>
        第{' '}
        <em>
          {pageIndex + 1} / {pageOptions.length}
        </em>{' '}
        页
      </div>
    </div>
  )
}
```

在 table 后面使用这个分页器：

```js
<>
  <table {...getTableProps()}>...
  </table>
  <Pagination
    canPreviousPage={canPreviousPage}
    canNextPage={canNextPage}
    previousPage={previousPage}
    nextPage={nextPage}
    pageOptions={pageOptions}
    pageIndex={pageIndex}
  />
</>
```

展示效果如下：

![pagination-demo-1](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202207022303443.gif)

更复杂的分页可以参考官方示例：[Examples: Pagination](https://react-table-v7.tanstack.com/docs/examples/pagination)。

## 完整的例子

通过前文我们已经把 react-table 的基本使用都演示了一遍，下面我们来个更加真实、完整的例子，它将包含以下功能：

1. 模拟从远端请求数据，包括排序、筛选、分页等
2. 展示更多高级功能：全局筛选、行选择、行展开
3. 使用 Material-UI 构建组件

首先创建一个新的项目：

```bash
npx create-react-app react-table-example

cd react-table-example
```

然后安装相关依赖：

```bash
npm i react-table mockjs axios lodash.orderby

npm i axios-mock-adapter --save-dev

npm i @material-ui/core @material-ui/icons
```

### 模拟 API

然后我们生成 200 条订单数据，同时模拟 API 的筛选、排序和分页功能：

```js
// mock.js

import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import Mock from 'mockjs'
import _orderby from 'lodash.orderby'

const { Random, mock } = Mock

const orders = new Array(200).fill(null).map(() => {
  return mock({
    order: Random.natural(),
    name: Random.cname(),
    address: Random.province() + '-' + Random.city() + '-' + Random.county(),
    date: Random.date()
  })
})

const mockAPI = {
  start() {
    const mock = new MockAdapter(axios)

    mock.onGet('/api/orders').reply((config) => {
      let { filter, sortBy, page = 0, size = 10 } = config.params || {}

      let mockOrders = [...orders]

      if (filter) {
        mockOrders = orders.filter((order) => {
          return Object.values(order).some((value) => value.includes(filter))
        })
      }

      if (sortBy.length) {
        sortBy.forEach((sort) => {
          mockOrders = _orderby(
            mockOrders,
            [sort.id],
            [sort.desc ? 'desc' : 'asc']
          )
        })
      }

      const offset = page * size

      mockOrders = mockOrders.slice(offset, offset + size)

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            200,
            {
              data: mockOrders,
              total_count: orders.length
            }
          ])
        }, 500)
      })
    })
  }
}

export default mockAPI
```

然后在 App.js 中引入并开始 mock：

```js
import mockAPI from './mock'

mockAPI.start()
```

### 构建基础 Table 组件

有了上面的经验，我们很快就可以构建一个基础的 table 组件：

```js
// components/Table.js

import React from 'react'

import { useTable } from 'react-table'

import MaUTable from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'

function Table({ columns, data }) {
  const { getTableProps, headerGroups, prepareRow, rows } = useTable({
    columns,
    data
  })

  return (
    <TableContainer>
      <MaUTable {...getTableProps()}>
        <TableHead>
          {headerGroups.map((headerGroup) => (
            <TableRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <TableCell {...column.getHeaderProps()}>
                  {column.render('Header')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {rows.map((row, i) => {
            prepareRow(row)
            return (
              <TableRow {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <TableCell {...cell.getCellProps()}>
                      {cell.render('Cell')}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </MaUTable>
    </TableContainer>
  )
}

export default Table
```

然后在 App.js 中请求 API 并展示：

```js
import React, { useState, useMemo, useEffect } from 'react'
import axios from 'axios'

import Table from './components/Table'

import mockAPI from './mock'

mockAPI.start()

function App() {
  const fetchOrders = async (params = {}) => {
    return axios.get('/api/orders', { params }).then((res) => {
      const resp = res.data

      setOrders(resp.data)
    })
  }

  const [orders, setOrders] = useState([])

  const data = useMemo(() => {
    return [...orders]
  }, [orders])

  const columns = useMemo(
    () => [
      {
        Header: '订单编号',
        accessor: 'order'
      },
      {
        Header: '姓名',
        accessor: 'name'
      },
      {
        Header: '收货地址',
        accessor: 'address'
      },
      {
        Header: '下单日期',
        accessor: 'date'
      }
    ],
    []
  )
  
  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>React Table Example —— 卡拉云(https://kalacloud.com)</h1>
      <Table data={data} columns={columns} />
    </div>
  )
}

export default App
```

展示效果如下：

![image-20220703003526931](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202207030035968.png)

### 分页

接着我们添加分页功能，首先增加 `TablePaginationActions` 组件：

```js
// components/TablePaginationActions.js

import React from 'react'

import FirstPageIcon from '@material-ui/icons/FirstPage'
import IconButton from '@material-ui/core/IconButton'
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft'
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight'
import LastPageIcon from '@material-ui/icons/LastPage'
import { makeStyles, useTheme } from '@material-ui/core/styles'
import PropTypes from 'prop-types'

const useStyles = makeStyles((theme) => ({
  root: {
    flexShrink: 0,
    marginLeft: theme.spacing(2.5)
  }
}))

const TablePaginationActions = (props) => {
  const classes = useStyles()
  const theme = useTheme()
  const { count, page, rowsPerPage, onPageChange } = props

  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0)
  }

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1)
  }

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1)
  }

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1))
  }

  return (
    <div className={classes.root}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === 'rtl' ? (
          <KeyboardArrowRight />
        ) : (
          <KeyboardArrowLeft />
        )}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? (
          <KeyboardArrowLeft />
        ) : (
          <KeyboardArrowRight />
        )}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </div>
  )
}

export default TablePaginationActions
```

然后在 `Table.js` 中修改如下：

```diff
import React, { useEffect } from 'react'
import { useTable, usePagination } from 'react-table'

+ import TableFooter from '@material-ui/core/TableFooter'
+ import TablePagination from '@material-ui/core/TablePagination'
+ import TablePaginationActions from './TablePaginationActions'

- function Table({ columns, data }) {
+ function Table({ columns, data, totalCount, onStateChange }) {
  const {
    getTableProps,
    headerGroups,
    prepareRow,
-   rows,  
+   page,
+   gotoPage,
+   setPageSize,
+   state: { pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data,
+     manualPagination: true,
+     pageCount: totalCount
    },
+   usePagination
  )

+  useEffect(() => {
+    onStateChange({ pageIndex, pageSize })
+  }, [pageIndex, pageSize, onStateChange])

+  const handleChangePage = (event, newPage) => {
+    gotoPage(newPage)
+  }

+  const handleChangeRowsPerPage = (event) => {
+    setPageSize(Number(event.target.value))
+  }

  return (
    <TableContainer>
      <MaUTable {...getTableProps()}>
				...
        <TableBody>
-         {rows.map((row, i) => {
+         {page.map((row, i) => {
					...
        </TableBody>

+       <TableFooter>
+         <TableRow>
+           <TablePagination
+             rowsPerPageOptions={[5, 10, 15, 20]}
+             colSpan={3}
+             count={totalCount}
+             rowsPerPage={pageSize}
+             page={pageIndex}
+             SelectProps={{
+               inputProps: { 'aria-label': 'rows per page' },
+               native: true
+             }}
+             onPageChange={handleChangePage}
+             onRowsPerPageChange={handleChangeRowsPerPage}
+             ActionsComponent={TablePaginationActions}
+           />
+         </TableRow>
+       </TableFooter>
      </MaUTable>
    </TableContainer>
  )
}

export default Table
```

在 App.js 中增加控制分页的逻辑：

```js
const [totalCount, setTotalCount] = useState(0)

const fetchOrders = async (params = {}) => {
  return axios.get('/api/orders', { params }).then((res) => {
    const resp = res.data

    setOrders(resp.data)
    setTotalCount(resp.total_count)
  })
}

const onStateChange = useCallback(({ pageIndex, pageSize }) => {
  fetchOrders({
    page: pageIndex,
    size: pageSize
  })
}, [])
```

由于 Table 组件内部会触发 `onStateChange`  因此移除 `useEffect` ，然后传入 Table 相关属性：

```diff
- useEffect(() => {
-     fetchOrders().then((orders) => {
-       setOrders(orders)
-     })
-   }, [])

<Table
  data={data}
  columns={columns}
+ totalCount={totalCount}
+ onStateChange={onStateChange}
/>
```

展示效果如下：

![pagination-demo-2](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202207030124702.gif)

### 排序

接着我们添加排序功能，首先修改 `Table.js`：

```diff
- import { useTable, usePagination } from 'react-table'
+ import { useTable, usePagination, useSortBy } from 'react-table'

+ import TableSortLabel from '@material-ui/core/TableSortLabel'

function Table({ columns, data, totalCount, onStateChange }) {
  const {
    getTableProps,
    headerGroups,
    prepareRow,
    page,
    gotoPage,
    setPageSize,
-   state: { pageIndex, pageSize }    
+   state: { pageIndex, pageSize, sortBy }
  } = useTable(
    {
      columns,
      data,
      manualPagination: true,
+     manualSortBy: true,
      pageCount: totalCount
    },
+   useSortBy,
    usePagination
  )
  
-  useEffect(() => {
-    onStateChange({ pageIndex, pageSize })
-  }, [pageIndex, pageSize, onStateChange])

+  useEffect(() => {
+    onStateChange({ pageIndex, pageSize, sortBy })
+  }, [pageIndex, pageSize, sortBy, onStateChange])


    <TableCell
-     {...column.getHeaderProps()}
+     {...column.getHeaderProps(column.getSortByToggleProps())}
    >
       {column.render('Header')}
+     <TableSortLabel
+       active={column.isSorted}
+       direction={column.isSortedDesc ? 'desc' : 'asc'}
+     />			
    </TableCell>
}
```

展示效果如下：

![sort-demo-3](https://gd4ark-1258805822.cos.ap-guangzhou.myqcloud.com/images202207031414084.gif)

### 筛选

