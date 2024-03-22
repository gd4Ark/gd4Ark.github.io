import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://4ark.me",
  author: "4Ark",
  desc: "Art and beauty can be created on a computer.",
  title: "4Ark",
  lightAndDarkMode: true,
  postPerPage: 6,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
};

export const LOCALE = {
  lang: "zh", // html lang code. Set this empty and default will be "en"
  langTag: ["zh-CN"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/gd4Ark",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
  {
    name: "Mail",
    href: "mailto:gd4ark@gmail.com",
    linkTitle: `Send an email to ${SITE.title}`,
    active: true,
  },
  {
    name: "Twitter",
    href: "https://twitter.com/gd4Ark",
    linkTitle: `${SITE.title} on Twitter`,
    active: true,
  },
  {
    name: "RSS",
    href: "https://4ark.me/rss.xml",
    linkTitle: `${SITE.title} on RSS`,
    active: true,
  },
];
