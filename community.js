/* NA7N members-only community index. Discussion creation is a separate page. */
(() => {
  "use strict";
  const en=document.documentElement.lang==="en";
  const t=(ar,english)=>en?english:ar;
  const $=id=>document.getElementById(id);
  const ui={prompts:$("cm-prompts"),threads:$("cm-threads"),count:$("cm-count"),
            search:$("cm-search"),filters:$("cm-filters"),status:$("cm-write-status")};
  if(!ui.prompts||!ui.threads)return;
  const client=window.na7nSupabase||null;
  const gate=$("cm-member-gate"),gateStatus=$("cm-gate-status");
  const categories={
    general:t("عام","General"), daily:t("الحياة اليومية","Daily life"),
    treatment:t("العلاج والأدوية","Treatment"),nutrition:t("التغذية","Nutrition"),
    work:t("العمل والدراسة","Work & study"),support:t("الدعم","Support"),
    goals:t("الأهداف","Goals")
  };
  const state={category:"all",query:"",prompts:[],posts:[],user:null,staff:null};
  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const detailUrl=(kind,id)=>{
    const params=new URLSearchParams({kind,id:String(id)});
    return (en?"community-topic-en.html":"community-topic.html")+"?"+params.toString();
  };
  const matches=(category,...parts)=>(state.category==="all"||state.category===category)
    && parts.join(" ").toLocaleLowerCase().includes(state.query.toLocaleLowerCase());
  function card({category,title,excerpt,meta,href}){
    const a=el("a","cm-topic");a.href=href;
    a.append(el("span","cm-tag",categories[category]||categories.general));
    a.append(el("h3","",title));
    a.append(el("p","",excerpt));
    if(meta)a.append(el("span","cm-post-meta",meta));
    a.append(el("span","cm-more",t("اقرأ النقاش ←","Read discussion →")));
    return a;
  }
  const remembered=history.state?.na7nCommunity;
  if(remembered&&typeof remembered==="object"){
    state.category=Object.prototype.hasOwnProperty.call(categories,remembered.category)
      ?remembered.category:"all";
    state.query=typeof remembered.query==="string"?remembered.query.slice(0,160):"";
    ui.search.value=state.query;
    ui.filters.querySelectorAll("[data-category]").forEach(b=>
      b.setAttribute("aria-pressed",String(b.dataset.category===state.category))
    );
  }
  function remember(){
    history.replaceState({...history.state,na7nCommunity:{category:state.category,query:state.query}},"",location.href);
  }
  function renderPrompts(){
    ui.prompts.replaceChildren();
    const listed=state.prompts.filter(p=>matches(p.category,p.title_ar,p.title_en,p.excerpt_ar,p.excerpt_en));
    ui.count.textContent=t("الموضوعات: ","Topics: ")+listed.length;
    for(const p of listed){
      ui.prompts.append(card({
        category:p.category,title:en?p.title_en:p.title_ar,
        excerpt:en?p.excerpt_en:p.excerpt_ar,
        meta:t("موضوع للنقاش","Discussion topic"),
        href:detailUrl("prompt",p.id)
      }));
    }
    if(!listed.length)ui.prompts.append(el("p","cm-empty",t("لا توجد موضوعات مطابقة.","No matching topics.")));
  }
  function renderPosts(){
    ui.threads.replaceChildren();
    const listed=state.posts.filter(p=>!p.parent_id&&matches(p.category,p.title||"",p.body||"",...(p.tags||[])));
    for(const p of listed){
      let date="";
      try{date=new Intl.DateTimeFormat(en?"en-GB":"ar-AE",{month:"short",day:"numeric",year:"numeric"}).format(new Date(p.created_at));}catch{}
      ui.threads.append(card({
        category:p.category,title:p.title||t("نقاش","Discussion"),
        excerpt:(p.body||"").slice(0,175)+((p.body||"").length>175?"…":""),
        meta:date+(p.status==="approved"?"":t(" · قيد المراجعة"," · Pending review")),
        href:detailUrl("post",p.id)
      }));
    }
    if(!listed.length)ui.threads.append(el("p","cm-empty",
      t("لا توجد نقاشات منشورة بعد. يمكنك قراءة الموضوعات أعلاه.",
        "No discussions yet. You can explore the topics above.")));
  }
  const reportPanel=$("cm-moderation-panel");
  const reportList=$("cm-reports-list");
  const reportStatus=$("cm-reports-status");
  const reasonLabels={
    privacy:t("معلومات خاصة","Private information"),
    medical:t("نصيحة طبية غير آمنة","Unsafe medical advice"),
    harassment:t("إساءة أو مضايقة","Abuse or harassment"),
    other:t("مخالفة أخرى","Other")
  };
  const isModerator=()=>state.staff?.is_active===true&&state.staff?.role==="moderator";
  const actionButton=(label,handler,secondary=true)=>{
    const b=el("button","cm-button"+(secondary?" alt":""),label);
    b.type="button";b.addEventListener("click",handler);return b;
  };
  async function resolveReports(postId,resolution){
    const {error}=await client.from("na7n_community_reports").update({
      resolved_at:new Date().toISOString(),
      resolution,
      reviewed_by:state.user.id
    }).eq("post_id",postId).is("resolved_at",null);
    return !error;
  }
  async function hideFlaggedPost(postId){
    if(!isModerator())return;
    if(!window.confirm(t("إخفاء المحتوى عن أعضاء المجتمع؟","Hide this content from community members?")))return;
    const {data,error}=await client.from("na7n_community_posts")
      .update({status:"hidden"}).eq("id",postId).select("id").maybeSingle();
    if(error||!data){reportStatus.textContent=t("تعذّر إخفاء المحتوى.","Could not hide content.");return;}
    const resolved=await resolveReports(postId,"hidden");
    reportStatus.textContent=resolved?t("تم إخفاء المحتوى.","Content hidden."):
      t("تم الإخفاء، لكن تعذّر إغلاق البلاغات تلقائيًا.","Content hidden, but report resolution failed.");
    await reloadReportsAndPosts();
  }
  async function deleteFlaggedPost(postId){
    if(!isModerator())return;
    if(!window.confirm(t("الحذف نهائي ويزيل التعليقات المرتبطة بالنقاش. هل تريد المتابعة؟",
                         "Deletion is permanent and may remove related comments. Continue?")))return;
    const {data,error}=await client.from("na7n_community_posts").delete().eq("id",postId).select("id").maybeSingle();
    if(error||!data){reportStatus.textContent=t("تعذّر حذف المحتوى.","Could not delete content.");return;}
    reportStatus.textContent=t("حُذف المحتوى نهائيًا.","Content permanently deleted.");
    await reloadReportsAndPosts();
  }
  async function dismissReports(postId){
    if(!isModerator())return;
    if(!window.confirm(t("إغلاق هذه البلاغات دون إزالة المحتوى؟","Dismiss these reports without removing the content?")))return;
    const ok=await resolveReports(postId,"dismissed");
    reportStatus.textContent=ok?t("أُغلقت البلاغات.","Reports dismissed."):
      t("تعذّر إغلاق البلاغات.","Could not dismiss reports.");
    await loadReports();
  }
  async function reloadReportsAndPosts(){
    await loadReports();
    const {data,error}=await client.from("na7n_community_posts")
      .select("id,parent_id,category,title,body,tags,status,created_at")
      .order("created_at",{ascending:false}).limit(120);
    if(!error)state.posts=data||[];
    renderPosts();
  }
  async function loadReports(){
    if(!isModerator())return;
    reportPanel.hidden=false;
    reportList.replaceChildren();
    const {data:reports,error}=await client.from("na7n_community_reports")
      .select("id,post_id,reason,created_at").is("resolved_at",null)
      .order("created_at",{ascending:false}).limit(100);
    if(error){reportStatus.textContent=t("تعذّر تحميل البلاغات.","Could not load reports.");return;}
    const byTarget=new Map();
    for(const r of reports||[]){
      if(!byTarget.has(r.post_id))byTarget.set(r.post_id,[]);
      byTarget.get(r.post_id).push(r);
    }
    if(!byTarget.size){
      reportList.append(el("p","cm-state",t("لا توجد بلاغات جديدة.","No outstanding reports.")));
      return;
    }
    reportStatus.textContent=t("البلاغات المفتوحة: ","Open reports: ")+(reports?.length||0);
    const ids=[...byTarget.keys()];
    const {data:posts,error:postError}=await client.from("na7n_community_posts")
      .select("id,parent_id,title,body,status").in("id",ids);
    if(postError){reportList.append(el("p","cm-state",t("تعذّر تحميل المحتوى المبلّغ عنه.","Could not load flagged content.")));return;}
    const lookup=new Map((posts||[]).map(p=>[p.id,p]));
    for(const [postId,flags] of byTarget.entries()){
      const p=lookup.get(postId);
      const item=el("div","cm-report-item");
      item.append(el("p","cm-post-meta",t("بلاغات: ","Reports: ")+flags.length+" · "+
        [...new Set(flags.map(r=>reasonLabels[r.reason]||r.reason))].join("، ")));
      item.append(el("p","cm-report-excerpt",p?(p.title||p.body||"").slice(0,260):
        t("المحتوى لم يعد متاحًا.","Content no longer available.")));
      if(p){
        const link=el("a","cm-report-link",t("عرض النقاش","View discussion"));
        link.href=detailUrl("post",p.parent_id||p.id);
        item.append(link);
        const controls=el("div","cm-detail-actions");
        if(p.status==="approved")controls.append(actionButton(t("إخفاء","Hide"),()=>hideFlaggedPost(postId)));
        controls.append(actionButton(t("حذف نهائي","Permanently delete"),()=>deleteFlaggedPost(postId)));
        controls.append(actionButton(t("تجاهل البلاغ","Dismiss report"),()=>dismissReports(postId)));
        item.append(controls);
      }else{
        item.append(actionButton(t("إغلاق البلاغ","Dismiss report"),()=>dismissReports(postId)));
      }
      reportList.append(item);
    }
  }
  function showGate(message){
    document.documentElement.classList.remove("cm-member-access");
    gate.hidden=false;
    gateStatus.textContent=message||t("يرجى تسجيل الدخول للاطلاع على المجتمع.","Sign in to view the community.");
    state.user=null;state.staff=null;state.prompts=[];state.posts=[];
    if(reportPanel)reportPanel.hidden=true;
    if(reportList)reportList.replaceChildren();
    ui.prompts.replaceChildren();ui.threads.replaceChildren();
    ui.count.textContent="";ui.status.textContent="";
  }
  if($("cm-reports-refresh"))$("cm-reports-refresh").addEventListener("click",loadReports);
  ui.search.addEventListener("input",()=>{
    state.query=ui.search.value.trim();
    remember();renderPrompts();renderPosts();
  });
  ui.filters.addEventListener("click",event=>{
    const b=event.target.closest("[data-category]");
    if(!b)return;
    state.category=b.dataset.category;
    ui.filters.querySelectorAll("[data-category]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
    remember();renderPrompts();renderPosts();
  });
  async function init(){
    if(!client){showGate(t("خدمة الحساب غير متاحة الآن.","Account service unavailable."));return;}
    let user;
    try{
      const {data,error}=await client.auth.getUser();
      if(error||!data?.user||data.user.is_anonymous===true){showGate();return;}
      user=data.user;
    }catch{showGate(t("تعذّر التحقق من حسابك.","Unable to verify your account."));return;}
    state.user=user;
    const [prompts,posts,staff]=await Promise.all([
      client.from("na7n_community_prompts")
        .select("id,category,title_ar,title_en,excerpt_ar,excerpt_en")
        .order("sort_order"),
      client.from("na7n_community_posts")
        .select("id,parent_id,category,title,body,tags,status,created_at")
        .order("created_at",{ascending:false}).limit(120),
      client.from("na7n_community_staff")
        .select("role,is_active").eq("user_id",user.id).maybeSingle()
    ]);
    state.staff=staff.error?null:staff.data;
    state.prompts=prompts.error?[]:(prompts.data||[]);
    state.posts=posts.error?[]:(posts.data||[]);
    document.documentElement.classList.add("cm-member-access");
    gate.hidden=true;
    ui.status.textContent=posts.error?t("تعذّر تحميل نقاشات الأعضاء.","Unable to load member discussions."):"";
    renderPrompts();renderPosts();
    if(isModerator())await loadReports();
    client.auth.onAuthStateChange((_evt,session)=>{
      if((session?.user?.id||null)!==state.user?.id){
        showGate(t("انتهت الجلسة. سجّل الدخول مجددًا.","Session ended. Sign in again."));
      }
    });
  }
  init().catch(()=>showGate(t("تعذّر فتح المجتمع. أعد تحميل الصفحة.","Unable to load the community. Reload this page.")));
})();