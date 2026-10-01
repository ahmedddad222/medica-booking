(() => {
  'use strict'

  const isTauri = Boolean(window.__TAURI_INTERNALS__)
  if (isTauri) return

  document.documentElement.classList.add('web-mobile')

  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
  if (standalone) document.documentElement.classList.add('pwa-standalone')

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js?v=4', { scope: './' })
        registration.update().catch(() => undefined)
      } catch {}
    })
  }
})()
