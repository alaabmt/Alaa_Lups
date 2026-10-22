/* NA7N clinician self-registration. Applications NEVER activate medical review permissions. */
(() => {
 "use strict";
 const ar=document.documentElement.lang!=="en",T=(a,b)=>ar?a:b,$=id=>document.getElementById(id);
 const sb=window.supabase?.createClient("https://wobpwxdlfrzfugzocdie.supabase.co","sb_publishable_QlDRz3T6CwgTHI3cdGJLMA_BwH4qlwO");
 const say=(m,kind="info")=>{const el=$("dr-status");el.textContent=m;el.dataset.kind=kind;};
 const hidden=(id,yes)=>$(id).hidden=yes;
 const err=e=>e?.message||T("تعذر إكمال الطلب.","Could not complete the request.");
 let activeUser=null;
 async function state(){
  if(!sb){say(T("تعذّر تحميل خدمة الحساب.","Account service is unavailable."),"error");return;}
  const {data,error}=await sb.auth.getUser();
  activeUser=!error?data?.user:null;
  hidden("dr-auth",!!activeUser);hidden("dr-application",!activeUser);hidden("dr-user-bar",!activeUser);
  if(!activeUser){say(T("سجّل الدخول أو أنشئ حسابًا مهنيًا لطلب مراجعة المحتوى.","Sign in or create a professional account to request review assignments."));return;}
  $("dr-user").textContent=activeUser.email||"";
  const {data:existing,error:readError}=await sb.from("na7n_medical_review_applications").select("status,submitted_at").eq("user_id",activeUser.id).maybeSingle();
  if(readError){say(err(readError),"error");hidden("dr-apply-form",true);return;}
  if(existing){
   hidden("dr-apply-form",true);hidden("dr-applied",false);
   $("dr-application-state").textContent=existing.status==="pending"
    ?T("تم استلام طلبك وهو بانتظار موافقة الإدارة وتفعيل حسابك للمراجعة.","Application received. Administrative approval and reviewer activation are pending.")
    :["approved","verified"].includes(existing.status)
    ?T("تم تسجيل مراجعة طلبك. تابع مع منسق الموقع لتأكيد تفعيل التكليفات.","Your application has been reviewed. Contact the coordinator about your activation.")
    :T("تم إغلاق الطلب. تواصل مع إدارة نَحْنُ للمزيد من المعلومات.","Application closed. Contact the NA7N coordinator for details.");
   say(T("يمكنك متابعة حالة طلبك هنا.","Your request status is available here."),"success");
  }else{hidden("dr-applied",true);hidden("dr-apply-form",false);say(T("أدخل معلوماتك المهنية. التسجيل لا يعني الاعتماد كطبيب مراجع.","Enter your professional details. Registration does not activate reviewer permissions."));}
 }
 $("dr-login-form").addEventListener("submit",async e=>{
  e.preventDefault();say(T("جارٍ تسجيل الدخول...","Signing in..."));
  const {error}=await sb.auth.signInWithPassword({email:$("dr-login-email").value.trim(),password:$("dr-login-password").value});
  if(error){say(err(error),"error");return;}
  $("dr-login-password").value="";await state();
 });
 $("dr-signup-form").addEventListener("submit",async e=>{
  e.preventDefault();const email=$("dr-signup-email").value.trim(),password=$("dr-signup-password").value;
  if(password.length<8){say(T("اختر كلمة مرور لا تقل عن 8 أحرف.","Choose a password of at least eight characters."),"error");return;}
  say(T("جارٍ إنشاء الحساب...","Creating account..."));
  const {data,error}=await sb.auth.signUp({email,password});
  $("dr-signup-password").value="";
  if(error){say(err(error),"error");return;}
  if(!data?.session){say(T("تحقق من بريدك الإلكتروني لإكمال تسجيل الحساب، ثم عد إلى هذه الصفحة لتسجيل الدخول وتقديم الطلب.","Check your email to confirm your account, then return here, sign in and submit the professional application."),"success");return;}
  await state();
 });
 $("dr-apply-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!activeUser)return;
  if(!$("dr-contact-consent").checked){say(T("الموافقة على التواصل المهني مطلوبة لتقديم الطلب.","Professional contact consent is required."),"error");return;}
  const v=id=>$(id).value.trim();
  const row={
   user_id:activeUser.id,
   full_name_ar:v("dr-name-ar"),full_name_en:v("dr-name-en")||null,
   specialty_ar:v("dr-specialty-ar"),specialty_en:v("dr-specialty-en")||null,
   consent_to_professional_contact:true,consent_to_publish_name:$("dr-public-name").checked,
   consent_to_publish_photo:false
  };
  say(T("جارٍ إرسال الطلب للمراجعة...","Submitting your application..."));
  const {error}=await sb.from("na7n_medical_review_applications").insert(row);
  if(error){say(err(error),"error");return;}await state();
 });
 $("dr-signout").addEventListener("click",async()=>{await sb.auth.signOut();await state();});
 if(sb)state().catch(e=>say(err(e),"error"));
})();

