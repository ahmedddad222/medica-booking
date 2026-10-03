(() => {
  'use strict'

  const SUPABASE_URL = 'https://kpnlechlpdpoivrafehl.supabase.co'
  const SUPABASE_KEY = 'sb_publishable_oeM2jjHRBJuejkd34nY4-A_G8s_GwYb'
  let openedSent = false
  let heartbeatTimer = null
  let retryTimer = null

  function sessionToken(){
    try{
      const keys = Object.keys(localStorage).filter(k => /^sb-.*-auth-token$/.test(k))
      for(const key of keys){
        const raw = localStorage.getItem(key)
        if(!raw) continue
        const parsed = JSON.parse(raw)
        const token = parsed?.access_token || parsed?.currentSession?.access_token || (Array.isArray(parsed) ? parsed[0]?.access_token : '')
        if(token) return token
      }
    }catch{}
    return ''
  }

  function staffVisible(){
    const el=document.getElementById('staffApp')
    return Boolean(el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none')
  }

  function currentPage(){
    const page=document.querySelector('#staffApp .page:not(.hidden)')
    return page?.id || 'staff'
  }

  function clientType(){
    if(window.__TAURI_INTERNALS__) return 'desktop-app'
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
    const mobile = window.matchMedia?.('(max-width: 820px)')?.matches
    if(mobile && standalone) return 'mobile-pwa'
    if(mobile) return 'mobile-web'
    return 'desktop-web'
  }

  async function touchPresence(){
    if(document.hidden || !staffVisible()) return false
    const token=sessionToken()
    if(!token) return false
    try{
      const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/touch_medica_presence`,{
        method:'POST',
        headers:{
          apikey:SUPABASE_KEY,
          Authorization:`Bearer ${token}`,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          p_client_type:clientType(),
          p_page:currentPage(),
          p_open:!openedSent
        }),
        keepalive:true
      })
      if(res.ok){
        openedSent=true
        return true
      }
    }catch{}
    return false
  }

  function schedule(){
    clearInterval(heartbeatTimer)
    heartbeatTimer=setInterval(touchPresence,45000)
    clearInterval(retryTimer)
    retryTimer=setInterval(()=>{
      if(!openedSent) touchPresence()
    },8000)
  }

  function boot(){
    setTimeout(touchPresence,1200)
    schedule()
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) touchPresence() })
    window.addEventListener('focus',touchPresence)
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('[data-staff-page],[data-staff-goto]')) setTimeout(touchPresence,600)
    },true)
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true})
  else boot()
})()
