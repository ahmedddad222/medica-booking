(function(){
  'use strict';

  var routeParts=location.pathname.split('/').filter(Boolean);
  if(routeParts[0]==='queue'&&routeParts[1]){
    location.replace('/queue.html?clinic='+encodeURIComponent(routeParts[1]));
    return;
  }

  var API='https://kpnlechlpdpoivrafehl.supabase.co/functions/v1/booking/';
  var params=new URLSearchParams(location.search);
  var pathSlug=location.pathname.split('/').filter(Boolean).pop()||'';
  var slug=(params.get('clinic')||pathSlug||'').trim();

  var state={
    ctx:null,minDate:null,maxDate:null,months:[],activeMonth:'',
    selectedDate:'',selectedTime:'',slots:[],slotItems:[]
  };

  var weekdays=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var $=function(id){return document.getElementById(id)};
  var pad=function(n){return String(n).padStart(2,'0')};
  var dateKey=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  var parseDate=function(v){return new Date(v+'T12:00:00')};
  var monthKey=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)};
  var endpoint=function(){return API+encodeURIComponent(slug)};
  var fmtTime=function(t){
    var p=String(t||'').slice(0,5).split(':').map(Number),h=p[0],m=p[1],hh=(h%12)||12;
    return hh+':'+pad(m)+' '+(h>=12?'م':'ص')
  };
  var fmtDate=function(v){
    var d=parseDate(v);
    return weekdays[d.getDay()]+'، '+pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()
  };
  var monthLabel=function(key){
    var p=key.split('-');
    return p[1]+' / '+p[0]
  };

  function escapeHtml(v){
    return String(v||'').replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]
    })
  }

  function showFatal(text){
    $('page').innerHTML='<div class="fatal"><b>!</b><h2>تعذر فتح صفحة الحجز</h2><p>'+escapeHtml(text||'رابط الحجز غير متاح حالياً')+'</p></div>'
  }

  function setNotice(text,type){
    var el=$('notice');
    el.textContent=text||'';
    el.className='notice'+(text?' show '+(type||'bad'):'')
  }

  function setLogo(url){
    if(!url)return;
    var pairs=[[$('clinicLogo'),$('logoFallback')],[$('sideLogo'),$('sideLogoFallback')]];
    pairs.forEach(function(pair){
      var img=pair[0],fallback=pair[1];
      if(!img)return;
      img.onload=function(){img.hidden=false;if(fallback)fallback.hidden=true};
      img.onerror=function(){img.hidden=true;if(fallback)fallback.hidden=false};
      img.src=url
    })
  }

  function applyContext(ctx){
    var c=ctx.clinic||{},b=ctx.booking||{};
    $('clinicName').textContent=c.name||'Medica';
    $('sideClinicName').textContent=c.name||'Medica';
    $('clinicSubtitle').textContent=c.specialty||c.tagline||'عيادة طبية';
    $('doctorName').textContent=c.doctor_name?'د. '+c.doctor_name:'';
    $('sideDoctorName').textContent=c.doctor_name?'د. '+c.doctor_name:(c.specialty||c.tagline||'حجز إلكتروني');
    document.title='حجز موعد | '+(c.name||'Medica');

    if(/^#[0-9a-f]{6}$/i.test(c.brand_color||'')){
      document.documentElement.style.setProperty('--brand',c.brand_color)
    }
    if(c.logo_url)setLogo(c.logo_url);

    if(c.address){
      $('addressMeta').hidden=false;$('addressMeta').querySelector('strong').textContent=c.address;
      $('sideAddress').hidden=false;$('sideAddress').querySelector('strong').textContent=c.address
    }
    var phoneValue=String(c.phone||'').trim();
    var sidePhoneStrong=$('sidePhone')?.querySelector('strong');
    if(sidePhoneStrong)sidePhoneStrong.textContent=phoneValue||'غير مضاف';
    if(phoneValue){
      $('phoneHeroBtn').hidden=false;
      $('phoneHeroBtn').href='tel:'+phoneValue.replace(/\s+/g,'')
    }
    if(c.maps_url){
      $('mapsHeroBtn').hidden=false;$('mapsHeroBtn').href=c.maps_url;
      $('mapsSideBtn').hidden=false;$('mapsSideBtn').href=c.maps_url
    }

    renderHours(b.hours||[]);
    updateTodayHours(b.hours||[])
  }

  function renderHours(hours){
    if(!hours.length){
      $('hoursList').innerHTML='<div class="slots-placeholder">لم يتم تحديد أوقات الدوام للعرض.</div>';
      return
    }
    $('hoursList').innerHTML=hours.map(function(h){
      return '<div class="hours-row"><span>'+weekdays[Number(h.weekday)]+'</span><strong>'+fmtTime(h.start_time)+' - '+fmtTime(h.end_time)+'</strong></div>'
    }).join('')
  }

  function updateTodayHours(hours){
    var day=new Date().getDay();
    var h=hours.find(function(x){return Number(x.weekday)===day});
    $('todayHoursMeta').querySelector('strong').textContent=h?(fmtTime(h.start_time)+' - '+fmtTime(h.end_time)):'لا يوجد دوام اليوم'
  }

  function configureDates(){
    var today=new Date();today.setHours(12,0,0,0);
    var days=Math.min(60,Math.max(1,Number(state.ctx.booking&&state.ctx.booking.window_days||30)));
    var max=new Date(today);max.setDate(max.getDate()+days);
    state.minDate=today;state.maxDate=max;

    var cursor=new Date(today.getFullYear(),today.getMonth(),1,12);
    var lastMonth=new Date(max.getFullYear(),max.getMonth(),1,12);
    state.months=[];
    while(cursor<=lastMonth){
      state.months.push(monthKey(cursor));
      cursor.setMonth(cursor.getMonth()+1)
    }
    state.activeMonth=state.months[0]||monthKey(today);
    renderMonths();
    chooseInitialDate()
  }

  function openWeekdaySet(){
    return new Set((state.ctx.booking&&state.ctx.booking.open_weekdays||[]).map(Number))
  }

  function datesForMonth(key){
    var p=key.split('-').map(Number),y=p[0],m=p[1]-1;
    var open=openWeekdaySet(),days=[],last=new Date(y,m+1,0,12).getDate();
    for(var d=1;d<=last;d++){
      var dt=new Date(y,m,d,12);
      if(dt<state.minDate||dt>state.maxDate)continue;
      if(!open.has(dt.getDay()))continue;
      days.push(dt)
    }
    return days
  }

  function renderMonths(){
    $('monthTabs').innerHTML=state.months.map(function(key){
      return '<button type="button" class="month-tab'+(key===state.activeMonth?' active':'')+'" data-month="'+key+'">'+monthLabel(key)+'</button>'
    }).join('');
    $('monthTabs').querySelectorAll('[data-month]').forEach(function(btn){
      btn.onclick=function(){
        state.activeMonth=btn.dataset.month;
        var dates=datesForMonth(state.activeMonth);
        if(dates.length){
          var selectedMonth=state.selectedDate?monthKey(parseDate(state.selectedDate)):'';
          if(selectedMonth!==state.activeMonth)selectDate(dateKey(dates[0]),false)
          else renderDates()
        }else renderDates();
        renderMonths()
      }
    });
    renderDates()
  }

  function renderDates(){
    var dates=datesForMonth(state.activeMonth);
    if(!dates.length){
      $('dateList').innerHTML='<div class="dates-empty">لا توجد أيام متاحة في هذا الشهر.</div>';
      return
    }
    $('dateList').innerHTML=dates.map(function(d){
      var key=dateKey(d),active=key===state.selectedDate;
      return '<button type="button" class="date-card'+(active?' active':'')+'" data-date="'+key+'" aria-label="'+escapeHtml(fmtDate(key))+'">'+
        '<span class="weekday">'+weekdays[d.getDay()]+'</span>'+
        '<span class="daynum">'+d.getDate()+'</span>'+
        '<span class="monthnum">'+pad(d.getMonth()+1)+' / '+d.getFullYear()+'</span>'+
      '</button>'
    }).join('');
    $('dateList').querySelectorAll('[data-date]').forEach(function(btn){
      btn.onclick=function(){selectDate(btn.dataset.date,true)}
    });

    var active=$('dateList').querySelector('.date-card.active');
    if(active&&innerWidth<=680){
      requestAnimationFrame(function(){active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})})
    }
  }

  function chooseInitialDate(){
    var open=openWeekdaySet();
    if(!open.size){
      $('dateList').innerHTML='<div class="dates-empty">لم تُحدد العيادة أياماً متاحة للحجز.</div>';
      $('slotsWrap').innerHTML='<div class="slots-placeholder">لا توجد أوقات متاحة للحجز حالياً.</div>';
      return
    }
    var d=new Date(state.minDate);
    while(d<=state.maxDate){
      if(open.has(d.getDay())){
        state.activeMonth=monthKey(d);
        selectDate(dateKey(d),false);
        renderMonths();
        return
      }
      d.setDate(d.getDate()+1)
    }
  }

  function selectDate(key,userAction){
    state.selectedDate=key;
    state.selectedTime='';
    state.slots=[];
    state.slotItems=[];
    state.activeMonth=monthKey(parseDate(key));
    renderMonths();
    syncSelection();
    loadSlots();
    if(userAction&&innerWidth<=680){
      setTimeout(function(){$('slotsWrap').scrollIntoView({behavior:'smooth',block:'nearest'})},80)
    }
  }

  function syncSelection(){
    var dateText=state.selectedDate?fmtDate(state.selectedDate):'لم يتم اختيار يوم';
    var timeText=state.selectedTime?fmtTime(state.selectedTime):'—';
    $('reviewDate').textContent=dateText;
    $('reviewTime').textContent=timeText;
    $('topSelection').textContent=state.selectedDate?(dateText+(state.selectedTime?' • '+timeText:'')):'لم يتم اختيار موعد';
    updateSubmit()
  }

  function loadingSlots(){
    $('slotsWrap').innerHTML='<div class="time-select-shell"><div class="time-select-trigger" style="pointer-events:none"><span class="time-select-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg></span><span class="time-select-copy"><span>وقت الموعد</span><strong>جارٍ تحميل الأوقات...</strong></span><span class="time-select-meta"></span></div></div>'
  }

  async function loadSlots(){
    if(!state.selectedDate)return;
    loadingSlots();
    try{
      var r=await fetch(endpoint()+'?api=slots&date='+encodeURIComponent(state.selectedDate),{cache:'no-store'});
      var j=await r.json();
      if(!r.ok)throw new Error(j.error||'تعذر تحميل الأوقات');

      state.slotItems=(j.all_slots||[]).map(function(x){
        return {
          time:String((x&&x.time)||'').slice(0,5),
          status:x&&x.status==='booked'?'booked':'available'
        }
      }).filter(function(x){return /^\d{2}:\d{2}$/.test(x.time)});

      if(!state.slotItems.length){
        state.slotItems=(j.slots||[]).map(function(t){
          return {time:String(t).slice(0,5),status:'available'}
        })
      }

      state.slots=state.slotItems.filter(function(x){return x.status==='available'}).map(function(x){return x.time});
      if(state.selectedTime&&!state.slots.includes(state.selectedTime))state.selectedTime='';
      renderSlots();
      syncSelection()
    }catch(e){
      state.slots=[];
      state.slotItems=[];
      $('slotsWrap').innerHTML='<div class="slots-placeholder">'+escapeHtml(e.message||'تعذر تحميل الأوقات، حاول مرة أخرى.')+'</div>'
    }
  }

  function renderTimePickerSheet(){
    var wrap=$('timePickerSlots');
    if(!wrap)return;
    $('timePickerDate').textContent=state.selectedDate?fmtDate(state.selectedDate):'—';

    if(!state.slotItems.length){
      wrap.innerHTML='<div class="time-picker-empty">لا توجد أوقات ضمن دوام هذا اليوم.</div>';
      return
    }

    wrap.innerHTML=state.slotItems.map(function(item){
      var booked=item.status==='booked';
      var active=!booked&&state.selectedTime===item.time;
      return '<button type="button" class="time-option '+(booked?'booked':'available')+(active?' active':'')+'" data-time="'+item.time+'" '+(booked?'disabled aria-disabled="true"':'')+'>'+
        '<strong>'+fmtTime(item.time)+'</strong>'+
        '<small>'+(booked?'محجوز':(active?'محدد':'متاح'))+'</small>'+
      '</button>'
    }).join('');

    wrap.querySelectorAll('.time-option.available').forEach(function(btn){
      btn.onclick=function(){
        state.selectedTime=btn.dataset.time;
        syncSelection();
        renderSlots();
        closeTimePicker();
        if(innerWidth<=680){
          setTimeout(function(){document.querySelector('.booking-step:nth-of-type(3)')?.scrollIntoView({behavior:'smooth',block:'start'})},100)
        }
      }
    })
  }

  function openTimePicker(){
    if(!state.selectedDate)return;
    var backdrop=$('timePickerBackdrop');
    if(!backdrop)return;
    renderTimePickerSheet();
    backdrop.hidden=false;
    document.body.classList.add('time-picker-open')
  }

  function closeTimePicker(){
    var backdrop=$('timePickerBackdrop');
    if(backdrop)backdrop.hidden=true;
    document.body.classList.remove('time-picker-open')
  }

  function renderSlots(){
    var availableCount=state.slotItems.filter(function(x){return x.status==='available'}).length;

    if(!state.slotItems.length){
      $('slotsWrap').innerHTML='<div class="slots-placeholder">لا توجد أوقات متاحة في هذا اليوم.</div>';
      return
    }

    var selected=state.selectedTime?fmtTime(state.selectedTime):'اختيار الوقت';
    var meta=state.selectedTime?'محدد':(availableCount?availableCount+' متاح':'ممتلئ');

    $('slotsWrap').innerHTML='<div class="time-select-shell">'+
      '<button id="openTimePickerBtn" type="button" class="time-select-trigger'+(state.selectedTime?' has-value':'')+'">'+
        '<span class="time-select-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg></span>'+
        '<span class="time-select-copy"><span>وقت الموعد</span><strong>'+selected+'</strong></span>'+
        '<span class="time-select-meta">'+meta+' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></span>'+
      '</button>'+
    '</div>';

    $('openTimePickerBtn').onclick=openTimePicker
  }

  function validateName(show){
    var value=$('name').value.trim(),ok=value.length>=2;
    $('nameError').textContent=show&&!ok?'اكتب اسم المريض بشكل صحيح':'';
    return ok
  }

  function validatePhone(show){
    var digits=$('phone').value.replace(/\D/g,''),ok=digits.length>=8;
    $('phoneError').textContent=show&&!ok?'اكتب رقم هاتف صحيح':'';
    return ok
  }

  function updateSubmit(){
    $('submitBtn').disabled=!(state.selectedDate&&state.selectedTime&&validateName(false)&&validatePhone(false))
  }

  async function submitBooking(e){
    e.preventDefault();
    setNotice('');
    var nameOk=validateName(true),phoneOk=validatePhone(true);
    if(!state.selectedDate)return setNotice('اختَر يوم الحجز أولاً','bad');
    if(!state.selectedTime)return setNotice('اختَر وقتاً من الأوقات المتاحة','bad');
    if(!nameOk||!phoneOk)return;

    var btn=$('submitBtn'),chosenDate=state.selectedDate,chosenTime=state.selectedTime;
    btn.disabled=true;
    btn.textContent='جاري إرسال الطلب...';

    try{
      var body={
        date:chosenDate,
        time:chosenTime,
        name:$('name').value.trim(),
        phone:$('phone').value.trim(),
        note:$('note').value.trim(),
        website:$('website').value
      };
      var r=await fetch(endpoint(),{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(body)
      });
      var j=await r.json();
      if(!r.ok)throw new Error(j.error||'تعذر إرسال طلب الحجز');

      $('successDate').textContent=fmtDate(chosenDate);
      $('successTime').textContent=fmtTime(chosenTime);
      $('bookingFlow').hidden=true;
      $('successView').classList.add('show');
      scrollTo({top:0,behavior:'smooth'})
    }catch(err){
      setNotice(err.message||'تعذر إرسال الطلب، حاول مرة أخرى.','bad')
    }finally{
      btn.textContent='إرسال طلب الحجز';
      updateSubmit()
    }
  }

  function resetBooking(){
    $('successView').classList.remove('show');
    $('bookingFlow').hidden=false;
    $('bookingForm').reset();
    state.selectedTime='';
    syncSelection();
    renderSlots();
    setNotice('');
    scrollTo({top:document.querySelector('.content-grid').offsetTop-10,behavior:'smooth'})
  }

  async function init(){
    if(!slug)return showFatal('رابط الحجز غير مكتمل.');
    try{
      var r=await fetch(endpoint()+'?api=context',{cache:'no-store'});
      var ctx=await r.json();
      if(!r.ok)throw new Error(ctx.error||'رابط الحجز غير متاح حالياً');
      state.ctx=ctx;
      applyContext(ctx);
      configureDates()
    }catch(e){
      showFatal(e.message||'تعذر فتح رابط الحجز')
    }
  }

  $('name').addEventListener('input',updateSubmit);
  $('phone').addEventListener('input',updateSubmit);
  $('name').addEventListener('blur',function(){validateName(true)});
  $('phone').addEventListener('blur',function(){validatePhone(true)});
  $('closeTimePickerBtn').addEventListener('click',closeTimePicker);
  $('timePickerBackdrop').addEventListener('click',function(e){if(e.target===this)closeTimePicker()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('timePickerBackdrop').hidden)closeTimePicker()});
  $('bookingForm').addEventListener('submit',submitBooking);
  $('newBookingBtn').addEventListener('click',resetBooking);

  init()
})();
