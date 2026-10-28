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

  // Medica Voice V2: audio files only; no browser text-to-speech and no English fallback.
  var voice={enabled:false,playing:null,generation:0};
  function voiceStatus(message,error){
    var label=$('voiceStatus');
    if(label){label.textContent=message;label.style.color=error?'#fda4af':'#a7f3d0'}
  }
  function stopVoice(){
    voice.generation++;
    if(voice.playing){try{voice.playing.pause();voice.playing.src=''}catch{}voice.playing=null}
  }
  async function playVoice(test,call){
    if(!voice.enabled)return;
    stopVoice();
    var generation=voice.generation;
    var params=test?'?speech=1&test=1':'?speech=1&seq='+encodeURIComponent(call.call_seq);
    voiceStatus('جاري تحضير النداء العربي...');
    try{
      var ctrl=new AbortController(),timeout=setTimeout(function(){ctrl.abort()},11000);
      var response;
      try{response=await fetch(endpoint()+params,{cache:'no-store',signal:ctrl.signal})}finally{clearTimeout(timeout)}
      if(!response.ok){
        var detail='';try{detail=(await response.json()).error||''}catch{}
        throw Error('HTTP '+response.status+(detail?' — '+detail:''));
      }
      var type=response.headers.get('content-type')||'';
      if(!type.startsWith('audio/'))throw Error('الخادم لم يرجع ملف صوت');
      var blob=await response.blob();
      if(blob.size<200)throw Error('الملف الصوتي فارغ');
      if(generation!==voice.generation)return;
      var blobUrl=URL.createObjectURL(blob),audio=new Audio(blobUrl);
      voice.playing=audio;
      audio.onended=function(){URL.revokeObjectURL(blobUrl);if(voice.playing===audio)voice.playing=null;voiceStatus('النداء الصوتي جاهز')};
      audio.onerror=function(){URL.revokeObjectURL(blobUrl);voiceStatus('تعذر تشغيل الملف الصوتي',true)};
      try{await audio.play()}catch(error){URL.revokeObjectURL(blobUrl);throw error}
      voiceStatus('النداء العربي يعمل');
    }catch(error){
      if(generation!==voice.generation)return;
      voiceStatus('الصوت الخارجي غير متاح: '+String(error.message||error),true);
      console.warn('Medica Voice V2:',error);
    }
  }
  function announce(call){
    var card=$('currentCard');
    card.classList.remove('call-flash');
    void card.offsetWidth;
    card.classList.add('call-flash');
    if(voice.enabled)playVoice(false,call);
  }
  function enableSound(){
    voice.enabled=true;
    state.soundReady=true;
    localStorage.setItem('medica_queue_sound','on');
    $('soundGate').classList.add('enabled');
    $('soundGate').querySelector('strong').textContent='النداء الصوتي مفعّل';
    $('soundGate').querySelector('small').textContent='اضغط هنا لاختبار الصوت';
    playVoice(true);
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
  $('testArabicVoice').addEventListener('click',function(){
    if(!voice.enabled)enableSound();else playVoice(true);
  });
  updateClock();
  setInterval(updateClock,1000);
  refresh();
  setInterval(refresh,2000);
})();
