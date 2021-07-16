module.exports = {
  title: '4Ark',
  description: '4Ark gd4ark WEB 前端 个人博客 博客',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  plugins: [
    [
      '@vuepress/google-analytics',
      {
        ga: 'G-GF95RX6W2Z'
      }
    ]
  ],
  theme: '@vuepress/theme-blog',
  themeConfig: {
    nav: [
      {
        text: 'Blog',
        link: '/'
      },
      {
        text: 'Tags',
        link: '/tag/'
      },
      {
        text: 'About',
        link: '/about/'
      }
    ],

    footer: {
      contact: [
        {
          type: 'github',
          link: 'https://github.com/gd4Ark'
        },
        {
          type: 'mail',
          link: 'mailto:gd4ark@gmail.com'
        }
      ],
      copyright: [
        {
          text: '4Ark © 2021',
          link: ''
        }
      ]
    },

    sitemap: {
      hostname: 'https://4ark.me/'
    },

    comment: {
      service: 'disqus',
      shortname: 'https-4ark-me'
    },

    feed: {
      canonical_base: 'https://4ark.me/',
      posts_directories: ['/_posts/']
    }
  }
}
