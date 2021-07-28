const _reverse = require('lodash.reverse')
const _sortBy = require('lodash.sortby')

module.exports = {
  title: '4Ark',
  description: '4Ark gd4ark WEB 前端 个人博客 博客',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  plugins: {
    '@vuepress/google-analytics': {
      ga: 'UA-190615898-1'
    }
  },
  theme: '@gd4ark/vuepress-theme-blog',
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

    feed: {
      canonical_base: 'https://4ark.me/',
      posts_directories: ['/_posts/'],
      feeds: {
        atom1: {
          enable: true,
          file_name: 'atom.xml',
          head_link: {
            enable: true,
            type: 'application/atom+xml',
            title: '%%site_title%% Atom Feed'
          }
        }
      },
      sort: (entries) => _reverse(_sortBy(entries, 'date'))
    },

    sitemap: {
      hostname: 'https://4ark.me/'
    },

    comment: {
      service: 'disqus',
      shortname: 'https-4ark-me'
    }
  }
}
