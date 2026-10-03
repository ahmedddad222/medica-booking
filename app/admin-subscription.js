(() => {
  'use strict'

  const SUPABASE_URL='https://kpnlechlpdpoivrafehl.supabase.co'
  const SUPABASE_KEY='sb_publishable_oeM2jjHRBJuejkd34nY4-A_G8s_GwYb'
  let clinicMap=new Map()
  let loading=null
  let lastLoaded=0
  let guardBusy=false
  let guardTimer=null

  function token(){
    try{
      for(const key of Object.keys(localStorage).filter(k=>/^sb-.*-auth-token$/.test(k))){
        const raw=localStorage.getItem(key)
        if(!raw) continue
        const parsed=JSON.parse(raw)
        const t=parsed?.access_token||parsed?.currentSession?.access_token||(Array.isArray(parsed)?parsed[0]?.access_token:'')
        if(t) return t
      }
    }catch{}
    return ''
  }

  async function callAdmin(action,payload={}){
    const access=token()
    if(!access) throw new Error('تعذر قراءة جلسة الأدمن. أعد تسجيل الدخول.')
    const res=await fetch(`${SUPABASE_URL}/functions/v1/admin-api`,{
      method:'POST',
      headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${access}`,'Content-Type':'application/json'},
      body:JSON.stringify({action,...payload}),
      cache:'no-store'
    })
    const data=await res.json().catch(()=>({}))
    if(!res.ok||data?.error) throw new Error(data?.error||`فشل الطلب (${res.status})`)
    return data
  }

  function fmt(value){
    if(!value) return '—'
    try{
      return new Date(value).toLocaleDateString('ar-IQ',{
        timeZone:'Asia/Baghdad',year:'numeric',month:'long',day:'numeric'
      })
    }catch{return String(value)}
  }

  function daysLeft(value){
    if(!value) return null
    const diff=new Date(value).getTime()-Date.now()
    return Math.ceil(diff/86400000)
  }

  function modeLabel(mode){
    return mode==='annual'?'سنوي':mode==='trial'?'تجريبي':'دائم'
  }

  function modeClass(mode){
    return mode==='annual'?'annual':mode==='trial'?'trial':'permanent'
  }

  function injectStyles(){
    if(document.getElementById('adminSubscriptionStyles')) return
    const s=document.createElement('style')
    s.id='adminSubscriptionStyles'
    s.textContent=`
      #adminApp .admin-subscription-box{margin:12px 0 4px;padding:13px 14px;border:1px solid #dfe7f0;border-radius:16px;background:linear-gradient(180deg,#fbfdff,#f7faff)}
      #adminApp .admin-subscription-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
      #adminApp .admin-subscription-title{display:grid;gap:4px}
      #adminApp .admin-subscription-title strong{font-size:12px;color:#334155}
      #adminApp .admin-subscription-title small{font-size:10.5px;color:#64748b;line-height:1.5}
      #adminApp .admin-subscription-badge{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:900;white-space:nowrap;border:1px solid transparent}
      #adminApp .admin-subscription-badge.annual{background:#eef2ff;color:#4338ca;border-color:#dfe3ff}
      #adminApp .admin-subscription-badge.permanent{background:#ecfdf5;color:#047857;border-color:#d1fae5}
      #adminApp .admin-subscription-badge.trial{background:#fff7ed;color:#c2410c;border-color:#fed7aa}
      #adminApp .admin-subscription-expired{color:#b42335!important;font-weight:850}
      #adminApp .admin-subscription-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}
      #adminApp .admin-subscription-actions button{min-height:34px;padding:7px 10px;border-radius:10px;border:1px solid #dce5ef;background:#fff;color:#334155;font:inherit;font-size:10.5px;font-weight:850;cursor:pointer}
      #adminApp .admin-subscription-actions button.active{background:#0f172a;color:#fff;border-color:#0f172a}
      #adminApp .admin-subscription-actions .renew{background:#eef2ff;color:#4338ca;border-color:#dfe3ff}
      #adminApp .admin-subscription-actions button:disabled{opacity:.55;cursor:not-allowed}
      #adminApp .admin-annual-stat{background:linear-gradient(180deg,#fff,#f7f7ff)!important}
      #adminApp .admin-annual-stat::before{background:#6366f1!important;box-shadow:0 0 0 5px #eef2ff!important}
      #adminApp .admin-annual-stat::after{background:#eef2ff!important}
      #adminApp .admin-expiry-inline{font-size:10.5px;color:#64748b}
      #adminApp .admin-expiry-inline.expired{color:#b42335;font-weight:850}
      .admin-subscription-toast{position:fixed;left:16px;bottom:102px;z-index:13000;max-width:min(420px,calc(100vw - 32px));padding:12px 14px;border-radius:14px;background:#0f172a;color:#fff;font-size:12px;line-height:1.6;box-shadow:0 16px 40px rgba(15,23,42,.24)}
      @media(max-width:820px){
        html.web-mobile #adminApp .admin-subscription-box{border-radius:18px;padding:12px}
        html.web-mobile #adminApp .admin-subscription-head{align-items:center}
        html.web-mobile #adminApp .admin-subscription-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
        html.web-mobile #adminApp .admin-subscription-actions button{width:100%;min-height:40px}
        html.web-mobile #adminApp .admin-subscription-actions .renew{grid-column:1/-1}
      }
    `
    document.head.appendChild(s)
  }

  function toast(text){
    document.querySelector('.admin-subscription-toast')?.remove()
    const el=document.createElement('div')
    el.className='admin-subscription-toast'
    el.textContent=text
    document.body.appendChild(el)
    setTimeout(()=>el.remove(),4200)
  }

  function ensureCreateOption(){
    const select=document.getElementById('createAccountMode')
    if(!select || select.querySelector('option[value="annual"]')) return
    const option=document.createElement('option')
    option.value='annual'
    option.textContent='سنوي — سنة واحدة'
    const permanent=select.querySelector('option[value="permanent"]')
    if(permanent?.nextSibling) select.insertBefore(option,permanent.nextSibling)
    else select.appendChild(option)
  }

  async function loadDashboard(force=false){
    if(!force && clinicMap.size && Date.now()-lastLoaded<15000) return clinicMap
    if(loading) return loading
    loading=(async()=>{
      const data=await callAdmin('dashboard')
      clinicMap=new Map((data?.clinics||[]).map(c=>[String(c.id),c]))
      lastLoaded=Date.now()
      updateAnnualStat()
      return clinicMap
    })().finally(()=>{loading=null})
    return loading
  }

  function updateAnnualStat(){
    const grid=document.querySelector('#adminDashboard .grid-cards')
    if(!grid) return
    let stat=document.getElementById('adminAnnualCount')
    if(!stat){
      stat=document.createElement('div')
      stat.className='stat admin-annual-stat'
      stat.innerHTML='<span>اشتراكات سنوية</span><strong id="adminAnnualCountValue">0</strong>'
      grid.appendChild(stat)
    }
    const annual=[...clinicMap.values()].filter(c=>(c.account_mode||'permanent')==='annual')
    const target=document.getElementById('adminAnnualCountValue')
    if(target) target.textContent=String(annual.length)
  }

  function correctOriginalBadge(container,clinic){
    const title=container.querySelector('h3,.item-title')
    if(!title) return
    const badges=[...title.querySelectorAll('.badge')]
    const accountBadge=badges.find(b=>['دائم','تجريبي','سنوي'].includes((b.textContent||'').trim()))
    if(!accountBadge) return
    accountBadge.textContent=modeLabel(clinic.account_mode||'permanent')
    accountBadge.classList.remove('warn','brand')
    if(clinic.account_mode==='trial') accountBadge.classList.add('warn')
    else accountBadge.classList.add('brand')
  }

  function subscriptionSummary(clinic){
    const mode=clinic.account_mode||'permanent'
    if(mode!=='annual') return mode==='trial'?'حساب تجريبي بدون مدة سنوية':'صلاحية دائمة بدون تاريخ انتهاء'
    const days=daysLeft(clinic.subscription_expires_at)
    if(days===null) return 'لم يتم تحديد تاريخ الانتهاء بعد'
    if(days<0) return `انتهى بتاريخ ${fmt(clinic.subscription_expires_at)}`
    if(days===0) return `ينتهي اليوم — ${fmt(clinic.subscription_expires_at)}`
    return `ينتهي ${fmt(clinic.subscription_expires_at)} — متبقي ${days} يوم`
  }

  function renderBox(card,clinic){
    let box=card.querySelector('.admin-subscription-box')
    if(!box){
      box=document.createElement('div')
      box.className='admin-subscription-box'
      const anchor=card.querySelector('.inline-form') || card.querySelector('.section-title')
      if(anchor) anchor.insertAdjacentElement('beforebegin',box)
      else card.appendChild(box)
    }

    const mode=clinic.account_mode||'permanent'
    const days=mode==='annual'?daysLeft(clinic.subscription_expires_at):null
    const expired=mode==='annual' && days!==null && days<0
    box.innerHTML=`
      <div class="admin-subscription-head">
        <div class="admin-subscription-title">
          <strong>صلاحية العيادة</strong>
          <small class="${expired?'admin-subscription-expired':''}">${subscriptionSummary(clinic)}</small>
        </div>
        <span class="admin-subscription-badge ${modeClass(mode)}">${modeLabel(mode)}</span>
      </div>
      <div class="admin-subscription-actions">
        <button type="button" data-sub-mode="permanent" class="${mode==='permanent'?'active':''}">دائم</button>
        <button type="button" data-sub-mode="annual" class="${mode==='annual'?'active':''}">سنوي — سنة</button>
        <button type="button" data-sub-mode="trial" class="${mode==='trial'?'active':''}">تجريبي</button>
        ${mode==='annual'?'<button type="button" class="renew" data-renew-annual>+ تجديد سنة</button>':''}
      </div>
    `

    box.querySelectorAll('[data-sub-mode]').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const next=btn.dataset.subMode
        if(next===mode) return
        const label=modeLabel(next)
        if(!confirm(`تحويل صلاحية "${clinic.name}" إلى ${label}؟`)) return
        box.querySelectorAll('button').forEach(b=>b.disabled=true)
        try{
          await callAdmin('set_clinic_account_mode',{clinic_id:String(clinic.id),account_mode:next})
          toast(next==='annual'?'تم تفعيل اشتراك سنوي لمدة سنة':'تم تحديث صلاحية العيادة')
          await refreshAll()
        }catch(err){
          toast(err?.message||'تعذر تحديث الصلاحية')
          decorate()
        }
      })
    })

    box.querySelector('[data-renew-annual]')?.addEventListener('click',async()=>{
      if(!confirm(`تجديد اشتراك "${clinic.name}" سنة إضافية؟`)) return
      box.querySelectorAll('button').forEach(b=>b.disabled=true)
      try{
        await callAdmin('renew_annual_subscription',{clinic_id:String(clinic.id)})
        toast('تمت إضافة سنة كاملة للاشتراك')
        await refreshAll()
      }catch(err){
        toast(err?.message||'تعذر تجديد الاشتراك')
        decorate()
      }
    })
  }

  function decorateRecent(){
    document.querySelectorAll('#adminRecentClinics [data-open-clinic]').forEach(btn=>{
      const clinic=clinicMap.get(String(btn.dataset.openClinic||''))
      const item=btn.closest('.item')
      if(!clinic||!item) return
      correctOriginalBadge(item,clinic)
      const meta=item.querySelector('.item-meta')
      if(!meta) return
      let expiry=meta.querySelector('.admin-expiry-inline')
      if((clinic.account_mode||'permanent')!=='annual'){
        expiry?.remove()
        return
      }
      if(!expiry){
        expiry=document.createElement('span')
        expiry.className='admin-expiry-inline'
        meta.appendChild(expiry)
      }
      const days=daysLeft(clinic.subscription_expires_at)
      expiry.classList.toggle('expired',days!==null&&days<0)
      expiry.textContent=subscriptionSummary(clinic)
    })
  }

  async function decorate(){
    ensureCreateOption()
    const cards=[...document.querySelectorAll('#adminClinicsList [data-clinic-card]')]
    const recent=[...document.querySelectorAll('#adminRecentClinics [data-open-clinic]')]
    if(!cards.length && !recent.length){
      updateAnnualStat()
      return
    }
    try{await loadDashboard()}catch{return}
    cards.forEach(card=>{
      const clinic=clinicMap.get(String(card.dataset.clinicCard||''))
      if(!clinic) return
      correctOriginalBadge(card,clinic)
      renderBox(card,clinic)
    })
    decorateRecent()
    updateAnnualStat()
  }

  async function refreshAll(){
    lastLoaded=0
    await loadDashboard(true)
    document.getElementById('adminRefresh')?.click()
    setTimeout(decorate,650)
  }

  function cachedClinic(){
    try{
      const userId=localStorage.getItem('medica:last-offline-user')
      if(!userId) return null
      const raw=localStorage.getItem(`medica:offline-context:${userId}`)
      const ctx=raw?JSON.parse(raw):null
      return ctx?.clinic||null
    }catch{return null}
  }

  function annualExpired(clinic){
    return clinic?.account_mode==='annual' &&
      clinic?.subscription_expires_at &&
      new Date(clinic.subscription_expires_at).getTime()<=Date.now()
  }

  function showExpired(clinic){
    const blocked=document.getElementById('blockedView')
    if(!blocked) return
    const title=document.getElementById('blockedTitle')
    const text=document.getElementById('blockedText')
    if(title) title.textContent='انتهى الاشتراك السنوي'
    if(text) text.textContent=`انتهت صلاحية اشتراك ${clinic?.name||'العيادة'} بتاريخ ${fmt(clinic?.subscription_expires_at)}. راجع مدير النظام لتجديد الاشتراك.`
    ;['authView','adminApp','staffApp','onboardingView'].forEach(id=>document.getElementById(id)?.classList.add('hidden'))
    blocked.classList.remove('hidden')
  }

  async function guardOnline(){
    if(guardBusy) return
    const access=token()
    if(!access) return
    guardBusy=true
    try{
      const userRes=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
        headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${access}`},cache:'no-store'
      })
      if(!userRes.ok) return
      const user=await userRes.json()
      if(!user?.id) return

      const memberRes=await fetch(
        `${SUPABASE_URL}/rest/v1/clinic_members?select=clinic_id,role,active&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
        {headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${access}`},cache:'no-store'}
      )
      if(!memberRes.ok) return
      const members=await memberRes.json()
      const member=members?.[0]
      if(!member?.clinic_id) return

      const clinicRes=await fetch(
        `${SUPABASE_URL}/rest/v1/clinics?select=id,name,account_mode,subscription_expires_at,active&id=eq.${encodeURIComponent(member.clinic_id)}&limit=1`,
        {headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${access}`},cache:'no-store'}
      )
      if(!clinicRes.ok) return
      const clinics=await clinicRes.json()
      const clinic=clinics?.[0]
      if(annualExpired(clinic)) showExpired(clinic)
    }catch{}finally{guardBusy=false}
  }

  function scheduleGuard(){
    clearTimeout(guardTimer)
    guardTimer=setTimeout(()=>{
      const cached=cachedClinic()
      if(annualExpired(cached)) showExpired(cached)
      if(navigator.onLine) guardOnline()
    },450)
  }

  function boot(){
    injectStyles()
    ensureCreateOption()
    setTimeout(decorate,700)

    const adminList=document.getElementById('adminClinicsList')
    const recent=document.getElementById('adminRecentClinics')
    const dashboard=document.getElementById('adminDashboard')
    const observer=new MutationObserver(()=>setTimeout(decorate,60))
    if(adminList) observer.observe(adminList,{childList:true,subtree:true})
    if(recent) observer.observe(recent,{childList:true,subtree:true})
    if(dashboard) observer.observe(dashboard,{childList:true,subtree:true})

    document.getElementById('adminRefresh')?.addEventListener('click',()=>{
      lastLoaded=0
      setTimeout(decorate,700)
    })

    scheduleGuard()
    window.addEventListener('online',scheduleGuard)
    window.addEventListener('focus',scheduleGuard)
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleGuard()})

    const views=['staffApp','blockedView','onboardingView'].map(id=>document.getElementById(id)).filter(Boolean)
    const viewObserver=new MutationObserver(scheduleGuard)
    views.forEach(v=>viewObserver.observe(v,{attributes:true,attributeFilter:['class','hidden','style']}))
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true})
  else boot()
})()
