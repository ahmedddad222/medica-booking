(() => {
  'use strict'

  const SUPABASE_URL = 'https://kpnlechlpdpoivrafehl.supabase.co'
  const SUPABASE_KEY = 'sb_publishable_oeM2jjHRBJuejkd34nY4-A_G8s_GwYb'
  const AUTH_KEY = 'sb-kpnlechlpdpoivrafehl-auth-token'
  const PAGE_ID = 'adminAudit'
  const MAX_ROWS = 250

  const tableLabels = {
    clinics:'بيانات العيادة',
    clinic_members:'حسابات العيادة',
    profiles:'الملف الشخصي',
    patients:'المرضى',
    appointments:'الحجوزات',
    payments:'الدفعات',
    expenses:'المصاريف',
    clinic_employees:'الموظفون',
    salary_payments:'الرواتب',
    recurring_expenses:'الالتزامات الشهرية',
    patient_visits:'سجل الزيارات',
    daily_closings:'الإغلاق اليومي',
    clinic_booking_settings:'إعدادات الحجز الإلكتروني',
    clinic_booking_hours:'أوقات الحجز الإلكتروني',
    online_booking_requests:'طلبات الحجز الإلكتروني',
    prescriptions:'الوصفات الطبية',
    ultrasound_exams:'فحوصات السونار',
    ultrasound_images:'صور السونار'
  }

  const fieldLabels = {
    name:'اسم العيادة', doctor_name:'اسم الطبيب', phone:'الهاتف', address:'العنوان',
    default_visit_fee:'سعر الكشف', active:'الحالة', logo_path:'الشعار',
    brand_color:'لون الهوية', tagline:'الوصف', specialty:'التخصص',
    account_mode:'نوع الحساب', report_template:'قالب التقرير', clinic_type:'نوع العيادة',
    role:'الدور', full_name:'الاسم', onboarding_completed:'إكمال البيانات',
    patient_id:'المريض', starts_at:'موعد الحجز', visit_type:'نوع الزيارة',
    status:'الحالة', visit_fee:'أجرة الزيارة', notes:'ملاحظات',
    queue_number:'رقم الدور', queue_date:'تاريخ الدور', arrived_at:'وقت الوصول',
    service_started_at:'بدء الخدمة', completed_at:'وقت الإكمال',
    entry_requested_at:'طلب الإدخال', entry_confirmed_at:'تأكيد الإدخال',
    amount:'المبلغ', payment_method:'طريقة الدفع', paid_at:'وقت الدفع',
    title:'العنوان', expense_date:'تاريخ المصروف', category:'التصنيف',
    monthly_salary:'الراتب الشهري', job_title:'المسمى الوظيفي',
    public_slug:'رابط الحجز', enabled:'الحجز الإلكتروني', slot_minutes:'مدة الموعد',
    min_notice_minutes:'الإشعار المسبق', booking_window_days:'فترة الحجز',
    google_maps_url:'Google Maps', whatsapp_number:'رقم واتساب',
    weekday:'اليوم', is_open:'مفتوح', start_time:'بداية الدوام', end_time:'نهاية الدوام',
    requested_start:'الموعد المطلوب', patient_name:'اسم المريض',
    patient_phone:'هاتف المريض', rejection_reason:'سبب الرفض',
    diagnosis:'التشخيص', treatment:'العلاج', doctor_notes:'ملاحظات الطبيب',
    next_review_date:'موعد المراجعة', visit_date:'تاريخ الزيارة',
    exam_type:'نوع الفحص', exam_date:'تاريخ الفحص', findings:'النتائج'
  }

  const roleLabels = {secretary:'سكرتير/ة',doctor:'طبيب',owner:'طبيب',admin:'أدمن',system:'النظام'}
  const actionLabels = {INSERT:'إضافة',UPDATE:'تعديل',DELETE:'حذف'}

  let rows = []
  let loadedOnce = false

  function esc(value=''){
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
  }

  function sessionToken(){
    const candidates = [AUTH_KEY, ...Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))]
    for (const key of [...new Set(candidates)]) {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        if (parsed?.access_token) return parsed.access_token
        if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token
        if (Array.isArray(parsed) && parsed[0]?.access_token) return parsed[0].access_token
      } catch {}
    }
    return ''
  }

  function fmtDate(value){
    if(!value) return '—'
    try {
      return new Date(value).toLocaleString('ar-IQ',{
        timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit',
        hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true
      })
    } catch { return String(value) }
  }

  function fmtValue(value){
    if(value === null || value === undefined || value === '') return '—'
    if(value === true) return 'نعم'
    if(value === false) return 'لا'
    if(typeof value === 'object'){
      try { value = JSON.stringify(value) } catch { value = String(value) }
    }
    const s=String(value)
    return s.length > 180 ? s.slice(0,177)+'…' : s
  }

  function injectStyles(){
    if(document.getElementById('adminAuditStyles')) return
    const style=document.createElement('style')
    style.id='adminAuditStyles'
    style.textContent=`
      #adminAudit .audit-toolbar{display:grid;grid-template-columns:1.4fr repeat(3,minmax(150px,.7fr)) auto;gap:10px;align-items:end}
      #adminAudit .audit-toolbar .field{margin:0}
      #adminAudit .audit-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 16px}
      #adminAudit .audit-kpi{padding:15px 16px;border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:var(--shadow-sm)}
      #adminAudit .audit-kpi span{display:block;color:var(--muted);font-size:11px;font-weight:750}
      #adminAudit .audit-kpi strong{display:block;color:var(--heading);font-size:23px;margin-top:7px}
      #adminAudit .audit-list{display:grid;gap:10px}
      #adminAudit .audit-entry{border:1px solid var(--line);border-radius:16px;background:#fff;overflow:hidden}
      #adminAudit .audit-entry summary{list-style:none;cursor:pointer;padding:14px 16px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
      #adminAudit .audit-entry summary::-webkit-details-marker{display:none}
      #adminAudit .audit-title{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
      #adminAudit .audit-title strong{color:var(--heading)}
      #adminAudit .audit-meta{display:flex;gap:7px 12px;flex-wrap:wrap;color:var(--muted);font-size:11px;margin-top:7px}
      #adminAudit .audit-time{white-space:nowrap;color:var(--muted);font-size:11px}
      #adminAudit .audit-body{padding:0 16px 15px;border-top:1px solid #eef2f6}
      #adminAudit .audit-change{display:grid;grid-template-columns:minmax(120px,.5fr) minmax(0,1fr) 24px minmax(0,1fr);gap:8px;align-items:start;padding:10px 0;border-bottom:1px solid #f0f3f6;font-size:12px}
      #adminAudit .audit-change:last-child{border-bottom:0}
      #adminAudit .audit-field{font-weight:800;color:#334155}
      #adminAudit .audit-old,#adminAudit .audit-new{padding:8px 10px;border-radius:10px;word-break:break-word;line-height:1.55}
      #adminAudit .audit-old{background:#fff5f5;color:#8a3941}
      #adminAudit .audit-new{background:#f0faf7;color:#17664c}
      #adminAudit .audit-arrow{text-align:center;color:#94a3b8;padding-top:8px}
      #adminAudit .audit-empty{padding:34px;text-align:center;color:var(--muted)}
      #adminAudit .audit-error{padding:14px;border:1px solid #f3cbd0;background:#fff2f3;color:#9f3841;border-radius:14px}
      @media(max-width:900px){
        #adminAudit .audit-toolbar{grid-template-columns:1fr 1fr}
        #adminAudit .audit-toolbar .audit-search{grid-column:1/-1}
        #adminAudit .audit-kpis{grid-template-columns:1fr 1fr}
      }
      @media(max-width:600px){
        #adminAudit .audit-toolbar{grid-template-columns:1fr}
        #adminAudit .audit-toolbar .audit-search{grid-column:auto}
        #adminAudit .audit-change{grid-template-columns:1fr}
        #adminAudit .audit-arrow{display:none}
        #adminAudit .audit-entry summary{grid-template-columns:1fr}
        #adminAudit .audit-time{white-space:normal}
      }
    `
    document.head.appendChild(style)
  }

  function injectUi(){
    const app=document.getElementById('adminApp')
    if(!app || document.getElementById(PAGE_ID)) return false
    injectStyles()

    const sideNav=app.querySelector('.sidebar .nav')
    if(sideNav){
      const b=document.createElement('button')
      b.type='button'; b.className='admin-audit-nav'; b.textContent='سجل التعديلات'
      b.addEventListener('click',openAudit)
      sideNav.appendChild(b)
    }

    const mobileNav=document.getElementById('adminMobileNav')
    if(mobileNav){
      const b=document.createElement('button')
      b.type='button'; b.className='admin-audit-nav'; b.textContent='السجل'
      b.addEventListener('click',openAudit)
      mobileNav.appendChild(b)
    }

    const main=app.querySelector('main.main')
    const section=document.createElement('section')
    section.id=PAGE_ID
    section.className='page hidden'
    section.innerHTML=`
      <div class="audit-kpis">
        <div class="audit-kpi"><span>السجلات المحملة</span><strong id="auditCount">0</strong></div>
        <div class="audit-kpi"><span>تعديلات</span><strong id="auditUpdateCount">0</strong></div>
        <div class="audit-kpi"><span>إضافات</span><strong id="auditInsertCount">0</strong></div>
        <div class="audit-kpi"><span>حذف</span><strong id="auditDeleteCount">0</strong></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>سجل التعديلات</h3><div class="muted">خاص بحساب الأدمن فقط — يعرض من غيّر ومتى وما هي الحقول التي تغيرت</div></div><button id="auditReload" class="btn light small" type="button">تحديث</button></div>
        <div class="audit-toolbar">
          <label class="field audit-search"><span>بحث</span><input id="auditSearch" placeholder="اسم العيادة، المستخدم، المريض..." /></label>
          <label class="field"><span>العيادة</span><select id="auditClinic"><option value="">كل العيادات</option></select></label>
          <label class="field"><span>الإجراء</span><select id="auditAction"><option value="">الكل</option><option value="UPDATE">تعديل</option><option value="INSERT">إضافة</option><option value="DELETE">حذف</option></select></label>
          <label class="field"><span>القسم</span><select id="auditTable"><option value="">كل الأقسام</option></select></label>
          <button id="auditApply" class="btn primary" type="button">تطبيق</button>
        </div>
        <div class="sep"></div>
        <div id="auditStatus" class="muted">اضغط تحديث لتحميل السجل</div>
        <div id="auditList" class="audit-list"></div>
      </div>
    `
    main.appendChild(section)

    Object.entries(tableLabels).forEach(([value,label])=>{
      const o=document.createElement('option');o.value=value;o.textContent=label
      document.getElementById('auditTable')?.appendChild(o)
    })

    document.getElementById('auditReload')?.addEventListener('click',loadAudit)
    document.getElementById('auditApply')?.addEventListener('click',renderAudit)
    document.getElementById('auditSearch')?.addEventListener('input',renderAudit)
    document.getElementById('auditClinic')?.addEventListener('change',renderAudit)
    document.getElementById('auditAction')?.addEventListener('change',renderAudit)
    document.getElementById('auditTable')?.addEventListener('change',renderAudit)

    document.querySelectorAll('[data-admin-page]').forEach(btn=>{
      btn.addEventListener('click',()=>document.querySelectorAll('.admin-audit-nav').forEach(x=>x.classList.remove('active')))
    })
    document.getElementById('adminRefresh')?.addEventListener('click',()=>{
      if(!document.getElementById(PAGE_ID)?.classList.contains('hidden')) loadAudit()
    })
    return true
  }

  function openAudit(){
    const page=document.getElementById(PAGE_ID)
    if(!page) return
    document.querySelectorAll('#adminApp .page').forEach(x=>x.classList.add('hidden'))
    page.classList.remove('hidden')
    document.querySelectorAll('[data-admin-page]').forEach(x=>x.classList.remove('active'))
    document.querySelectorAll('.admin-audit-nav').forEach(x=>x.classList.add('active'))
    const title=document.getElementById('adminPageTitle')
    if(title) title.textContent='سجل التعديلات'
    window.scrollTo({top:0,behavior:'smooth'})
    if(!loadedOnce) loadAudit()
  }

  async function loadAudit(){
    const status=document.getElementById('auditStatus')
    const list=document.getElementById('auditList')
    if(!status || !list) return
    const token=sessionToken()
    if(!token){
      status.textContent='تعذر قراءة جلسة الأدمن. أعد تسجيل الدخول.'
      list.innerHTML=''
      return
    }
    status.textContent='جاري تحميل سجل التعديلات...'
    list.innerHTML=''
    try{
      const params=new URLSearchParams({
        select:'id,occurred_at,actor_user_id,actor_email,actor_name,actor_role,clinic_id,clinic_name,table_name,action,record_id,record_label,changed_fields,old_values,new_values,client_info',
        order:'occurred_at.desc',
        limit:String(MAX_ROWS)
      })
      const res=await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?${params}`,{
        headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,Accept:'application/json'}
      })
      if(!res.ok){
        const txt=await res.text().catch(()=> '')
        throw new Error(res.status===401?'انتهت جلسة الأدمن. سجل الدخول من جديد.':(txt||`تعذر تحميل السجل (${res.status})`))
      }
      rows=await res.json()
      loadedOnce=true
      populateClinics()
      renderAudit()
    }catch(err){
      status.innerHTML=`<div class="audit-error">${esc(err?.message||'تعذر تحميل سجل التعديلات')}</div>`
      list.innerHTML=''
    }
  }

  function populateClinics(){
    const select=document.getElementById('auditClinic')
    if(!select) return
    const current=select.value
    const map=new Map()
    rows.forEach(r=>{ if(r.clinic_id) map.set(r.clinic_id,r.clinic_name||r.clinic_id) })
    select.innerHTML='<option value="">كل العيادات</option>'
    ;[...map.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'ar')).forEach(([id,name])=>{
      const o=document.createElement('option');o.value=id;o.textContent=name;select.appendChild(o)
    })
    if([...map.keys()].includes(current)) select.value=current
  }

  function renderAudit(){
    const list=document.getElementById('auditList')
    const status=document.getElementById('auditStatus')
    if(!list || !status) return
    const q=String(document.getElementById('auditSearch')?.value||'').trim().toLowerCase()
    const clinic=document.getElementById('auditClinic')?.value||''
    const action=document.getElementById('auditAction')?.value||''
    const table=document.getElementById('auditTable')?.value||''

    const filtered=rows.filter(r=>{
      if(clinic && r.clinic_id!==clinic) return false
      if(action && r.action!==action) return false
      if(table && r.table_name!==table) return false
      if(q){
        const hay=[r.clinic_name,r.actor_name,r.actor_email,r.record_label,tableLabels[r.table_name],actionLabels[r.action],...(r.changed_fields||[])].join(' ').toLowerCase()
        if(!hay.includes(q)) return false
      }
      return true
    })

    document.getElementById('auditCount').textContent=String(filtered.length)
    document.getElementById('auditUpdateCount').textContent=String(filtered.filter(x=>x.action==='UPDATE').length)
    document.getElementById('auditInsertCount').textContent=String(filtered.filter(x=>x.action==='INSERT').length)
    document.getElementById('auditDeleteCount').textContent=String(filtered.filter(x=>x.action==='DELETE').length)
    status.textContent=filtered.length?`يعرض ${filtered.length} سجل من آخر ${rows.length} عملية محفوظة`:'لا توجد نتائج مطابقة'

    list.innerHTML=filtered.map(entryHtml).join('') || '<div class="audit-empty">لا توجد سجلات مطابقة</div>'
  }

  function entryHtml(r){
    const actionClass=r.action==='DELETE'?'bad':r.action==='INSERT'?'ok':'brand'
    const actor=r.actor_name||r.actor_email||roleLabels[r.actor_role]||'النظام'
    const role=r.actor_role?roleLabels[r.actor_role]||r.actor_role:''
    const clinic=r.clinic_name||'بدون عيادة'
    const subject=r.record_label||r.record_id||'—'
    const fields=(r.changed_fields||[]).filter(f=>f!=='updated_at'&&f!=='created_at')
    const changes=fields.map(field=>{
      const oldV=r.old_values?.[field]
      const newV=r.new_values?.[field]
      return `<div class="audit-change"><div class="audit-field">${esc(fieldLabels[field]||field)}</div><div class="audit-old">${r.action==='INSERT'?'—':esc(fmtValue(oldV))}</div><div class="audit-arrow">←</div><div class="audit-new">${r.action==='DELETE'?'—':esc(fmtValue(newV))}</div></div>`
    }).join('')

    return `
      <details class="audit-entry">
        <summary>
          <div>
            <div class="audit-title">
              <span class="badge ${actionClass}">${esc(actionLabels[r.action]||r.action)}</span>
              <strong>${esc(tableLabels[r.table_name]||r.table_name)}</strong>
              <span class="badge">${esc(subject)}</span>
            </div>
            <div class="audit-meta">
              <span>العيادة: ${esc(clinic)}</span>
              <span>بواسطة: ${esc(actor)}${role?` — ${esc(role)}`:''}</span>
              <span>${fields.length} حقل متغير</span>
            </div>
          </div>
          <span class="audit-time">${esc(fmtDate(r.occurred_at))}</span>
        </summary>
        <div class="audit-body">${changes||'<div class="muted" style="padding-top:12px">لا توجد تفاصيل حقول إضافية</div>'}</div>
      </details>
    `
  }

  function boot(){
    if(injectUi()) return
    let tries=0
    const timer=setInterval(()=>{
      tries++
      if(injectUi() || tries>30) clearInterval(timer)
    },250)
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true})
  else boot()
})()
