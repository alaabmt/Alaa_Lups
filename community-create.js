/* NA7N Community compose: member-only, authorized staff immediate publication with later moderation. */
(() => {
 "use strict";
 const en=document.documentElement.lang==="en";
 const t=(a,b)=>en?b:a;
 const $=id=>document.getElementById(id);
 const gate=$("cm-member-gate"), gateStatus=$("cm-gate-status");
 const formWrap=$("cm-create-form-wrap"), unavailable=$("cm-create-unavailable"), success=$("cm-create-success");
 const form=$("cm-create-form"), title=$("cm-create-title"), body=$("cm-create-body"), tagsInput=$("cm-create-tags");
 const feedback=$("cm-create-feedback"), submit=$("cm-create-submit");
 const preview=$("cm-create-preview-box");
 const client=window.na7nSupabase;
 const communityIdentity=window.Na7nCommunityIdentity;
 let user=null;
 const showGate=message=>{
   document.documentElement.classList.remove("cm-member-access");
   gate.hidden=false;
   gateStatus.textContent=message||t("سجّل الدخول للمتابعة.","Sign in to continue.");
   formWrap.hidden=unavailable.hidden=success.hidden=true;
 };
 const parseTags=()=>{
   const items=tagsInput.value.split(/[,،]/u).map(x=>x.trim().replace(/^#/,"")).filter(Boolean);
   const unique=[...new Set(items)];
   if(unique.length>5 || unique.some(x=>x.length>32 || x.length<2) || unique.join(",").length>180) return null;
   return unique;
 };
 const previewDiscussion=()=>{
   if(!form.reportValidity())return;
   const tags=parseTags();
   if(tags===null){feedback.textContent=t("استخدم حتى 5 كلمات دلالية، من حرفين إلى 32 حرفًا لكل كلمة.","Use up to 5 tags, each 2–32 characters.");return;}
   feedback.textContent="";
   $("cm-preview-title").textContent=title.value.trim();
   $("cm-preview-text").textContent=body.value.trim();
   $("cm-preview-tags").textContent=tags.length?t("الكلمات الدلالية: ","Tags: ")+tags.join(" · "):"";
   preview.hidden=false;
   preview.scrollIntoView({behavior:"auto",block:"start"});
 };
 async function init(){
   if(!client){showGate(t("خدمة الحساب غير متاحة الآن.","Account service unavailable."));return;}
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user||data.user.is_anonymous){showGate();return;}
   user=data.user;
   const [staff,flags]=await Promise.all([
     client.from("na7n_community_staff").select("role,is_active").eq("user_id",user.id).maybeSingle(),
     client.from("na7n_community_features").select("pilot_mode,patient_posting_enabled").eq("id",1).maybeSingle()
   ]);
   document.documentElement.classList.add("cm-member-access");
   gate.hidden=true;
   const chosenIdentity=communityIdentity
     ?await communityIdentity.getProfile(client,user.id):null;
   const permitted=!!(staff.data?.is_active && !staff.error && flags.data?.pilot_mode
     && !flags.error && chosenIdentity?.nickname);
   const setupLink=$("cm-setup-identity-link");
   if(setupLink)setupLink.hidden=!!chosenIdentity?.nickname;
   if(!chosenIdentity?.nickname){
     unavailable.querySelector("h2").textContent=t("اختر اسمك المستعار قبل المشاركة","Choose a nickname before posting");
     unavailable.querySelector("p").textContent=t(
       "لحماية هويتك، اختر الاسم المستعار والصورة الرمزية اللذين سيراهما أعضاء المجتمع. لن يظهر اسمك الحقيقي بجانب مشاركاتك.",
       "Protect your identity by choosing a nickname and avatar. Your real name will not appear on discussions."
     );
   }
   formWrap.hidden=!permitted;
   unavailable.hidden=permitted;
   success.hidden=true;
   client.auth.onAuthStateChange((_evt,session)=>{
     if((session?.user?.id||null)!==user?.id){user=null;showGate(t("انتهت الجلسة؛ سجّل الدخول مجددًا.","Session ended. Please sign in again."));}
   });
 }
 form.addEventListener("submit",async event=>{
   event.preventDefault();
   if(!user||!client||formWrap.hidden||!form.reportValidity())return;
   const validTags=parseTags();
   if(validTags===null){feedback.textContent=t("الحد الأقصى خمس كلمات دلالية، كل واحدة من حرفين إلى 32.","Up to five tags, each 2–32 characters.");return;}
   const cleanTitle=title.value.trim(),cleanBody=body.value.trim();
   if(cleanTitle.length<8||cleanBody.length<12||cleanTitle.length>140||cleanBody.length>3000){
     feedback.textContent=t("تحقق من طول العنوان والمحتوى.","Check your title and message lengths.");return;
   }
   submit.disabled=true;feedback.textContent=t("جارٍ نشر النقاش…","Publishing discussion…");
   const {data:published,error}=await client.from("na7n_community_posts").insert({
      author_id:user.id,parent_id:null,category:"general",
      title:cleanTitle,body:cleanBody,tags:validTags,status:"approved"
   }).select("id").single();
   submit.disabled=false;
   if(error){feedback.textContent=t("تعذّر حفظ النقاش. حاول لاحقًا.","Could not save the discussion. Please try later.");return;}
   formWrap.hidden=true;
   if(published?.id){
     const view=$("cm-view-new-post");
     view.href=(en?"community-topic-en.html":"community-topic.html")+"?kind=post&id="+encodeURIComponent(published.id);
     view.hidden=false;
   }
   success.hidden=false;
   success.scrollIntoView({behavior:"auto",block:"start"});
 });
 $("cm-create-preview").addEventListener("click",previewDiscussion);
 $("cm-preview-close").addEventListener("click",()=>{preview.hidden=true;title.focus();});
 init().catch(()=>showGate(t("تعذّر التحقق من الحساب.","Could not verify your account.")));
})();