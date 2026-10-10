(() => {
  "use strict";
  // HARD STOP: current Supabase database is outside the UAE. Do not turn this on
  // until a reviewed storage deployment has received the private-story schema,
  // verified staff identities and role bindings, and a signed compliance decision.
  const STORY_CONTENT_STORAGE_APPROVED = false;
  const $ = id => document.getElementById(id);
  const client = window.na7nSupabase;
  let user = null, staff = null, factorId = null, selectedCase = null, cases = [];
  let reviewers = [], busy = false, sequence = 0;
  const visible = (id, yes) => $(id)?.classList.toggle("admin-hidden", !yes);
  const inform = (id, message) => { if ($(id)) $(id).textContent = message; };
  const friendlyError = () => "تعذر إكمال الإجراء. تحقق من اتصالك وصلاحياتك، ثم حاول مجددًا.";
  function resetViews() {
    ["admin-login","admin-mfa","admin-denied","admin-board","case-detail"].forEach(id => visible(id,false));
    visible("mfa-setup",false);
    visible("mfa-enroll",false);
    inform("login-message","");
    inform("mfa-message","");
    inform("detail-status-message","");
  }
  function clearPrivate() {
    selectedCase = null; cases = []; reviewers = [];
    $("cases-body").replaceChildren();
    $("review-list").replaceChildren();
    $("detail-story").value = "";
    $("detail-edited").value = "";
    $("review-note").value = "";
    visible("case-detail",false);
  }
  async function render() {
    const version = ++sequence;
    resetViews();
    if (!client) { visible("admin-login",true); inform("login-message","خدمة تسجيل الدخول غير متاحة حاليًا."); $("admin-login-form").querySelector("button").disabled=true; return; }
    let current;
    try { current = await client.auth.getUser(); }
    catch { visible("admin-login",true); inform("login-message",friendlyError()); return; }
    if(version!==sequence)return;
    user = current?.data?.user || null;
    if (!user) { staff = null; clearPrivate(); visible("admin-login",true); return; }
    try {
      const aal = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if(version!==sequence)return;
      if(aal.error || aal.data?.currentLevel!=="aal2") { await showMfa(); return; }
      const response = await client.from("na7n_story_staff")
        .select("user_id,role,display_name,is_active")
        .eq("user_id",user.id).maybeSingle();
      if(version!==sequence)return;
      if(response.error || !response.data?.is_active ||
          !["privacy_owner","educational_reviewer"].includes(response.data.role)) {
        staff = null; clearPrivate(); visible("admin-denied",true); return;
      }
      staff = response.data;
      visible("admin-board",true);
      inform("admin-role",staff.role==="privacy_owner"?"مسؤولة الخصوصية والتحرير واعتماد النشر":"مراجع تثقيفي للحالات المعيَّنة فقط");
      inform("admin-person",staff.display_name+" — "+(user.email||"حساب مصرح"));
      if (!STORY_CONTENT_STORAGE_APPROVED) {
        inform("cases-status","لم تُعتمد بيئة تخزين القصص الطبية. تم إثبات دورك دون تحميل أي بيانات مرضى.");
        return;
      }
      visible("refresh-cases",true);
      await loadCases();
    } catch {
      if(version===sequence){ clearPrivate(); visible("admin-denied",true); }
    }
  }
  async function showMfa() {
    visible("admin-mfa",true);
    inform("mfa-explanation","يجب تأكيد الهوية باستخدام تطبيق المصادقة قبل الاطلاع على أي معلومات إدارية.");
    const {data,error}=await client.auth.mfa.listFactors();
    if(error){inform("mfa-message",friendlyError());return;}
    const verified = data?.totp?.find(f => f.status==="verified");
    if(verified){factorId=verified.id;visible("mfa-form",true);inform("mfa-explanation","أدخل رمز تطبيق المصادقة المرتبط بحسابك.");}
    else {visible("mfa-enroll",true);visible("mfa-form",false);inform("mfa-explanation","هذه أول مرة تستخدم فيها التحقق بخطوتين. فعّل تطبيق المصادقة لبدء الدخول.");}
  }
  async function enrollMfa() {
    if(busy)return;busy=true;$("mfa-enroll").disabled=true;
    try {
      const {data,error}=await client.auth.mfa.enroll({factorType:"totp",friendlyName:"NA7N staff stories"});
      if(error || !data?.id || !data?.totp?.qr_code)throw new Error("enrollment");
      factorId=data.id;
      // QR is supplied by Supabase Auth; it is never written to GitHub or a database.
      $("mfa-qr").src=data.totp.qr_code;
      inform("mfa-secret","إذا تعذر مسح الرمز، أدخله يدويًا في تطبيق المصادقة: "+(data.totp.secret||""));
      visible("mfa-setup",true);visible("mfa-form",true);visible("mfa-enroll",false);
      inform("mfa-message","امسح الرمز في تطبيق المصادقة ثم أدخل رمز الستة أرقام.");
    }catch{inform("mfa-message",friendlyError());}
    finally{busy=false;$("mfa-enroll").disabled=false;}
  }
  async function verifyMfa(event) {
    event.preventDefault();if(busy||!factorId)return;
    const code=$("mfa-code").value.trim();if(!/^\d{6}$/.test(code))return;
    busy=true;
    try {
      const challenge=await client.auth.mfa.challenge({factorId});
      if(challenge.error||!challenge.data?.id)throw new Error("challenge");
      const check=await client.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});
      if(check.error)throw new Error("verify");
      $("mfa-code").value="";
      await render();
    } catch {inform("mfa-message","رمز المصادقة غير صحيح أو انتهت صلاحيته. حاول مجددًا.");}
    finally{busy=false;}
  }
  async function login(event) {
    event.preventDefault();if(busy||!client)return;
    const email=$("staff-email").value.trim(),password=$("staff-password").value;
    if(!email || !password)return;
    busy=true;inform("login-message","جارٍ التحقق من الحساب…");
    try {
      const r=await client.auth.signInWithPassword({email,password});
      $("staff-password").value="";
      if(r.error) { inform("login-message","تعذر تسجيل الدخول. تحقق من بيانات الحساب.");return; }
      await render();
    }catch{inform("login-message",friendlyError());}
    finally{busy=false;}
  }
  async function logout() {
    if(!client)return;
    ++sequence;clearPrivate();staff=null;user=null;
    try{await client.auth.signOut();}catch{}
    await render();
  }
  function statusLabel(st) {
    return {new:"جديدة",privacy_review:"مراجعة الخصوصية",assigned:"مُعيّنة لمراجع",
      educational_review:"مراجعة تثقيفية",awaiting_author_consent:"بانتظار موافقة الكاتب",
      approved:"معتمدة",published:"منشورة",rejected:"مرفوضة",withdrawn:"مسحوبة"}[st]||"غير معروف";
  }
  async function loadCases() {
    if(!STORY_CONTENT_STORAGE_APPROVED || !staff)return;
    inform("cases-status","جارٍ تحميل الحالات المصرّح بها…");
    const response=await client.from("na7n_story_cases")
      .select("id,title,redacted_story,edited_story,status,assigned_reviewer,clinical_review_required,privacy_cleared_at,created_at")
      .order("created_at",{ascending:false}).limit(100);
    if(response.error){ inform("cases-status","تعذر تحميل الحالات. تحقق من اعتماد التخزين وسياسات الصلاحيات.");return; }
    cases=response.data||[];
    $("cases-body").replaceChildren();
    const counts = {
      news:cases.filter(c=>c.status==="new").length,
      review:cases.filter(c=>["privacy_review","assigned","educational_review"].includes(c.status)).length,
      consent:cases.filter(c=>c.status==="awaiting_author_consent").length
    };
    inform("stat-new",counts.news);inform("stat-review",counts.review);inform("stat-consent",counts.consent);
    visible("cases-table",cases.length>0);visible("cases-empty",cases.length===0);
    inform("cases-status",staff.role==="privacy_owner"?"الحالات المصرّح بها لإدارة الخصوصية.":"الحالات المُسندة إليك فقط.");
    for(const c of cases){
      const row=document.createElement("tr");
      for(const value of [c.title,statusLabel(c.status),new Date(c.created_at).toLocaleDateString("ar-AE")]){
        const td=document.createElement("td");td.textContent=value||"";row.append(td);
      }
      const action=document.createElement("td"),button=document.createElement("button");
      button.type="button";button.className="admin-select-btn";button.textContent="فتح";
      button.addEventListener("click",()=>openCase(c.id));action.append(button);row.append(action);$("cases-body").append(row);
    }
    if(staff.role==="privacy_owner"){
      const staffList=await client.rpc("na7n_story_reviewers_for_owner");
      reviewers=staffList.error?[]:(staffList.data||[]);
    }
  }
  async function openCase(id){
    if(!STORY_CONTENT_STORAGE_APPROVED || !staff)return;
    const record=cases.find(c=>c.id===id);if(!record)return;
    selectedCase=record;
    visible("case-detail",true);
    inform("detail-title",record.title+" — "+statusLabel(record.status));
    $("detail-story").value=record.redacted_story||"";
    $("detail-edited").value=record.edited_story||"";
    inform("detail-guidance",staff.role==="privacy_owner"?
      "مراجعة الخصوصية والتحرير من اختصاصك. لا تضع بيانات المرضى في تقارير أو سجلات عامة.":
      "أنت مخوّل بمراجعة السلامة التثقيفية فقط، ولا يمكنك الاطلاع على بريد المشارك أو بياناته الأصلية، أو اعتماد النشر.");
    visible("owner-editor",staff.role==="privacy_owner");
    visible("reviewer-editor",staff.role==="educational_reviewer");
    if(staff.role==="privacy_owner"){
      const list=$("detail-reviewer");list.replaceChildren();
      const empty=document.createElement("option");empty.value="";empty.textContent="لم يُعيَّن";list.append(empty);
      reviewers.forEach(r=>{let op=document.createElement("option");op.value=r.user_id;op.textContent=r.display_name;list.append(op);});
      list.value=record.assigned_reviewer||"";
      $("detail-status").value=["approved","published"].includes(record.status)?"awaiting_author_consent":record.status;
      $("detail-privacy-cleared").checked=!!record.privacy_cleared_at;
    }
    await loadReviews(id);
    $("case-detail").scrollIntoView({block:"start",behavior:"smooth"});
  }
  async function loadReviews(id){
    $("review-list").replaceChildren();
    const q=await client.from("na7n_story_reviews")
      .select("comment,review_type,created_at").eq("case_id",id).order("created_at",{ascending:false});
    if(q.error){inform("detail-status-message","تعذر تحميل الملاحظات.");return;}
    if(!q.data?.length){const p=document.createElement("p");p.textContent="لا توجد مراجعات مسجلة."; $("review-list").append(p);return;}
    for(const r of q.data){
      const p=document.createElement("p");p.className="admin-note";
      p.textContent=new Date(r.created_at).toLocaleString("ar-AE")+" — "+r.comment;
      $("review-list").append(p);
    }
  }
  async function saveCase(){
    if(!STORY_CONTENT_STORAGE_APPROVED || staff?.role!=="privacy_owner" || !selectedCase || busy)return;
    const edited=$("detail-edited").value.trim(),status=$("detail-status").value;
    const update={edited_story:edited||null,assigned_reviewer:$("detail-reviewer").value||null,
      status,privacy_cleared_at:$("detail-privacy-cleared").checked
        ? (selectedCase.privacy_cleared_at||new Date().toISOString()) : null};
    busy=true;
    try{
      const x=await client.from("na7n_story_cases").update(update)
        .eq("id",selectedCase.id).select("id").single();
      if(x.error)throw x.error;
      inform("detail-status-message","حُفظت التعديلات. لا تمنح هذه الخطوة إذن النشر.");
      await loadCases();
    }catch{inform("detail-status-message","فشل حفظ المراجعة. تحقق من صلاحياتك ومتطلبات المرحلة.");}
    finally{busy=false;}
  }
  async function saveReview(){
    if(!STORY_CONTENT_STORAGE_APPROVED || staff?.role!=="educational_reviewer" || !selectedCase || busy)return;
    const comment=$("review-note").value.trim();
    if(comment.length<5){inform("detail-status-message","أدخل ملاحظة من خمسة أحرف على الأقل.");return;}
    busy=true;
    try{
      const r=await client.from("na7n_story_reviews").insert({
        case_id:selectedCase.id,reviewer_id:user.id,review_type:"educational_safety",comment
      });
      if(r.error)throw r.error;
      $("review-note").value="";inform("detail-status-message","تم حفظ ملاحظة المراجعة دون منح صلاحية النشر.");
      await loadReviews(selectedCase.id);
    }catch{inform("detail-status-message","تعذر حفظ الملاحظة. تأكد من تعيين الحالة لك.");}
    finally{busy=false;}
  }
  $("admin-login-form").addEventListener("submit",login);
  $("mfa-form").addEventListener("submit",verifyMfa);
  $("mfa-enroll").addEventListener("click",enrollMfa);
  $("admin-logout").addEventListener("click",logout);
  $("denied-logout").addEventListener("click",logout);
  $("refresh-cases").addEventListener("click",loadCases);
  $("save-case").addEventListener("click",saveCase);
  $("submit-review").addEventListener("click",saveReview);
  render();
})();
