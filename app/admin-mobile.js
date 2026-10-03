(() => {
  'use strict'

  const mobile = window.matchMedia?.('(max-width: 820px)')?.matches !== false
  if (!mobile) return

  function visible(el){
    return Boolean(el && !el.hidden && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none')
  }

  function icon(name){
    const icons={
      settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="M19 13.2v-2.4l-2-.7a7 7 0 0 0-.7-1.7l.9-1.9-1.7-1.7-1.9.9a7 7 0 0 0-1.7-.7L11.2 3H8.8l-.7 2a7 7 0 0 0-1.7.7l-1.9-.9-1.7 1.7.9 1.9A7 7 0 0 0 3 10.1l-2 .7v2.4l2 .7c.2.6.4 1.2.7 1.7l-.9 1.9 1.7 1.7 1.9-.9c.5.3 1.1.5 1.7.7l.7 2h2.4l.7-2c.6-.2 1.2-.4 1.7-.7l1.9.9 1.7-1.7-.9-1.9c.3-.5.5-1.1.7-1.7l2-.7Z"/></svg>',
      logout:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/></svg>',
      refresh:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>'
    }
    return icons[name]||''
  }

  function inject(){
    const app=document.getElementById('adminApp')
    const topbar=app?.querySelector('.topbar')
    const nav=document.getElementById('adminMobileNav')
    const logout=document.getElementById('adminLogout')
    const email=document.getElementById('adminEmail')
    if(!app || !topbar || !nav || !logout) return false
    if(app.dataset.mobilePremiumReady==='1') return true
    app.dataset.mobilePremiumReady='1'

    let actions=topbar.querySelector('.admin-mobile-header-actions')
    if(!actions){
      actions=document.createElement('div')
      actions.className='admin-mobile-header-actions'

      const settings=document.createElement('button')
      settings.type='button'
      settings.className='admin-mobile-icon-btn admin-settings-open'
      settings.setAttribute('aria-label','إعدادات الأدمن')
      settings.innerHTML=icon('settings')

      const logoutBtn=document.createElement('button')
      logoutBtn.type='button'
      logoutBtn.className='admin-mobile-icon-btn danger admin-mobile-logout'
      logoutBtn.setAttribute('aria-label','تسجيل الخروج')
      logoutBtn.innerHTML=icon('logout')
      logoutBtn.addEventListener('click',()=>logout.click())

      actions.append(settings,logoutBtn)
      topbar.appendChild(actions)
    }

    let settingsPage=document.getElementById('adminSettingsMobile')
    if(!settingsPage){
      settingsPage=document.createElement('section')
      settingsPage.id='adminSettingsMobile'
      settingsPage.className='page hidden admin-mobile-settings-page'
      settingsPage.innerHTML=`
        <div class="admin-settings-hero">
          <div class="admin-settings-icon">${icon('settings')}</div>
          <div><span>Medica Admin</span><h3>إعدادات الأدمن</h3><p>أدوات الحساب وإدارة الجلسة بدون تغيير إعدادات العيادات.</p></div>
        </div>
        <div class="admin-settings-grid">
          <div class="admin-settings-card">
            <span class="admin-settings-label">حساب الأدمن</span>
            <strong id="adminSettingsEmail">—</strong>
            <small>Super Admin</small>
          </div>
          <button id="adminSettingsRefresh" class="admin-settings-action" type="button">
            <span class="admin-settings-action-icon">${icon('refresh')}</span>
            <span><strong>تحديث بيانات اللوحة</strong><small>إعادة تحميل العيادات والحسابات والسجل</small></span>
          </button>
          <button id="adminSettingsLogout" class="admin-settings-action danger" type="button">
            <span class="admin-settings-action-icon">${icon('logout')}</span>
            <span><strong>تسجيل الخروج</strong><small>إنهاء جلسة الأدمن على هذا الجهاز</small></span>
          </button>
        </div>
      `
      app.querySelector('main.main')?.appendChild(settingsPage)
    }

    let settingsNav=nav.querySelector('.admin-settings-nav')
    if(!settingsNav){
      settingsNav=document.createElement('button')
      settingsNav.type='button'
      settingsNav.className='admin-settings-nav'
      settingsNav.innerHTML='<span class="admin-nav-icon">'+icon('settings')+'</span><span>الإعدادات</span>'
      nav.appendChild(settingsNav)
    }

    const title=document.getElementById('adminPageTitle')
    const openSettings=()=>{
      app.querySelectorAll('main.main > .page').forEach(page=>page.classList.add('hidden'))
      settingsPage.classList.remove('hidden')
      nav.querySelectorAll('button').forEach(btn=>btn.classList.remove('active'))
      settingsNav.classList.add('active')
      if(title) title.textContent='الإعدادات'
      const emailTarget=document.getElementById('adminSettingsEmail')
      if(emailTarget) emailTarget.textContent=email?.textContent?.trim() || 'Super Admin'
      window.scrollTo({top:0,behavior:'smooth'})
    }

    actions.querySelector('.admin-settings-open')?.addEventListener('click',openSettings)
    settingsNav.addEventListener('click',openSettings)
    document.getElementById('adminSettingsRefresh')?.addEventListener('click',()=>document.getElementById('adminRefresh')?.click())
    document.getElementById('adminSettingsLogout')?.addEventListener('click',()=>logout.click())

    nav.querySelectorAll('[data-admin-page],.admin-audit-nav').forEach(btn=>{
      btn.addEventListener('click',()=>{
        settingsPage.classList.add('hidden')
        settingsNav.classList.remove('active')
      })
    })

    // Add compact icons to the original mobile destinations without changing navigation logic.
    const iconMap={
      adminDashboard:'<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>',
      adminClinics:'<svg viewBox="0 0 24 24"><path d="M5 20V7l7-3 7 3v13"/><path d="M9 10h6M9 14h6M9 18h6"/></svg>',
      adminCreate:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
    }
    nav.querySelectorAll('[data-admin-page]').forEach(btn=>{
      if(btn.querySelector('.admin-nav-icon')) return
      const key=btn.dataset.adminPage
      const label=btn.textContent.trim()
      btn.innerHTML='<span class="admin-nav-icon">'+(iconMap[key]||'')+'</span><span>'+label+'</span>'
    })

    // Audit button is injected later; keep it visually consistent when it appears.
    const observer=new MutationObserver(()=>{
      const auditBtn=nav.querySelector('.admin-audit-nav')
      if(auditBtn && !auditBtn.querySelector('.admin-nav-icon')){
        const label=auditBtn.textContent.trim() || 'السجل'
        auditBtn.innerHTML='<span class="admin-nav-icon"><svg viewBox="0 0 24 24"><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg></span><span>'+label+'</span>'
        auditBtn.addEventListener('click',()=>settingsPage.classList.add('hidden'))
      }
    })
    observer.observe(nav,{childList:true,subtree:true})

    // Never show mobile admin controls while another app view is active.
    const sync=()=>{
      actions.hidden=!visible(app)
      nav.classList.toggle('admin-mobile-ready',visible(app))
    }
    sync()
    new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class','style','hidden']})
    return true
  }

  function boot(){
    if(inject()) return
    let tries=0
    const timer=setInterval(()=>{if(inject()||++tries>40)clearInterval(timer)},250)
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true})
  else boot()
})()
