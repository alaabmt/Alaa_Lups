/* NA7N authenticated physician review workspace. Never let a WhatsApp URL confer approval. */
(() => {
 "use strict";
 const byId=id=>document.getElementById(id);
 const lang=document.documentElement.lang==="en"?"en":"ar",en=lang==="en";
 const T=(ar,eng)=>en?eng:ar;
 const mode=document.body.dataset.reviewMode;
 const sb=window.na7nSupabase || window.supabase?.createClient("https://wobpwxdlfrzfugzocdie.supabase.co","sb_publishable_QlDRz3T6CwgTHI3cdGJLMA_BwH4qlwO");
 let user=null,assignments=[],decisions=[],reviewers=[],staff=null,current=null,currentSha="",selectedBlock=null,lastAssignment=null;
 const ALLOWED=["newly-diagnosed.html","symptoms.html","treatment.html","appointment.html","living.html","pregnancy.html","newly-diagnosed-en.html","symptoms-en.html","treatment-en.html","appointment-en.html","living-en.html","pregnancy-en.html","about-lupus.html","about-lupus-en.html","diagnosis-tests.html","diagnosis-tests-en.html","kidneys.html","kidneys-en.html","skin-sun.html","skin-sun-en.html","faq.html","faq-en.html","fatigue.html"];
 const show=(id,on=true)=>{const el=byId(id);if(el)el.hidden=!on;};
 const say=(message,type="info")=>{const el=byId("mr-status");if(el){el.textContent=message;el.dataset.kind=type;}};
 const encode=s=>new TextEncoder().encode(s);
 const hex=a=>Array.from(a).map(v=>v.toString(16).padStart(2,"0")).join("");
 async function loadPage(path){
  if(!ALLOWED.includes(path))throw new Error(T("هذه الصفحة ليست ضمن نطاق مراجعة الأطباء.","This page is not in the physician review set."));
  const r=await fetch(path+"?review-source="+Date.now(),{cache:"no-store",credentials:"omit"});
  if(!r.ok)throw new Error(T("تعذر جلب الصفحة من الموقع.","Could not fetch the page."));
  const buffer=await r.arrayBuffer(),digest=await crypto.subtle.digest("SHA-256",buffer);
  return {html:new TextDecoder("utf-8").decode(buffer),sha:hex(new Uint8Array(digest))};
 }
 function refDate(x){return x?new Date(x).toLocaleString(en?"en-US":"ar-AE",{dateStyle:"medium",timeStyle:"short"}):"—"}
 function text(el,value){if(el)el.textContent=String(value??"");}
 const msg=e=>e?.message||T("تعذر إكمال الطلب.","Request failed.");
 async function signIn(e){e.preventDefault();say(T("جارٍ تسجيل الدخول...","Signing in..."));
 const email=byId("mr-email").value.trim(),password=byId("mr-password").value;
 const {error}=await sb.auth.signInWithPassword({email,password});
 if(error){say(msg(error),"error");return;}await initSession();
 }
 async function signOut(){await sb.auth.signOut();location.reload();}
 async function initSession(){
  if(!sb){say(T("خدمة تسجيل الدخول غير متاحة.","Authentication service unavailable."),"error");return;}
  const {data,error}=await sb.auth.getUser();user=!error?data?.user:null;
  show("mr-login",!user);show("mr-panel",false);show("mr-signout",!!user);
  if(!user){say(T("سجّل الدخول بحساب الطبيب أو المنسق المكلف رسميًا.","Sign in with your assigned physician or coordinator account."));return;}
  text(byId("mr-user"),user.email||"");
  try{
   const roleTable=mode==="doctor"?"na7n_medical_reviewers":"na7n_medical_review_staff";
   const authz=await sb.from(roleTable).select(mode==="doctor"?"user_id,is_active,nomination_approved_at":"user_id,is_active,role").eq("user_id",user.id).maybeSingle();
   if(authz.error)throw authz.error;
   if(!authz.data?.is_active || (mode==="doctor"&&!authz.data?.nomination_approved_at)){
    say(T("هذا الحساب غير مكلّف بهذا الدور. لا تُمنح الصلاحية إلا بعد التحقق والتكليف الإداري.","This account has no verified assignment for this role."),"error");return;
   }
   show("mr-panel",true);
   say(T("تم تسجيل الدخول بنجاح.","Signed in successfully."),"success");
   if(mode==="doctor")await doctorHome();else await coordinatorHome();
  }catch(ex){say(msg(ex),"error");}
 }
 async function query(table){const {data,error}=await sb.from(table).select("*");if(error)throw error;return data||[];}
 async function doctorHome(){
  let {data,error}=await sb.from("na7n_medical_review_assignments").select("*").eq("reviewer_id",user.id).order("assigned_at",{ascending:false});
  if(error)throw error;assignments=data||[];
  const d=await sb.from("na7n_medical_review_decisions").select("*");
  if(d.error)throw d.error;decisions=d.data||[];
  const newList=byId("mr-new-assignment-list"),completedList=byId("mr-completed-assignment-list");
  newList.replaceChildren();completedList.replaceChildren();
  const pendingAssignments=assignments.filter(a=>a.is_active&&!decisions.some(d=>d.assignment_id===a.id));
  const completedAssignments=assignments.filter(a=>decisions.some(d=>d.assignment_id===a.id));
  text(byId("mr-total-count"),assignments.length);
  text(byId("mr-completed-count"),completedAssignments.length);
  text(byId("mr-remaining-count"),pendingAssignments.length);
  const addAssignmentLink=(list,a,done)=>{
   const link=document.createElement("a");link.className="mr-review-link";link.href="?assignment="+encodeURIComponent(a.id);
   link.textContent=a.page_path+" · "+(done?T("قرار محفوظ: ","Recorded: ")+done.decision:(a.is_active?T("بانتظار المراجعة","Awaiting review"):T("تكليف مُلغى","Assignment inactive")));
   list.append(link);
  };
  pendingAssignments.forEach(a=>addAssignmentLink(newList,a,null));
  completedAssignments.forEach(a=>addAssignmentLink(completedList,a,decisions.find(d=>d.assignment_id===a.id)));
  if(!assignments.length)text(newList,T("لم تُكلّف بأي صفحة بعد. يجب أن توافق الإدارة على انضمامك وتكلّفك بالصفحة أولًا.","You have no assigned pages yet. Staff must first approve your application and assign a page."));
  if(!completedAssignments.length)text(completedList,T("لا توجد صفحات مكتملة بعد.","No completed pages yet."));
  let id=new URLSearchParams(location.search).get("assignment");if(!id && assignments.length===1)id=assignments[0].id;
  current=assignments.find(a=>a.id===id);
  if(!current){say(T("اختر صفحة من تكليفاتك.","Choose an assigned page."));show("mr-active-review",false);return;}
  if(!current.is_active){say(T("هذا التكليف لم يعد نشطًا؛ اطلب رابطًا جديدًا من الإدارة.","This assignment is no longer active."),"error");return;}
  show("mr-active-review");await openReview(current);
 }
 async function openReview(a){
  const page=await loadPage(a.page_path);
  currentSha=page.sha;
  text(byId("mr-page-title"),a.page_path);
  text(byId("mr-version"),a.content_sha256.slice(0,12));
  const same=page.sha===a.content_sha256;
  text(byId("mr-version-status"),same?T("النسخة متطابقة مع التكليف","Exact assigned version"):T("تغيّرت الصفحة منذ إرسال التكليف — لا يمكن الاعتماد","Page changed — review disabled"));
  show("mr-review-edit",same && !decisions.find(d=>d.assignment_id===a.id));
  byId("mr-review-edit").querySelectorAll("input,textarea,button").forEach(x=>x.disabled=!same);
  if(!same){say(T("الصفحة المنشورة لا تطابق بصمة المحتوى المكلف. اطلب نسخة مراجعة جديدة.","The page no longer matches its assigned digest. Ask for a new review."),"error");return;}
  const frame=byId("mr-page-frame"),doc=new DOMParser().parseFromString(page.html,"text/html");
  doc.querySelectorAll("script,iframe,object,embed,form,meta[http-equiv='refresh']").forEach(x=>x.remove());
  const base=doc.createElement("base");base.href=location.origin+"/";doc.head.prepend(base);
  doc.querySelectorAll(".na7n-learning-stage[hidden],.na7n-learning-stage").forEach(el=>el.hidden=false);
  doc.querySelectorAll("details").forEach(el=>el.open=true);
  const style=doc.createElement("style");style.textContent="body{padding-bottom:26px!important}main p,main li,main h2,main h3,main summary{cursor:crosshair} .mr-picked{outline:3px solid #704ba0!important;background:#f4eaff!important}";doc.head.append(style);
  frame.onload=()=>{
   const d=frame.contentDocument;if(!d)return;
   const blocks=[...d.querySelectorAll("main p,main li,main h2,main h3,main summary")].filter(el=>!el.closest("nav")&&!el.closest(".na7n-step-actions"));
   blocks.forEach((el,i)=>{
    const key="p-"+String(i+1).padStart(4,"0");
    el.dataset.reviewKey=key;
    el.addEventListener("click",evt=>{
     evt.preventDefault();evt.stopPropagation();
     d.querySelectorAll(".mr-picked").forEach(x=>x.classList.remove("mr-picked"));el.classList.add("mr-picked");
     selectedBlock={key,quote:(el.textContent||"").trim().replace(/\s+/g," ").slice(0,300)};
     text(byId("mr-selected"),key+" · "+selectedBlock.quote);
    },true);
   });
   text(byId("mr-block-count"),blocks.length);
  };
  frame.srcdoc="<!doctype html>\n"+doc.documentElement.outerHTML;
  await loadComments(a.id);
  const decision=decisions.find(d=>d.assignment_id===a.id);
  if(decision){show("mr-review-edit",false);say(T("تم حفظ القرار ولا يمكن تعديله مباشرة. أي نسخة معدلة تحتاج تكليفًا جديدًا.","Decision recorded and immutable. A changed page requires a new assignment."),"success");}
  else say(T("كل خطوات الصفحة وأقسام (+) مفتوحة للمراجعة. اضغط على أي فقرة لإضافة ملاحظة.","All steps and expandable sections are open. Tap a paragraph to add a comment."),"success");
 }
 async function loadComments(id){
  const {data,error}=await sb.from("na7n_medical_review_comments").select("*").eq("assignment_id",id).order("created_at",{ascending:true});
  if(error)throw error;
  const list=byId("mr-comments");list.replaceChildren();
  if(!data?.length){text(list,T("لم تُسجّل ملاحظات بعد.","No paragraph comments yet."));return;}
  for(const c of data){const box=document.createElement("div");box.className="mr-note";
   const h=document.createElement("strong");h.textContent=c.paragraph_key+" · "+(c.quoted_text||"").slice(0,110);
   const p=document.createElement("div");p.textContent=c.comment_text;box.append(h,p);list.append(box);}
 }
 async function saveComment(e){
  e.preventDefault();if(!current||!selectedBlock){say(T("اضغط أولًا على الفقرة داخل الصفحة.","First tap a paragraph in the page."),"error");return;}
  const value=byId("mr-comment").value.trim();if(value.length<3){say(T("اكتب ملاحظتك.","Write your comment."),"error");return;}
  const {error}=await sb.from("na7n_medical_review_comments").insert({assignment_id:current.id,paragraph_key:selectedBlock.key,quoted_text:selectedBlock.quote,comment_text:value});
  if(error){say(msg(error),"error");return;}
  byId("mr-comment").value="";await loadComments(current.id);say(T("حُفظت الملاحظة في سجل المراجعة.","Paragraph comment recorded."),"success");
 }
 async function submitDecision(e){
  e.preventDefault();if(!current||currentSha!==current.content_sha256)return;
  const decision=document.querySelector('input[name="mr-decision"]:checked')?.value;
  const statement=byId("mr-statement").value.trim();
  if(!decision||statement.length<10||!byId("mr-attest").checked){say(T("اختر القرار، واكتب سببًا من 10 أحرف على الأقل، وأكد مراجعة الصفحة كاملة.","Choose a decision, enter at least 10 characters and attest full-page review."),"error");return;}
  if(!confirm(T("سيسجل قرارك النهائي على هذه النسخة. هل تؤكد؟","Record your final decision on this exact content version?")))return;
  if(decision==="approved"){
   if(!byId("mr-name-consent").checked){say(T("وافق على عرض اسمك وتخصصك مع المراجعة المعتمدة.","Consent to display your name and specialty with the approved review."),"error");return;}
   const consent=await sb.rpc("na7n_medical_name_consent");
   if(consent.error){say(msg(consent.error),"error");return;}
  }
  const {error}=await sb.from("na7n_medical_review_decisions").insert({assignment_id:current.id,decision,statement});
  if(error){say(msg(error),"error");return;}say(T("حُفظ قرارك. لا تظهر العلامة الخضراء إلا بعد موافقة طبيبين واستكمال اعتماد النشر.","Decision saved. Green status requires two physician approvals and publisher release."),"success");await doctorHome();
 }
 async function coordinatorHome(){
  const {data,error}=await sb.from("na7n_medical_review_staff").select("*").eq("user_id",user.id).maybeSingle();
  if(error)throw error;staff=data;
  if(!staff?.is_active){show("mr-admin-work",false);say(T("هذا الحساب ليس منسقًا معتمدًا للمراجعات. أضف الدور من إدارة قاعدة البيانات بعد التحقق من الهوية.","This account is not a provisioned review coordinator."),"error");return;}
  show("mr-admin-work");show("mr-publisher",staff.role==="publisher");say(T("كلّف طبيبين مختلفين وافقت الإدارة على انضمامهما.","Assign two distinct physicians approved by staff."),"success");
  showDirectReviewerForm();
  reviewers=await query("na7n_medical_reviewers");await refreshAdmin();
  const select=byId("mr-doctor");select.replaceChildren();
  const eligible=reviewers.filter(r=>r.is_active&&r.nomination_approved_at);
  if(!eligible.length){
   const opt=document.createElement("option");opt.value="";opt.textContent=T("لا يوجد طبيب معتمد للتكليف بعد","No staff-approved physicians available yet");opt.disabled=true;opt.selected=true;select.append(opt);
  }
  for(const r of eligible){
   const opt=document.createElement("option");opt.value=r.user_id;opt.textContent=(en?r.display_name_en||r.display_name_ar:r.display_name_ar)+" — "+(en?r.specialty_en||r.specialty_ar||"Specialty not added":r.specialty_ar||"لم يُضف التخصص");
   select.append(opt);
  }
  select.disabled=!eligible.length;
  const assignButton=byId("mr-assign-form").querySelector('button[type="submit"]');
  if(assignButton)assignButton.disabled=!eligible.length;
  showInviteHelp(eligible.length===0);
  await showPendingApplicants();
  const page=byId("mr-page");page.replaceChildren();ALLOWED.forEach(path=>{let opt=document.createElement("option");opt.value=path;opt.textContent=path;page.append(opt);});
  page.value="treatment.html";await preparePage();
  if(!eligible.length)say(T("لا يوجد أطباء مفعّلون بعد. استخدم دعوة التسجيل أدناه؛ يمكن التكليف بعد موافقة الإدارة على الانضمام.","No active physicians yet. Invite a physician below; assignments unlock after administrative approval."));
 }
 function showDirectReviewerForm(){
  if(byId("mr-direct-reviewer"))return;
  const section=document.createElement("section");section.className="mr-card";section.id="mr-direct-reviewer";
  const title=document.createElement("h2");title.textContent=T("إضافة طبيب والموافقة عليه مباشرة","Add and approve a physician");
  const lead=document.createElement("p");lead.textContent=T("أدخل الاسم والبريد وكلمة مرور للحساب الجديد. إذا كان البريد مسجلًا، نستخدم الحساب الحالي وتبقى كلمة مروره كما هي. التخصص اختياري، ولا تُطلب بيانات ترخيص.","Enter a name, email and password for a new account. Existing accounts keep their password. Specialty is optional; no license details are required.");
  const form=document.createElement("form");form.id="mr-add-reviewer-form";
  const grid=document.createElement("div");grid.className="mr-grid";
  const fields=[
   ["mr-add-name-ar",T("الاسم بالعربية أو الاسم المتاح","Name in Arabic or available name"),"text",true],
   ["mr-add-name-en",T("الاسم بالإنجليزية (اختياري)","English name (optional)"),"text",false],
   ["mr-add-email",T("البريد الإلكتروني","Email"),"email",true],
   ["mr-add-password",T("كلمة مرور للحساب الجديد (8 أحرف على الأقل)","Password for a new account (at least 8 characters)"),"password",false],
   ["mr-add-specialty-ar",T("التخصص بالعربية (اختياري)","Arabic specialty (optional)"),"text",false],
   ["mr-add-specialty-en",T("التخصص بالإنجليزية (اختياري)","English specialty (optional)"),"text",false]
  ];
  for(const [id,label,type,required] of fields){
   const field=document.createElement("div");field.className="mr-field";
   const caption=document.createElement("label");caption.htmlFor=id;caption.textContent=label;
   const input=document.createElement("input");input.id=id;input.type=type;input.required=required;
   input.autocomplete=type==="password"?"new-password":"off";
   input.maxLength=type==="email"?254:type==="password"?72:120;
   if(type==="text")input.minLength=3;
   if(type==="password")input.minLength=8;
   field.append(caption,input);grid.append(field);
  }
  const button=document.createElement("button");button.type="submit";button.className="mr-btn";
  button.textContent=T("إضافة الحساب وتفعيل المراجعة","Add account and activate reviewer");
  const result=document.createElement("p");result.className="mr-status";result.setAttribute("role","status");
  form.append(grid,button,result);section.append(title,lead,form);byId("mr-admin-work").before(section);
  form.addEventListener("submit",async e=>{
   e.preventDefault();button.disabled=true;result.dataset.kind="info";
   result.textContent=T("جارٍ إضافة الحساب وتفعيل المراجعة...","Creating account and activating reviewer...");
   const value=id=>byId(id).value.trim();
   const password=byId("mr-add-password").value;byId("mr-add-password").value="";
   try{
    const {data,error}=await sb.functions.invoke("na7n-medical-create-reviewer",{body:{
     name_ar:value("mr-add-name-ar"),name_en:value("mr-add-name-en"),email:value("mr-add-email"),
     specialty_ar:value("mr-add-specialty-ar"),specialty_en:value("mr-add-specialty-en"),password
    }});
    if(error){
     let detail="";try{detail=(await error.context?.json())?.error||""}catch{}
     throw new Error(detail||msg(error));
    }
    if(data?.reviewer_active!==true)throw new Error(T("لم يكتمل تفعيل المراجع.","Reviewer activation did not complete."));
    result.dataset.kind="success";result.textContent=data.account_created
     ?T("أُنشئ الحساب وفُعّل الطبيب للمراجعة. يمكنك تكليفه بصفحة الآن.","Account created and reviewer activated. You can assign a page now.")
     :T("فُعّل الطبيب على حسابه الحالي دون تغيير كلمة مروره. يمكنك تكليفه بصفحة الآن.","Reviewer activated on the existing account; password unchanged. You can assign a page now.");
    form.reset();await coordinatorHome();
   }catch(error){result.dataset.kind="error";result.textContent=msg(error);}
   finally{button.disabled=false;}
  });
 }
 function showInviteHelp(empty){
  let panel=byId("mr-doctor-onboarding");
  if(!panel){
   panel=document.createElement("div");panel.id="mr-doctor-onboarding";panel.className="mr-onboarding";
   const h=document.createElement("h3");h.textContent=T("إضافة الطبيب الأول","Invite your first physician");
   const message=document.createElement("p");message.textContent=T("أرسل رابط التسجيل المهني إلى الطبيب. سيُنشئ حسابًا ويقدم اسمه وتخصصه. سيبقى الطلب معلّقًا حتى توافق الإدارة على انضمامه وتفعّل الحساب؛ لا يُمنح أي اعتماد طبي تلقائي.","Send the professional registration link. The physician signs up and submits a name and specialty. The request stays pending until staff approve and activate the account.");
   const link=document.createElement("a");link.href=en?"doctor-register-en.html":"doctor-register.html";link.textContent=T("فتح تسجيل الطبيب","Open physician registration");link.className="mr-review-link";
   const invite=document.createElement("button");invite.type="button";invite.className="mr-btn secondary";
   invite.textContent=T("دعوة طبيب عبر واتساب","Invite physician via WhatsApp");
   invite.addEventListener("click",()=>{
    const url=location.origin+"/"+(en?"doctor-register-en.html":"doctor-register.html");
    const msg=T("دكتورنا الكريم، ندعوك للمشاركة في مراجعة محتوى التثقيف الصحي بموقع نَحْنُ. الرجاء إنشاء حساب مهني وتقديم الاسم والتخصص عبر الرابط التالي. تقديم الطلب لا يعني تفعيل الاعتماد، ولا تشارك أي معلومات تخص المرضى:\n",
     "Dear Doctor, NA7N invites you to apply as a medical education reviewer. Register with your professional name and specialty. Submission does not grant review privileges. Do not share patient data:\n")+url;
    window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank","noopener,noreferrer");
   });
   panel.append(h,message,link,invite);
   const form=byId("mr-assign-form");form.after(panel);
  }
  panel.hidden=false;
  panel.querySelector("h3").textContent=empty
   ? T("إضافة أول طبيب مراجع","Invite your first physician")
   : T("دعوة طبيب مراجع إضافي","Invite another physician");
 }
 async function showPendingApplicants(){
  let section=byId("mr-pending-applications");
  if(!section){
   section=document.createElement("section");section.className="mr-card";section.id="mr-pending-applications";
   const title=document.createElement("h2");title.textContent=T("طلبات انضمام الأطباء بانتظار موافقة الإدارة","Pending physician applications");
   const lead=document.createElement("p");lead.textContent=T("توافق الإدارة على انضمام الطبيب بالاسم والتخصص، دون طلب رقم ترخيص أو التحقق منه.","Staff approve physician participation by name and specialty. No license number or license check is required.");
   const list=document.createElement("div");list.id="mr-pending-list";list.className="mr-review-list";
   section.append(title,lead,list);
   byId("mr-admin-work").after(section);
  }
  const {data:pending,error:applicationError}=await sb.from("na7n_medical_review_applications").select("*").eq("status","pending").order("submitted_at",{ascending:false});
  if(applicationError)throw applicationError;
  const list=byId("mr-pending-list");list.replaceChildren();
  if(!pending.length){const p=document.createElement("p");p.textContent=T("لا توجد طلبات تسجيل مهني حتى الآن.","No professional applications have been submitted.");list.append(p);return;}
  for(const p of pending){
   const card=document.createElement("div");card.className="mr-note";
   const name=document.createElement("strong");name.textContent=en?(p.full_name_en||p.full_name_ar):p.full_name_ar;
   const desc=document.createElement("div");
   desc.textContent=(en?(p.specialty_en||p.specialty_ar):p.specialty_ar)+" · "+T("الحالة: ","Status: ")+(p.status==="pending"?T("بانتظار موافقة الإدارة","Pending staff approval"):p.status);
   card.append(name,desc);
   if(p.user_id===user.id){
    const warning=document.createElement("p");warning.className="mr-status";warning.dataset.kind="info";
    warning.textContent=T(
      "هذا طلبك المهني. يجب أن يوافق مسؤول آخر مخوّل على تفعيلك، ولا يمكنك تكليف نفسك بمراجعة صفحة.",
      "This is your own application. Another authorized staff member must approve activation, and you cannot assign yourself to a page.");
    card.append(warning);
   }
   if(p.user_id!==user.id){
    for(const outcome of ["approved","declined"]){
     const button=document.createElement("button");button.type="button";button.className="mr-btn secondary";
     button.textContent=outcome==="approved"?T("الموافقة وتفعيل الطبيب","Approve and activate"):T("رفض الطلب","Decline application");
     button.addEventListener("click",async()=>{
      card.querySelectorAll("button").forEach(b=>b.disabled=true);
      const {error}=await sb.rpc("na7n_medical_approve_application",{p_applicant_id:p.user_id,p_outcome:outcome});
      if(error){say(msg(error),"error");card.querySelectorAll("button").forEach(b=>b.disabled=false);return;}
      await coordinatorHome();
     });card.append(button);
    }
   }
   list.append(card);
  }
 }
 async function refreshAdmin(){
  assignments=await query("na7n_medical_review_assignments");decisions=await query("na7n_medical_review_decisions");
  const list=byId("mr-admin-assignments");list.replaceChildren();
  for(const a of assignments.slice().sort((x,y)=>y.assigned_at.localeCompare(x.assigned_at)).slice(0,60)){
   const d=decisions.find(z=>z.assignment_id===a.id),r=reviewers.find(z=>z.user_id===a.reviewer_id);
   const div=document.createElement("div");div.className="mr-note";
   div.textContent=a.page_path+" — "+(r?.display_name_ar||"—")+" — "+(d?.decision||T("بانتظار","Pending"))+" — "+(a.is_active?T("نشط","Active"):T("ملغى","Inactive"));
   list.append(div);
  }
  if(!assignments.length)text(list,T("لا توجد تكليفات حتى الآن.","No assignments yet."));
 }
 async function preparePage(){
  const path=byId("mr-page").value;
  if(!ALLOWED.includes(path))return;
  try{const p=await loadPage(path);currentSha=p.sha;text(byId("mr-current-hash"),p.sha);say(T("تم حساب بصمة الصفحة الحالية؛ يُربط بها تكليف الطبيب.","Current page digest calculated; assignments bind to this exact text."),"success");}
  catch(e){say(msg(e),"error");}
 }
 async function assign(e){
  e.preventDefault();const page=byId("mr-page").value,doctor=byId("mr-doctor").value;
  if(!doctor){say(T("لا يوجد طبيب مفعّل بموافقة الإدارة بعد. استخدم دعوة التسجيل أولًا.","No staff-approved physician is available. Use the registration invitation first."),"error");return;}
  if(!currentSha){say(T("تعذر حساب نسخة الصفحة؛ أعد اختيارها.","Could not verify page version. Select it again."),"error");return;}
  const {data,error}=await sb.rpc("na7n_medical_assign",{p_page_path:page,p_sha256:currentSha,p_reviewer_id:doctor,p_due_at:null});
  if(error){say(msg(error),"error");return;}
  lastAssignment=data;await refreshAdmin();const url=location.origin+"/doctor-review.html?assignment="+encodeURIComponent(data);
  text(byId("mr-assignment-link"),url);show("mr-send-row",true);say(T("تم تكليف الطبيب. افتح واتساب وأرسل الرابط بعد مراجعة المستلم.","Assignment saved. Open WhatsApp and send the link to the right physician."),"success");
 }
 function whatsapp(){
  if(!lastAssignment)return;
  const url=location.origin+"/doctor-review.html?assignment="+lastAssignment;
  const message=T("دكتورنا الكريم، نرجو مراجعة صفحة نَحْنُ عبر الرابط الآمن أدناه. بعد تسجيل الدخول اقرأ جميع الفقرات والأقسام ثم سجّل ملاحظاتك وقرارك (موافق/تحتاج تعديل/رفض). الرابط لا يمنح صلاحية اعتماد بحد ذاته.\n","Dear Doctor, please review the assigned NA7N page using the link below. Sign in, review all sections, add paragraph comments and record Approve / Request changes / Reject. The link itself does not grant approval access.\n")+url;
  window.open("https://wa.me/?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
 }
 async function publish(e){
  e.preventDefault();const path=byId("mr-page").value,qa=byId("mr-qa-url").value.trim();
  const page=await loadPage(path);if(page.sha!==currentSha){say(T("تغيرت الصفحة؛ أعد حساب الإصدار.","Page changed. Recalculate the digest."),"error");return;}
  const {error}=await sb.rpc("na7n_medical_publish",{p_page_path:path,p_sha256:currentSha,p_qa_evidence_url:qa});
  if(error){say(msg(error),"error");return;}
  say(T("سُجّل قرار النشر لهذا الإصدار. ستظهر العلامة الخضراء فقط إذا استمرت شروط الاعتماد صحيحة.","Publisher release recorded for this digest. Green appears only while all conditions still hold."),"success");
 }
 byId("mr-login-form")?.addEventListener("submit",signIn);
 byId("mr-signout")?.addEventListener("click",signOut);
 byId("mr-comment-form")?.addEventListener("submit",saveComment);
 byId("mr-decision-form")?.addEventListener("submit",submitDecision);
 byId("mr-page")?.addEventListener("change",preparePage);
 byId("mr-assign-form")?.addEventListener("submit",assign);
 byId("mr-whatsapp")?.addEventListener("click",whatsapp);
 byId("mr-publish-form")?.addEventListener("submit",publish);
 initSession().catch(e=>say(msg(e),"error"));
})();

