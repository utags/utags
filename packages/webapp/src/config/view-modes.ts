export const viewModes = [
  { value: 'list', label: '列表' },
  { value: 'compact', label: '紧凑' },
  // { value: 'compact2', label: '紧凑 2' },
  { value: 'simple', label: '极简 (linkding)' },
  { value: 'simple2', label: '极简 (lobsters)' },
  // { value: 'simple3', label: '极简 3' },
  // { value: 'simple4', label: '极简 4' },
  // 表格视图/Excel 视图: 标题，描述，备注，标签，网址，创建时间，更新时间
] as const

export type ViewMode = (typeof viewModes)[number]['value']
