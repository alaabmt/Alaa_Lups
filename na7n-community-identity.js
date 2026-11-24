/* NA7N Community identity: public pseudonym only; real account contact details never used in community views. */
(() => {
 "use strict";
 if(window.Na7nCommunityIdentity)return;
 const styles=[
  {id:"leaf",emoji:"🌿",ar:"أوراق",en:"Leaves",bg:"#e7f4e7"},
  {id:"flower",emoji:"🌸",ar:"زهرة",en:"Flower",bg:"#fbe8f0"},
  {id:"moon",emoji:"🌙",ar:"قمر",en:"Moon",bg:"#eeebfa"},
  {id:"sun",emoji:"☀️",ar:"شمس",en:"Sun",bg:"#fff2d3"},
  {id:"wave",emoji:"🌊",ar:"موجة",en:"Wave",bg:"#e4f4fb"},
  {id:"butterfly",emoji:"🦋",ar:"فراشة",en:"Butterfly",bg:"#e8ebfb"},
  {id:"tree",emoji:"🌳",ar:"شجرة",en:"Tree",bg:"#e5f4e6"},
  {id:"star",emoji:"⭐",ar:"نجمة",en:"Star",bg:"#fff3df"},
  {id:"bird",emoji:"🐦",ar:"طائر",en:"Bird",bg:"#e7f3fa"},
  {id:"rainbow",emoji:"🌈",ar:"قوس قزح",en:"Rainbow",bg:"#fff0ec"},
  {id:"book",emoji:"📖",ar:"كتاب",en:"Book",bg:"#e9edf4"},
  {id:"heart",emoji:"💜",ar:"قلب",en:"Heart",bg:"#f1eafa"}
 ];
 const bucket="na7n-community-avatars";
 const e=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 const caches=new Map();
 const en=()=>document.documentElement.lang==="en";
 const lang=(a,b)=>en()?b:a;
 const findStyle=id=>styles.find(s=>s.id===id)||styles[0];
 const safeAlias=(name,fullName)=>{
   const alias=(name||"").normalize("NFC").trim().replace(/\s+/g," ");
   if(alias.length<3||alias.length>30)return lang("اختر اسمًا مستعارًا من 3 إلى 30 حرفًا.","Choose a nickname of 3–30 characters.");
   if(!/^[\p{L}\p{N}_ .-]+$/u.test(alias)||/@|https?:|www\.|[0-9]{6,}/i.test(alias))return lang("استخدم حروفًا أو أرقامًا قصيرة دون روابط أو بريد إلكتروني أو هاتف.","Use letters or short numbers, without email addresses, URLs or phone numbers.");
   const reserved=["admin","administrator","moderator","doctor","support","نحن","إدارة نحن","طبيب","المشرف","دكتور"];
   if(reserved.includes(alias.toLocaleLowerCase()))return lang("هذا الاسم محجوز. اختر اسمًا آخر.","This name is reserved.");
   if(fullName && alias.toLocaleLowerCase()===fullName.trim().toLocaleLowerCase())return lang("اختر اسمًا مختلفًا عن اسمك الحقيقي لحماية خصوصيتك.","Choose a nickname different from your real name.");
   return "";
 };
 const plainAvatar=(style="leaf",large=false)=>{
   const s=findStyle(style),span=e("span","na7n-member-avatar"+(large?" large":""));
   span.textContent=s.emoji;
   span.style.backgroundColor=s.bg;
   span.setAttribute("aria-hidden","true");
   return span;
 };
 async function getProfile(client,userId){
   if(!client||!userId)return null;
   const {data,error}=await client.from("na7n_community_identities")
     .select("user_id,nickname,avatar_style,avatar_path").eq("user_id",userId).maybeSingle();
   return error?null:data;
 }
 async function getProfiles(client,ids){
   const uniq=[...new Set((ids||[]).filter(Boolean))].slice(0,120);
   const map=new Map();
   if(!uniq.length||!client)return map;
   for(let start=0;start<uniq.length;start+=60){
     const {data,error}=await client.from("na7n_community_identities")
       .select("user_id,nickname,avatar_style,avatar_path").in("user_id",uniq.slice(start,start+60));
     if(!error)for(const p of data||[])map.set(p.user_id,p);
   }
   return map;
 }
 async function loadPrivateImage(client,path){
   if(!client||!path||!/^[0-9a-f-]{36}\/avatar\.webp$/.test(path))return null;
   if(!caches.has(path)){
     caches.set(path,client.storage.from(bucket).download(path).then(({data,error})=>{
       if(error||!data)return null;
       return URL.createObjectURL(data);
     }).catch(()=>null));
   }
   return caches.get(path);
 }
 function avatar(client,profile,large=false){
   const node=plainAvatar(profile?.avatar_style||"leaf",large);
   if(profile?.avatar_path){
     loadPrivateImage(client,profile.avatar_path).then(src=>{
       if(!src || !node.isConnected)return;
       const image=e("img");
       image.src=src;image.alt="";
       image.loading="lazy";
       image.decoding="async";
       node.replaceChildren(image);
     });
   }
   return node;
 }
 function memberLabel(client,profile,opts={}){
   const row=e("span","na7n-member-label");
   row.append(avatar(client,profile,Boolean(opts.large)));
   row.append(e("span","na7n-member-name",profile?.nickname||lang("عضو مجتمع","Community member")));
   return row;
 }
 function picker(container,chosen,onPick){
   container.replaceChildren();
   for(const s of styles){
     const b=e("button","na7n-avatar-choice");
     b.type="button";
     b.dataset.style=s.id;
     b.setAttribute("aria-pressed",String(chosen===s.id));
     b.setAttribute("aria-label",en()?s.en:s.ar);
     b.append(plainAvatar(s.id));
     b.append(e("span","na7n-avatar-choice-name",en()?s.en:s.ar));
     b.addEventListener("click",()=>{
       for(const el of container.querySelectorAll(".na7n-avatar-choice"))
         el.setAttribute("aria-pressed",String(el===b));
       onPick(s.id);
     });
     container.append(b);
   }
 }
 async function reencodeImage(file){
   if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>4*1024*1024)
     throw new Error(lang("اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 4 ميغابايت.","Choose JPG, PNG or WebP under 4 MB."));
   const url=URL.createObjectURL(file);
   let image;
   try{
     image=await new Promise((resolve,reject)=>{
       const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error("bad_image"));im.src=url;
     });
     if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth>10000||image.naturalHeight>10000)
       throw new Error("image_dimensions");
     const canvas=document.createElement("canvas");
     canvas.width=canvas.height=256;
     const ctx=canvas.getContext("2d");
     if(!ctx)throw new Error("canvas");
     ctx.fillStyle="#f5f8f9";ctx.fillRect(0,0,256,256);
     const scale=Math.max(256/image.naturalWidth,256/image.naturalHeight);
     const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
     ctx.drawImage(image,(256-w)/2,(256-h)/2,w,h);
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",.83));
     if(!blob||blob.type!=="image/webp"||blob.size>1048576)
       throw new Error("output_format");
     return blob; // EXIF and original filenames are discarded.
   }finally{URL.revokeObjectURL(url);}
 }
 async function uploadAvatar(client,userId,file){
   const blob=await reencodeImage(file);
   const path=userId+"/avatar.webp";
   const {error}=await client.storage.from(bucket).upload(path,blob,{
      upsert:true,contentType:"image/webp",cacheControl:"60"
   });
   if(error)throw error;
   caches.delete(path);
   return path;
 }
 async function removeAvatar(client,userId){
   const {error}=await client.storage.from(bucket).remove([userId+"/avatar.webp"]);
   if(error)throw error;
   caches.delete(userId+"/avatar.webp");
 }
 window.Na7nCommunityIdentity={
   styles,bucket,lang,picker,validate:safeAlias,getProfile,getProfiles,
   avatar,memberLabel,uploadAvatar,removeAvatar
 };
})();
