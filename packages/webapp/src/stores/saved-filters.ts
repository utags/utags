import { persisted, type Persisted } from 'svelte-persisted-store'
import { STORAGE_KEY_FILTERS } from '../config/constants.js'

export type Filter = {
  id: string
  name: string
  description: string
  filterString: string
  created: number
  updated: number
}

export const filters: Persisted<Filter[]> = persisted(STORAGE_KEY_FILTERS, [])
