import type { PlasmoCSConfig } from 'plasmo'

import { interceptShadowDOM } from '../modules/shadow-root'

export const config: PlasmoCSConfig = {
  run_at: 'document_start',
  matches: ['https://*/*', 'http://*/*'],
  all_frames: true,
  world: 'MAIN',
}

// For extension
interceptShadowDOM()
