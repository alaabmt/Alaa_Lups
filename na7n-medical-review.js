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
 // Staff and physicians must pass TOTP MFA before viewing assignments or making decisions.
 let pendingTotpId="";
 function mfaCard(){
  let node=byId("mr-mfa-card");if(node)return node;
  node=document.createElement("section");node.className="mr-card";node.id="mr-mfa-card";
  const title=document.createElement("h2");title.textContent=T("المصادقة الثنائية لحماية الاعتماد الطبي","Two-factor authentication for medical reviews");
  const intro=document.createElement("p");intro.textContent=T(
   "افتح تطبيق المصادقة على هاتفك (مثل Microsoft Authenticator أو Google Authenticator). لا ترسل رمز التحقق أو مفتاح الإعداد عبر واتساب أو لأي شخص.",
   "Use an authenticator app (e.g. Microsoft or Google Authenticator). Never share authentication codes or setup keys on WhatsApp.");
  const qr=document.createElement("img");qr.id="mr-mfa-qr";qr.hidden=true;qr.alt=T("رمز إعداد المصادقة الثنائية","MFA setup QR code");qr.style.cssText="display:block;width:min(220px,100%);height:auto;margin:10px auto";
  const help=document.createElement("p");help.id="mr-mfa-help";help.className="mr-meta";
  const secret=document.createElement("code");secret.id="mr-mfa-secret";secret.style.cssText="display:block;direction:ltr;word-break:break-all;font-size:14px;margin:8px 0";
  const setup=document.createElement("button");setup.id="mr-mfa-setup";setup.className="mr-btn secondary";setup.type="button";setup.textContent=T("إعداد المصادقة الثنائية","Set up two-factor authentication");
  const form=document.createElement("form");form.id="mr-mfa-form";form.className="mr-field";form.hidden=true;
  const label=document.createElement("label");label.htmlFor="mr-mfa-code";label.textContent=T("رمز التحقق المؤقت من 6 أرقام","Six-digit authenticator code");
  const code=document.createElement("input");code.id="mr-mfa-code";code.name="mfa-code";code.inputMode="numeric";code.autocomplete="one-time-code";code.pattern="[0-9]{6}";code.minLength=6;code.maxLength=6;code.required=true;code.type="text";
  const verify=document.createElement("button");verify.className="mr-btn";verify.type="submit";verify.textContent=T("التحقق والدخول","Verify and continue");
  form.append(label,code,verify);
  node.append(title,intro,help,setup,qr,secret,form);
  byId("mr-user-card").after(node);
  setup.addEventListener("click",async()=>{
   setup.disabled=true;try{
    const {data,error}=await sb.auth.mfa.enroll({factorType:"totp",friendlyName:"NA7N medical content review"});
    if(error)throw error;
    pendingTotpId=data.id;
    qr.hidden=false;
    const qrUrl=data.totp?.qr_code||"";
    if(qrUrl.startsWith("data:image/"))qr.src=qrUrl;else qr.hidden=true;
    secret.textContent=T("مفتاح الإعداد اليدوي (للاستخدام الشخصي فقط): ","Manual setup key (keep private): ")+(data.totp?.secret||"");
    setup.hidden=true;form.hidden=false;
    help.textContent=T("امسح الرمز أو أدخل المفتاح في تطبيق المصادقة، ثم أدخل رمز الأرقام الستة.",
      "Scan the QR or enter the setup key in your authenticator app, then type the six-digit code.");
   }catch(err){say(msg(err),"error");setup.disabled=false;}
  });
  form.addEventListener("submit",async(e)=>{
   e.preventDefault();const code=byId("mr-mfa-code").value.trim();
   if(!/^[0-9]{6}$/.test(code)){say(T("أدخل رمزًا من ستة أرقام.","Enter a six-digit code."),"error");return;}
   if(!pendingTotpId){say(T("أعد إعداد المصادقة الثنائية.","Restart MFA setup."),"error");return;}
   try{
    const {error}=await sb.auth.mfa.challengeAndVerify({factorId:pendingTotpId,code});
    if(error)throw error;
    byId("mr-mfa-code").value="";pendingTotpId="";
    secret.textContent="";qr.removeAttribute("src");node.hidden=true;
    await initSession();
   }catch(err){say(msg(err),"error");}
  });
  return node;
 }
 async function ensureMfa(){
  const assurance=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.error)throw assurance.error;
  if(assurance.data?.currentLevel==="aal2"){const c=byId("mr-mfa-card");if(c)c.hidden=true;return true;}
  const card=mfaCard();card.hidden=false;show("mr-panel",false);
  const factors=await sb.auth.mfa.listFactors();if(factors.error)throw factors.error;
  const verified=(factors.data?.totp||[]).find(x=>x.status==="verified");
  const setup=byId("mr-mfa-setup"),form=byId("mr-mfa-form"),help=byId("mr-mfa-help");
  if(verified){
   setup.hidden=true;form.hidden=false;pendingTotpId=verified.id;
   help.textContent=T("الحساب محمي. أدخل الرمز المتجدد من تطبيق المصادقة للمتابعة.",
     "Your account has an authenticator. Enter the current six-digit code.");
  }else{
   setup.hidden=false;form.hidden=true;
   help.textContent=T("قبل إدارة الأطباء يجب تفعيل المصادقة الثنائية. استخدم تطبيق مصادقة موثوق.",
     "Set up two-factor authentication before you can manage clinical reviews.");
  }
  say(T("لن تُفتح صلاحيات المراجعة حتى ينجح التحقق بخطوتين.","Review permissions remain locked until MFA verification succeeds."));
  return false;
 }
 async function initSession(){
  if(!sb){say(T("خدمة تسجيل الدخول غير متاحة.","Authentication service unavailable."),"error");return;}
  const {data,error}=await sb.auth.getUser();user=!error?data?.user:null;
  show("mr-login",!user);show("mr-panel",false);show("mr-signout",!!user);
  if(!user){const c=byId("mr-mfa-card");if(c)c.hidden=true;say(T("سجّل الدخول بحساب الطبيب أو المنسق المكلف رسميًا.","Sign in with your assigned physician or coordinator account."));return;}
  text(byId("mr-user"),user.email||"");
  try{
   const roleTable=mode==="doctor"?"na7n_medical_reviewers":"na7n_medical_review_staff";
   const authz=await sb.from(roleTable).select(mode==="doctor"?"user_id,is_active,license_verified_at":"user_id,is_active").eq("user_id",user.id).maybeSingle();
   if(authz.error)throw authz.error;
   if(!authz.data?.is_active || (mode==="doctor"&&!authz.data?.license_verified_at)){
    say(T("هذا الحساب غير مكلّف بهذا الدور. لا تُمنح الصلاحية إلا بعد التحقق والتكليف الإداري.","This account has no verified assignment for this role."),"error");return;
   }
   if(!(await ensureMfa()))return;
   show("mr-panel",true);
   say(T("تم التحقق من تسجيل الدخول والمصادقة الثنائية.","Sign-in and MFA verified."),"success");
   if(mode==="doctor")await doctorHome();else await coordinatorHome();
  }catch(ex){say(msg(ex),"error");}
 }
 async function query(table){const {data,error}=await sb.from(table).select("*");if(error)throw error;return data||[];}
 async function doctorHome(){
  let {data,error}=await sb.from("na7n_medical_review_assignments").select("*").eq("reviewer_id",user.id).order("assigned_at",{ascending:false});
  if(error)throw error;assignments=data||[];
  const d=await sb.from("na7n_medical_review_decisions").select("*");
  if(d.error)throw d.error;decisions=d.data||[];
  const list=byId("mr-assignment-list");list.replaceChildren();
  if(!assignments.length)text(list,T("لم تُكلّف بأي صفحة بعد. يجب أن تتحقق الإدارة من ترخيصك وتخصصك أولًا.","You have no assigned pages yet. Your credentials and specialty must first be verified by the team."));
  assignments.forEach(a=>{
   const done=decisions.find(d=>d.assignment_id===a.id);
   const link=document.createElement("a");link.className="mr-review-link";link.href="?assignment="+encodeURIComponent(a.id);
   link.textContent=a.page_path+" · "+(done?T("قرار محفوظ: ","Recorded: ")+done.decision:(a.is_active?T("بانتظار المراجعة","Awaiting review"):T("تكليف مُلغى","Assignment inactive")));
   list.append(link);
  });
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
  const {error}=await sb.from("na7n_medical_review_decisions").insert({assignment_id:current.id,decision,statement});
  if(error){say(msg(error),"error");return;}say(T("حُفظ قرارك. لا تظهر العلامة الخضراء إلا بعد موافقة طبيبين واستكمال اعتماد النشر.","Decision saved. Green status requires two physician approvals and publisher release."),"success");await doctorHome();
 }
 async function coordinatorHome(){
  const {data,error}=await sb.from("na7n_medical_review_staff").select("*").eq("user_id",user.id).maybeSingle();
  if(error)throw error;staff=data;
  if(!staff?.is_active){show("mr-admin-work",false);say(T("هذا الحساب ليس منسقًا معتمدًا للمراجعات. أضف الدور من إدارة قاعدة البيانات بعد التحقق من الهوية.","This account is not a provisioned review coordinator."),"error");return;}
  show("mr-admin-work");show("mr-publisher",staff.role==="publisher");say(T("تأكد من تكليف طبيبين مستقلين والتحقق من ترخيص كل منهما.","Assign two distinct, verified physicians."),"success");
  reviewers=await query("na7n_medical_reviewers");await refreshAdmin();
  const select=byId("mr-doctor");select.replaceChildren();
  for(const r of reviewers.filter(r=>r.is_active&&r.license_verified_at)){
   const opt=document.createElement("option");opt.value=r.user_id;opt.textContent=(en?r.display_name_en||r.display_name_ar:r.display_name_ar)+" — "+(en?r.specialty_en||r.specialty_ar:r.specialty_ar);
   select.append(opt);
  }
  const page=byId("mr-page");ALLOWED.forEach(path=>{let opt=document.createElement("option");opt.value=path;opt.textContent=path;page.append(opt);});
  page.value="treatment.html";await preparePage();
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
  e.preventDefault();const page=byId("mr-page").value,doctor=byId("mr-doctor").value;if(!currentSha||!doctor)return;
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
