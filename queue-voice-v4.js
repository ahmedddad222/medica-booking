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

  // Medica Voice V6: bundled Nabra AI Arabic voice, served from this domain.
  var voice={enabled:false,playing:null,serial:0,engine:null,loading:null,audioContext:null,extraSources:[]};
  function voiceStatus(message,error){var label=$('voiceStatus');if(label){label.textContent=message;label.style.color=error?'#fda4af':'#a7f3d0'}}
  function stopVoice(){
    voice.serial++;
    voice.extraSources.forEach(function(source){try{source.stop()}catch{}try{source.disconnect()}catch{}});
    voice.extraSources=[];
    if(voice.playing){try{voice.playing.stop()}catch{}try{voice.playing.disconnect()}catch{}voice.playing=null}
  }
  function notificationChime(ctx,at){
    [660,880].forEach(function(freq,index){
      var oscillator=ctx.createOscillator(),gain=ctx.createGain();
      var start=at+index*.28;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(freq,start);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(.105,start+.035);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.54);
      oscillator.connect(gain);gain.connect(ctx.destination);
      oscillator.start(start);oscillator.stop(start+.56);
      voice.extraSources.push(oscillator);
    });
  }
  async function localEngine(){
    if(voice.engine)return voice.engine;
    if(!voice.loading)voice.loading=(async function(){
      voiceStatus('جاري تحميل محرك الصوت العربي...');
      var module=await import('/queue-nabra-bundle.js?v=7');
      if(!module.NabraTTS)throw Error('حزمة الصوت ناقصة');
      // Probe each required resource separately to locate the exact network failure.
      var tests=[
        ['نموذج الصوت','https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX/resolve/main/onnx/model_fp16.onnx'],
        ['بيانات الصوت','https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX/resolve/main/voices/af_msa.bin'],
        ['ملف WebAssembly','/queue-onnx/ort-wasm-simd-threaded.jsep.wasm'],
        ['ملف تشغيل ONNX','/queue-onnx/ort-wasm-simd-threaded.jsep.mjs']
      ];
      for(var j=0;j<tests.length;j++){
        var target=tests[j];
        voiceStatus('فحص تحميل '+target[0]+'...');
        try{
          var probe=await fetch(target[1],{method:'GET',headers:{Range:'bytes=0-0'},cache:'no-store'});
          if(!probe.ok)throw Error('HTTP '+probe.status);
          try{await probe.body?.cancel()}catch(e){}
        }catch(probeError){
          throw Error('فشل اتصال '+target[0]+': '+String(probeError.message||probeError)+' — '+target[1]);
        }
      }
      voice.engine=await module.NabraTTS.load({
        dtype:'fp16',device:'wasm',worker:false,wasmPaths:'/queue-onnx/',
        onProgress:function(p){if(p.total>0)voiceStatus('تنزيل النموذج العربي: '+Math.round(100*p.loaded/p.total)+'٪')}
      });
      return voice.engine;
    })().catch(function(e){voice.loading=null;throw e});
    return voice.loading;
  }
  async function playVoice(test,call){
    if(!voice.enabled)return;
    stopVoice();var id=voice.serial;
    var text='يُرجى من '+String(call.patient_name||'المريض').trim().slice(0,70)+' الدخول إلى الطبيب.';
    try{
      var engine=await localEngine();
      voiceStatus('جاري توليد النداء العربي...');
      var result=await engine.generate(text);
      if(id!==voice.serial)return;
      // Play generated raw PCM directly using Web Audio; avoids CSP-blocked blob: media URLs.
      if(!(result.audio instanceof Float32Array)||result.audio.length===0)throw Error('محرك الصوت لم ينتج بيانات صوتية');
      var ctx=voice.audioContext||(voice.audioContext=new (window.AudioContext||window.webkitAudioContext)());
      if(ctx.state==='suspended')await ctx.resume();
      var sampleRate=Number(result.sampleRate)||24000;
      var buffer=ctx.createBuffer(1,result.audio.length,sampleRate);
      buffer.copyToChannel(result.audio, 0);
      var source=ctx.createBufferSource();
      source.buffer=buffer;
      var direct=ctx.createGain();direct.gain.value=.88;
      var delay=ctx.createDelay(.5);delay.delayTime.value=.125;
      var echo=ctx.createGain();echo.gain.value=.13;
      source.connect(direct);direct.connect(ctx.destination);
      source.connect(delay);delay.connect(echo);echo.connect(ctx.destination);
      voice.playing=source;
      source.onended=function(){if(voice.playing===source)voice.playing=null;voiceStatus('الصوت جاهز')};
      var startAt=ctx.currentTime+.05;
      notificationChime(ctx,startAt);
      source.start(startAt+.86);
      voiceStatus('الصوت العربي يعمل');
    }catch(e){if(id===voice.serial)voiceStatus('الصوت العربي غير جاهز: '+String(e.message||e),true);console.error('Medica local Arabic TTS',e)}
  }
  function announce(call){var card=$('currentCard');card.classList.remove('call-flash');void card.offsetWidth;card.classList.add('call-flash');if(voice.enabled)playVoice(false,call)}
  function enableSound(){voice.enabled=true;state.soundReady=true;try{voice.audioContext=voice.audioContext||new (window.AudioContext||window.webkitAudioContext)();voice.audioContext.resume()}catch(e){voiceStatus('المتصفح لا يدعم Web Audio',true);return}localStorage.setItem('medica_queue_sound','on');$('soundGate').classList.add('enabled');$('soundGate').querySelector('strong').textContent='النداء العربي مفعّل';$('soundGate').querySelector('small').textContent='جاهز للنداء عند وصول الدور'}

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
  updateClock();
  setInterval(updateClock,1000);
  refresh();
  setInterval(refresh,2000);
})();
