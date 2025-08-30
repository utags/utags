export const mergeMetaOptions = [
  { value: 'local', label: '保留本地数据' },
  { value: 'remote', label: '使用远程/导入数据' },
  { value: 'newer', label: '使用最近更新的数据' },
  { value: 'merge', label: '合并所有字段' },
] as const

export const mergeTagsOptions = [
  { value: 'local', label: '保留本地标签' },
  { value: 'remote', label: '使用远程/导入标签' },
  { value: 'newer', label: '使用最近更新的标签' },
  { value: 'union', label: '合并所有标签' },
] as const

export type MergeMetaStrategy = (typeof mergeMetaOptions)[number]['value']
export type MergeTagsStrategy = (typeof mergeTagsOptions)[number]['value']
