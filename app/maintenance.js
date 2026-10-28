(() => {
  'use strict'

  const SUPABASE_URL = 'https://kpnlechlpdpoivrafehl.supabase.co'
  const API_KEY = 'sb_publishable_oeM2jjHRBJuejkd34nY4-A_G8s_GwYb'
  const DEFAULT_MESSAGE = 'المنصة تحت الصيانة حالياً. سنعود للعمل قريباً.'
  let current = { maintenance_mode:false, maintenance_message:DEFAULT_MESSAGE, updated_at:null }
  let maintenanceBlocked = false
  let busy = false

  const $ = id => document.getElementById(id)
  const visible = el => Boolean(el && !el.hidden && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none')

  function accessToken() {
    try {
      for (const key of Object.keys(localStorage)) {
        if (!/^sb-.*-auth-token$/.test(key)) continue
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        const token = parsed?.access_token || parsed?.currentSession?.access_token
        if (token) return token
      }
    } catch {}
    return ''
  }

  async function api(method='GET', body=null) {
    const token = accessToken()
    if (!token) return null
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/platform_settings?id=eq.1&select=maintenance_mode,maintenance_message,updated_at',
      {
        method,
        cache:'no-store',
        headers:{
          apikey:API_KEY,
          authorization:'Bearer ' + token,
          'content-type':'application/json',
          accept:'application/json',
          prefer:'return=representation',
        },
        body:body ? JSON.stringify(body) : undefined,
      }
    )
    if (!response.ok) throw new Error('maintenance_request_failed_' + response.status)
    const rows = await response.json()
    return Array.isArray(rows) ? rows[0] || null : rows
  }

  function normalize(row={}) {
    return {
      maintenance_mode:Boolean(row.maintenance_mode),
      maintenance_message:String(row.maintenance_message || DEFAULT_MESSAGE).trim().slice(0,240) || DEFAULT_MESSAGE,
      updated_at:row.updated_at || null,
    }
  }

  function renderAdmin() {
    const panel=$('adminMaintenancePanel'), badge=$('adminMaintenanceBadge'), button=$('adminMaintenanceToggle'), input=$('adminMaintenanceMessage'), updated=$('adminMaintenanceUpdated')
    if (!panel || !badge || !button || !input) return
    panel.classList.toggle('maintenance-active',current.maintenance_mode)
    badge.className='badge ' + (current.maintenance_mode ? 'bad' : 'ok')
    badge.textContent=current.maintenance_mode ? 'الصيانة مفعلة' : 'المنصة تعمل'
    if (document.activeElement !== input) input.value=current.maintenance_message
    button.className='btn ' + (current.maintenance_mode ? 'primary' : 'danger')
    button.textContent=current.maintenance_mode ? 'إنهاء الصيانة وتشغيل المنصة' : 'تفعيل وضع الصيانة'
    if (updated) updated.textContent=current.updated_at ? 'آخر تحديث: ' + new Date(current.updated_at).toLocaleString('ar-IQ') : ''
  }

  function blockUsers() {
    const admin=$('adminApp')
    if (visible(admin)) return
    const staff=$('staffApp'), onboarding=$('onboardingView')
    if (!visible(staff) && !visible(onboarding) && !maintenanceBlocked) return
    const title=$('blockedTitle'), text=$('blockedText'), blocked=$('blockedView')
    if (!title || !text || !blocked) return
    ;['authView','onboardingView','adminApp','staffApp'].forEach(id => $(id)?.classList.add('hidden'))
    title.textContent='المنصة تحت الصيانة'
    text.textContent=current.maintenance_message + ' الحجز الإلكتروني للمرضى مستمر بالعمل بشكل طبيعي.'
    blocked.classList.remove('hidden')
    blocked.dataset.maintenance='1'
    maintenanceBlocked=true
  }

  async function poll() {
    if (busy || !accessToken()) return
    busy=true
    try {
      const row=await api('GET')
      if (!row) return
      const wasActive=current.maintenance_mode
      current=normalize(row)
      renderAdmin()
      if (current.maintenance_mode) blockUsers()
      else if ((maintenanceBlocked || wasActive) && $('blockedView')?.dataset.maintenance === '1') {
        location.reload()
      }
    } catch {} finally { busy=false }
  }

  async function toggle() {
    const button=$('adminMaintenanceToggle')
    if (!button || !visible($('adminApp'))) return
    const enabling=!current.maintenance_mode
    const message=String($('adminMaintenanceMessage')?.value || DEFAULT_MESSAGE).trim().slice(0,240) || DEFAULT_MESSAGE
    const prompt=enabling
      ? 'سيتم إيقاف تطبيق Medica لدى الأطباء والسكرتارية، بينما يبقى الحجز الإلكتروني يعمل. هل تريد التفعيل؟'
      : 'هل تريد إنهاء الصيانة وتشغيل المنصة للمستخدمين؟'
    if (!confirm(prompt)) return
    button.disabled=true
    try {
      const row=await api('PATCH',{
        maintenance_mode:enabling,
        maintenance_message:message,
        updated_at:new Date().toISOString(),
      })
      current=normalize(row || {maintenance_mode:enabling,maintenance_message:message})
      renderAdmin()
    } catch {
      alert('تعذر تغيير وضع الصيانة. أعد المحاولة.')
    } finally { button.disabled=false }
  }

  function bind() {
    $('adminMaintenanceToggle')?.addEventListener('click',toggle)
    poll()
    const observer=new MutationObserver(() => poll())
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','hidden']})
    setInterval(() => { if (!document.hidden) poll() },10000)
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden)poll() })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',bind,{once:true})
  else bind()
})()
