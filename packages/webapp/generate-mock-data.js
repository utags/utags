import fs from 'node:fs'

const domainPool = []

const generateDomain = () => {
  const suffixes = ['.com', '.net', '.org', '.io', '.co', '.dev', '.app']
  let domain
  do {
    const randomLength = Math.floor(Math.random() * (15 - 3)) + 3
    const prefix = Math.random()
      .toString(36)
      .slice(2, 2 + randomLength)
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    domain = prefix + suffix
  } while (
    domain.length < 8 ||
    domain.length > 30 ||
    domainPool.includes(domain)
  )

  return domain
}

const paths = ['article', 'post', 'blog', 'news', 'product']
const generateCount = 10_000

const generateTitle = () => {
  const subjects = [
    '人工智能',
    '区块链技术',
    '用户体验',
    '数字化转型',
    '云计算',
  ]
  const verbs = ['驱动', '赋能', '重塑', '优化', '颠覆']
  const objects = ['商业模式', '行业格局', '运维体系', '营销策略', '开发流程']
  const modifiers = [
    '在数字经济时代',
    '通过智能算法',
    '基于大数据分析',
    '结合物联网',
    '依托5G网络',
  ]

  const randomPart = () => {
    const structure = Math.random()
    if (structure < 0.3) {
      return `${subjects[Math.floor(Math.random() * subjects.length)]}${verbs[Math.floor(Math.random() * verbs.length)]}${objects[Math.floor(Math.random() * objects.length)]}`
    }

    if (structure < 0.6) {
      return `${modifiers[Math.floor(Math.random() * modifiers.length)]}，${subjects[Math.floor(Math.random() * subjects.length)]}迎来新发展`
    }

    return `${subjects[Math.floor(Math.random() * subjects.length)]}与${objects[Math.floor(Math.random() * objects.length)]}的${['融合', '碰撞', '协同', '博弈'][Math.floor(Math.random() * 4)]}`
  }

  let title = randomPart()
  while (title.length < 3 || title.length > 50) {
    title = randomPart()
  }

  return title
}

const generateBookmarks = () => {
  const data = {}
  const now = Date.now()

  for (let i = 0; i < generateCount; i++) {
    let domain

    if (domainPool.length < 20) {
      domain = generateDomain()
      domainPool.push(domain)
    } else {
      domain = domainPool[Math.floor(Math.random() * domainPool.length)]
    }

    const path = paths[Math.floor(Math.random() * paths.length)]
    const url = `https://${domain}/${path}-${Math.random().toString(36).slice(2, 7)}`

    const created = Math.max(
      now - Math.floor(Math.random() * 31_536_000_000),
      0
    ) // 确保不早于1970年
    const maxUpdate = Math.min(
      created + Math.floor(Math.random() * 2_592_000_000),
      now
    ) // 取当前时间和30天后的较小值
    const updated = Math.random() > 0.2 ? maxUpdate : created // 保持20%几率不更新

    // 新增随机标签生成函数
    const generateRandomTag = () => {
      const length = Math.floor(Math.random() * 10) + 1
      let tag = ''
      const chineseChars = [
        '技术',
        '设计',
        '商业',
        '生活',
        '娱乐',
        '教育',
        '健康',
        '旅游',
        '云',
        '端',
        '智能',
        '安全',
        '数据',
        '分析',
        '学习',
        '收藏',
      ]
      const englishParts = [
        'AI',
        'Cloud',
        'Data',
        'Tech',
        'Dev',
        'Net',
        'Sys',
        'Web',
        'App',
        'Mobile',
        'block',
        'test',
      ]

      for (let i = 0; i < length; i++) {
        tag +=
          Math.random() > 0.3
            ? chineseChars[Math.floor(Math.random() * chineseChars.length)]
            : englishParts[Math.floor(Math.random() * englishParts.length)]
      }

      return tag.slice(0, Math.max(0, length))
    }

    // 修改tags生成逻辑
    const tagCount = Math.floor(Math.random() * 5) + 1
    const uniqueTags = new Set()
    while (uniqueTags.size < tagCount) {
      uniqueTags.add(generateRandomTag())
    }

    const tags = Array.from(uniqueTags)

    data[url] = {
      tags,
      meta: {
        title: generateTitle(),
        created,
        updated,
      },
    }
  }

  return { data }
}

fs.writeFileSync('mock-data.json', JSON.stringify(generateBookmarks(), null, 2))
console.log(`成功生成${generateCount}条测试数据到 mock-data.json`)
