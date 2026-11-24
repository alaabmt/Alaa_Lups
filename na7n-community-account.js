/* NA7N account community identity settings. Distinct from confidential user profile. */
(() => {
 "use strict";
 const api=window.Na7nCommunityIdentity;
 const client=window.na7nSupabase;
 if(!api||!client)return;
 const $=id=>document.getElementById(id);
 const tr=(a,b)=>api.lang(a,b);
 const input=$("community-nickname"),fileInput=$("community-avatar-file");
 const preview=$("community-identity-preview"),status=$("community-identity-status");
 const save=$("community-identity-save"),remove=$("community-avatar-remove");
 const picker=$("community-avatar-options");
 const signupOptions=$("signup-avatar-options");
 if(!input||!signupOptions||!picker)return;
 let user=null,profile=null,style="leaf",loading=null,uploadAllowed=false,lastSavedImagePath=null,usingPreset=false,pendingPreviewUrl=null;
 function getSelectedStyle(){return style;}
 function clearPendingPreview(){
   if(pendingPreviewUrl)URL.revokeObjectURL(pendingPreviewUrl);
   pendingPreviewUrl=null;
 }
 function showPreview(){
   preview.replaceChildren();
   const p={nickname:input.value.trim()||tr("اسمك المستعار","Your nickname"),
            avatar_style:style,avatar_path:(usingPreset||pendingPreviewUrl)?null:(profile?.avatar_path||null)};
   const avatar=api.avatar(client,p,true);
   if(pendingPreviewUrl){
     const image=document.createElement("img");
     image.src=pendingPreviewUrl;
     image.alt="";
     avatar.replaceChildren(image);
   }
   preview.append(avatar);
   const content=document.createElement("div");
   const strong=document.createElement("strong");strong.textContent=p.nickname;
   const small=document.createElement("small");
   small.textContent=tr("هكذا سيراك أعضاء المجتمع المسجلون","This is how signed-in members will see you");
   content.append(strong,small);preview.append(content);
 }
 api.picker(signupOptions,$("signup-avatar-style").value||"leaf",chosen=>{
   $("signup-avatar-style").value=chosen;
 });
 api.picker(picker,style,chosen=>{
   style=chosen;
   // Selecting a preset means the saved custom image will be replaced when saved.
   usingPreset=true;
   clearPendingPreview();
   fileInput.value="";
   showPreview();
 });
 input.addEventListener("input",showPreview);
 fileInput.addEventListener("change",()=>{
   clearPendingPreview();
   const file=fileInput.files?.[0];
   if(!file){showPreview();return;}
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>4*1024*1024){
     fileInput.value="";
     status.textContent=tr("اختر صورة JPG أو PNG أو WebP لا تتجاوز 4 ميغابايت.",
       "Choose JPG, PNG or WebP under 4 MB.");
     showPreview();
     return;
   }
   pendingPreviewUrl=URL.createObjectURL(file);
   usingPreset=false;
   showPreview();
   status.textContent=tr("هذه معاينة فقط؛ اضغط «حفظ الاسم والصورة» لرفعها. صورة الوجه قد تكشف هويتك.",
     "Preview only. Select Save to upload. A face photograph can reveal your identity.");
 });
 function messageError(error){
   if(error?.code==="23505")return tr("هذا الاسم المستعار مستخدم بالفعل. اختر اسمًا مختلفًا.",
                                      "This nickname is already taken. Choose a different one.");
   if(error?.code==="23514")return tr("الاسم المستعار غير مقبول. جرّب اسمًا أبسط دون بيانات اتصال.",
                                      "That nickname is not allowed. Try one without identifying details.");
   return tr("تعذّر حفظ الملف العام. يرجى المحاولة لاحقًا.",
             "Could not save your public profile. Please try again.");
 }
 function displayIdentity(){
   input.value=profile?.nickname || user?.user_metadata?.community_nickname || "";
   style=profile?.avatar_style||user?.user_metadata?.community_avatar_style||"leaf";
   api.picker(picker,style,chosen=>{
     style=chosen;
     usingPreset=true;
     clearPendingPreview();
     fileInput.value="";
     showPreview();
   });
   showPreview();
 }
 async function seedFromSignup(userData){
   if(!userData)return;
   const alias=userData.user_metadata?.community_nickname;
   const chosen=userData.user_metadata?.community_avatar_style||"leaf";
   if(!alias || api.validate(alias,userData.user_metadata?.full_name))return;
   const {data:existing,error:checkError}=await client.from("na7n_community_identities")
     .select("user_id").eq("user_id",userData.id).maybeSingle();
   if(checkError||existing)return;
   const {error}=await client.from("na7n_community_identities")
     .insert({user_id:userData.id,nickname:alias.trim(),avatar_style:chosen});
   if(error)status.textContent=messageError(error);
 }
 async function initialize(userData){
   if(!userData)return;
   user=userData;
   await seedFromSignup(userData);
   const p=await api.getProfile(client,userData.id);
   profile=p;
   clearPendingPreview();
   lastSavedImagePath=p?.avatar_path||null;
   usingPreset=false;
   const {data:staff}=await client.from("na7n_community_staff")
     .select("is_active").eq("user_id",userData.id).maybeSingle();
   uploadAllowed=Boolean(staff?.is_active);
   fileInput.disabled=!uploadAllowed;
   if(!uploadAllowed){
     $("community-upload-note").textContent=tr(
       "يمكنك اختيار صورة جاهزة الآن. رفع الصور الخاصة غير متاح لهذا الحساب حتى اكتمال متطلبات حماية البيانات.",
       "You can select a ready-made avatar now. Custom uploads are not enabled for this account until data protection requirements are completed."
     );
   }
   displayIdentity();
   if(!p){
     status.textContent=tr(
       "اختر اسمًا مستعارًا لحماية هويتك عند المشاركة في المجتمع.",
       "Choose a nickname before participating in the community."
     );
   }
 }
 async function onSignedIn(userData){
   if(loading && user?.id===userData.id)return loading;
   loading=initialize(userData).finally(()=>{loading=null;});
   return loading;
 }
 async function saveIdentity(){
   if(!user)return;
   const nickname=input.value.normalize("NFC").trim().replace(/\s+/g," ");
   const errorMessage=api.validate(nickname,user.user_metadata?.full_name);
   if(errorMessage){status.textContent=errorMessage;input.focus();return;}
   save.disabled=true;status.textContent=tr("جارٍ الحفظ…","Saving…");
   try{
     let avatarPath=usingPreset?null:(profile?.avatar_path||null);
     const chosenFile=fileInput.files?.[0];
     if(chosenFile){
       if(!uploadAllowed){
         status.textContent=tr("رفع الصور غير متاح لحسابك حاليًا.","Custom uploads are not enabled for your account.");
         return;
       }
       avatarPath=await api.uploadAvatar(client,user.id,chosenFile);
     }
     const payload={nickname,avatar_style:style,avatar_path:avatarPath,
                    updated_at:new Date().toISOString()};
     const request=profile?.user_id
       ?client.from("na7n_community_identities").update(payload).eq("user_id",user.id)
       :client.from("na7n_community_identities").insert({user_id:user.id,...payload});
     const {error}=await request;
     if(error){status.textContent=messageError(error);return false;}
     const previous=lastSavedImagePath;
     profile={user_id:user.id,...payload};
     usingPreset=false;
     lastSavedImagePath=avatarPath;
     clearPendingPreview();
     fileInput.value="";
     status.textContent=tr("تم حفظ الاسم والصورة اللذين سيظهران في المجتمع.",
       "Your nickname and avatar are saved for the community.");
     showPreview();
     if(previous && previous!==avatarPath && uploadAllowed){
       try{await api.removeAvatar(client,user.id);}catch{/* Unreferenced file remains private. */}
     }
     return true;
   }catch(error){
     status.textContent=error?.message?.includes("4 MB")?error.message:
       tr("تعذّر رفع الصورة. جرّب صورة أصغر أو استخدم إحدى الصور الجاهزة.",
          "Upload failed. Try a smaller image or choose a ready-made avatar.");
   }finally{save.disabled=false;}
 }
 async function switchToPreset(){
   if(!user)return;
   usingPreset=true;
   fileInput.value="";
   await saveIdentity();
 }
 save.addEventListener("click",saveIdentity);
 remove.addEventListener("click",switchToPreset);
 window.Na7nCommunityAccount={onSignedIn,seedFromSignup};
})();
