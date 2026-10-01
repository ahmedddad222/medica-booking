(() => {
  'use strict'

  const isTauri = Boolean(window.__TAURI_INTERNALS__)
  if (isTauri) return

  document.documentElement.classList.add('web-mobile')

  const styleVersion = '20261001-v3'
  const ensureMobileStyle = () => {
    let link = document.getElementById('medicaMobileV3')
    if (!link) {
      link = document.createElement('link')
      link.id = 'medicaMobileV3'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    const href = `./mobile-v3.css?v=${styleVersion}`
    if (!link.href.includes(`mobile-v3.css?v=${styleVersion}`)) link.href = href
  }
  ensureMobileStyle()

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js?v=3', { scope: './' })
        registration.update().catch(() => undefined)
      } catch {}
    })
  }

  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
  if (standalone) document.documentElement.classList.add('pwa-standalone')

  let installPrompt = null

  const makeButton = (id, text, className = '') => {
    const button = document.createElement('button')
    button.type = 'button'
    button.id = id
    button.className = className
    button.textContent = text
    return button
  }

  function ensureMobileTools() {
    ensureMobileStyle()
    const staffApp = document.getElementById('staffApp')
    if (!staffApp || staffApp.classList.contains('hidden')) return
    const topbar = staffApp.querySelector('.premium-topbar, .topbar')
    if (!topbar) return

    let tools = topbar.querySelector('.mobile-web-tools')
    if (!tools) {
      tools = document.createElement('div')
      tools.className = 'mobile-web-tools'

      const logout = makeButton('mobileWebLogout', 'خروج', 'mobile-web-tool mobile-web-logout')
      logout.setAttribute('aria-label', 'تسجيل الخروج')
      logout.addEventListener('click', () => document.getElementById('staffLogout')?.click())
      tools.appendChild(logout)

      if (!standalone) {
        const install = makeButton('mobileWebInstall', 'تثبيت', 'mobile-web-tool mobile-web-install')
        install.hidden = !installPrompt
        install.setAttribute('aria-label', 'تثبيت Medica على الجهاز')
        install.addEventListener('click', async () => {
          if (installPrompt) {
            installPrompt.prompt()
            try { await installPrompt.userChoice } catch {}
            installPrompt = null
            install.hidden = true
            return
          }
          showInstallHelp()
        })
        tools.appendChild(install)
      }

      topbar.appendChild(tools)
    }
  }

  function showInstallHelp() {
    if (document.getElementById('medicaInstallHelp')) return
    const box = document.createElement('div')
    box.id = 'medicaInstallHelp'
    box.className = 'medica-install-help'
    box.innerHTML = `
      <div class="medica-install-help-card" role="dialog" aria-modal="true" aria-label="تثبيت Medica">
        <button type="button" class="medica-install-close" aria-label="إغلاق">×</button>
        <img src="./medica-icon.svg" alt="Medica" />
        <strong>ثبّت Medica على الموبايل</strong>
        <p>على iPhone: افتح زر المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية».</p>
        <p>على Android: من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p>
      </div>`
    box.querySelector('.medica-install-close').addEventListener('click', () => box.remove())
    box.addEventListener('click', e => { if (e.target === box) box.remove() })
    document.body.appendChild(box)
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    installPrompt = event
    ensureMobileTools()
    const button = document.getElementById('mobileWebInstall')
    if (button) button.hidden = false
  })

  window.addEventListener('appinstalled', () => {
    installPrompt = null
    document.documentElement.classList.add('pwa-standalone')
    const button = document.getElementById('mobileWebInstall')
    if (button) button.remove()
  })

  const observer = new MutationObserver(() => ensureMobileTools())

  window.addEventListener('DOMContentLoaded', () => {
    ensureMobileStyle()
    ensureMobileTools()
    observer.observe(document.body, { attributes: true, childList: true, subtree: true })
  })
})()
