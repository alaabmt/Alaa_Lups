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
  const state={category:"all",query:"",prompts:[],posts:[],user:null};
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
  function showGate(message){
    document.documentElement.classList.remove("cm-member-access");
    gate.hidden=false;
    gateStatus.textContent=message||t("يرجى تسجيل الدخول للاطلاع على المجتمع.","Sign in to view the community.");
    state.user=null;state.prompts=[];state.posts=[];
    ui.prompts.replaceChildren();ui.threads.replaceChildren();
    ui.count.textContent="";ui.status.textContent="";
  }
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
    const [prompts,posts]=await Promise.all([
      client.from("na7n_community_prompts")
        .select("id,category,title_ar,title_en,excerpt_ar,excerpt_en")
        .order("sort_order"),
      client.from("na7n_community_posts")
        .select("id,parent_id,category,title,body,tags,status,created_at")
        .order("created_at",{ascending:false}).limit(120)
    ]);
    state.prompts=prompts.error?[]:(prompts.data||[]);
    state.posts=posts.error?[]:(posts.data||[]);
    document.documentElement.classList.add("cm-member-access");
    gate.hidden=true;
    ui.status.textContent=posts.error?t("تعذّر تحميل نقاشات الأعضاء.","Unable to load member discussions."):"";
    renderPrompts();renderPosts();
    client.auth.onAuthStateChange((_evt,session)=>{
      if((session?.user?.id||null)!==state.user?.id){
        showGate(t("انتهت الجلسة. سجّل الدخول مجددًا.","Session ended. Sign in again."));
      }
    });
  }
  init().catch(()=>showGate(t("تعذّر فتح المجتمع. أعد تحميل الصفحة.","Unable to load the community. Reload this page.")));
})();