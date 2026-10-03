(() => {
  'use strict'

  const SUPABASE_URL='https://kpnlechlpdpoivrafehl.supabase.co'
  const SUPABASE_KEY='sb_publishable_oeM2jjHRBJuejkd34nY4-A_G8s_GwYb'
  let clinicMap=new Map()
  let loadingMap=null
  let lastMapAt=0

  function esc(value=''){
    return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
  }

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
      body:JSON.stringify({action,...payload})
    })
    const data=await res.json().catch(()=>({}))
    if(!res.ok||data?.error) throw new Error(data?.error||`فشل الطلب (${res.status})`)
    return data
  }

  function injectStyles(){
    if(document.getElementById('adminDeleteClinicStyles')) return
    const s=document.createElement('style')
    s.id='adminDeleteClinicStyles'
    s.textContent=`
      #adminApp .admin-delete-clinic{border-color:#f2c9cf!important;background:#fff5f6!important;color:#b42335!important}
      #adminApp .admin-delete-clinic:hover{background:#ffe9ec!important}
      .admin-delete-backdrop{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.58);backdrop-filter:blur(8px)}
      .admin-delete-card{width:min(520px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:22px;box-shadow:0 30px 80px rgba(15,23,42,.26);direction:rtl}
      .admin-delete-icon{width:52px;height:52px;border-radius:17px;display:grid;place-items:center;background:#fff1f2;color:#b42335;margin-bottom:14px}
      .admin-delete-icon svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .admin-delete-card h3{margin:0;color:#7f1d2d;font-size:20px}
      .admin-delete-card p{margin:8px 0 0;color:#64748b;font-size:12.5px;line-height:1.75}
      .admin-delete-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:16px 0}
      .admin-delete-summary>div{padding:11px;border:1px solid #e8edf3;border-radius:14px;background:#f8fafc;text-align:center}
      .admin-delete-summary span{display:block;color:#64748b;font-size:10px}
      .admin-delete-summary strong{display:block;margin-top:4px;color:#0f172a;font-size:15px}
      .admin-delete-warning{padding:12px 13px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:11.5px;line-height:1.65}
      .admin-delete-confirm{margin-top:16px}
      .admin-delete-confirm label{display:block;color:#475569;font-size:11.5px;font-weight:800;margin-bottom:7px}
      .admin-delete-confirm code{font-family:inherit;color:#b42335;background:#fff1f2;padding:2px 5px;border-radius:6px}
      .admin-delete-confirm input{width:100%;min-height:50px;border:1px solid #d7e0ea;border-radius:14px;padding:0 13px;font-size:16px;outline:none}
      .admin-delete-confirm input:focus{border-color:#e87988;box-shadow:0 0 0 4px rgba(190,24,93,.08)}
      .admin-delete-actions{display:flex;gap:8px;margin-top:16px}
      .admin-delete-actions button{flex:1;min-height:46px;border:0;border-radius:13px;font:inherit;font-weight:850;cursor:pointer}
      .admin-delete-cancel{background:#f1f5f9;color:#334155}
      .admin-delete-confirm-btn{background:#be123c;color:#fff}
      .admin-delete-confirm-btn:disabled{opacity:.42;cursor:not-allowed}
      .admin-delete-progress{margin-top:10px;color:#64748b;font-size:11px;min-height:18px}
      .admin-delete-toast{position:fixed;left:14px;bottom:100px;z-index:13000;max-width:min(420px,calc(100vw - 28px));padding:12px 14px;border-radius:14px;background:#0f172a;color:#fff;font-size:12px;line-height:1.6;box-shadow:0 16px 40px rgba(15,23,42,.24)}
      @media(max-width:600px){
        .admin-delete-card{padding:18px;border-radius:22px}
        .admin-delete-summary{grid-template-columns:1fr 1fr 1fr}
        .admin-delete-actions{flex-direction:column-reverse}
      }
    `
    document.head.appendChild(s)
  }

  function toast(text){
    document.querySelector('.admin-delete-toast')?.remove()
    const el=document.createElement('div')
    el.className='admin-delete-toast'
    el.textContent=text
    document.body.appendChild(el)
    setTimeout(()=>el.remove(),5500)
  }

  async function loadMap(force=false){
    if(!force && clinicMap.size && Date.now()-lastMapAt<30000) return clinicMap
    if(loadingMap) return loadingMap
    loadingMap=(async()=>{
      const data=await callAdmin('dashboard')
      clinicMap=new Map((data?.clinics||[]).map(c=>[String(c.id),c]))
      lastMapAt=Date.now()
      return clinicMap
    })().finally(()=>{loadingMap=null})
    return loadingMap
  }

  function trashIcon(){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M7 7l1 13h8l1-13"/><path d="M10 11v5M14 11v5"/></svg>'
  }

  function closeModal(){
    document.querySelector('.admin-delete-backdrop')?.remove()
  }

  function openModal(clinic){
    closeModal()
    const overlay=document.createElement('div')
    overlay.className='admin-delete-backdrop'
    const accounts=Array.isArray(clinic.members)?clinic.members.length:0
    overlay.innerHTML=`
      <div class="admin-delete-card" role="dialog" aria-modal="true" aria-label="حذف العيادة نهائياً">
        <div class="admin-delete-icon">${trashIcon()}</div>
        <h3>حذف العيادة نهائياً</h3>
        <p>سيتم حذف <strong>${esc(clinic.name)}</strong> وكل البيانات المرتبطة بها من النظام. هذه العملية لا يمكن التراجع عنها.</p>
        <div class="admin-delete-summary">
          <div><span>الحسابات</span><strong>${accounts}</strong></div>
          <div><span>المرضى</span><strong>${Number(clinic.patient_count||0)}</strong></div>
          <div><span>الحجوزات</span><strong>${Number(clinic.appointment_count||0)}</strong></div>
        </div>
        <div class="admin-delete-warning">سيتم حذف حسابات الطبيب والسكرتير، المرضى، الحجوزات، الدفعات، المصاريف، السونار، إعدادات الحجز، الملفات وسجلات هذه العيادة. الحساب المشترك مع عيادة أخرى — إن وجد مستقبلاً — لن يُحذف.</div>
        <div class="admin-delete-confirm">
          <label>للتأكيد اكتب اسم العيادة بالضبط: <code>${esc(clinic.name)}</code></label>
          <input id="adminDeleteClinicName" autocomplete="off" spellcheck="false" />
        </div>
        <div class="admin-delete-progress" id="adminDeleteProgress"></div>
        <div class="admin-delete-actions">
          <button type="button" class="admin-delete-cancel">إلغاء</button>
          <button type="button" class="admin-delete-confirm-btn" disabled>حذف نهائياً</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)

    const input=overlay.querySelector('#adminDeleteClinicName')
    const confirm=overlay.querySelector('.admin-delete-confirm-btn')
    const cancel=overlay.querySelector('.admin-delete-cancel')
    const progress=overlay.querySelector('#adminDeleteProgress')
    const exact=String(clinic.name||'').trim()

    const sync=()=>{confirm.disabled=input.value.trim()!==exact}
    input.addEventListener('input',sync)
    cancel.addEventListener('click',closeModal)
    overlay.addEventListener('click',e=>{if(e.target===overlay) closeModal()})
    input.focus()

    confirm.addEventListener('click',async()=>{
      if(input.value.trim()!==exact) return
      confirm.disabled=true
      cancel.disabled=true
      input.disabled=true
      progress.textContent='جاري حذف العيادة وحساباتها وملفاتها نهائياً...'
      try{
        const result=await callAdmin('delete_clinic_permanently',{
          clinic_id:String(clinic.id),
          confirm_name:exact
        })
        closeModal()
        clinicMap.delete(String(clinic.id))
        document.querySelector(`#adminClinicsList [data-clinic-card="${CSS.escape(String(clinic.id))}"]`)?.remove()
        const warnings=Array.isArray(result?.warnings)?result.warnings:[]
        const msg=warnings.length
          ? `تم حذف العيادة والحسابات، لكن توجد ملاحظات: ${warnings.join('، ')}`
          : `تم حذف ${clinic.name} نهائياً مع ${result?.deleted_accounts??accounts} حساب و${result?.removed_files??0} ملف`
        toast(msg)
        setTimeout(()=>document.getElementById('adminRefresh')?.click(),350)
      }catch(err){
        progress.textContent=err?.message||'تعذر حذف العيادة'
        progress.style.color='#b42335'
        confirm.disabled=false
        cancel.disabled=false
        input.disabled=false
      }
    })
  }

  async function ensureButtons(){
    const list=document.getElementById('adminClinicsList')
    if(!list) return
    const cards=[...list.querySelectorAll('[data-clinic-card]')]
    if(!cards.length) return
    try{await loadMap()}catch{return}

    for(const card of cards){
      const id=String(card.dataset.clinicCard||'')
      const clinic=clinicMap.get(id)
      if(!clinic || card.querySelector('.admin-delete-clinic')) continue
      const toolbar=card.querySelector('.panel-head .toolbar') || card.querySelector('.panel-head')
      if(!toolbar) continue
      const btn=document.createElement('button')
      btn.type='button'
      btn.className='btn danger small admin-delete-clinic'
      btn.dataset.deleteClinic=id
      btn.textContent='حذف نهائياً'
      btn.addEventListener('click',()=>openModal(clinic))
      toolbar.appendChild(btn)
    }
  }

  function boot(){
    injectStyles()
    const list=document.getElementById('adminClinicsList')
    if(list){
      const observer=new MutationObserver(()=>{setTimeout(ensureButtons,40)})
      observer.observe(list,{childList:true,subtree:true})
    }
    let tries=0
    const timer=setInterval(()=>{
      ensureButtons()
      if(document.getElementById('adminClinicsList')||++tries>40) clearInterval(timer)
    },300)
    document.getElementById('adminRefresh')?.addEventListener('click',()=>{lastMapAt=0;setTimeout(()=>ensureButtons(),700)})
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true})
  else boot()
})()
