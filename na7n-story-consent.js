/* NA7N patient-story consent preferences. Privacy-first: no network requests or server storage. */
(() => {
  "use strict";
  const root=document.getElementById("na7n-story-consent");
  if(!root) return;
  const en=document.documentElement.lang.toLowerCase().startsWith("en");
  const T=(ar,eng)=>en?eng:ar;
  const consentVersion="story-preferences-1.0-2026-11-20";
  const choices=[
    {id:"alias",label:T("اسم مستعار","A pseudonym")},
    {id:"real",label:T("اسمي الحقيقي","My real name")},
    {id:"anonymous",label:T("دون اسم","No name")}
  ];
  const make=(tag,attrs={},value="")=>{
    const el=document.createElement(tag);
    for(const [key,v] of Object.entries(attrs)){
      if(key==="class") el.className=v;
      else if(key==="type"||key==="name"||key==="value"||key==="id"||key==="role") el.setAttribute(key,v);
      else if(key==="aria-live") el.setAttribute(key,v);
    }
    if(value) el.textContent=value;
    return el;
  };
  const section=make("section",{class:"sc-panel"});
  const heading=make("h2",{} ,T("اختر كيف تريد أن نعرض قصتك","Choose how your story could be shared"));
  heading.id="story-consent-heading";
  section.append(heading,make("p",{class:"sc-intro"},T(
    "نموذج تحضيري للاطلاع على خيارات الموافقة. لا تُرسل قصتك أو معلوماتك الصحية من هنا، ولا يعد اختيار المربعات موافقة نهائية للنشر. ستراجع النسخة النهائية بنفسك عندما تتوفر قناة آمنة للمشاركة.",
    "Explore your publication preferences. This form does not submit your story or health information. Selecting options does not grant final publication consent. You will review the finished story through an approved secure process."
  )));
  const form=make("form",{id:"story-consent-preferences"});
  form.noValidate=true;
  const personal=make("fieldset");
  personal.append(make("legend",{},T("كيف سيظهر اسمك؟","How should your name appear?")));
  for(const choice of choices){
    const label=make("label",{class:"sc-choice"}),input=make("input",{type:"radio",name:"identity",value:choice.id});
    if(choice.id==="alias")input.checked=true;
    label.append(input,document.createTextNode(choice.label));personal.append(label);
  }
  form.append(personal);
  const opts=[
    ["image",T("أرغب بالسماح باستخدام صورة أحددها بعد معاينتها والموافقة على نسختها النهائية.","I would consider use of a specific image, after reviewing and approving the exact image.")],
    ["translation",T("أرغب في إتاحة ترجمة قصتي بعد اطلاعي على النسخة المترجمة النهائية.","I would consider translation after reviewing the final translated version.")],
    ["repost",T("أرغب في إتاحة مشاركة قصتي ضمن حسابات نَحْنُ الرسمية بعد تحديد المنشور ومراجعته.","I would consider sharing through NA7N official channels after reviewing the specific post.")]
  ];
  const box=make("fieldset");
  box.append(make("legend",{},T("اختيارات مستقلة — غير مفعلة افتراضيًا","Separate options — all off by default")));
  for(const [key,labelText] of opts){
    const lab=make("label",{class:"sc-choice"}),input=make("input",{type:"checkbox",name:key,id:"sc-"+key});
    lab.append(input,document.createTextNode(labelText));box.append(lab);
  }
  form.append(box);
  const notices=make("div",{class:"sc-notices"});
  notices.append(make("p",{},T(
    "لا تشمل هذه الاختيارات الاستخدام التجاري أو البحثي أو مشاركة معلوماتك مع جهات أخرى. لا تنشر نَحْنُ أي قصة قبل مراجعة النص النهائي وتوثيق موافقة صاحبها بصورة مستقلة. ويمكن طلب سحب الموافقة لاحقًا وفق سياسة الخصوصية والالتزامات السارية.",
    "These choices do not include commercial or research use or sharing your health data with third parties. NA7N will not publish a story without a separate verified approval of its final text. Withdrawal requests are handled under the applicable privacy policy and requirements."
  )));
  notices.append(make("p",{},T(
    "لا تدخل اسمك الحقيقي أو تشخيصك أو أي معلومات صحية في هذا النموذج. المشاركة في المستقبل اختيارية ولا تؤثر في حقك في قراءة المواد التعليمية.",
    "Do not enter your real name, diagnosis, or health details here. Future participation is optional and does not affect access to educational content."
  )));
  form.append(notices);
  const actions=make("div",{class:"sc-actions"});
  const copy=make("button",{type:"button",class:"sc-copy"},T("نسخ اختياراتي","Copy my preferences"));
  const reset=make("button",{type:"reset",class:"sc-reset"},T("إعادة تعيين","Reset"));
  actions.append(copy,reset);
  form.append(actions);
  const status=make("p",{class:"sc-status","aria-live":"polite",role:"status"});
  form.append(status);
  const foot=make("p",{class:"sc-foot"},T(
    "هذه نسخة توضيحية تعمل في متصفحك فقط ولا تحفظ الاختيارات في الموقع أو في قاعدة بيانات. عند فتح استقبال القصص مستقبلاً، سيكون تقديم القصة والموافقة على النص النهائي إجراءين منفصلين موثّقين.",
    "This browser-only demonstration does not save choices on the site or in a database. When secure submissions become available, submitting a story and granting final-text publication consent will be separate, recorded actions."
  ));
  section.append(form,foot);root.append(section);
  const prepare=()=>{
    const identity=form.querySelector('input[name="identity"]:checked')?.value||"alias";
    const who=choices.find(x=>x.id===identity)?.label||"";
    const line=(id,ar,enText)=>T(ar,enText)+": "+(form.querySelector("#sc-"+id)?.checked?T("أفضل السماح بعد اعتماد النسخة النهائية","Interested, subject to final approval"):T("لا أوافق حاليًا","Not selected"));
    return [
      T("نَحْنُ — تفضيلات مستقبلية لنشر قصة (ليست موافقة نهائية)","NA7N — Future story publication preferences (NOT final consent)"),
      T("صيغة النموذج","Form version")+": "+consentVersion,
      T("الاسم المعروض","Display name")+": "+who,
      line("image","الصورة","Image"),
      line("translation","الترجمة","Translation"),
      line("repost","إعادة المشاركة","Reposting"),
      T("لا تحتوي هذه الاختيارات على نص قصة أو معلومات صحية، ولم تُسجّل أو تُرسل إلى نَحْنُ.","This preference summary contains no story or health information, and was not submitted or saved by NA7N.")
    ].join("\n");
  };
  copy.addEventListener("click",async()=>{
    const value=prepare();
    try{
      if(!navigator.clipboard?.writeText)throw Error("unavailable");
      await navigator.clipboard.writeText(value);
      status.textContent=T("تم نسخ اختياراتك إلى جهازك فقط. لم تُرسل أي بيانات.","Preferences copied to your device. Nothing was submitted.");
    }catch{
      const output=make("textarea",{class:"sc-fallback"});output.value=value;output.readOnly=true;
      const old=form.querySelector(".sc-fallback");if(old)old.remove();form.append(output);output.select();
      status.textContent=T("انسخ النص المحدد يدويًا. لم تُرسل أي بيانات.","Copy the selected summary manually. Nothing was submitted.");
    }
  });
  form.addEventListener("reset",()=>{status.textContent="";form.querySelector(".sc-fallback")?.remove();});
})();
