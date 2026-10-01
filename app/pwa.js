(() => {
  'use strict'
  if (Boolean(window.__TAURI_INTERNALS__)) return

  document.documentElement.classList.add('web-mobile')

  const themeMeta = document.querySelector('meta[name="theme-color"]')
  if (themeMeta) themeMeta.setAttribute('content', '#0e9384')

  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
  if (standalone) document.documentElement.classList.add('pwa-standalone')

  const hasStoredSession = (() => {
    try {
      return Object.keys(localStorage).some(key => /^sb-.*-auth-token$/.test(key) && Boolean(localStorage.getItem(key)))
    } catch { return false }
  })()

  let splash = null
  if (hasStoredSession) {
    document.documentElement.classList.add('session-checking')
    splash = document.createElement('div')
    splash.className = 'medica-session-splash'
    splash.innerHTML = '<div><img src="./medica-icon.svg" alt="Medica"><i></i><span>جاري استعادة الجلسة</span></div>'
    document.body.appendChild(splash)
  }

  const finishSessionCheck = () => {
    document.documentElement.classList.remove('session-checking')
    splash?.remove()
    splash = null
  }

  function installUtilities() {
    const staffApp = document.getElementById('staffApp')
    const settingsTarget = document.querySelector('#staffMobileNav [data-staff-page="settings"]')
    const logoutTarget = document.getElementById('staffLogout')
    const topbarMeta = document.querySelector('#staffApp .topbar-meta')

    if (settingsTarget && !document.querySelector('.mobile-settings-shortcut')) {
      const settings = document.createElement('button')
      settings.type = 'button'
      settings.className = 'mobile-settings-shortcut'
      settings.setAttribute('aria-label', 'الإعدادات')
      settings.setAttribute('title', 'الإعدادات')
      settings.textContent = 'الإعدادات'
      settings.addEventListener('click', () => settingsTarget.click())
      document.body.appendChild(settings)

      const syncSettings = () => {
        const targetHidden = settingsTarget.hidden || settingsTarget.classList.contains('hidden') || settingsTarget.classList.contains('role-hidden') || settingsTarget.classList.contains('feature-hidden') || getComputedStyle(settingsTarget).display === 'none'
        const appHidden = !staffApp || staffApp.hidden || staffApp.classList.contains('hidden') || getComputedStyle(staffApp).display === 'none'
        settings.hidden = targetHidden || appHidden
      }
      syncSettings()
      const observer = new MutationObserver(syncSettings)
      observer.observe(settingsTarget, { attributes: true, attributeFilter: ['class','style','hidden'] })
      if (staffApp) observer.observe(staffApp, { attributes: true, attributeFilter: ['class','style','hidden'] })
    }

    if (logoutTarget && topbarMeta && !document.querySelector('.mobile-header-logout')) {
      document.querySelector('.mobile-logout-shortcut')?.remove()
      const logout = document.createElement('button')
      logout.type = 'button'
      logout.className = 'mobile-header-logout'
      logout.setAttribute('aria-label', 'تسجيل الخروج')
      logout.setAttribute('title', 'تسجيل الخروج')
      logout.textContent = 'تسجيل الخروج'
      logout.addEventListener('click', () => logoutTarget.click())
      topbarMeta.appendChild(logout)
    }
  }

  function watchSessionRestore() {
    if (!hasStoredSession) return
    const ids = ['authView','blockedView','onboardingView','adminApp','staffApp']
    const nodes = ids.map(id => document.getElementById(id)).filter(Boolean)
    const observer = new MutationObserver(() => {
      const visible = nodes.find(node => !node.hidden && !node.classList.contains('hidden') && getComputedStyle(node).display !== 'none')
      if (visible) {
        observer.disconnect()
        finishSessionCheck()
      }
    })
    nodes.forEach(node => observer.observe(node, { attributes:true, attributeFilter:['class','style','hidden'] }))
    setTimeout(() => { observer.disconnect(); finishSessionCheck() }, 8000)
  }

  const boot = () => { installUtilities(); watchSessionRestore() }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true })
  else boot()
  window.addEventListener('load', installUtilities, { once:true })

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js?v=12', { scope:'./' })
        registration.update().catch(() => undefined)
      } catch {}
    })
  }
})()
