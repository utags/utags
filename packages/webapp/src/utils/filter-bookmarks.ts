import Console from 'console-tagger'
import type { BookmarkKeyValuePair } from '../types/bookmarks.js'
import { defaultFilterRegistry } from './filter-registry.js'
import { createTimeCondition } from './filters/time-filter.js'
import { createNoteCondition } from './filters/note-filter.js'
import { createTagFilterCondition } from './filters/tag-filter.js'
import { createDomainFilterCondition } from './filters/domain-filter.js'
import { createQueryFilterCondition } from './filters/query-filter.js'

const console = new Console({
  prefix: 'filter-bookmarks',
  color: { line: 'black', background: 'yellow' },
})

defaultFilterRegistry
  .register('time', createTimeCondition)
  .register('has_note', createNoteCondition)
  .register('t', createTagFilterCondition)
  .register('d', createDomainFilterCondition)
  .register('q', createQueryFilterCondition)

export function filterBookmarksByUrlParams(
  entries: BookmarkKeyValuePair[],
  searchParams: string | URLSearchParams
) {
  console.log(
    'filterBookmarksByUrlParams',
    decodeURIComponent(searchParams.toString())
  )
  return defaultFilterRegistry.apply(entries, searchParams)
}

// /#sb/linux.do#block/linux.do
// /?time=created&period=1m#sb/linux.do#block/linux.do
// /?filter=has_note#sb/linux.do#block/linux.do
// /?filter=has_note&time=created&period=1m#sb/linux.do#block/linux.do
// /?filter=sb/linux.do&filter=block/linux.do#sb/linux.do#block/linux.do
// /?filter=has_note&filter=sb/linux.do&filter=block/linux.do#sb/linux.do#block/linux.do
// /?filter=has_note&filter=sb/linux.do&filter=block/linux.do&time=created&period=1m#sb/linux.do#block/linux.do
// time=created&period=1m
// filter=sb/linux.do
// filter=has_note
// filter=has_highlight
// filter=is_hidden
// filter=is_article
// filter=is_video
// filter=is_audio
// filter=is_image
// filter=is_file
// filter=is_folder
// filter=is_archived
// filter=is_deleted
// filter=is_synced
// filter=is_unsynced
// source=default
// source=shared/1234
// source=deleted
// source=imported
// source=synced
// filter=!tag1,tag2

// test cases
// ?q=ab&q=12&q=AB,ab,cc&cc,ab => ?q=ab&q=12&q=ab,cc
// ?q=ab&q=12&q=AB => ?q=ab&q=12
