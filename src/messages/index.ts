import { initI18n } from 'browser-extension-i18n'

import messagesEn from './en'
import messagesRu from './ru'
import messagesZh from './zh-cn'

export const i = initI18n({
  'en,en-US': messagesEn,
  'zh,zh-CN': messagesZh,
  'ru,ru-RU': messagesRu,
})
