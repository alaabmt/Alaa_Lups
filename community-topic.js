/* NA7N Community reader: member-only detail pages, no patient data, no AI calls. */
(() => {
  "use strict";
  const en=document.documentElement.lang==="en";
  const t=(ar,english)=>en?english:ar;
  const $=id=>document.getElementById(id);
  const client=window.na7nSupabase||null;
  const query=new URLSearchParams(location.search);
  const kind=query.get("kind");
  const topicId=query.get("id")||"";
  const listPage=en?"community-en.html":"community.html";
  const accountPage=en?"account-en.html":"account.html";
  const detailPage=en?"community-topic-en.html":"community-topic.html";
  const valid=kind==="prompt" ? /^[a-z0-9-]{2,60}$/i.test(topicId)
    : kind==="post" && /^[a-f0-9]{8}-[a-f0-9-]{27,36}$/i.test(topicId);
  const categories={
    general:t("عام","General"),
    daily:t("الحياة اليومية","Daily life"),
    treatment:t("العلاج والأدوية","Treatment"),
    nutrition:t("التغذية","Nutrition"),
    work:t("العمل والدراسة","Work & study"),
    support:t("الدعم","Support"),
    goals:t("الأهداف","Goals")
  };
  const state={user:null,staff:null,flags:null,item:null,reportTarget:null};
  const memberGate=$("cm-member-gate");
  const gateStatus=$("cm-gate-status");
  const article=$("cm-topic-body");
  const feedback=$("cm-topic-feedback");
  const actions=$("cm-topic-actions");
  const replyDialog=$("cm-reply-dialog");
  const replies=$("cm-replies");
  const replyForm=$("cm-reply-form");
  const replyInput=$("cm-reply-input");
  const submitReply=$("cm-reply-submit");
  const reportDialog=$("cm-report-dialog");
  const canWrite=()=>!!(state.user && state.staff?.is_active && state.flags?.pilot_mode);
  const canModerate=()=>canWrite() && state.staff.role==="moderator";
  const el=(tag,cls,text)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(text!==undefined)e.textContent=text;
    return e;
  };
  const button=(label,fn,secondary=false)=>{
    const b=el("button","cm-button"+(secondary?" alt":""),label);
    b.type="button";b.addEventListener("click",fn);return b;
  };
  const renderStatus=(message)=>{feedback.textContent=message||"";};
  function readableDate(value){
    try{return new Intl.DateTimeFormat(en?"en-GB":"ar-AE",{year:"numeric",month:"short",day:"numeric"}).format(new Date(value));}catch{return "";}
  }
  const relatedHref=href=>{
    if(typeof href!=="string"||!/^[a-z0-9-]+\.html$/i.test(href))return null;
    if(!en)return href;
    if(href==="fatigue.html")return "living-en.html";
    return href.replace(/\.html$/,"-en.html");
  };
  function clearForGate(message){
    document.documentElement.classList.remove("cm-member-access");
    memberGate.hidden=false;
    gateStatus.textContent=message||t("سجّل دخولك للاطلاع على هذا النقاش.","Sign in to read this discussion.");
    state.user=null;state.staff=null;state.item=null;
    article.replaceChildren();actions.replaceChildren();replies.replaceChildren();
    if(!replyDialog.hidden)closeReply();
  }
  function setupNavigation(){
    const returnPath=detailPage+location.search;
    $("cm-login-link").href=accountPage+"?mode=login&return="+encodeURIComponent(returnPath);
    $("cm-signup-link").href=accountPage+"?mode=signup&return="+encodeURIComponent(returnPath);
    const other=en?"community-topic.html":"community-topic-en.html";
    $("cm-language-switch").href=other+location.search;
    const back=$("cm-back");
    back.addEventListener("click",event=>{
      // Back to the original list restores its scroll, text search and selected category.
      // For externally shared links, use a normal link to the community list instead.
      try{
        const referring=new URL(document.referrer);
        const refFile=referring.pathname.split("/").pop();
        if(referring.origin===location.origin && ["community.html","community-en.html"].includes(refFile)
           && history.length>1){
          event.preventDefault();
          history.back();
        }
      }catch{ /* No safe referrer: fallback to linked list. */ }
    });
  }
  async function refreshHelpful(){
    if(kind!=="post"||!state.item||state.item.status!=="approved")return;
    const target=$("cm-helpful");
    if(!target)return;
    const [countResult,ownResult]=await Promise.all([
      client.from("na7n_community_helpful").select("post_id",{head:true,count:"exact"}).eq("post_id",topicId),
      client.from("na7n_community_helpful").select("post_id").eq("post_id",topicId).eq("user_id",state.user.id).maybeSingle()
    ]);
    const liked=!!ownResult.data;
    target.textContent=(liked?t("إزالة مفيد","Remove helpful"):t("مفيد","Helpful"))+
      " ("+(countResult.count??0)+")";
    target.dataset.liked=String(liked);
  }
  async function toggleHelpful(){
    if(!canWrite()||state.item?.status!=="approved")return;
    const liked=$("cm-helpful")?.dataset.liked==="true";
    const result=liked
      ?await client.from("na7n_community_helpful").delete().eq("post_id",topicId).eq("user_id",state.user.id)
      :await client.from("na7n_community_helpful").insert({post_id:topicId,user_id:state.user.id});
    if(result.error){renderStatus(t("تعذّر حفظ التفاعل.","Could not save your reaction."));return;}
    await refreshHelpful();
  }
  function openReportDialog(id){
    if(!state.user || !id)return;
    state.reportTarget=id;
    reportDialog.hidden=false;
    const first=reportDialog.querySelector("[data-report-reason]");
    if(first)first.focus();
  }
  function closeReportDialog(){
    reportDialog.hidden=true;
    state.reportTarget=null;
  }
  async function submitReport(reason){
    if(!state.user || !state.reportTarget || !["privacy","medical","harassment","other"].includes(reason))return;
    const target=state.reportTarget;
    closeReportDialog();
    const {error}=await client.from("na7n_community_reports").insert({
      post_id:target,reporter_id:state.user.id,reason
    });
    renderStatus(error
      ?t("لم يُرسل البلاغ. ربما سبق أن أبلغت عن هذا المحتوى.","Report not sent. You may have already reported this content.")
      :t("وصل بلاغك إلى فريق الإشراف. شكرًا لمساعدتنا في حماية المجتمع.","Your report was sent to the moderation team."));
  }
  async function deletePost(id){
    if(!canModerate())return;
    if(!window.confirm(t("الحذف نهائي ولا يمكن التراجع عنه. هل تريد المتابعة؟",
                         "Deletion is permanent and cannot be undone. Continue?")))return;
    const {error}=await client.from("na7n_community_posts").delete().eq("id",id);
    if(error){renderStatus(t("تعذّر حذف المحتوى.","Could not delete the content."));return;}
    if(id===topicId){
      location.assign(listPage);
    }else{
      renderStatus(t("حُذف التعليق.","Reply deleted."));
      await loadReplies();
    }
  }
  async function moderate(id,status){
    if(!canModerate())return;
    if(!window.confirm(t("تأكيد مراجعة هذا المحتوى؟","Confirm moderation of this content?")))return;
    const {error}=await client.from("na7n_community_posts").update({status}).eq("id",id);
    if(error){renderStatus(t("تعذّر حفظ قرار المراجعة.","Moderation decision could not be saved."));return;}
    if(id===topicId)await loadTopic();
    else await loadReplies();
  }
  async function loadReplies(){
    if(kind!=="post"||!state.item)return;
    replies.replaceChildren();
    const {data,error}=await client.from("na7n_community_posts")
      .select("id,parent_id,author_id,body,status,created_at")
      .eq("parent_id",topicId)
      .order("created_at",{ascending:true}).limit(100);
    if(error){replies.append(el("p","cm-state",t("تعذّر تحميل التعليقات.","Couldn't load replies.")));return;}
    if(!data?.length){replies.append(el("p","cm-state",t("لا توجد تعليقات بعد.","No replies yet.")));return;}
    for(const reply of data){
      const box=el("div","cm-comment cm-topic-comment");
      if(reply.status!=="approved"&&!canModerate())continue;
      const meta=reply.status==="approved"
        ?readableDate(reply.created_at)
        :t("محتوى مخفي — للمشرف فقط","Hidden content — moderators only");
      box.append(el("p","cm-post-meta",meta));
      box.append(el("p","",reply.body));
      const controls=el("div","cm-detail-actions");
      if(reply.status==="approved")controls.append(button(t("إبلاغ عن التعليق","Report reply"),()=>openReportDialog(reply.id),true));
      if(canModerate()){
        if(reply.status==="approved")controls.append(button(t("إخفاء التعليق","Hide reply"),()=>moderate(reply.id,"hidden"),true));
        if(reply.status==="hidden")controls.append(button(t("إعادة إظهار التعليق","Restore reply"),()=>moderate(reply.id,"approved"),true));
        if(reply.status==="pending")controls.append(button(t("اعتماد التعليق","Approve reply"),()=>moderate(reply.id,"approved"),true));
        controls.append(button(t("حذف التعليق نهائيًا","Delete reply"),()=>deletePost(reply.id),true));
      }
      if(controls.childNodes.length)box.append(controls);
      replies.append(box);
    }
  }
  function openReply(){
    if(!canWrite()||kind!=="post")return;
    $("cm-reply-feedback").textContent="";
    replyInput.value="";
    replyDialog.hidden=false;
    replyInput.focus();
  }
  function closeReply(){
    replyDialog.hidden=true;
    $("cm-reply-feedback").textContent="";
  }
  async function saveReply(event){
    event.preventDefault();
    if(!canWrite()||kind!=="post"||!state.item||!replyForm.reportValidity())return;
    const body=replyInput.value.trim();
    if(body.length<12||body.length>3000){
      $("cm-reply-feedback").textContent=t("يجب أن يتراوح التعليق بين 12 و3000 حرف.","Reply must have 12–3000 characters.");
      return;
    }
    submitReply.disabled=true;
    const {error}=await client.from("na7n_community_posts").insert({
      parent_id:topicId,author_id:state.user.id,
      category:state.item.category,title:null,body,status:"approved"
    });
    submitReply.disabled=false;
    if(error){$("cm-reply-feedback").textContent=t("تعذّر إرسال التعليق.","Could not submit reply.");return;}
    closeReply();
    renderStatus(t("نُشر تعليقك مباشرة.","Your reply is now published."));
    await loadReplies();
  }
  function renderTopic(item){
    state.item=item;
    const editorial=kind==="prompt";
    const title=editorial ? (en?item.title_en:item.title_ar) : item.title;
    const body=editorial ? (en?item.excerpt_en:item.excerpt_ar) : item.body;
    $("cm-topic-category").textContent=categories[item.category]||categories.general;
    $("cm-topic-title").textContent=title||t("نقاش","Discussion");
    document.title=(title||t("النقاش","Discussion"))+" | "+t("مجتمع نَحْنُ","NA7N Community");
    $("cm-topic-meta").textContent=editorial
      ?t("موضوع للنقاش","Discussion topic")
      :readableDate(item.created_at)+(item.status==="approved"?"":" · "+t("مخفي عن الأعضاء","Hidden from members"));
    article.replaceChildren(el("p","",body||""));
    if (!editorial && Array.isArray(item.tags) && item.tags.length) {
      const terms=el("div","cm-topic-tags");
      for (const tag of item.tags) terms.append(el("span","cm-tag","#"+tag));
      article.append(terms);
    }
    actions.replaceChildren();
    $("cm-replies-section").hidden=editorial;
    if(editorial){
      const href=relatedHref(item.link_url);
      if(href){
        const a=el("a","cm-button alt",t("اقرأ معلومات مرتبطة بالموضوع","Read related information"));
        a.href=href;actions.append(a);
      }
      article.append(el("p","cm-post-meta",t(
        "التعليقات على هذا الموضوع غير متاحة حاليًا.",
        "Replies are not available for this topic yet."
      )));
    }else{
      if(item.status==="approved"){
        if(canWrite()){
          const helpful=button(t("مفيد","Helpful"),toggleHelpful,true);
          helpful.id="cm-helpful";actions.append(helpful);
          refreshHelpful();
          actions.append(button(t("أضف تعليقًا","Add a reply"),openReply,true));
        }
        actions.append(button(t("إبلاغ","Report"),()=>openReportDialog(topicId),true));
      }
      if(canModerate()){
        if(item.status==="approved"){
          actions.append(button(t("إخفاء النقاش","Hide discussion"),()=>moderate(topicId,"hidden"),true));
        }else if(item.status==="hidden"){
          actions.append(button(t("إعادة إظهار النقاش","Restore discussion"),()=>moderate(topicId,"approved"),true));
        }else if(item.status==="pending"){
          actions.append(button(t("اعتماد النقاش","Approve discussion"),()=>moderate(topicId,"approved"),true));
        }
        actions.append(button(t("حذف النقاش نهائيًا","Delete discussion"),()=>deletePost(topicId),true));
      }
      loadReplies();
    }
    if(editorial||item.status==="approved"){
      actions.append(button(t("نسخ رابط النقاش","Copy discussion link"),async()=>{
        try{
          await navigator.clipboard.writeText(location.origin+location.pathname+location.search);
          renderStatus(t("تم نسخ الرابط. يتطلب فتحه تسجيل الدخول.","Link copied. Sign-in is required to open it."));
        }catch{
          renderStatus(t("يمكنك نسخ الرابط من شريط العنوان.","Copy the URL from your browser address bar."));
        }
      },true));
    }
  }
  async function loadTopic(){
    renderStatus("");
    if(!valid){
      $("cm-topic-title").textContent=t("رابط غير صالح","Invalid link");
      article.replaceChildren(el("p","cm-state",t("تحقق من رابط الموضوع أو عُد إلى قائمة النقاشات.","Check the link or return to discussions.")));
      return;
    }
    const fetch = kind==="prompt"
      ?client.from("na7n_community_prompts")
        .select("id,category,title_ar,title_en,excerpt_ar,excerpt_en,link_url").eq("id",topicId).maybeSingle()
      :client.from("na7n_community_posts")
        .select("id,parent_id,category,title,body,tags,status,author_id,created_at").eq("id",topicId).is("parent_id",null).maybeSingle();
    const {data,error}=await fetch;
    if(error||!data){
      $("cm-topic-title").textContent=t("الموضوع غير متاح","Discussion unavailable");
      article.replaceChildren(el("p","cm-state",t(
        "قد يكون الرابط غير صحيح أو أن الموضوع غير متاح لحسابك.",
        "This link may be incorrect, or the discussion may not be available to your account."
      )));
      actions.replaceChildren();
      $("cm-replies-section").hidden=true;
      return;
    }
    if(data.status!=="approved"&&!canModerate()&&kind==="post"){
      $("cm-topic-title").textContent=t("الموضوع غير متاح","Discussion unavailable");
      article.replaceChildren(el("p","cm-state",t("هذا النقاش غير متاح حاليًا.","This discussion is not currently available.")));
      actions.replaceChildren();
      $("cm-replies-section").hidden=true;
      return;
    }
    renderTopic(data);
  }
  async function init(){
    setupNavigation();
    if(!client){
      clearForGate(t("خدمة تسجيل الدخول غير متاحة الآن.","Sign-in service is unavailable."));
      return;
    }
    let user;
    try{
      const {data,error}=await client.auth.getUser();
      if(error||!data?.user||data.user.is_anonymous===true){clearForGate();return;}
      user=data.user;
    }catch{clearForGate(t("تعذّر التحقق من حسابك. أعد تحميل الصفحة.","Could not verify your account. Reload this page."));return;}
    state.user=user;
    const [flagResult,staffResult]=await Promise.all([
      client.from("na7n_community_features")
        .select("pilot_mode,patient_posting_enabled,ask_ella_enabled").eq("id",1).maybeSingle(),
      client.from("na7n_community_staff")
        .select("role,is_active").eq("user_id",user.id).maybeSingle()
    ]);
    state.flags=flagResult.error?null:flagResult.data;
    state.staff=staffResult.error?null:staffResult.data;
    document.documentElement.classList.add("cm-member-access");
    memberGate.hidden=true;
    await loadTopic();
    // This UI intentionally cannot activate the AI assistant.
    $("cm-ai-button").disabled=true;
    client.auth.onAuthStateChange((_event,session)=>{
      if((session?.user?.id||null)!==(state.user?.id||null))
        clearForGate(t("انتهت الجلسة؛ سجّل الدخول مجددًا.","Session ended. Please sign in again."));
    });
  }
  $("cm-report-close").addEventListener("click",closeReportDialog);
  reportDialog.addEventListener("click",event=>{if(event.target===reportDialog)closeReportDialog();});
  reportDialog.addEventListener("click",event=>{
    const selected=event.target.closest("[data-report-reason]");
    if(selected)submitReport(selected.dataset.reportReason);
  });
  $("cm-reply-close").addEventListener("click",closeReply);
  $("cm-reply-cancel").addEventListener("click",closeReply);
  replyForm.addEventListener("submit",saveReply);
  replyDialog.addEventListener("click",event=>{if(event.target===replyDialog)closeReply();});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){
      if(!replyDialog.hidden)closeReply();
      if(!reportDialog.hidden)closeReportDialog();
    }
  });
  init().catch(()=>clearForGate(t("تعذّر فتح النقاش. أعد تحميل الصفحة.","Unable to open this discussion. Please reload.")));
})();