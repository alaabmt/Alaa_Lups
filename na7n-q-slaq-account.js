// Account view of optional, encrypted Q-SLAQ records on the same device.
// No reading or writing of health records to Supabase; auth only verifies user ID.
(function(){
  "use strict";
  const en=document.documentElement.lang==="en";
  const T=(ar,english)=>en?english:ar;
  const $=id=>document.getElementById(id);
  const vault=window.NA7NQslaQVault;
  const client=window.na7nSupabase;
  const status=$("qsDeviceAccountStatus"),recordsBox=$("qsLocalRecords"),preview=$("qsDeviceReport");
  if(!status||!recordsBox||!preview)return;
  let openedRecords=[],ownerId=null,busy=false,sequence=0;
  function node(tag,text,cls){
    const element=document.createElement(tag);
    if(cls)element.className=cls;
    if(text!==undefined)element.textContent=String(text);
    return element;
  }
  function clear(){
    ++sequence;openedRecords=[];ownerId=null;
    recordsBox.replaceChildren();
    preview.replaceChildren();preview.hidden=true;
    $("qsAccountPassphrase").value="";
    document.body.classList.remove("qs-account-print");
  }
  function statusText(ar,english){status.textContent=T(ar,english);}
  function labelValue(q){
    const x=Number(q.value);
    if(q.type==="global")return x+" / 10";
    if(q.type==="binary")return x===1?T("نعم","Yes"):T("لا","No");
    const ar=["لم يحدث","خفيفة","متوسطة","شديدة"];
    const english=["None","Mild","Moderate","Severe"];
    return en?english[x]:ar[x];
  }
  function briefInterpretation(r){
    const s=r.scores;
    return [
      T("مجموع شدة الأعراض: "+s.severity+" من 34 نقطة. يعكس عبء الأعراض المبلّغ عنها، ولا يُصنف نشاط الذئبة سريريًا.",
        "Total symptom severity: "+s.severity+"/34. It reflects self-reported symptom burden, not a clinical lupus severity category."),
      T("عدد الأعراض الموجودة: "+s.symptoms+" من أصل 18 عرضًا. هذا لا يعني عدد المضاعفات أو سبب الأعراض.",
        "Symptoms reported: "+s.symptoms+"/18. This is not a count of complications or a determination of their cause."),
      T("التقييم العام الشخصي: "+s.global+" من 10 خلال الشهر الماضي. هذا تقديرك الشخصي المستقل عن مجموع الأعراض.",
        "Patient global rating: "+s.global+"/10 for the past month, separate from the symptom scores.")
    ];
  }
  function report(r){
    preview.replaceChildren();preview.hidden=false;
    preview.append(node("h2",T("تقرير Q-SLAQ — محفوظ على هذا الجهاز","Q-SLAQ report — saved on this device")));
    preview.append(node("p",T("تاريخ الاستبيان: ","Assessment date: ")+new Date(r.completedAt).toLocaleDateString(en?"en-US":"ar-AE")));
    preview.append(node("p",T("اسم المريض (يُكتب يدويًا): ______________________ | تاريخ الموعد: __________",
      "Patient name (handwritten): ____________________ | Appointment date: __________")));
    const grid=node("div",undefined,"qs-score-summary");
    for(const [label,value,max] of [
      [T("شدة الأعراض","Symptom severity"),r.scores.severity,34],
      [T("عدد الأعراض","Symptom count"),r.scores.symptoms,18],
      [T("التقييم العام","Patient global"),r.scores.global,10]]){
      const card=node("article");
      card.append(node("span",label),node("strong",value+" / "+max));
      grid.append(card);
    }
    preview.append(grid);
    const interp=node("section");
    interp.append(node("h3",T("شرح الدرجات للمريض","What the scores mean")));
    for(const text of briefInterpretation(r))interp.append(node("p",text));
    interp.append(node("p",T("لا توجد درجة فاصلة معتمدة هنا تفسر 13 أو 14 باعتبارها نشاطًا خفيفًا أو متوسطًا أو شديدًا، ولا يجوز تغيير العلاج بحسب هذا الرقم وحده.",
      "No cutoff shown here means a score such as 13 or 14 diagnoses mild, moderate or severe disease. Do not change treatment from a score alone.")));
    preview.append(interp);
    const questions=node("section");
    questions.append(node("h3",T("جميع أسئلة الاستبيان وإجابات المريض (19)","Full questions and patient responses (19)")));
    for(const [index,q] of (r.questions||[]).entries()){
      const article=node("article",undefined,"qs-answers-card");
      article.append(node("h4",(index+1)+". "+q.en));
      article.append(node("p",q.ar));
      article.append(node("p",T("الإجابة: ","Answer: ")+labelValue(q)));
      questions.append(article);
    }
    preview.append(questions);
    const guidance=node("section");
    guidance.append(node("h3",T("ملاحظات للمناقشة مع مقدم الرعاية","Questions for the care visit")));
    guidance.append(node("p",T("ناقش الأعراض التي تغيّرت مع الوقت وتأثيرها على حياتك اليومية، مع الفحص والتحاليل. درجات Q-SLAQ ليست تشخيصًا.",
      "Discuss changes in symptoms and their effects on daily life, together with examination and testing. Q-SLAQ scores are not a diagnosis.")));
    const redFlag=(r.answers?.breath||0)>0||(r.answers?.chest||0)>0;
    if(redFlag)guidance.append(node("p",T("أبلغت عن ضيق النفس أو ألم الصدر؛ إذا كان العرض جديدًا أو شديدًا أو موجودًا الآن، اطلب رعاية طبية عاجلة.",
      "You reported breathlessness or chest pain; if new, severe or occurring now, seek urgent medical care.")));
    guidance.append(node("p",T("النص العربي ترجمة إرشادية غير معتمدة. البيانات ذاتية الإبلاغ، ومخزنة محليًا على جهازك فقط.",
      "Arabic wording is an unvalidated explanatory translation. Answers are self-reported and this record remains only on your device.")));
    preview.append(guidance);
    const actions=node("div",undefined,"qs-action-row");
    const print=node("button",T("طباعة / حفظ PDF لجميع الأسئلة والتقرير","Print / save complete PDF report"),"button primary");
    print.type="button";print.addEventListener("click",()=>{
      document.body.classList.add("qs-account-print");window.print();
    });
    actions.append(print);preview.append(actions);
    preview.scrollIntoView({block:"start",behavior:"smooth"});
  }
  function showRecords(){
    recordsBox.replaceChildren();
    for(const r of openedRecords){
      const card=node("article",undefined,"qs-record-card");
      card.append(node("strong","Q-SLAQ — "+new Date(r.completedAt).toLocaleDateString(en?"en-US":"ar-AE")));
      card.append(node("p",r.scores.severity+"/34 · "+r.scores.symptoms+"/18 · "+r.scores.global+"/10"));
      const show=node("button",T("عرض التقرير الكامل","View complete report"),"button secondary");
      show.type="button";show.addEventListener("click",()=>report(r));
      const del=node("button",T("حذف من الجهاز","Delete from device"),"button secondary");
      del.type="button";del.addEventListener("click",async()=>{
        if(!ownerId||!window.confirm(T("سيُحذف هذا السجل المشفّر نهائيًا من هذا الجهاز. متابعة؟",
          "This encrypted record will be permanently removed from this device. Continue?")))return;
        try{
          await vault.remove(ownerId,r.id);
          openedRecords=openedRecords.filter(other=>other.id!==r.id);
          preview.replaceChildren();preview.hidden=true;
          statusText("حُذف السجل المحلي. لم يُرسل طلب إلى قاعدة بيانات الموقع.",
            "Local record deleted. Nothing was sent to the website database.");
          showRecords();
        }catch{
          statusText("تعذر حذف السجل من هذا الجهاز.","Unable to delete the device record.");
        }
      });
      const actions=node("div",undefined,"qs-action-row");actions.append(show,del);card.append(actions);recordsBox.append(card);
    }
  }
  async function unlock(){
    if(busy)return;
    const pass=$("qsAccountPassphrase").value;
    if(pass.length<12){
      statusText("أدخل العبارة السرية المستقلة التي استخدمتها عند الحفظ (12 حرفًا على الأقل).",
        "Enter your separate saved encryption passphrase (at least 12 characters).");return;
    }
    const myVersion=++sequence;
    busy=true;$("qsDeviceUnlock").disabled=true;preview.hidden=true;
    try{
      if(!vault?.available()||!client){
        statusText("خدمة الحساب أو التخزين المشفّر غير متاحة في هذا المتصفح.",
          "Authentication or encrypted device storage is unavailable.");return;
      }
      const response=await client.auth.getUser();
      if(myVersion!==sequence)return;
      const user=response.data?.user;
      if(response.error||!user||user.is_anonymous||$("dashboard").classList.contains("hidden")){
        clear();statusText("سجّل الدخول إلى حسابك أولًا.","Sign in to your account first.");return;
      }
      ownerId=user.id;
      const reports=await vault.load(user.id,pass);
      if(myVersion!==sequence)return;
      openedRecords=reports;
      showRecords();
      statusText(reports.length?
        "تم فتح "+reports.length+" من السجلات المشفّرة على هذا الجهاز فقط.":
        "لا توجد نتائج Q-SLAQ محفوظة على هذا الجهاز لهذا الحساب. أكمل الاستبيان واحفظه صراحةً.",
        reports.length?"Opened "+reports.length+" encrypted record(s) on this device only.":
          "No Q-SLAQ records are saved in this browser for this account. Complete the assessment and explicitly choose to save it.");
    }catch{
      openedRecords=[];recordsBox.replaceChildren();preview.hidden=true;
      statusText("تعذر فتح السجل. تحقق من العبارة السرية ومن أنك تستخدم الجهاز والمتصفح نفسيهما.",
        "Unable to unlock records. Check the passphrase and use the same device and browser.");
    }finally{busy=false;$("qsDeviceUnlock").disabled=false;$("qsAccountPassphrase").value="";}
  }
  $("qsDeviceUnlock").addEventListener("click",unlock);
  $("qsAccountPassphrase").addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();unlock();}
  });
  window.addEventListener("afterprint",()=>document.body.classList.remove("qs-account-print"));
  // Account login/logout controls the dashboard class; remove decrypted data on logout.
  const dashboard=$("dashboard");
  new MutationObserver(()=>{
    if(dashboard.classList.contains("hidden")){
      clear();statusText("سجّل الدخول لعرض سجلات هذا الجهاز.",
        "Sign in to see records on this device.");
    }else if(!ownerId){
      statusText("أدخل عبارة الحفظ السرية لعرض تقييمات Q-SLAQ المخزنة على هذا الجهاز.",
        "Enter the encryption passphrase to unlock Q-SLAQ assessments stored on this device.");
    }
  }).observe(dashboard,{attributes:true,attributeFilter:["class"]});
})();
