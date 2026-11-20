/* NA7N story journey preview. Browser memory only; NO submission or storage. */
(() => {
"use strict";
const root=document.getElementById("na7n-story-consent"); if(!root)return;
const en=(document.documentElement.lang||"ar").toLowerCase().startsWith("en");
const T=(ar,english)=>en?english:ar;
const version="story-journey-preview-1.0-2026-11-20";
const prompts=[
 ["start",T("كيف بدأت رحلتك؟","How did your journey begin?"),T("يمكنك وصف البداية بأسلوبك، دون ذكر معلومات تعرّف بك.","Describe your beginning in your own words, without identifying information.")],
 ["challenge",T("ما أبرز تحدٍّ واجهته؟","What was your biggest challenge?"),T("شارك فقط ما تشعر بالارتياح في مشاركته.","Share only what you feel comfortable sharing.")],
 ["support",T("ما الذي ساعدك خلال رحلتك؟","What helped you along the way?"),T("قد يكون دعمًا من الأسرة أو الفريق الطبي أو المجتمع.","It could be support from family, care teams, or your community.")],
 ["message",T("ما الرسالة التي تود إيصالها إلى الآخرين؟","What would you like others to know?"),T("اكتب رسالة أو فكرة تود مشاركتها.","Write a message or insight you would like to share.")]
];
const identities=[
 ["alias",T("اسم مستعار","Pseudonym")],
 ["anonymous",T("دون اسم","Anonymous")],
 ["real",T("اسمي الحقيقي، بعد موافقة نهائية مستقلة","My real name, subject to separate final consent")]
];
const options=[
 ["photo",T("أرغب في إرفاق صورة لاحقًا، بعد معاينتها والموافقة على نشرها.","I may add an image later, subject to reviewing and consenting to that image.")],
 ["translation",T("قد أوافق على ترجمة قصتي بعد الاطلاع على النص المترجم النهائي.","I may consent to a translation after reviewing the final translated text.")],
 ["repost",T("قد أوافق على مشاركتها عبر حسابات نَحْنُ الرسمية بعد مراجعة المنشور.","I may consent to reposting on NA7N official accounts after reviewing the specific post.")]
];
let step=0;
const state={start:"",challenge:"",support:"",message:"",identity:"alias",photo:false,translation:false,repost:false};
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
const panel=el("section","sc-panel");panel.setAttribute("aria-labelledby","sc-heading");
const heading=el("h2","",T("شارك قصتك — معاينة رحلة المشاركة","Share your story — preview the journey"));heading.id="sc-heading";panel.append(heading);
panel.append(el("p","sc-intro",T(
 "يمكنك تجربة كتابة قصة ومراجعتها هنا. هذه تجربة محلية داخل المتصفح فقط؛ لا تدخل بيانات صحية أو معلومات تعريفية حقيقية، ولا تُرسل أو تحفظ أي بيانات.",
 "Try writing and previewing a story. This is a browser-only demonstration: do not enter real health details or identifying information. Nothing is sent or saved."
)));
const steps=el("ol","sc-steps");steps.setAttribute("aria-label",T("مراحل المشاركة","Journey steps"));panel.append(steps);
const content=el("div","sc-content");panel.append(content);
const alert=el("p","sc-status");alert.setAttribute("role","status");alert.setAttribute("aria-live","polite");panel.append(alert);
panel.append(el("p","sc-foot",T(
 "استقبال القصص غير مفعّل حاليًا. عند جاهزية المسار الآمن، سيكون إرسال القصة إجراءً منفصلًا، ثم يطّلع المشارك على النسخة النهائية ويوافق على نشرها قبل ظهورها للآخرين.",
 "Story intake is currently disabled. Once a secure process is approved, submitting a story and approving the final publication version will be separate steps."
)));
root.replaceChildren(panel);
const button=(label,cls,handler,disabled=false)=>{
 const b=el("button",cls,label);b.type="button";b.disabled=disabled;b.addEventListener("click",handler);return b;
};
const nav=(prev,next,description)=>{
 const bar=el("div","sc-actions");
 if(prev!==null)bar.append(button(T("السابق","Back"),"sc-reset",()=>render(prev)));
 if(next!==null)bar.append(button(description||T("التالي","Next"),"sc-copy",()=>render(next)));
 content.append(bar);
};
const render=(n)=>{
 step=n;content.replaceChildren();alert.textContent="";
 steps.replaceChildren();
 [T("كتابة القصة","Write"),T("خيارات الخصوصية","Privacy choices"),T("المعاينة","Preview")].forEach((x,i)=>{
  const item=el("li",i===step?"sc-step-active":i<step?"sc-step-done":"",x);
  if(i===step)item.setAttribute("aria-current","step");
  steps.append(item);
 });
 if(step===0)renderWrite();
 else if(step===1)renderPrivacy();
 else renderPreview();
};
function renderWrite(){
 content.append(el("h3","",T("اكتب قصتك بطريقتك","Tell your story, your way")));
 content.append(el("p","sc-hint",T(
  "الأسئلة للمساعدة فقط. لا يلزم ملؤها جميعًا في هذه المعاينة. تجنّب أسماء الأشخاص، أرقام الملفات، أو تفاصيل صحية حقيقية.",
  "These prompts are optional for this preview. Avoid names, record numbers, and real health details."
 )));
 for(const [key,title,hint] of prompts){
  const wrapper=el("div","sc-field"),id="sc-write-"+key;
  const label=el("label","sc-label",title);label.htmlFor=id;
  const input=el("textarea","sc-textarea");input.id=id;input.rows=3;input.maxLength=1800;
  input.placeholder=hint;input.value=state[key];input.addEventListener("input",()=>{state[key]=input.value;});
  wrapper.append(label,input);content.append(wrapper);
 }
 nav(null,1,T("التالي: خيارات الخصوصية","Next: privacy choices"));
}
function renderPrivacy(){
 content.append(el("h3","",T("أنت من يحدد ما يمكن مشاركته","You control what could be shared")));
 const group=el("fieldset","sc-fieldset");
 group.append(el("legend","",T("كيف يظهر اسمك عند الموافقة النهائية؟","How should your name appear after final consent?")));
 identities.forEach(([key,labelText])=>{
  const label=el("label","sc-choice"),input=el("input");input.type="radio";input.name="sc-identity";input.value=key;input.checked=state.identity===key;
  input.addEventListener("change",()=>{if(input.checked)state.identity=key;});
  label.append(input,document.createTextNode(labelText));group.append(label);
 });
 content.append(group);
 const more=el("fieldset","sc-fieldset");
 more.append(el("legend","",T("خيارات مستقلة — غير محددة مسبقًا","Optional choices — off by default")));
 options.forEach(([key,labelText])=>{
  const label=el("label","sc-choice"),input=el("input");input.type="checkbox";input.checked=state[key];
  input.addEventListener("change",()=>{state[key]=input.checked;});
  label.append(input,document.createTextNode(labelText));more.append(label);
 });
 content.append(more);
 content.append(el("p","sc-hint",T(
  "هذه تفضيلات مبدئية وليست موافقة قانونية على نشر القصة أو الصورة. ستُطلب موافقة صريحة على النسخة النهائية لكل استخدام عند تفعيل النظام الآمن.",
  "These are preferences, not legally recorded consent to publish a story or image. Specific final consent will be requested for each use through the future secure system."
 )));
 nav(0,2,T("معاينة قصتي","Preview my story"));
}
function renderPreview(){
 content.append(el("h3","",T("راجع ما كتبته","Review your draft")));
 const preview=el("div","sc-preview");
 const title=el("p","sc-preview-name",T("طريقة عرض الاسم: ","Name display: ")+(identities.find(a=>a[0]===state.identity)?.[1]||""));
 preview.append(title);
 let count=0;
 prompts.forEach(([key,title])=>{
  const value=state[key].trim();
  if(!value)return;
  count++;
  const item=el("div","sc-preview-item");
  item.append(el("h4","",title),el("p","",value));preview.append(item);
 });
 if(!count)preview.append(el("p","sc-hint",T("لم تُكتب قصة بعد. يمكنك العودة لإضافة نص تجريبي.","No story text yet. Go back to try sample text.")));
 options.forEach(([key,labelText])=>{
  if(state[key])preview.append(el("p","sc-option-selected",labelText));
 });
 content.append(preview);
 content.append(el("p","sc-hint",T(
  "لن يتم إرسال هذه المعاينة أو حفظها؛ ولم تُمنح أي موافقة نهائية. لا يوجد زر إرسال نشط قبل اعتماد التخزين الآمن والتحقق من هوية صاحب القصة.",
  "This preview will not be sent or stored, and no final consent has been given. There is no active submission button until secure storage and author verification are approved."
 )));
 const bar=el("div","sc-actions");
 bar.append(button(T("تعديل القصة","Edit story"),"sc-reset",()=>render(0)));
 bar.append(button(T("تعديل الخصوصية","Edit privacy"),"sc-reset",()=>render(1)));
 const disabled=button(T("إرسال القصة — غير متاح حاليًا","Submit story — not yet available"),"sc-submit",()=>{},true);
 disabled.title=T("بانتظار اعتماد استقبال القصص الآمن","Secure story intake is not yet approved");
 bar.append(disabled);
 content.append(bar);
 const clear=button(T("مسح النص التجريبي من هذه الصفحة","Clear this preview"),"sc-reset",()=>{
  prompts.forEach(([key])=>{state[key]="";});
  state.identity="alias";options.forEach(([key])=>state[key]=false);
  render(0);alert.textContent=T("تم مسح النص من هذه المعاينة.","Preview text cleared.");
 });
 content.append(clear);
}
render(0);
})();
