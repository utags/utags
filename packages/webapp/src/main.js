import { mount } from 'svelte'
import App from './App.svelte'
import './tailwind.css'

if (globalThis.structuredClone === undefined) {
  // eslint-disable-next-line unicorn/prefer-structured-clone
  globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val))
}

// 初始化Google Analytics
globalThis.gtag('config', 'G-7FV6Z2SXHE', {
  // eslint-disable-next-line camelcase
  page_path: globalThis.location.pathname,
  // eslint-disable-next-line camelcase
  send_page_view: true,
})

const app = mount(App, { target: document.querySelector('#app') })

export default app

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(() => console.log('SW registration failed'))
  })
}
