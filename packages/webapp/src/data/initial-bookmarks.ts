export const initialBookmarks = {
  'https://utags.link/': {
    meta: {
      title: 'UTags Bookmark Manager', // UTags 书签管理器
      description:
        'UTags Bookmark Manager is a modern bookmark management tool designed to help developers and advanced users overcome the clutter of bookmarks. Unlike traditional bookmark management methods, it uses a flexible tagging system and powerful filtering functions, allowing users to manage and find online resources more efficiently.', // UTags 书签管理器是一个现代化的书签管理工具，旨在帮助开发者和资深用户摆脱书签杂乱无章的困扰。它不同于传统的书签管理方式，采用了灵活的标签系统和强大的筛选功能，让用户能够更高效地管理和查找网络资源。
      note: `Instructions:
- You can add notes to bookmarks
- Clear data in settings
- Supports importing bookmark HTML files from Chrome/Edge/Firefox/Safari
      `, // 使用说明: ...
      created: Date.now(),
      updated: Date.now(),
    },
    tags: [
      '★',
      'Open Source',
      'Bookmarks', // 书签 (also English)
      'Bookmark Manager', // 书签管理器
      'Tools/Free', // 工具/免费
      'Read Later', // 稍后阅读
      'Bookmarks',
    ],
  },
  'https://greasyfork.org/scripts/460718': {
    meta: {
      title: 'Userscript - 🏷️ UTags - Add user tags to links',
      note: `Add custom tags or notes to links such as users, posts and videos. For example, tags can be added to users or posts on a forum, making it easy to identify them or block their posts and replies. It works on X (Twitter), Reddit, Facebook, Threads, Instagram, Youtube, TikTok, GitHub, Greasy Fork, Hacker News, pixiv and numerous other websites.`,
      created: Date.now(),
      updated: Date.now(),
    },
    tags: ['Open Source', 'Tools', 'Userscript'],
  },
  'https://chromewebstore.google.com/detail/utags-add-usertags-to-lin/kofjcnaphffjoookgahgjidofbdplgig':
    {
      meta: {
        title: 'Chrome extension - UTags - Add usertags to links',
        created: Date.now() - 1000 - Math.floor(Math.random() * 3_600_000),
        updated: Date.now() - 1000,
      },
      tags: [
        'Browser Extension/Chrome',
        'Browser Extension',
        'Tools',
        'Open Source',
      ],
    },
  'https://microsoftedge.microsoft.com/addons/detail/utags-add-usertags-to-l/bhlbflbehfoccjjenpekilgabbjjnphe':
    {
      meta: {
        title: 'Edge extension - UTags - Add usertags to links',
        created: Date.now() - 2000 - Math.floor(Math.random() * 3_600_000),
        updated: Date.now() - 2000,
      },
      tags: [
        'Browser Extension/Edge',
        'Browser Extension',
        'Productivity',
        'Tools',
        'Open Source',
      ],
    },
  'https://addons.mozilla.org/firefox/addon/utags/': {
    meta: {
      title: 'Firefox extension - UTags - Add usertags to links',
      created: Date.now() - 3000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 3000,
    },
    tags: [
      'Browser Extension/Firefox',
      'Browser Extension',
      'Open Source',
      'Tools',
      'Bookmarks',
    ],
  },
  'https://github.com/utags/utags': {
    meta: {
      title: 'GitHub - utags/utags: 🏷️ UTags - Add user tags to links',
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      '★',
      'Open Source',
      'Browser Extension',
      'Userscript',
      'Bookmark Manager', // 书签管理器
      'Tools/Free', // 工具/免费
      'Bookmarks',
    ],
  },
  'https://utags.link/c/public/help': {
    meta: {
      title: 'Help Documentation', // 帮助文档
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: ['help', 'public-collection', 'UTags', 'Read Later'],
  },
  'https://utags.link/c/public/release-notes': {
    meta: {
      title: 'Release Notes', // 更新日志
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: ['release-notes', 'public-collection', 'UTags', 'Read Later'],
  },
  'https://github.com/orgs/utags/discussions': {
    meta: {
      title: 'Feedback and Suggestions', // 反馈与建议
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Discussions',
      'Forum', // 论坛
      'Community', // 社区
      'UTags',
    ],
  },

  'https://tapmeplus1.com/zh': {
    meta: {
      title: '"Tap Me +1" Web Game', // 《点我加 1》的网页版小游戏
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      '🎮 Games', // 🎮 游戏
      '🎮 Mini Games/Web', // 小游戏/网页版
    ],
  },
  'https://svelte.dev/': {
    meta: {
      title: 'Svelte',
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Tech Stack', // 技术栈
      'JavaScript',
      'TypeScript',
      'Open Source',
    ],
  },
  'https://tailwindcss.com/': {
    meta: {
      title: 'Tailwind CSS',
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Tech Stack', // 技术栈
      'CSS',
      'Open Source',
    ],
  },
  'https://lucide.dev/': {
    meta: {
      title: 'Lucide',
      description: 'Beautiful & consistent icon toolkit made by the community.',
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Tech Stack', // 技术栈
      'Icon',
      'Open Source',
    ],
  },
  'https://www.typescriptlang.org/': {
    meta: {
      title: 'TypeScript',
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Tech Stack', // 技术栈
      'TypeScript',
      'Open Source',
    ],
  },
  'https://inlang.com/m/gerre34r/library-inlang-paraglideJs': {
    meta: {
      title: 'Paraglide JS',
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Tech Stack', // 技术栈
      'I18N',
      'Open Source',
    ],
  },
  'https://vite.dev/': {
    meta: {
      title: 'Vite | Next Generation Frontend Tooling',
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Tech Stack', // 技术栈
      'TypeScript',
      'JavaScript',
      'Tools/Frontend',
      'Open Source',
    ],
  },
  'https://vitest.dev/': {
    meta: {
      title: 'Vitest | Next Generation testing framework',
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Tech Stack', // 技术栈
      'TypeScript',
      'JavaScript',
      'Tools/Frontend',
      'Open Source',
    ],
  },
  'https://www.v2ex.com/': {
    meta: {
      title: 'V2EX - A community for creative workers', // V2EX - 创意工作者们的社区
      description:
        'A community for creative workers. Discuss exciting topics like programming, design, hardware, and games.', // 创意工作者的社区。讨论编程、设计、硬件、游戏等令人激动的话题。
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Forum', // 论坛
      'Forum/Programmers', // 论坛/程序员
      '💰 Sponsors', // 💰 赞助商
    ],
  },
  'https://linux.do/': {
    meta: {
      title: 'LINUX DO',
      description: 'Where possible begins.',
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Forum', // 论坛
      'Forum/Programmers', // 论坛/程序员
      '💰 Sponsors', // 💰 赞助商
    ],
  },
  'https://github.com/helloxz/linksumm': {
    meta: {
      title: 'LinkSumm',
      description:
        'LinkSumm is an intelligent summary extractor driven by AI large models. You can input a URL, and AI will summarize the content for you.', // LinkSumm 是一款使用 AI 大模型驱动的智能摘要提取器，您可以输入一个 URL 地址，让 AI 为您总结内容。
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Tools/AI', // 工具/AI
      'Open Source',
      '💰 Sponsors', // 💰 赞助商
    ],
  },
  'https://greasyfork.org/': {
    meta: {
      title: 'Greasy Fork',
      description:
        'Greasy Fork is a free site providing user scripts to improve your web browsing experience.',
      created: Date.now() - 4000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() - 4000,
    },
    tags: [
      'Userscript',
      '💰 Sponsors', // 💰 赞助商
    ],
  },
  'https://gemini.google.com/app': {
    meta: {
      title: 'Google Gemini',
      description:
        'Google Gemini is an advanced AI assistant that can help with writing, analysis, coding, and creative tasks through natural conversation.',
      created: Date.now() - 5000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 50_000,
    },
    tags: ['AI Chat', 'Tools/AI', 'Google', 'Assistant'],
  },
  'https://chatgpt.com/': {
    meta: {
      title: 'ChatGPT',
      description:
        'ChatGPT is an AI-powered conversational assistant by OpenAI that can help with various tasks including writing, coding, analysis, and creative projects.',
      created: Date.now() - 6000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 49_000,
    },
    tags: ['AI Chat', 'Tools/AI', 'OpenAI', 'Assistant'],
  },
  'https://www.doubao.com/chat/': {
    meta: {
      title: 'Doubao (豆包)',
      description:
        "Doubao is ByteDance's AI assistant that provides intelligent conversation, content creation, and problem-solving capabilities in Chinese and English.",
      created: Date.now() - 7000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 48_000,
    },
    tags: ['AI Chat', 'Tools/AI', 'ByteDance', 'Assistant', 'Chinese'],
  },
  'https://chat.deepseek.com/': {
    meta: {
      title: 'DeepSeek Chat',
      description:
        'DeepSeek Chat is an AI conversational platform that offers advanced reasoning capabilities for coding, mathematics, and general problem-solving tasks.',
      created: Date.now() - 8000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 47_000,
    },
    tags: ['AI Chat', 'Tools/AI', 'DeepSeek', 'Assistant', 'Coding'],
  },
  'https://www.google.com/': {
    meta: {
      title: 'Google',
      description:
        "Google is the world's most popular search engine, providing comprehensive web search, images, videos, news, and various online services.",
      created: Date.now() - 9000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 100_000,
    },
    tags: ['Popular', 'Search Engine', 'Google', 'Web Search', 'Essential'],
  },
  'https://www.bing.com/': {
    meta: {
      title: 'Bing',
      description:
        'Microsoft Bing is a web search engine that provides search results for web pages, images, videos, and news with AI-powered features.',
      created: Date.now() - 10_000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 99_000,
    },
    tags: ['Popular', 'Search Engine', 'Microsoft', 'Web Search', 'AI Search'],
  },
  'https://www.youtube.com/': {
    meta: {
      title: 'YouTube',
      description:
        "YouTube is the world's largest video sharing platform where users can watch, upload, and share videos on virtually any topic.",
      created: Date.now() - 11_000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 98_000,
    },
    tags: [
      'Popular',
      'Video',
      'Entertainment',
      'Google',
      'Social Media',
      'Learning',
    ],
  },
  'https://www.reddit.com/': {
    meta: {
      title: 'Reddit',
      description:
        'Reddit is a social news aggregation and discussion website where users can share content, participate in discussions, and vote on posts.',
      created: Date.now() - 12_000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 97_000,
    },
    tags: [
      'Popular',
      'Social Media',
      'Discussion',
      'News',
      'Community',
      'Forum',
    ],
  },
  'https://www.tiktok.com/': {
    meta: {
      title: 'TikTok',
      description:
        'TikTok is a popular short-form video hosting service where users create and share entertaining videos with music, effects, and filters.',
      created: Date.now() - 13_000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 96_000,
    },
    tags: [
      'Popular',
      'Video',
      'Social Media',
      'Entertainment',
      'Short Video',
      'Mobile',
    ],
  },
  'https://twitter.com/': {
    meta: {
      title: 'Twitter (X)',
      description:
        'Twitter (now X) is a microblogging platform where users share short messages, news, and engage in real-time conversations.',
      created: Date.now() - 14_000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 95_000,
    },
    tags: [
      'Popular',
      'Social Media',
      'Microblogging',
      'News',
      'Real-time',
      'Communication',
    ],
  },
  'https://www.facebook.com/': {
    meta: {
      title: 'Facebook',
      description:
        'Facebook is a social networking platform that connects people worldwide, allowing users to share updates, photos, and communicate with friends.',
      created: Date.now() - 15_000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 94_000,
    },
    tags: [
      'Popular',
      'Social Media',
      'Social Network',
      'Communication',
      'Meta',
      'Friends',
    ],
  },
  'https://www.instagram.com/': {
    meta: {
      title: 'Instagram',
      description:
        'Instagram is a photo and video sharing social networking service where users can share visual content and stories.',
      created: Date.now() - 16_000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 93_000,
    },
    tags: [
      'Popular',
      'Social Media',
      'Photo Sharing',
      'Video',
      'Meta',
      'Visual Content',
    ],
  },
  'https://www.linkedin.com/': {
    meta: {
      title: 'LinkedIn',
      description:
        'LinkedIn is a professional networking platform for career development, business connections, and professional content sharing.',
      created: Date.now() - 17_000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 92_000,
    },
    tags: [
      'Popular',
      'Professional',
      'Networking',
      'Career',
      'Business',
      'Social Media',
    ],
  },
  'https://github.com/': {
    meta: {
      title: 'GitHub',
      description:
        'GitHub is a web-based platform for version control and collaboration, hosting millions of software development projects.',
      created: Date.now() - 18_000 - Math.floor(Math.random() * 3_600_000),
      updated: Date.now() + 91_000,
    },
    tags: [
      'Popular',
      'Development',
      'Git',
      'Code Repository',
      'Collaboration',
      'Open Source',
    ],
  },
}
