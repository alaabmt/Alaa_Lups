// Q-SLAQ: explicit mandatory answers, accessible results, no stored patient data.
(function(){const severityItems=[['weight','Unintentional weight loss','إلى أي درجة نقص وزنك دون أن تحاول إنقاصه؟'],['fatigue','Fatigue','ما مدى شدة الإرهاق (التعب الشديد) الذي شعرتَ به؟'],['fever','Fever (>38.5°C)','ما مدى شدة الحمّى (حرارة أعلى من 38.5 درجة مئوية) التي أصبتَ بها؟'],['nodes','Swollen lymph nodes in the neck','ما مدى شدة تضخّم الغدد اللمفاوية (غدد صغيرة تحت الجلد) في رقبتك؟'],['alopecia','Hair loss in patches or clumps','ما مدى شدة تساقط شعرك على شكل بقع أو خصلات؟'],['breath','Shortness of breath','ما مدى شدة ضيق النفس (صعوبة التنفس) الذي شعرتَ به؟'],['chest','Chest pain when taking a deep breath','ما مدى شدة الألم الذي شعرتَ به في صدرك عند أخذ نفس عميق؟'],['abdomen','Abdominal pain','ما مدى شدة ألم بطنك؟'],['forget','Forgetfulness','ما مدى شدة النسيان الذي لاحظتَه؟'],['depress','Feeling depressed','ما مدى شدة شعورك بالاكتئاب؟'],['headache','Unusual headache','ما مدى شدة الصداع غير المعتاد عندك؟'],['muscleWeak','Muscle weakness','ما مدى شدة الضعف الذي شعرتَ به في عضلاتك؟'],['musclePain','Muscle pain','ما مدى شدة الألم في عضلاتك؟'],['jointPain','Joint pain or stiffness','ما مدى شدة الألم أو التيبّس (صعوبة تحريك المفصل) في مفاصلك؟'],['jointSwelling','Joint swelling','ما مدى شدة التورّم في مفاصلك؟']];const skinItems=[['malar','Butterfly-shaped rash on the cheeks','هل ظهر على خدّيك طفح على شكل فراشة؟'],['sun','Rash or feeling ill after sun exposure','هل ظهر عندك طفح جلدي، أو شعرتَ بالتوعّك بعد التعرّض للشمس؟'],['sores','Sores in the mouth or nose','هل ظهرت عندك تقرّحات في الفم أو الأنف؟']];const choices=[['None','لم يحدث'],['Mild','بدرجة خفيفة'],['Moderate','بدرجة متوسطة'],['Severe','بدرجة شديدة']];
  "use strict";
  const allItems=severityItems.concat(skinItems);
  const allIds=allItems.map(x=>x[0]);
  const questionLabels=new Map(allItems.map(x=>[x[0],x[2]]));
  const count=allIds.length+1;
  const levels=["لم يحدث","خفيفة","متوسطة","شديدة"];
  const patientLabels={
    weight:"نقص الوزن دون محاولة",fatigue:"الإرهاق",fever:"الحمّى",nodes:"تضخم غدد الرقبة",
    alopecia:"تساقط الشعر على شكل بقع أو خصل",breath:"ضيق النفس",chest:"ألم الصدر عند التنفس بعمق",
    abdomen:"ألم البطن",forget:"النسيان",depress:"الشعور بالاكتئاب",headache:"الصداع غير المعتاد",
    muscleWeak:"ضعف العضلات",musclePain:"ألم العضلات",jointPain:"ألم المفاصل أو تيبسها",
    jointSwelling:"تورم المفاصل",malar:"طفح الوجنتين بشكل فراشة",sun:"طفح أو توعك بعد الشمس",
    sores:"تقرحات الفم أو الأنف"
  };
  const $=id=>document.getElementById(id);
  function sevCard(id,en,ar){
    return '<article class="qs-card" data-question="'+id+'"><fieldset aria-required="true"><legend class="qs-en">'+en+
      ' <span class="qs-required">* مطلوب</span></legend><p class="qs-ar">خلال الشهر الماضي، '+ar+
      '</p><span class="qs-translation">ترجمة توضيحية</span><div class="qs-options">'+
      choices.map((choice,i)=>'<label><input type="radio" required name="'+id+'" value="'+i+'">'+
      '<span class="qs-choice"><strong>'+choice[0]+'</strong><small>'+choice[1]+'</small></span></label>').join('')+
      '</div></fieldset></article>';
  }
  function binCard(id,en,ar){
    return '<article class="qs-card" data-question="'+id+'"><fieldset aria-required="true"><legend class="qs-en">'+en+
      ' <span class="qs-required">* مطلوب</span></legend><p class="qs-ar">خلال الشهر الماضي، '+ar+
      '</p><span class="qs-translation">ترجمة توضيحية</span><div class="qs-options qs-binary">'+
      '<label><input type="radio" required name="'+id+'" value="1"><span class="qs-choice"><strong>Yes</strong><small>نعم</small></span></label>'+
      '<label><input type="radio" required name="'+id+'" value="0"><span class="qs-choice"><strong>No</strong><small>لا</small></span></label>'+
      '</div></fieldset></article>';
  }
  $("severityGrid").innerHTML=severityItems.map(x=>sevCard(...x)).join('');
  $("skinGrid").innerHTML=skinItems.map(x=>binCard(...x)).join('');
  const form=$("qsForm"),results=$("results"),rating=$("global"),error=$("formError");
  let currentReport=null;
  let detailsInitiallyOpen=false;
  function response(name){
    const input=form.querySelector('input[name="'+name+'"]:checked');
    return input?Number(input.value):null;
  }
  function positive(name){const n=response(name);return n===null?0:Number(n>0);}
  function unanswered(){
    const names=allIds.filter(name=>response(name)===null);
    if(rating.value===""||!/^(10|[0-9])$/.test(rating.value))names.push("global");
    return names;
  }
  function progress(){
    const missing=unanswered();
    $("qsProgressText").textContent=(count-missing.length)+" من "+count;
    $("qsProgressBar").value=count-missing.length;
    for(const card of form.querySelectorAll("[data-question]")){
      const absent=!error.hidden&&missing.includes(card.dataset.question);
      card.classList.toggle("qs-unanswered",absent);
      for(const input of card.querySelectorAll('input[type="radio"]')){
        if(absent)input.setAttribute("aria-invalid","true");
        else input.removeAttribute("aria-invalid");
      }
    }
    rating.closest(".qs-global").classList.toggle("qs-unanswered",!error.hidden&&missing.includes("global"));
    if(!error.hidden&&missing.includes("global"))rating.setAttribute("aria-invalid","true");
    else rating.removeAttribute("aria-invalid");
    return missing;
  }
  function clearError(){error.hidden=true;error.textContent="";progress();}
  function clearResult(){
    results.classList.add("qs-hidden");
    document.body.classList.remove("qs-print-only");
    currentReport=null;
    $("qsVaultPassword").value="";
    setText("qsDeviceStatus","");
  }
  function showMissing(missing){
    error.hidden=false;
    const names=missing.slice(0,4).map(name=>name==="global"?"التقييم العام من 0 إلى 10":questionLabels.get(name));
    error.textContent="لا يمكن حساب النتيجة قبل الإجابة عن جميع الأسئلة. عدد الأسئلة غير المجابة: "+missing.length+
      ". من بينها: "+names.join("، ")+(missing.length>4?"، وغيرها.":".")+
      " اختر «لم يحدث» أو «لا» عندما لا يكون العرض موجودًا.";
    progress();
    const first=missing[0]==="global"?rating:form.querySelector('input[name="'+missing[0]+'"]');
    if(first){
      const card=first.closest(".qs-card,.qs-global");
      if(card)card.scrollIntoView({behavior:"smooth",block:"center"});
      try{first.focus({preventScroll:true});}catch(_){first.focus();}
    }
  }
  function setText(id,text){$(id).textContent=text;}
  function report(weighted,symptoms,g){
    setText("weightedScore",weighted+" / 34");
    setText("symptomScore",symptoms+" / 18");
    setText("globalScore",g+" / 10");
    setText("resultDate","تاريخ إعداد الملخص: "+new Date().toLocaleDateString("ar-AE")+" · الإجابات عن الشهر الماضي");
    setText("resultLead","الدرجات الثلاث مختلفة في معناها. تصف هذه الأرقام تجربتك مع الأعراض ولا تحل محل تقييم الطبيب لنشاط الذئبة.");
    setText("severityMeaning","سجّلت "+weighted+" نقطة من أصل 34 في مؤشر يجمع شدّة الأعراض التي وصفتها. ارتفاع الرقم يعكس عبئًا أكبر من الأعراض المبلّغ عنها، لكنه ليس نسبة خطورة، ولا يصنّف مرضك تلقائيًا إلى خفيف أو متوسط أو شديد.");
    setText("symptomMeaning","أبلغت عن وجود "+symptoms+" من أصل 18 عرضًا مذكورًا في الاستبيان. يُحسب العرض مرة واحدة سواء كان خفيفًا أو متوسطًا أو شديدًا؛ لا يعني هذا العدد أن لديك "+symptoms+" مضاعفات أو أن الذئبة سبّبتها جميعًا.");
    setText("globalMeaning","اخترت "+g+" من 10 لتصف إحساسك العام بنشاط المرض خلال الشهر الماضي؛ 0 يعني أنك لا تشعر بنشاط، و10 أشد نشاط يمكنك تصوّره. وهو سؤال مستقل عن مجموع الشدة وعدد الأعراض."+
      (g===0&&symptoms>0?" اخترت الصفر رغم وجود أعراض في الإجابات الأخرى؛ هذا ليس خطأ حسابيًا ويمكن مناقشة الاختلاف مع طبيبك.":""));
    const significant=severityItems.map(x=>({label:patientLabels[x[0]],score:response(x[0]),binary:false}))
      .filter(x=>x.score>0)
      .concat(skinItems.map(x=>({label:patientLabels[x[0]],score:response(x[0]),binary:true})).filter(x=>x.score>0))
      .sort((a,b)=>b.score-a.score);
    const list=$("qsPriorityList");
    list.replaceChildren();
    if(!significant.length){
      const li=document.createElement("li");li.textContent="لم تذكر أعراضًا ضمن البنود التي يشملها هذا الاختبار.";list.append(li);
    }else{
      for(const item of significant){
        const li=document.createElement("li");
        li.textContent=item.label+" — "+(item.binary?"أبلغت عن وجوده":"الشدة التي وصفتها: "+levels[item.score]);
        list.append(li);
      }
    }
    setText("qsDiscussion",significant.length?
      "ناقش مع الطبيب أي الأعراض أثّر أكثر في حياتك، ومتى بدأ، وهل تغيّر منذ آخر زيارة، وما الذي يستدعي فحصًا أو متابعة. ويمكن مقارنة النتائج السابقة إذا استُخدمت الطريقة نفسها.":
      "احتفظ بالملخص لمقارنة التغيّر لاحقًا. واذكر لفريقك الطبي أي أعراض لم تُذكر في هذا الاستبيان، حتى لو كانت جميع الإجابات «لم يحدث».");
    const redFlag=response("breath")>0||response("chest")>0;
    $("qsSafety").hidden=false;
    setText("qsSafety",redFlag?
      "ذكرت ضيق النفس أو ألم الصدر. ناقش ذلك مع فريقك الصحي، وإذا كان العرض جديدًا أو شديدًا أو موجودًا حاليًا فاطلب تقييمًا عاجلًا ولا تنتظر نتيجة الاستبيان.":
      "إذا ظهر ألم صدر جديد أو ضيق نفس شديد أو أعراض حادة، فاطلب مساعدة طبية عاجلة دون انتظار نتيجة Q-SLAQ.");
  }
  function buildFullQuestions(){
    const container=$("qsPrintedQuestions");
    container.replaceChildren();
    const addHeading=text=>{
      const h=document.createElement("h3");h.className="qs-report-group";h.textContent=text;container.append(h);
    };
    const item=(number,en,ar,answer,extra)=>{
      const article=document.createElement("article");article.className="qs-printed-question";
      const title=document.createElement("h4");title.textContent=number+". "+en;
      const arabic=document.createElement("p");arabic.className="ar";arabic.textContent="خلال الشهر الماضي، "+ar;
      const choice=document.createElement("p");choice.className="qs-printed-choice";choice.textContent="إجابة المريض: "+answer;
      const note=document.createElement("small");note.textContent=extra;
      article.append(title,arabic,choice,note);container.append(article);
    };
    addHeading("الجزء الأول — شدّة الأعراض (15 سؤالًا)");
    severityItems.forEach((q,index)=>{
      const v=response(q[0]);
      const selected=v===0?"None — لم يحدث":v===1?"Mild — بدرجة خفيفة":
        v===2?"Moderate — بدرجة متوسطة":"Severe — بدرجة شديدة";
      item(index+1,q[1],q[2],selected,"الخيارات المعروضة: None / Mild / Moderate / Severe");
    });
    addHeading("الجزء الثاني — أعراض الجلد والأغشية المخاطية (3 أسئلة)");
    skinItems.forEach((q,index)=>item(severityItems.length+index+1,q[1],q[2],
      response(q[0])===1?"Yes — نعم":"No — لا","الخيارات المعروضة: Yes / No"));
    addHeading("الجزء الثالث — التقييم الشخصي العام (سؤال واحد)");
    item(19,"Patient's Global Disease Activity during the past month",
      "ما تقييمك العام لنشاط الذئبة كما تشعر به؟",rating.value+" / 10",
      "0 = لا نشاط بحسب تقييمك، 10 = أشد نشاط يمكنك تخيّله.");
  }
  function buildSnapshot(weighted,symptoms,g){
    const questions=allItems.map((q,index)=>({
      id:q[0],en:q[1],ar:q[2],value:response(q[0]),
      type:index<severityItems.length?"severity":"binary"
    }));
    questions.push({id:"global",en:"Patient's Global Disease Activity during the past month",
      ar:"ما تقييمك العام لنشاط الذئبة خلال الشهر الماضي كما تشعر به؟",
      value:g,type:"global"});
    return {tool:"Q-SLAQ",schema:1,
      completedAt:new Date().toISOString(),period:"الشهر الماضي",
      algorithm:"SRQ Q-SLAQ / 0-34 severity / 0-18 symptom / 0-10 global",
      scores:{severity:weighted,symptoms,global:g},
      answers:Object.fromEntries(questions.map(q=>[q.id,q.value])),questions};
  }
  async function saveToThisDevice(){
    setText("qsDeviceStatus","");
    if(!currentReport||results.classList.contains("qs-hidden")){
      setText("qsDeviceStatus","احسب النتيجة كاملة أولًا.");return;
    }
    if(!$("qsSaveConsent").checked){
      setText("qsDeviceStatus","يرجى الموافقة صراحةً على التخزين المشفّر المحلي قبل الحفظ.");return;
    }
    const pass=$("qsVaultPassword").value;
    if(pass.length<12){
      setText("qsDeviceStatus","استخدم عبارة سرية مستقلة من 12 حرفًا على الأقل، ولا تكتب كلمة مرور حسابك.");return;
    }
    const vault=window.NA7NQslaQVault;
    if(!vault||!vault.available()){
      setText("qsDeviceStatus","لا يدعم هذا المتصفح التخزين المشفّر المطلوب. استخدم طباعة أو حفظ التقرير PDF.");return;
    }
    const button=$("qsSaveToAccount");button.disabled=true;
    try{
      const supabase=window.na7nSupabase;
      if(!supabase)throw new Error("auth_unavailable");
      const {data,error}=await supabase.auth.getUser();
      if(error||!data?.user||data.user.is_anonymous){
        setText("qsDeviceStatus","سجّل الدخول إلى «حسابي» أولًا من هذا المتصفح ثم عُد إلى هذه الصفحة. التقرير لم يُحفَظ.");return;
      }
      await vault.save(data.user.id,pass,currentReport);
      setText("qsDeviceStatus","حُفظت النتيجة بصورة مشفّرة محليًا لهذا الحساب على هذا الجهاز فقط. افتح «حسابي» هنا وأدخل العبارة السرية نفسها لعرضها. لا توجد مزامنة بين الأجهزة.");
    }catch(_){
      setText("qsDeviceStatus","تعذر الحفظ المشفّر. لم نُرسل الإجابات إلى خادم؛ يمكنك حفظ التقرير PDF.");
    }finally{button.disabled=false;$("qsVaultPassword").value="";}
  }
  form.addEventListener("change",()=>{clearError();clearResult();progress();});
  form.addEventListener("submit",event=>{
    event.preventDefault();
    clearResult();
    const missing=unanswered();
    if(missing.length){showMissing(missing);return;}
    clearError();
    // Preserve the SRQ Q-SLAQ algorithm (0–34) and symptom count (0–18).
    const skin=Math.max(response("malar"),response("sun"),response("sores"))>0?1:0;
    const pulmonary=Math.max(response("breath"),response("chest"));
    const cognitive=Math.max(response("forget"),response("depress"));
    const muscle=response("muscleWeak")>0?response("muscleWeak"):response("musclePain");
    const joint=response("jointSwelling")>0?response("jointSwelling"):response("jointPain");
    const weighted=response("weight")+response("fatigue")+response("fever")+response("nodes")+
      skin+response("alopecia")+pulmonary+response("abdomen")+cognitive+response("headache")+muscle+joint;
    const symptoms=allIds.reduce((sum,name)=>sum+positive(name),0);
    const g=Number(rating.value);
    report(weighted,symptoms,g);
    buildFullQuestions();
    currentReport=buildSnapshot(weighted,symptoms,g);
    $("qsSaveConsent").checked=false;
    $("qsVaultPassword").value="";
    $("qsDeviceStatus").textContent="";
    results.classList.remove("qs-hidden");
    results.scrollIntoView({behavior:"smooth",block:"start"});
  });
  form.addEventListener("reset",()=>{
    clearResult();
    setTimeout(()=>{clearError();progress();},0);
  });
  $("qsSaveToAccount").addEventListener("click",saveToThisDevice);
  $("printResult").addEventListener("click",()=>{
    if(results.classList.contains("qs-hidden"))return;
    const details=$("qsFullQuestionnaire");
    detailsInitiallyOpen=details.open;
    details.open=true;
    document.body.classList.add("qs-print-only");
    window.print();
  });
  window.addEventListener("afterprint",()=>{
    document.body.classList.remove("qs-print-only");
    $("qsFullQuestionnaire").open=detailsInitiallyOpen;
  });
  progress();
})();
