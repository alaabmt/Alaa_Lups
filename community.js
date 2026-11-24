/* NA7N Community — controlled staff-only pilot; no patient health collection or AI processing. */
(() => {
  "use strict";
  const en = document.documentElement.lang === "en";
  const t = (ar, english) => en ? english : ar;
  const $ = id => document.getElementById(id);
  const ui = {
    prompts: $("cm-prompts"), threads: $("cm-threads"), count: $("cm-count"),
    search: $("cm-search"), filters: $("cm-filters"), detail: $("cm-detail"),
    start: $("cm-start"), writeStatus: $("cm-write-status"), dialog: $("cm-dialog"),
    form: $("cm-compose-form"), category: $("cm-category"), title: $("cm-title"), body: $("cm-body"),
    titleRow: $("cm-title-row"), categoryRow: $("cm-category-row"),
    feedback: $("cm-form-feedback"), submit: $("cm-submit")
  };
  if (!ui.prompts) return;
  const categories = {
    daily: t("الحياة اليومية","Daily life"), treatment: t("العلاج والأدوية","Treatment"),
    nutrition: t("التغذية","Nutrition"), work: t("العمل والدراسة","Work & study"),
    support: t("الدعم","Support"), goals: t("الأهداف","Goals")
  };
  const state = {
    client: window.na7nSupabase || null,
    user: null, staff: null, activeCategory: "all", query: "", prompts: [],
    posts: [], helpful: [], selected: null, replyTo: null,
    flags: {pilot_mode:true,patient_posting_enabled:false,ask_ella_enabled:false}
  };
  const canWrite = () => Boolean(state.user && state.staff && state.staff.is_active && state.flags.pilot_mode);
  const canModerate = () => canWrite() && state.staff.role === "moderator";
  const el = (tag, className, value) => {
    const node=document.createElement(tag);
    if (className) node.className=className;
    if (value !== undefined) node.textContent=value;
    return node;
  };
  const localLink = href => {
    if (typeof href !== "string" || !/^[a-z0-9-]+(?:-en)?\.html$/i.test(href)) return null;
    if (!en) return href.replace(/-en\.html$/, ".html");
    if (href === "fatigue.html") return "living-en.html"; // Related English page, not an exact translation.
    return href.replace(/(?:-en)?\.html$/, "-en.html");
  };
  const formatDate = value => {
    try {return new Intl.DateTimeFormat(en?"en-GB":"ar-AE",{year:"numeric",month:"short",day:"numeric"}).format(new Date(value));}
    catch {return "";}
  };
  const filterMatches = (category,...parts) => (state.activeCategory==="all" || state.activeCategory===category)
    && parts.join(" ").toLocaleLowerCase().includes(state.query.toLocaleLowerCase());
  const detailUrl=(kind,id)=>{
    const params = new URLSearchParams({kind,id:String(id)});
    return (en?"community-topic-en.html":"community-topic.html")+"?"+params.toString();
  };
  const card = ({category,title,excerpt,meta,href}) => {
    const b=el("a","cm-topic");
    b.href=href;
    b.append(el("span","cm-tag",categories[category] || category));
    b.append(el("h3","",title));
    b.append(el("p","",excerpt));
    if(meta) b.append(el("span","cm-post-meta",meta));
    b.append(el("span","cm-more",t("اقرأ النقاش ←","Read discussion →")));
    return b;
  };
  const rememberFilters=()=>history.replaceState(
    {...(history.state||{}), na7nCommunity:{category:state.activeCategory,query:state.query}},"",location.href
  );
  const remembered = history.state?.na7nCommunity;
  if (remembered && typeof remembered==="object"){
    state.activeCategory=Object.prototype.hasOwnProperty.call(categories,remembered.category) ? remembered.category : "all";
    state.query=typeof remembered.query==="string" ? remembered.query.slice(0,160) : "";
    ui.search.value=state.query;
    ui.filters.querySelectorAll("[data-category]").forEach(button=>
      button.setAttribute("aria-pressed",String(button.dataset.category===state.activeCategory))
    );
  }
  function renderPrompts(){
    ui.prompts.replaceChildren();
    const list=state.prompts.filter(p=>filterMatches(p.category,p.title_ar,p.title_en,p.excerpt_ar,p.excerpt_en));
    ui.count.textContent=t("عدد الموضوعات: ","Topics: ")+list.length;
    list.forEach(p=>ui.prompts.append(card({
      category:p.category,
      title:en?p.title_en:p.title_ar,
      excerpt:en?p.excerpt_en:p.excerpt_ar,
      meta:t("سؤال من فريق نَحْنُ — لا يتضمن تجارب مرضى","Staff-curated prompt — not a patient testimonial"),
      href:detailUrl('prompt',p.id)
    })));
    if(!list.length) ui.prompts.append(el("div","cm-empty",t("لا توجد موضوعات مطابقة. جرّب كلمة بحث أخرى.","No matching topics. Try a different search.")));
  }
  function renderThreads(){
    ui.threads.replaceChildren();
    const list=state.posts.filter(p=>!p.parent_id && filterMatches(p.category,p.title||"",p.body||""));
    list.forEach(p=>ui.threads.append(card({
      category:p.category,title:p.title||t("نقاش","Discussion"),
      excerpt:(p.body||"").slice(0,180)+((p.body||"").length>180?"…":""),
      meta:formatDate(p.created_at)+" · "+(p.status==="approved"?
        t("منشور تجريبي تمت مراجعته","Reviewed staff test post"):
        t("بانتظار المراجعة — يظهر للمصرح لهم فقط","Pending moderation — restricted")),
      href:detailUrl('post',p.id)
    })));
    if(!list.length) ui.threads.append(el("div","cm-empty",t(
      "لا توجد نقاشات تجريبية منشورة بعد. موضوعات البداية أعلاه متاحة للقراءة.",
      "No test discussions have been published yet. You can explore the starter topics above."
    )));
  }
  function detailBase(category,title,body){
    ui.detail.hidden=false;
    ui.detail.replaceChildren();
    const header=el("div","cm-detail-top");
    header.append(el("span","cm-tag",categories[category]||category));
    const close=el("button","cm-icon-button",t("إغلاق ×","Close ×"));close.type="button";
    close.addEventListener("click",()=>{ui.detail.hidden=true;state.selected=null});
    header.append(close);ui.detail.append(header);
    ui.detail.append(el("h2","",title));
    ui.detail.append(el("p","",body));
    return ui.detail;
  }
  const bringDetail=()=>{
    ui.detail.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
  };
  function openPrompt(p){
    state.selected={type:"prompt",data:p};
    const d=detailBase(p.category,en?p.title_en:p.title_ar,en?p.excerpt_en:p.excerpt_ar);
    d.append(el("div","cm-post-meta",t(
      "هذا سؤال افتتاحي صاغه فريق الموقع، وليس نقاش مريض. لا تُقبل ردود المرضى في النسخة التجريبية.",
      "This is a staff-curated prompt, not a patient discussion. Patient replies are disabled during the pilot."
    )));
    const actions=el("div","cm-detail-actions");
    const href=localLink(p.link_url);
    if(href){const a=el("a","cm-button alt",t("اقرأ موضوعًا ذا صلة","Read a related topic"));a.href=href;actions.append(a);}
    d.append(actions);bringDetail();
  }
  const makeButton=(text,action,alternate=false)=>{
    const b=el("button","cm-button"+(alternate?" alt":""),text);
    b.type="button";b.addEventListener("click",action);return b;
  };
  async function loadComments(post){
    if(!state.client || ui.detail.hidden) return;
    const container=$("cm-replies");
    if(!container) return;
    const {data,error}=await state.client.from("na7n_community_posts").select("id,author_id,body,status,created_at").eq("parent_id",post.id).order("created_at",{ascending:true}).limit(80);
    if(error){container.textContent=t("تعذّر تحميل التعليقات.","Couldn't load comments.");return;}
    container.replaceChildren();
    (data||[]).forEach(item=>{
      const block=el("div","cm-comment");
      const label=item.status==="approved"?t("تعليق تجريبي مُراجع","Reviewed test reply"):t("تعليق ينتظر المراجعة","Reply awaiting moderation");
      block.append(el("div","cm-post-meta",label+" · "+formatDate(item.created_at)));
      block.append(el("p","",item.body));
      if(canModerate() && item.status==="pending"){
        block.append(makeButton(t("اعتماد التعليق","Approve reply"),()=>moderate(item.id,"approved"),true));
      }
      container.append(block);
    });
    if(!(data||[]).length) container.append(el("p","cm-state",t("لا توجد تعليقات بعد.","No replies yet.")));
  }
  async function openPost(p){
    state.selected={type:"post",data:p};
    const d=detailBase(p.category,p.title||t("نقاش تجريبي","Test discussion"),p.body);
    d.append(el("div","cm-post-meta",formatDate(p.created_at)+" · "+t(
      "مشاركة من حساب فريق اختبار، وليست تجربة مريض","Authorized staff test content, not a patient account"
    )));
    if(p.status!=="approved")d.append(el("span","cm-mod-status",t("قيد المراجعة","Pending review")));
    const actions=el("div","cm-detail-actions");
    if(canWrite()){
      if(p.status==="approved"){
        const liked=state.helpful.some(x=>x.post_id===p.id&&x.user_id===state.user.id);
        const count=state.helpful.filter(x=>x.post_id===p.id).length;
        actions.append(makeButton((liked?t("أزل مفيد","Remove helpful"):t("مفيد","Helpful"))+" ("+count+")",()=>toggleHelpful(p),true));
      }
      actions.append(makeButton(t("علّق (اختبار)","Reply (test)"),()=>openComposer(p),true));
      actions.append(makeButton(t("إبلاغ","Report"),()=>reportPost(p),true));
    }
    if(canModerate()&&p.status==="pending"){
      actions.append(makeButton(t("اعتماد للنشر","Approve for publication"),()=>moderate(p.id,"approved")));
      actions.append(makeButton(t("رفض المشاركة","Reject post"),()=>moderate(p.id,"rejected"),true));
    }
    d.append(actions);
    const section=el("section","cm-reply-list");
    section.append(el("h3","",t("التعليقات التجريبية","Test replies")));
    const replies=el("div","");replies.id="cm-replies";section.append(replies);d.append(section);
    await loadComments(p);bringDetail();
  }
  async function loadPosts(){
    if(!state.client)return;
    const {data,error}=await state.client.from("na7n_community_posts").select("id,parent_id,author_id,category,title,body,status,created_at").order("created_at",{ascending:false}).limit(120);
    if(error){ui.writeStatus.textContent=t("الاطلاع على الموضوعات متاح؛ خدمة النقاشات غير متوفرة الآن.","Starter topics are available; discussion service is temporarily unavailable.");return;}
    state.posts=data||[];
    const ids=state.posts.filter(p=>!p.parent_id&&p.status==="approved").map(p=>p.id);
    if(ids.length){
      const {data:helpful}=await state.client.from("na7n_community_helpful").select("post_id,user_id").in("post_id",ids).limit(250);
      state.helpful=helpful||[];
    }else state.helpful=[];
    renderThreads();
  }
  async function toggleHelpful(p){
    if(!canWrite()||p.status!=="approved")return;
    const liked=state.helpful.some(x=>x.post_id===p.id&&x.user_id===state.user.id);
    const result=liked
      ?await state.client.from("na7n_community_helpful").delete().eq("post_id",p.id).eq("user_id",state.user.id)
      :await state.client.from("na7n_community_helpful").insert({post_id:p.id,user_id:state.user.id});
    if(result.error){window.alert(t("تعذّر حفظ التفاعل.","Couldn't save reaction."));return;}
    await loadPosts();const refreshed=state.posts.find(x=>x.id===p.id);if(refreshed)await openPost(refreshed);
  }
  async function reportPost(p){
    if(!canWrite())return;
    const reason=window.prompt(t("اكتب رقم السبب: 1 خصوصية، 2 معلومة طبية، 3 إساءة، 4 أخرى","Enter reason number: 1 Privacy, 2 Medical content, 3 Harassment, 4 Other"));
    if(!reason)return;
    const selected=({1:"privacy",2:"medical",3:"harassment",4:"other"})[reason.trim()];
    if(!selected){window.alert(t("الرجاء اختيار رقم من 1 إلى 4.","Please select 1 to 4."));return;}
    const {error}=await state.client.from("na7n_community_reports").insert({post_id:p.id,reporter_id:state.user.id,reason:selected});
    window.alert(error?t("تعذر إرسال البلاغ أو سبق الإبلاغ.","Report couldn't be submitted or has already been sent."):t("تم إرسال البلاغ لفريق الإشراف.","Report sent to moderation."));
  }
  async function moderate(id,status){
    if(!canModerate())return;
    if(!window.confirm(t("تأكيد قرار المراجعة لهذا المحتوى التجريبي؟","Confirm moderation decision for this test content?")))return;
    const {error}=await state.client.from("na7n_community_posts").update({status}).eq("id",id);
    if(error){window.alert(t("تعذر تحديث الحالة.","Could not update moderation status."));return;}
    await loadPosts();
    const post=state.posts.find(p=>p.id===id);
    if(post&&!post.parent_id)await openPost(post);
    else if(state.selected?.type==="post")await openPost(state.selected.data);
  }
  function openComposer(parent=null){
    if(!canWrite())return;
    state.replyTo=parent;
    ui.categoryRow.hidden=!!parent;ui.titleRow.hidden=!!parent;
    ui.title.required=!parent;ui.title.value="";
    ui.category.value=parent?.category||"daily";
    ui.body.value="";ui.feedback.textContent="";
    $("cm-dialog-title").textContent=parent?t("تعليق تجريبي","Test reply"):t("نقاش تجريبي جديد","New test discussion");
    ui.dialog.hidden=false;ui.body.focus();
  }
  function closeComposer(){ui.dialog.hidden=true;ui.feedback.textContent="";state.replyTo=null}
  ui.form.addEventListener("submit",async event=>{
    event.preventDefault();if(!canWrite()||!state.client)return;
    if(!ui.form.reportValidity())return;
    const payload={
      author_id:state.user.id,category:ui.category.value,
      title:state.replyTo?null:ui.title.value.trim(),
      body:ui.body.value.trim(),parent_id:state.replyTo?.id||null,status:"pending"
    };
    if(payload.body.length<12||payload.body.length>3000){ui.feedback.textContent=t("النص يجب أن يكون بين 12 و3000 حرف.","Text must be 12–3000 characters.");return;}
    ui.submit.disabled=true;
    const {error}=await state.client.from("na7n_community_posts").insert(payload);
    ui.submit.disabled=false;
    if(error){ui.feedback.textContent=t("لم تُحفظ المشاركة. تحقّق من صلاحية فريق الاختبار وحاول مجددًا.","Post not saved. Verify staff test access and try again.");return;}
    closeComposer();await loadPosts();
    window.alert(t("حُفظت المشاركة التجريبية للمراجعة؛ لن تظهر للجميع تلقائيًا.","Test submission saved for moderation; it will not publish automatically."));
  });
  ui.start.addEventListener("click",()=>openComposer());
  $("cm-dialog-close").addEventListener("click",closeComposer);
  $("cm-cancel").addEventListener("click",closeComposer);
  ui.dialog.addEventListener("click",e=>{if(e.target===ui.dialog)closeComposer();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!ui.dialog.hidden)closeComposer();});
  ui.search.addEventListener("input",()=>{
    state.query=ui.search.value.trim();rememberFilters();renderPrompts();renderThreads();
  });
  ui.filters.addEventListener("click",e=>{
    const button=e.target.closest("[data-category]");if(!button)return;
    state.activeCategory=button.dataset.category;
    rememberFilters();
    ui.filters.querySelectorAll(".cm-filter").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
    renderPrompts();renderThreads();
  });

  const memberGate = $("cm-member-gate");
  const memberGateStatus = $("cm-gate-status");
  function showGate(reason) {
    document.documentElement.classList.remove("cm-member-access");
    if (memberGate) memberGate.hidden = false;
    if (memberGateStatus) memberGateStatus.textContent = reason || t(
      "للاطلاع على المجتمع، يرجى تسجيل الدخول أو إنشاء حساب.",
      "Please sign in or create an account to view the community."
    );
    state.user=null; state.staff=null; state.prompts=[]; state.posts=[]; state.helpful=[]; state.selected=null;
    ui.start.disabled=true;
    ui.prompts.replaceChildren(); ui.threads.replaceChildren();
    ui.detail.hidden=true; ui.detail.replaceChildren();
    ui.count.textContent="";
    ui.writeStatus.textContent="";
    closeComposer();
  }
  async function init() {
    // Do not query or render any community records before a verified session.
    if (!state.client) {
      showGate(t("تعذّر الاتصال بخدمة الحساب. حاول إعادة تحميل الصفحة.",
                 "Account service is unavailable. Please reload the page."));
      return;
    }
    let user;
    try {
      const {data,error}=await state.client.auth.getUser();
      if (error || !data?.user || data.user.is_anonymous === true) {
        showGate();
        return;
      }
      user=data.user;
    } catch {
      showGate(t("تعذّر التحقق من الحساب. حاول إعادة تحميل الصفحة.",
                 "Unable to verify your account. Please reload the page."));
      return;
    }
    state.user=user;
    const [features,prompts,staff] = await Promise.all([
      state.client.from("na7n_community_features").select("pilot_mode,patient_posting_enabled,ask_ella_enabled").eq("id",1).maybeSingle(),
      state.client.from("na7n_community_prompts").select("id,category,title_ar,title_en,excerpt_ar,excerpt_en,link_url,sort_order").order("sort_order"),
      state.client.from("na7n_community_staff").select("role,is_active").eq("user_id",user.id).maybeSingle()
    ]);
    if (!features.error && features.data) state.flags=features.data;
    if (!prompts.error) state.prompts=prompts.data||[];
    state.staff=staff.error?null:staff.data;
    // Membership is checked in Supabase; DOM visibility is only a UX gate.
    // Database SELECT grants and row-level security independently block anonymous reads.
    document.documentElement.classList.add("cm-member-access");
    if (memberGate) memberGate.hidden=true;
    renderPrompts();
    renderThreads();
    if (canWrite()) {
      ui.start.disabled=false;
      ui.writeStatus.textContent=t(
        "أنت عضو مصرح له في الاختبار. يُسمح بالمحتوى الافتراضي فقط.",
        "You're an authorized staff tester. Fictional content only."
      );
    } else {
      ui.start.disabled=true;
      ui.writeStatus.textContent=t(
        "يمكنك قراءة الموضوعات. المشاركة متاحة لفريق الاختبار المصرح له فقط حاليًا.",
        "You may read discussions. Posting is restricted to authorized staff testers for now."
      );
    }
    // Ask NA7N remains off and has no backend, even for signed-in members.
    $("cm-ai-button").disabled=true;
    await loadPosts();
    state.client.auth.onAuthStateChange((_event,session)=>{
      if ((session?.user?.id||null)!==(state.user?.id||null)) {
        showGate(t("تم إنهاء الجلسة. سجّل دخولك للعودة إلى المجتمع.",
                   "Your session has ended. Sign in to return to the community."));
      }
    });
  }
  init().catch(()=>showGate(t("تعذّر فتح المجتمع. تحقق من تسجيل الدخول وأعد تحميل الصفحة.",
                             "Could not open the community. Verify your sign-in and reload.")));

})();
