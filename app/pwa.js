(() => {
  'use strict'
  if (Boolean(window.__TAURI_INTERNALS__)) return

  document.documentElement.classList.add('web-mobile')
  const themeMeta = document.querySelector('meta[name="theme-color"]')
  if (themeMeta) themeMeta.setAttribute('content', '#0f766e')

  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
  if (standalone) document.documentElement.classList.add('pwa-standalone')

  const mobile = window.matchMedia?.('(max-width: 820px)')?.matches !== false
  const hasStoredSession = (() => {
    try {
      return Object.keys(localStorage).some(key => /^sb-.*-auth-token$/.test(key) && Boolean(localStorage.getItem(key)))
    } catch { return false }
  })()

  if (!hasStoredSession || !mobile) document.documentElement.classList.add('mobile-auth-ready')

  let splash = null
  const beginSessionGuard = () => {
    if (!hasStoredSession || !mobile) return
    document.documentElement.classList.add('session-checking')
    if (!document.querySelector('.medica-session-splash')) {
      splash = document.createElement('div')
      splash.className = 'medica-session-splash'
      splash.innerHTML = '<div class="medica-session-splash-inner"><img src="./medica-icon.svg" alt="Medica"><span class="medica-session-spinner"></span><span>جاري فتح Medica</span></div>'
      document.body.appendChild(splash)
    }
  }

  const finishSessionGuard = () => {
    document.documentElement.classList.remove('session-checking')
    document.querySelector('.medica-session-splash')?.remove()
    splash = null
  }

  const revealAuth = () => {
    document.documentElement.classList.add('mobile-auth-ready')
    finishSessionGuard()
  }

  const viewIsVisible = node => Boolean(node && !node.hidden && !node.classList.contains('hidden') && getComputedStyle(node).display !== 'none')

  function watchSessionRestore() {
    if (!hasStoredSession || !mobile) return
    const authView = document.getElementById('authView')
    const resolvedViews = ['staffApp','adminApp','onboardingView','blockedView'].map(id => document.getElementById(id)).filter(Boolean)

    const settleIfResolved = () => {
      const appView = resolvedViews.find(viewIsVisible)
      if (appView) {
        authView?.classList.add('hidden')
        finishSessionGuard()
        return true
      }
      return false
    }

    if (settleIfResolved()) return

    const observed = [authView, ...resolvedViews].filter(Boolean)
    const observer = new MutationObserver(records => {
      if (settleIfResolved()) {
        observer.disconnect()
        return
      }
      const authWasTouched = records.some(record => record.target === authView)
      if (authWasTouched && authView && !authView.classList.contains('hidden')) {
        observer.disconnect()
        revealAuth()
      }
    })
    observed.forEach(node => observer.observe(node, { attributes:true, attributeFilter:['class','style','hidden'] }))
    setTimeout(() => {
      observer.disconnect()
      if (authView && !authView.classList.contains('hidden')) revealAuth()
      else finishSessionGuard()
    }, 6500)
  }

  function installMobileClinicBrand() {
    if (!mobile) return

    document.querySelector('.mobile-clinic-brand')?.remove()

    const heroCopy = document.querySelector('#dashboard .dashboard-hero .hero-copy')
    const sourceLogo = document.getElementById('staffBrandLogo')
    const sourceName = document.getElementById('staffBrandName')
    const sourceSubtitle = document.getElementById('staffBrandSubtitle')
    if (!heroCopy || !sourceLogo || !sourceName) return

    let brand = heroCopy.querySelector('.mobile-hero-clinic-brand')
    if (!brand) {
      brand = document.createElement('div')
      brand.className = 'mobile-hero-clinic-brand'
      brand.innerHTML = '<img class="mobile-hero-clinic-logo" alt="شعار العيادة"><div class="mobile-hero-clinic-brand-copy"><strong></strong><small></small></div>'
      heroCopy.insertBefore(brand, heroCopy.firstChild)
    }

    const mobileLogo = brand.querySelector('img')
    const mobileName = brand.querySelector('strong')
    const mobileSubtitle = brand.querySelector('small')

    const syncBrand = () => {
      mobileLogo.src = sourceLogo.currentSrc || sourceLogo.getAttribute('src') || './medica-icon.svg'
      mobileName.textContent = sourceName.textContent?.trim() || 'Medica'
      mobileSubtitle.textContent = sourceSubtitle?.textContent?.trim() || 'إدارة العيادة'
    }

    if (!mobileLogo.dataset.fallbackBound) {
      mobileLogo.dataset.fallbackBound = '1'
      mobileLogo.addEventListener('error', () => {
        if (!mobileLogo.src.endsWith('/medica-icon.svg')) mobileLogo.src = './medica-icon.svg'
      })
    }

    syncBrand()

    if (!brand.dataset.syncBound) {
      brand.dataset.syncBound = '1'
      const observer = new MutationObserver(syncBrand)
      observer.observe(sourceLogo, { attributes:true, attributeFilter:['src'] })
      observer.observe(sourceName, { childList:true, subtree:true, characterData:true })
      if (sourceSubtitle) observer.observe(sourceSubtitle, { childList:true, subtree:true, characterData:true })
    }
  }

  function installMobileUtilities() {
    if (!mobile) return
    const staffApp = document.getElementById('staffApp')
    const topbarMeta = document.querySelector('#staffApp .topbar-meta')
    const logout = document.getElementById('staffLogout')
    const settingsTarget = document.querySelector('#staffMobileNav [data-staff-page="settings"]')

    installMobileClinicBrand()

    if (logout && topbarMeta && logout.parentElement !== topbarMeta) {
      logout.classList.add('mobile-header-logout')
      logout.classList.remove('w100')
      topbarMeta.appendChild(logout)
    }

    document.querySelector('.mobile-logout-shortcut')?.remove()

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
        const appHidden = !viewIsVisible(staffApp)
        settings.hidden = targetHidden || appHidden
      }
      syncSettings()
      const observer = new MutationObserver(syncSettings)
      observer.observe(settingsTarget, { attributes:true, attributeFilter:['class','style','hidden'] })
      if (staffApp) observer.observe(staffApp, { attributes:true, attributeFilter:['class','style','hidden'] })
    }
  }

  beginSessionGuard()

  const boot = () => {
    installMobileUtilities()
    watchSessionRestore()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true })
  else boot()
  window.addEventListener('load', installMobileUtilities, { once:true })

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js?v=17', { scope:'./' })
        registration.update().catch(() => undefined)
      } catch {}
    })
  }
})()
