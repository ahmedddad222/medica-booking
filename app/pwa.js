(() => {
  'use strict'
  if (Boolean(window.__TAURI_INTERNALS__)) return

  document.documentElement.classList.add('web-mobile')

  const themeMeta = document.querySelector('meta[name="theme-color"]')
  if (themeMeta) themeMeta.setAttribute('content', '#102a50')

  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
  if (standalone) document.documentElement.classList.add('pwa-standalone')

  function installSettingsShortcut() {
    const target = document.querySelector('#staffMobileNav [data-staff-page="settings"]')
    const staffApp = document.getElementById('staffApp')
    if (!target || document.querySelector('.mobile-settings-shortcut')) return

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'mobile-settings-shortcut'
    button.setAttribute('aria-label', 'الإعدادات')
    button.setAttribute('title', 'الإعدادات')
    button.textContent = 'الإعدادات'
    button.addEventListener('click', () => target.click())
    document.body.appendChild(button)

    const sync = () => {
      const targetHidden = target.hidden || target.classList.contains('hidden') || target.classList.contains('role-hidden') || target.classList.contains('feature-hidden') || getComputedStyle(target).display === 'none'
      const appHidden = !staffApp || staffApp.hidden || staffApp.classList.contains('hidden') || getComputedStyle(staffApp).display === 'none'
      button.hidden = targetHidden || appHidden
    }

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(target, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] })
    if (staffApp) observer.observe(staffApp, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installSettingsShortcut, { once: true })
  else installSettingsShortcut()
  window.addEventListener('load', installSettingsShortcut, { once: true })

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js?v=10', { scope: './' })
        registration.update().catch(() => undefined)
      } catch {}
    })
  }
})()
