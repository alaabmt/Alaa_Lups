// NA7N English Q-SLAQ pilot: same question order and SRQ group scoring as Arabic version.
// Testing only; real patient data must not be entered in the current environment.
(() => {
  "use strict";
  const severityItems=[['weight','Unintentional weight loss','إلى أي درجة نقص وزنك دون أن تحاول إنقاصه؟'],['fatigue','Fatigue','ما مدى شدة الإرهاق (التعب الشديد) الذي شعرتَ به؟'],['fever','Fever (>38.5°C)','ما مدى شدة الحمّى (حرارة أعلى من 38.5 درجة مئوية) التي أصبتَ بها؟'],['nodes','Swollen lymph nodes in the neck','ما مدى شدة تضخّم الغدد اللمفاوية (غدد صغيرة تحت الجلد) في رقبتك؟'],['alopecia','Hair loss in patches or clumps','ما مدى شدة تساقط شعرك على شكل بقع أو خصلات؟'],['breath','Shortness of breath','ما مدى شدة ضيق النفس (صعوبة التنفس) الذي شعرتَ به؟'],['chest','Chest pain when taking a deep breath','ما مدى شدة الألم الذي شعرتَ به في صدرك عند أخذ نفس عميق؟'],['abdomen','Abdominal pain','ما مدى شدة ألم بطنك؟'],['forget','Forgetfulness','ما مدى شدة النسيان الذي لاحظتَه؟'],['depress','Feeling depressed','ما مدى شدة شعورك بالاكتئاب؟'],['headache','Unusual headache','ما مدى شدة الصداع غير المعتاد عندك؟'],['muscleWeak','Muscle weakness','ما مدى شدة الضعف الذي شعرتَ به في عضلاتك؟'],['musclePain','Muscle pain','ما مدى شدة الألم في عضلاتك؟'],['jointPain','Joint pain or stiffness','ما مدى شدة الألم أو التيبّس (صعوبة تحريك المفصل) في مفاصلك؟'],['jointSwelling','Joint swelling','ما مدى شدة التورّم في مفاصلك؟']];const skinItems=[['malar','Butterfly-shaped rash on the cheeks','هل ظهر على خدّيك طفح على شكل فراشة؟'],['sun','Rash or feeling ill after sun exposure','هل ظهر عندك طفح جلدي، أو شعرتَ بالتوعّك بعد التعرّض للشمس؟'],['sores','Sores in the mouth or nose','هل ظهرت عندك تقرّحات في الفم أو الأنف؟']];const choices=[['None','لم يحدث'],['Mild','بدرجة خفيفة'],['Moderate','بدرجة متوسطة'],['Severe','بدرجة شديدة']];
  const allItems=severityItems.concat(skinItems);
  const allIds=allItems.map(row=>row[0]);
  const questionLabels=Object.fromEntries(allItems.map(row=>[row[0],row[1]]));
  const levels=["None","Mild","Moderate","Severe"];
  const $=id=>document.getElementById(id);
  const form=$("qsForm"),results=$("results"),globalRating=$("global"),error=$("formError");
  if(!form || !results || !globalRating || !error) return;
  let currentReport=null,syntheticGenerated=false,initialDetailsOpen=false,resultsSynthetic=false;
  function card(row,binary){
    const [id,name]=row;
    const q=document.createElement("article");q.className="qs-card";q.dataset.question=id;
    const field=document.createElement("fieldset");field.setAttribute("aria-required","true");
    const legend=document.createElement("legend");legend.textContent=name+" ";
    const required=document.createElement("span");required.className="qs-required";required.textContent="Required";
    legend.append(required);field.append(legend);
    const choicesDiv=document.createElement("div");choicesDiv.className="qs-options";
    const opts=binary?[["Yes",1],["No",0]]:choices.map(([en],i)=>[en,i]);
    for(const [label,value] of opts){
      const wrapper=document.createElement("label"),radio=document.createElement("input"),text=document.createElement("span");
      radio.type="radio";radio.name=id;radio.value=String(value);radio.required=true;
      text.textContent=label;wrapper.append(radio,text);choicesDiv.append(wrapper);
    }
    field.append(choicesDiv);q.append(field);return q;
  }
  severityItems.forEach(row=>$("severityGrid").append(card(row,false)));
  skinItems.forEach(row=>$("skinGrid").append(card(row,true)));
  function response(name){const selected=form.querySelector('input[name="'+name+'"]:checked');return selected?Number(selected.value):null;}
  function positive(name){const value=response(name);return value===null?0:Number(value>0);}
  function missing(){
    const result=allIds.filter(id=>response(id)===null);
    if(globalRating.value==="" || !/^(10|[0-9])$/.test(globalRating.value))result.push("global");
    return result;
  }
  function updateProgress(){
    const unanswered=missing(),answered=19-unanswered.length;
    $("qsProgressText").textContent=answered+" of 19";
    $("qsProgressBar").value=answered;
    form.querySelectorAll("[data-question]").forEach(el=>{
      const isMissing=!error.hidden&&unanswered.includes(el.dataset.question);
      el.classList.toggle("qs-unanswered",isMissing);
      el.querySelectorAll("input").forEach(input=>{
        if(isMissing)input.setAttribute("aria-invalid","true");
        else input.removeAttribute("aria-invalid");
      });
    });
    globalRating.closest(".qs-global").classList.toggle("qs-unanswered",!error.hidden&&unanswered.includes("global"));
    return unanswered;
  }
  function clearError(){error.hidden=true;error.textContent="";updateProgress();}
  function clearResult(){
    results.hidden=true;document.body.classList.remove("qs-print-only");
    currentReport=null;resultsSynthetic=false;
    $("qsSyntheticPrintMark").hidden=true;
    $("qsSaveDemoCloud").disabled=true;$("qsSyntheticConsent").checked=false;$("qsSaveConsent").checked=false;
    $("qsDemoCloudStatus").textContent="";$("qsDeviceStatus").textContent="";$("qsVaultPassword").value="";
  }
  function showError(unanswered){
    error.hidden=false;error.textContent="Please answer all 19 questions before calculating. Missing: "+unanswered.length+". For example: "+
      unanswered.slice(0,4).map(id=>id==="global"?"your 0–10 global rating":questionLabels[id]).join(", ")+
      ". Choose None or No if a symptom was not present.";
    updateProgress();
    const first=unanswered[0]==="global"?globalRating:form.querySelector('input[name="'+unanswered[0]+'"]');
    if(first){first.closest(".qs-card,.qs-global")?.scrollIntoView({behavior:"smooth",block:"center"});first.focus({preventScroll:true});}
  }
  function calculateScores(){
    // Identical to q-slaq.js Arabic implementation, using SRQ 0–34 grouping:
    const skin=Math.max(response("malar"),response("sun"),response("sores"))>0?1:0;
    const pulmonary=Math.max(response("breath"),response("chest"));
    const cognitive=Math.max(response("forget"),response("depress"));
    const muscle=response("muscleWeak")>0?response("muscleWeak"):response("musclePain");
    const joint=response("jointSwelling")>0?response("jointSwelling"):response("jointPain");
    const weighted=response("weight")+response("fatigue")+response("fever")+response("nodes")+
      skin+response("alopecia")+pulmonary+response("abdomen")+cognitive+response("headache")+muscle+joint;
    const symptoms=allIds.reduce((total,id)=>total+positive(id),0);
    const g=Number(globalRating.value);
    return {weighted,symptoms,g};
  }
  function setText(id,val){$(id).textContent=val;}
  function showReport({weighted,symptoms,g}){
    setText("weightedScore",weighted+" / 34");
    setText("symptomScore",symptoms+" / 18");
    setText("globalScore",g+" / 10");
    setText("resultDate","Report date: "+new Intl.DateTimeFormat("en-AE",{day:"numeric",month:"long",year:"numeric"}).format(new Date())+" · Answers cover the past month");
    setText("resultLead","These are three distinct patient-reported measures. They cannot diagnose a lupus flare or indicate whether medicines should change.");
    setText("severityMeaning","You reported "+weighted+" of 34 possible symptom-severity points under the SRQ Q-SLAQ scoring rules. This is not a percentage of disease risk or a medically established mild/moderate/severe category.");
    setText("symptomMeaning","You reported "+symptoms+" of the 18 listed symptoms. Each symptom is counted once when present, regardless of its severity; this does not prove lupus caused all of them.");
    setText("globalMeaning","You selected "+g+" of 10 for how active lupus felt during the past month. This is independent of the symptom count and severity score."+
     (g===0&&symptoms>0?" You rated activity at zero despite reporting some symptoms; you can discuss that difference with your clinician.":""));
    const significant=severityItems.map(row=>({label:row[1],score:response(row[0]),binary:false}))
      .filter(x=>x.score>0).concat(skinItems.map(row=>({label:row[1],score:response(row[0]),binary:true})).filter(x=>x.score>0))
      .sort((a,b)=>b.score-a.score);
    const list=$("qsPriorityList");list.replaceChildren();
    if(!significant.length){const li=document.createElement("li");li.textContent="No listed symptoms were reported.";list.append(li);}
    else significant.forEach(x=>{const li=document.createElement("li");li.textContent=x.label+" — "+(x.binary?"Reported present":levels[x.score]);list.append(li);});
    setText("qsDiscussion",significant.length?
      "Ask about the symptoms affecting daily life most, when they began, what has changed, and what needs examination or follow-up. Compare past results only when the same method was used.":
      "Tell your team about any symptoms not included in these 18 questions, even if all of your responses here were None or No.");
    const redFlag=response("breath")>0||response("chest")>0;
    $("qsSafety").hidden=false;
    setText("qsSafety",redFlag?
      "You reported breathlessness or chest pain. If these symptoms are new, severe or occurring now, seek urgent assessment rather than waiting for questionnaire follow-up.":
      "New chest pain, severe breathlessness or other acute symptoms need urgent medical assessment, regardless of this score.");
  }
  function reportQuestions(){
    const target=$("qsPrintedQuestions");target.replaceChildren();
    for(const [index,row] of allItems.entries()){
      const [id,name]=row,v=response(id),isBinary=index>=severityItems.length;
      const article=document.createElement("article");article.className="qs-printed";
      const question=document.createElement("strong");question.textContent=(index+1)+". "+name;
      const p=document.createElement("p");p.textContent="Selected answer: "+(isBinary?(v===1?"Yes":"No"):levels[v]);
      article.append(question,p);target.append(article);
    }
    const q=document.createElement("article");q.className="qs-printed";
    q.textContent="19. Patient's Global Disease Activity during the past month — "+globalRating.value+" / 10";target.append(q);
  }
  function snapshot({weighted,symptoms,g}){
    const questions=allItems.map((row,index)=>({id:row[0],en:row[1],ar:row[2],value:response(row[0]),type:index<severityItems.length?"severity":"binary"}));
    questions.push({id:"global",en:"Patient's Global Disease Activity during the past month",
      ar:"ما تقييمك العام لنشاط الذئبة خلال الشهر الماضي كما تشعر به؟",value:g,type:"global"});
    return {tool:"Q-SLAQ",schema:1,completedAt:new Date().toISOString(),period:"past month",
      algorithm:"SRQ Q-SLAQ / 0-34 severity / 0-18 symptom / 0-10 global",
      scores:{severity:weighted,symptoms,global:g},
      answers:Object.fromEntries(questions.map(q=>[q.id,q.value])),questions};
  }
  function generateDemo(){
    for(const name of allIds){
      const max=skinItems.some(row=>row[0]===name)?1:3;
      const value=Math.floor(Math.random()*(max+1));
      const choice=form.querySelector('input[name="'+name+'"][value="'+value+'"]');if(choice)choice.checked=true;
    }
    globalRating.value=String(Math.floor(Math.random()*11));
    syntheticGenerated=true;clearError();clearResult();updateProgress();
    setText("qsDemoGeneratorStatus","All 19 responses are fictitious. Calculate results before saving them to the demo account.");
  }
  async function saveCloudDemo(){
    const status=$("qsDemoCloudStatus");status.textContent="";
    if(!syntheticGenerated||!currentReport||results.hidden){
      status.textContent="Only newly generated fictitious results may be saved to the demo database.";return;
    }
    if(!$("qsSyntheticConsent").checked){
      status.textContent="Confirm that these are automatically generated, fictitious responses.";return;
    }
    const button=$("qsSaveDemoCloud"),service=window.NA7NQslaQDemo;
    if(!service){status.textContent="Test-account saving is unavailable.";return;}
    button.disabled=true;
    try{
      const res=await service.save(currentReport.answers,true);
      status.textContent="Saved a fictitious test record dated "+
        new Date(res.completed_at).toLocaleString("en-AE")+
        ". Sign in to My Account to view test history.";
      syntheticGenerated=false;$("qsSyntheticConsent").checked=false;
      setText("qsDemoGeneratorStatus","One fictitious record was saved. Generate a fresh set to test again.");
    }catch(_){status.textContent="Unable to save. Check that you are signed in and online.";button.disabled=false;}
  }
  async function saveDevice(){
    const status=$("qsDeviceStatus");status.textContent="";
    if(!currentReport||results.hidden){status.textContent="Calculate a complete report first.";return;}
    if(!$("qsSaveConsent").checked){status.textContent="Explicit consent is required for encrypted local storage.";return;}
    const pass=$("qsVaultPassword").value;
    if(pass.length<12){status.textContent="Use a separate passphrase of at least 12 characters, not your account password.";return;}
    const vault=window.NA7NQslaQVault;
    if(!vault||!vault.available()){status.textContent="Encrypted storage is not supported by this browser. Print to PDF instead.";return;}
    const button=$("qsSaveToAccount");button.disabled=true;
    try{
      const client=window.na7nSupabase;
      if(!client)throw Error("No account service");
      const {data,error}=await client.auth.getUser();
      if(error||!data?.user||data.user.is_anonymous){status.textContent="Sign in to My Account in this browser first; no report was saved.";return;}
      await vault.save(data.user.id,pass,currentReport);
      status.textContent="Encrypted test report saved on this device only for this account. It does not sync across devices.";
    }catch(_){status.textContent="Encrypted save failed. No health answers were sent to the server."; }
    finally{button.disabled=false;$("qsVaultPassword").value="";}
  }
  form.addEventListener("change",()=>{
    syntheticGenerated=false;
    setText("qsDemoGeneratorStatus","Manual edits cannot be uploaded as demo records. Generate a new fictitious response set for cloud testing.");
    clearError();clearResult();updateProgress();
  });
  form.addEventListener("submit",event=>{
    event.preventDefault();clearResult();
    const unanswered=missing();if(unanswered.length){showError(unanswered);return;}
    clearError();
    const scores=calculateScores();showReport(scores);reportQuestions();
    currentReport=snapshot(scores);resultsSynthetic=syntheticGenerated;
    $("qsSyntheticPrintMark").hidden=!resultsSynthetic;
    $("qsSaveDemoCloud").disabled=!syntheticGenerated;
    results.hidden=false;results.scrollIntoView({behavior:"smooth",block:"start"});
  });
  form.addEventListener("reset",()=>{
    syntheticGenerated=false;clearResult();setText("qsDemoGeneratorStatus","Only test responses should be used here.");
    setTimeout(()=>{clearError();updateProgress();},0);
  });
  $("qsGenerateDemo").addEventListener("click",generateDemo);
  $("qsSaveDemoCloud").addEventListener("click",saveCloudDemo);
  $("qsSaveToAccount").addEventListener("click",saveDevice);
  $("printResult").addEventListener("click",()=>{
    if(results.hidden)return;
    const d=$("qsFullQuestionnaire");initialDetailsOpen=d.open;d.open=true;
    document.body.classList.add("qs-print-only");window.print();
  });
  window.addEventListener("afterprint",()=>{
    document.body.classList.remove("qs-print-only");
    $("qsFullQuestionnaire").open=initialDetailsOpen;
  });
  updateProgress();
})();
