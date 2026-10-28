(function(){
  'use strict';

  var API='https://kpnlechlpdpoivrafehl.supabase.co/functions/v1/queue-display/';
  var params=new URLSearchParams(location.search);
  var path=location.pathname.split('/').filter(Boolean);
  var pathSlug=path[0]==='queue'&&path[1]?path[1]:'';
  var slug=(params.get('clinic')||pathSlug||'').trim();
  var state={data:null,lastCallKey:'',soundReady:false,busy:false};

  var $=function(id){return document.getElementById(id)};
  var esc=function(v){return String(v||'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})};
  var endpoint=function(){return API+encodeURIComponent(slug)};

  function setBrand(data){
    var c=data.clinic||{};
    var color=/^#[0-9a-f]{6}$/i.test(c.brand_color||'')?c.brand_color:'#0e9384';
    document.documentElement.style.setProperty('--brand',color);
    $('clinicName').textContent=c.name||'Medica';
    $('doctorName').textContent=(c.doctor_name?'د. '+c.doctor_name:'')+(c.specialty?' • '+c.specialty:'');
    if(c.logo_url)$('clinicLogo').src=c.logo_url;
    document.title='طابور المرضى | '+(c.name||'Medica');
  }

  function queueNumber(n){return n?('#'+String(n)):'—'}

  function render(data){
    state.data=data;
    state.queueVoice=data.queue_voice==='male'?'male':'female';
    if($('voiceChoice'))$('voiceChoice').textContent=state.queueVoice==='male'?'صوت رجالي عربي':'صوت نسائي عربي';
    setBrand(data);
    var current=data.current;
    var waiting=Array.isArray(data.waiting)?data.waiting:[];
    $('waitingCount').textContent=String(waiting.length);
    $('currentSummary').textContent=current?queueNumber(current.queue_number):'—';

    var card=$('currentCard');
    if(current){
      card.classList.remove('empty-current');
      $('currentNumber').textContent=queueNumber(current.queue_number);
      $('currentName').textContent=current.patient_name||'مريض';
      $('currentHint').textContent='يرجى التفضل بالدخول إلى غرفة الطبيب';
    }else{
      card.classList.add('empty-current');
      $('currentNumber').textContent='—';
      $('currentName').textContent='لا يوجد مريض داخل الآن';
      $('currentHint').textContent='سيظهر اسم المريض هنا عند النداء';
    }

    var next=data.next;
    $('nextName').textContent=next?(next.patient_name||'مريض'):'—';
    $('nextNumber').textContent=next?queueNumber(next.queue_number):'—';

    if(!waiting.length){
      $('waitingList').innerHTML='<div class="waiting-empty">لا يوجد مرضى بالانتظار حالياً</div>';
    }else{
      $('waitingList').innerHTML=waiting.map(function(row,index){
        return '<div class="waiting-row '+(index===0?'next':'')+'">'+
          '<div class="waiting-no">'+esc(queueNumber(row.queue_number))+'</div>'+
          '<div><div class="waiting-name">'+esc(row.patient_name||'مريض')+'</div><div class="waiting-meta">'+(index===0?'الدور التالي':'بانتظار دوره')+'</div></div>'+
          '<span class="waiting-tag">'+(index===0?'التالي':'انتظار')+'</span>'+
        '</div>';
      }).join('');
    }

    var key=current?(String(current.queue_number||0)+':'+String(current.call_seq||0)):'';
    if(current&&current.call_seq>0&&key!==state.lastCallKey){
      if(state.soundReady) announce(current);
      state.lastCallKey=key;
    }else if(!current){
      state.lastCallKey='';
    }
  }

  function availableArabicVoices(){
    if(!window.speechSynthesis)return [];
    return window.speechSynthesis.getVoices().filter(function(v){return /^ar[-_]/i.test(v.lang||'') || /arabic|العربي/i.test(v.name||'')});
  }
  function voiceScore(v){
    var n=(v.name||'').toLowerCase(),lang=(v.lang||'').toLowerCase();
    return (/neural|natural|premium|online|enhanced/i.test(n)?100:0)+(/microsoft|google/i.test(n)?15:0)+(/ar-(sa|eg|ae)/i.test(lang)?5:0);
  }
  function fillArabicVoices(){
    var el=$('voiceChoice');if(!el)return;
    var voices=availableArabicVoices().sort(function(a,b){return voiceScore(b)-voiceScore(a)});
    var preferred=el.value||localStorage.getItem('medica_queue_voice')||'';
    el.textContent='';
    var auto=document.createElement('option');auto.value='';auto.textContent='أفضل صوت عربي متوفر';el.appendChild(auto);
    voices.forEach(function(v){var option=document.createElement('option');option.value=v.voiceURI;option.textContent=v.name+' ('+v.lang+')';el.appendChild(option)});
    if(voices.some(function(v){return v.voiceURI===preferred}))el.value=preferred;
  }
  function pickArabicVoice(){
    var voices=availableArabicVoices().sort(function(a,b){return voiceScore(b)-voiceScore(a)});
    var selected=$('voiceChoice')?.value||'';
    var gender=state.queueVoice==='male' ? /bassel|hamed|male|ذكر|رجل/i : /rana|salma|hoda|female|أنثى|امرأة/i;
    return voices.find(function(v){return gender.test(v.name||'') && /neural|natural|premium|online|enhanced/i.test(v.name||'')})||voices.find(function(v){return gender.test(v.name||'')})||voices.find(function(v){return v.voiceURI===selected})||voices[0]||null;
  }

  function speakText(text){
    if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
    window.speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(text);
    u.lang='ar-SA';

    u.rate=.96;
    u.pitch=1;
    u.volume=1;
    var voice=pickArabicVoice();
    if(voice){u.voice=voice;u.lang=voice.lang||'ar-SA';}
    window.speechSynthesis.speak(u);
  }

  function announce(current){
    var name=String(current.patient_name||'المريض').trim();
    var number=current.queue_number?String(current.queue_number):'';
    speakText('يرجى من '+name+(number?'، رقم الدور '+number:'')+'، التفضل بالدخول إلى غرفة الطبيب');
    var card=$('currentCard');
    card.classList.remove('call-flash');
    void card.offsetWidth;
    card.classList.add('call-flash');
  }

  function enableSound(){
    state.soundReady=true;
    var btn=$('soundGate');
    btn.classList.add('enabled');
    btn.querySelector('strong').textContent='النداء الصوتي مفعّل';
    btn.querySelector('small').textContent='اضغط هنا لاختبار الصوت مرة أخرى';
    localStorage.setItem('medica_queue_sound','on');
    speakText('تم تفعيل النداء الصوتي');
    setTimeout(function(){
      if(state.data&&state.data.current&&state.data.current.call_seq>0){
        announce(state.data.current);
        state.lastCallKey=String(state.data.current.queue_number||0)+':'+String(state.data.current.call_seq||0);
      }
    },900);
  }

  async function refresh(){
    if(state.busy||!slug)return;
    state.busy=true;
    try{
      var r=await fetch(endpoint(),{cache:'no-store',headers:{'accept':'application/json'}});
      var j=await r.json();
      if(!r.ok){
        if(r.status===403 && j.code==='FEATURE_LOCKED'){
          state.data=null;
          $('currentName').textContent='الشاشة غير مفعّلة';
          $('currentNumber').textContent='—';
          $('waitingList').innerHTML='';
          $('waitingCount').textContent='0';
          $('nextName').textContent='—';
          $('nextNumber').textContent='—';
          $('fatalText').textContent='انتهت التجربة المجانية أو لم يتم تفعيل اشتراك شاشة الطوابير. يرجى مراجعة إدارة Medica.';
          $('fatalState').classList.remove('hidden');
        }
        throw new Error(j.error||'تعذر تحميل الطابور');
      }
      $('fatalState').classList.add('hidden');
      $('connectionState').textContent='مباشر';
      $('connectionState').parentElement.classList.remove('offline');
      render(j);
    }catch(err){
      $('connectionState').textContent='إعادة اتصال';
      $('connectionState').parentElement.classList.add('offline');
      if(!state.data&&String(err.message||'').includes('not found')){
        $('fatalText').textContent='رابط شاشة الطابور غير صحيح أو العيادة غير متاحة.';
        $('fatalState').classList.remove('hidden');
      }
    }finally{state.busy=false}
  }

  function updateClock(){
    var now=new Date();
    $('clockTime').textContent=now.toLocaleTimeString('ar-IQ',{hour:'numeric',minute:'2-digit',hour12:true});
    $('clockDate').textContent=now.toLocaleDateString('ar-IQ',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  }

  if(!slug){
    $('fatalText').textContent='لم يتم تحديد رابط العيادة.';
    $('fatalState').classList.remove('hidden');
    return;
  }

  if(location.pathname==='/queue.html'){
    try{history.replaceState(null,'','/queue/'+encodeURIComponent(slug))}catch{}
  }

  $('soundGate').addEventListener('click',enableSound);
  if(localStorage.getItem('medica_queue_sound')==='on'){
    $('soundGate').querySelector('small').textContent='اضغط مرة واحدة لتشغيل الصوت في هذه الجلسة';
  }
  fillArabicVoices();

  if(window.speechSynthesis)window.speechSynthesis.onvoiceschanged=fillArabicVoices;

  updateClock();
  setInterval(updateClock,1000);
  refresh();
  setInterval(refresh,2000);
})();
