(() => {
  'use strict'
  if (Boolean(window.__TAURI_INTERNALS__)) return

  document.documentElement.classList.add('web-mobile')

  const themeMeta = document.querySelector('meta[name="theme-color"]')
  if (themeMeta) themeMeta.setAttribute('content', '#0b1e38')

  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
  if (standalone) document.documentElement.classList.add('pwa-standalone')

  function installMobileShortcuts() {
    const staffApp = document.getElementById('staffApp')
    const settingsTarget = document.querySelector('#staffMobileNav [data-staff-page="settings"]')
    const logoutTarget = document.getElementById('staffLogout')

    if (settingsTarget && !document.querySelector('.mobile-settings-shortcut')) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'mobile-settings-shortcut'
      button.setAttribute('aria-label', 'الإعدادات')
      button.setAttribute('title', 'الإعدادات')
      button.textContent = 'الإعدادات'
      button.addEventListener('click', () => settingsTarget.click())
      document.body.appendChild(button)

      const syncSettings = () => {
        const appHidden = !staffApp || staffApp.hidden || staffApp.classList.contains('hidden') || getComputedStyle(staffApp).display === 'none'
        const targetHidden = settingsTarget.hidden || settingsTarget.classList.contains('hidden') || settingsTarget.classList.contains('role-hidden') || settingsTarget.classList.contains('feature-hidden')
        button.hidden = appHidden || targetHidden
      }
      syncSettings()
      const observer = new MutationObserver(syncSettings)
      observer.observe(settingsTarget, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] })
      if (staffApp) observer.observe(staffApp, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] })
    }

    if (logoutTarget && !document.querySelector('.mobile-logout-shortcut')) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'mobile-logout-shortcut'
      button.setAttribute('aria-label', 'تسجيل الخروج')
      button.setAttribute('title', 'تسجيل الخروج')
      button.textContent = 'تسجيل الخروج'
      button.addEventListener('click', () => logoutTarget.click())
      document.body.appendChild(button)

      const syncLogout = () => {
        const appHidden = !staffApp || staffApp.hidden || staffApp.classList.contains('hidden') || getComputedStyle(staffApp).display === 'none'
        button.hidden = appHidden
      }
      syncLogout()
      if (staffApp) {
        const observer = new MutationObserver(syncLogout)
        observer.observe(staffApp, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] })
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installMobileShortcuts, { once: true })
  else installMobileShortcuts()
  window.addEventListener('load', installMobileShortcuts, { once: true })

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js?v=11', { scope: './' })
        registration.update().catch(() => undefined)
      } catch {}
    })
  }
})()
