var pagination = require('hexo-pagination')

hexo.extend.generator.register('weekly', function (locals) {
  const config = this.config

  const weeklyTag = config.weekly_generator?.tag || 'weekly'
  const posts = locals.tags.findOne({ name: weeklyTag }).posts.reverse()

  const paginationDir = config.pagination_dir || 'page'
  const path = config.weekly_generator?.path || '/weekly'

  return pagination(path, posts, {
    perPage: config.weekly_generator?.per_page || 10,
    layout: ['weekly'],
    format: paginationDir + '/%d/',
    data: {
      __index: true
    }
  })
})
