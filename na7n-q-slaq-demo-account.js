// NA7N Q-SLAQ fictitious-data pilot account history.
// Supabase RLS enforces per-user access. Never show these as patient records.
(function(){
"use strict";
const $=id=>document.getElementById(id);
const en=document.documentElement.lang==="en",T=(ar,english)=>en?english:ar;
const demo=window.NA7NQslaQDemo,client=window.na7nSupabase;
const status=$("qsDemoHistoryStatus"),table=$("qsDemoHistoryBody"),detail=$("qsDemoDetail");
if(!status||!table||!detail)return;
let rows=[],owner=null,version=0,busy=false,printed=false;
const definitions=[
 ["weight","Unintentional weight loss","نقص الوزن دون محاولة","severity"],
 ["fatigue","Fatigue","الإرهاق","severity"],
 ["fever","Fever (>38.5°C)","الحمّى","severity"],
 ["nodes","Swollen lymph nodes in the neck","تضخم الغدد اللمفاوية في الرقبة","severity"],
 ["alopecia","Hair loss in patches or clumps","تساقط الشعر على شكل بقع أو خصل","severity"],
 ["breath","Shortness of breath","ضيق النفس","severity"],
 ["chest","Chest pain when taking a deep breath","ألم الصدر عند التنفس بعمق","severity"],
 ["abdomen","Abdominal pain","ألم البطن","severity"],
 ["forget","Forgetfulness","النسيان","severity"],
 ["depress","Feeling depressed","الشعور بالاكتئاب","severity"],
 ["headache","Unusual headache","الصداع غير المعتاد","severity"],
 ["muscleWeak","Muscle weakness","ضعف العضلات","severity"],
 ["musclePain","Muscle pain","ألم العضلات","severity"],
 ["jointPain","Joint pain or stiffness","ألم المفاصل أو تيبسها","severity"],
 ["jointSwelling","Joint swelling","تورم المفاصل","severity"],
 ["malar","Butterfly-shaped rash on the cheeks","طفح الوجنتين بشكل فراشة","binary"],
 ["sun","Rash or feeling ill after sun exposure","طفح أو توعك بعد التعرض للشمس","binary"],
 ["sores","Sores in the mouth or nose","تقرحات الفم أو الأنف","binary"],
 ["global","Patient's Global Disease Activity","التقييم الشخصي العام لنشاط المرض","global"]
];
function el(tag,value,className){
 const x=document.createElement(tag);
 if(value!==undefined)x.textContent=String(value);
 if(className)x.className=className;
 return x;
}
function clear(){
 version++;rows=[];owner=null;printed=false;
 table.replaceChildren();detail.replaceChildren();detail.hidden=true;
 document.body.classList.remove("qs-demo-print");
}
function timestamp(d){return new Date(d).toLocaleString(en?"en-AE":"ar-AE",{dateStyle:"medium",timeStyle:"short"})}
function explain(){
 return [
 T("شدة الأعراض من 34: مجموع عبء الأعراض بحسب الإجابات الوهمية؛ ليس تشخيصًا أو نسبة خطورة.",
   "Severity /34: fictional symptom burden, not a diagnosis or percentage of disease risk."),
 T("عدد الأعراض من 18: عدد الأعراض الموجودة في الإجابات الوهمية، وليس عدد المضاعفات.",
   "Symptoms /18: number of fictitiously reported symptoms, not a count of complications."),
 T("التقييم العام من 10: تصور افتراضي مستقل للنشاط، وليس نشاطًا سريريًا موثقًا.",
   "Global /10: separate fictitious perceived-activity rating, not clinically confirmed disease activity.")
 ];
}
function scoreCell(row,key,max,prev){
 const cell=el("td");
 const score=Number(row[key]),prior=prev?Number(prev[key]):null;
 cell.append(el("strong",score+" / "+max));
 const track=el("div",undefined,"qs-demo-bar");
 const fill=el("span");fill.style.width=(100*score/max)+"%";track.append(fill);cell.append(track);
 const change=el("small",prev?
  T("التغيّر العددي عن التجربة السابقة: ","Difference from prior test: ")+
   (score-prior>0?"+":"")+(score-prior):
  T("أول تجربة","First demo"),"qs-demo-change");
 cell.append(change);
 return cell;
}
function valueText(kind,value){
 if(kind==="global")return value+"/10";
 if(kind==="binary")return value===1?T("نعم","Yes"):T("لا","No");
 return [T("لم يحدث","None"),T("خفيف","Mild"),T("متوسط","Moderate"),T("شديد","Severe")][value]||"—";
}
function show(row){
 if(!rows.some(r=>r.id===row.id))return;
 detail.replaceChildren();detail.hidden=false;
 detail.append(el("h3",T("تقرير تجربة وهمية — للاختبار فقط","Fictitious test report — demo only")));
 detail.append(el("p",T("التاريخ: ","Date: ")+timestamp(row.completed_at)));
 const score=el("p");score.append(el("strong",
  row.severity_score+"/34 · "+row.symptom_score+"/18 · "+row.global_score+"/10"));detail.append(score);
 for(const line of explain())detail.append(el("p",line));
 detail.append(el("p",T(
  "تنبيه: هذه الأرقام لا تمثل شخصًا مريضًا. ارتفاعها أو انخفاضها بين التجارب لا يعني تحسنًا أو تدهورًا طبيًا.",
  "These numbers describe no actual patient. Changes across demo runs do not imply clinical improvement or worsening.")));
 detail.append(el("h3",T("جميع الأسئلة الـ19 والإجابات الوهمية","All 19 questions and fictitious responses")));
 for(const [i,[id,english,arabic,kind]] of definitions.entries()){
  const article=el("article");
  article.append(el("h4",(i+1)+". "+english));
  article.append(el("p",arabic));
  article.append(el("p",T("الإجابة التجريبية: ","Demo response: ")+valueText(kind,row.answers?.[id])));
  detail.append(article);
 }
 const print=el("button",T("طباعة تقرير هذه التجربة","Print this demo report"),"button secondary");
 print.type="button";
 print.addEventListener("click",()=>{printed=true;document.body.classList.add("qs-demo-print");window.print();});
 detail.append(print);
 detail.scrollIntoView({behavior:"smooth",block:"start"});
}
function render(){
 table.replaceChildren();detail.hidden=true;detail.replaceChildren();
 if(!rows.length){
  status.textContent=T("لا توجد محاولات وهمية محفوظة في حسابك بعد. اختر توليد إجابات وهمية في صفحة Q-SLAQ.",
    "No fictitious tests saved yet. Generate a demo response in Q-SLAQ.");
  return;
 }
 status.textContent=T("عدد نتائج الاختبار الوهمية المحفوظة: ","Saved fictitious test runs: ")+rows.length+
 T(" — مرتبة من الأحدث إلى الأقدم."," — newest first.");
 const chronological=[...rows].sort((a,b)=>new Date(a.completed_at)-new Date(b.completed_at));
 const prior=new Map(chronological.map((r,i)=>[r.id,i?chronological[i-1]:null]));
 for(const r of rows){
  const tr=el("tr");
  tr.append(el("td",timestamp(r.completed_at)));
  tr.append(scoreCell(r,"severity_score",34,prior.get(r.id)));
  tr.append(scoreCell(r,"symptom_score",18,prior.get(r.id)));
  tr.append(scoreCell(r,"global_score",10,prior.get(r.id)));
  const actions=el("td");
  const showButton=el("button",T("عرض","View"),"button secondary");
  showButton.type="button";showButton.addEventListener("click",()=>show(r));
  const removeButton=el("button",T("حذف","Delete"),"button secondary");
  removeButton.type="button";removeButton.addEventListener("click",async()=>{
    if(!window.confirm(T("هل تريد حذف هذه التجربة الوهمية من حسابك نهائيًا؟",
      "Permanently delete this fictitious demo record?")))return;
    try{
     await demo.remove(r.id);
     if(owner){rows=rows.filter(x=>x.id!==r.id);render();}
    }catch{status.textContent=T("تعذر حذف تجربة الاختبار.","Unable to delete test run.");}
  });
  actions.append(showButton,document.createTextNode(" "),removeButton);tr.append(actions);table.append(tr);
 }
}
async function refresh(){
 const current=++version;
 // New login and refresh requests supersede older requests safely.
 busy=true;$("qsDemoRefresh").disabled=true;
 status.textContent=T("جارٍ تحميل التجارب الوهمية المحفوظة…","Loading saved fictitious tests…");
 try{
  if(!demo||!client)throw new Error("unavailable");
  const auth=await client.auth.getUser();
  if(current!==version)return;
  if(auth.error||!auth.data?.user||auth.data.user.is_anonymous){
   clear();status.textContent=T("سجّل الدخول إلى «حسابي» أولًا.","Sign in to My Account first.");return;
  }
  owner=auth.data.user.id;
  const list=await demo.history();
  if(current!==version)return;
  rows=list;render();
 }catch(_){
  if(current===version){table.replaceChildren();detail.hidden=true;
    status.textContent=T("تعذر تحميل نتائج التجربة. تحقق من اتصالك ثم اضغط تحديث.",
      "Demo results could not be loaded. Check your connection and refresh.");}
 }finally{busy=false;$("qsDemoRefresh").disabled=false;}
}
$("qsDemoRefresh").addEventListener("click",refresh);
window.addEventListener("afterprint",()=>{document.body.classList.remove("qs-demo-print");printed=false;});
if(client){
 client.auth.onAuthStateChange((_event,session)=>{
  const next=session?.user?.id||null;
  if(owner && next!==owner)clear();
  setTimeout(refresh,0);
 });
}
const section=$("dashboard");
new MutationObserver(()=>{
 if(section?.classList.contains("hidden")){
  clear();status.textContent=T("سجّل الدخول لعرض سجل التجارب الوهمية.",
   "Sign in to see fictitious test history.");
 }
}).observe(section,{attributes:true,attributeFilter:["class"]});
refresh();
})();
