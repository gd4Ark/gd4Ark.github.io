var pagination = require('hexo-pagination')

hexo.extend.generator.register('customIndex', function (locals) {
  locals.posts.forEach(function (post) {
    //  set post default type as post, 设置默认值
    if (post.type == undefined) {
      post.type = 'post'
    }
  })

  const config = this.config
  const posts = locals.posts.sort(config.index_generator.order_by)
  // filter posts with type == "post", 过滤
  const postsWithoutWeekly = posts.find({ type: 'post' })

  posts.data.sort((a, b) => (b.sticky || 0) - (a.sticky || 0))

  const paginationDir = config.pagination_dir || 'page'
  const path = config.index_generator.path || ''

  const weeklyTag = config.weekly_generator?.tag || '前端'
  const weeklyPosts = locals.tags
    .findOne({ name: weeklyTag })
    .posts.sort('date', 'desc')
    .limit(3)

  return pagination(path, postsWithoutWeekly, {
    perPage: config.index_generator.per_page,
    layout: ['index', 'archive'],
    format: paginationDir + '/%d/',
    data: {
      __index: true,
      weeklyPosts: weeklyPosts
    }
  })
})
