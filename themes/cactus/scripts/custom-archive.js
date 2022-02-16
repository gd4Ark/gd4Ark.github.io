var pagination = require('hexo-pagination');

hexo.extend.generator.register('customArchive', function(locals){
  locals.posts.forEach(function(post) {
    //  set post default type as post, 设置默认值
    if (post.type == undefined) {
      post.type = "post"
    }
  })

  const config = this.config;
  const posts = locals.posts.sort(config.index_generator.order_by);
  // filter posts with type == "post", 过滤
  const postsWithoutWeekly = posts.find({ "type": "post" })

  posts.data.sort((a, b) => (b.sticky || 0) - (a.sticky || 0));

  const paginationDir = config.pagination_dir || 'page';
  const path = config.archive_generator.path || 'archives';

  return pagination(path, postsWithoutWeekly, {
    perPage: config.archive_generator.per_page,
    layout: ['archive'],
    format: paginationDir + '/%d/',
    data: {
      __index: true
    }
  });
});
