/* NA7N isolated clinical-licence verification desk. No editorial or publishing permissions. */
(() => {
 "use strict";
 const en=document.documentElement.lang==="en";
 const tr=(ar,eng)=>en?eng:ar;
 const get=id=>document.getElementById(id);
 const db=window.na7nSupabase||window.supabase?.createClient(
  "https://wobpwxdlfrzfugzocdie.supabase.co","sb_publishable_QlDRz3T6CwgTHI3cdGJLMA_BwH4qlwO");
 let actor=null,cases=[],activeCase=null;
 function show(id,visible){const el=get(id);if(el)el.hidden=!visible;}
 function status(message,kind="info"){get("lv-status").textContent=message;get("lv-status").dataset.kind=kind;}
 function errorMessage(e){return e?.message||tr("تعذّر تنفيذ الطلب.","The request could not be completed.");}
 const line=(parent,text,tag="p")=>{const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;};
 async function load(){
  if(!db){status(tr("خدمة الحساب غير متاحة.","Account service unavailable."),"error");return;}
  const {data,error}=await db.auth.getUser();actor=error?null:data?.user;
  show("lv-login",!actor);show("lv-profile",!!actor);show("lv-work",false);
  if(!actor){status(tr("سجل الدخول بحساب مسؤول التحقق المخصص.","Sign in using the designated credential verification account."));return;}
  get("lv-identity").textContent=actor.email||"";
  const role=await db.from("na7n_medical_license_verifiers").select("is_active")
   .eq("user_id",actor.id).maybeSingle();
  if(role.error)throw role.error;
  if(!role.data?.is_active){
   status(tr("الحساب لا يملك صلاحية التحقق من التراخيص. تواصل مع الإدارة.","This account has no credential-verifier authority."),"error");return;
  }
  show("lv-work",true);await refresh();
 }
 async function refresh(){
  const {data,error}=await db.from("na7n_medical_review_applications")
   .select("user_id,full_name_ar,full_name_en,specialty_ar,specialty_en,licensing_authority,license_reference,consent_to_publish_name,status,submitted_at")
   .eq("status","pending").order("submitted_at",{ascending:true});
  if(error)throw error;
  cases=data||[];
  const list=get("lv-list");list.replaceChildren();
  const n=get("lv-count");n.textContent=String(cases.length);
  if(!cases.length){
   line(list,tr("لا توجد طلبات مهنية معلّقة حاليًا.","There are no pending professional applications."));
   show("lv-case",false);status(tr("لم تُسجّل طلبات تنتظر التحقق.","No applications awaiting verification."),"success");return;
  }
  for(const item of cases){
   const button=document.createElement("button");button.type="button";button.className="mr-review-link lv-case-button";
   button.textContent=(en?item.full_name_en||item.full_name_ar:item.full_name_ar)+
    " — "+(en?item.specialty_en||item.specialty_ar:item.specialty_ar);
   button.addEventListener("click",()=>selectCase(item.user_id));
   list.append(button);
  }
  if(activeCase && cases.some(x=>x.user_id===activeCase.user_id)){selectCase(activeCase.user_id);}
  else{activeCase=null;show("lv-case",false);}
  status(tr("اختر طلبًا وراجع الترخيص لدى جهة الترخيص الرسمية قبل تسجيل القرار.","Select an application and independently check its medical licence with the issuing authority."));
 }
 function selectCase(id){
  const item=cases.find(x=>x.user_id===id);if(!item)return;
  activeCase=item;show("lv-case",true);
  get("lv-name").textContent=en?item.full_name_en||item.full_name_ar:item.full_name_ar;
  get("lv-specialty").textContent=en?item.specialty_en||item.specialty_ar:item.specialty_ar;
  get("lv-authority").textContent=item.licensing_authority;
  get("lv-license").textContent=item.license_reference;
  get("lv-submit-date").textContent=new Date(item.submitted_at).toLocaleDateString(en?"en-US":"ar-AE");
  get("lv-consent").textContent=item.consent_to_publish_name?tr("نعم","Yes"):tr("لا","No");
  const self=item.user_id===actor?.id;
  get("lv-form").reset();
  show("lv-self-warning",self);
  get("lv-submit").disabled=self;
  if(self)status(tr("لا يمكنك التحقق من طلبك بنفسك؛ اطلب تحقق مسؤول مستقل.","You cannot verify your own application. Another authorized verifier is required."),"error");
  else status(tr("القرار النهائي لا يُحفظ إلا مع دليل تحقق رسمي موثق.","A final decision requires documented official verification evidence."));
 }
 async function submit(event){
  event.preventDefault();
  if(!activeCase||!actor||activeCase.user_id===actor.id)return;
  const decision=get("lv-outcome").value;
  const note=get("lv-notes").value.trim();
  const physician=get("lv-physician").checked,attestation=get("lv-attest").checked;
  if(!["verified","declined"].includes(decision)){status(tr("اختر اعتماد الترخيص أو رفض التحقق.","Select verified or declined."),"error");return;}
  if(note.length<20){
   status(tr("اكتب تفاصيل التحقق من الترخيص في الملاحظات (20 حرفًا على الأقل).","Document the licence check in the notes (at least 20 characters)."),"error");return;
  }
  if(decision==="verified"&&!physician){
   status(tr("لا يمكن تفعيل الصلاحية إلا بعد إثبات ترخيص طبيب ساري المفعول (لا ترخيص تمريض أو مهنة مساندة).","Only a currently licensed physician, not a nurse or allied-health professional, can be activated."),"error");return;
  }
  if(!attestation){status(tr("أكّد أنك تحققت بنفسك من المصدر الرسمي.","Confirm you checked the authoritative record yourself."),"error");return;}
  const question=decision==="verified"
   ?tr("سيُسجّل تحقق الترخيص وتُفعّل صفة طبيب مراجع لهذا الحساب. هل راجعت السجل الرسمي وتخصصه فعليًا؟","This activates physician reviewer eligibility. Did you personally check the official record and specialty?")
   :tr("هل تريد رفض طلب التحقق وتسجيل الملاحظات؟","Decline the application and record the reasons?");
  if(!confirm(question))return;
  get("lv-submit").disabled=true;
  status(tr("جارٍ حفظ نتيجة التحقق...","Saving verification decision..."));
  const {error}=await db.rpc("na7n_medical_check_license",{
   p_applicant_id:activeCase.user_id,p_outcome:decision,
   p_verification_note:note,
   p_physician_license_confirmed:decision==="verified"&&physician
  });
  if(error){get("lv-submit").disabled=false;status(errorMessage(error),"error");return;}
  activeCase=null;
  await refresh();
  status(decision==="verified"
   ?tr("حُفظ تحقق الترخيص المهني. ما زال تكليف الصفحات واعتمادها إجراءين منفصلين.","Physician credential verified. Page assignments and approvals remain separate.")
   :tr("حُفظ قرار رفض التحقق دون منح أي صلاحيات.","Verification declined. No reviewer privileges granted."),"success");
 }
 get("lv-signin")?.addEventListener("submit",async event=>{
  event.preventDefault();status(tr("جارٍ تسجيل الدخول...","Signing in..."));
  const {error}=await db.auth.signInWithPassword({
   email:get("lv-email").value.trim(),password:get("lv-password").value
  });
  get("lv-password").value="";
  if(error){status(errorMessage(error),"error");return;}
  try{await load()}catch(e){status(errorMessage(e),"error")}
 });
 get("lv-signout")?.addEventListener("click",async()=>{await db.auth.signOut();location.reload()});
 get("lv-form")?.addEventListener("submit",submit);
 load().catch(e=>status(errorMessage(e),"error"));
})();
