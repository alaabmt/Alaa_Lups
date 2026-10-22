/* Documented physician-review badge: NEVER green solely because a page contains a hardcoded flag. */
(() => {
 "use strict";
 const file=decodeURIComponent(location.pathname.split("/").pop()||"");
 const eligible=new Set(["newly-diagnosed.html","symptoms.html","treatment.html","appointment.html","living.html","pregnancy.html","newly-diagnosed-en.html","symptoms-en.html","treatment-en.html","appointment-en.html","living-en.html","pregnancy-en.html","about-lupus.html","about-lupus-en.html","diagnosis-tests.html","diagnosis-tests-en.html","kidneys.html","kidneys-en.html","skin-sun.html","skin-sun-en.html","faq.html","faq-en.html","fatigue.html"]);
 if(!eligible.has(file))return;
 const main=document.querySelector("main");if(!main)return;
 const en=document.documentElement.lang==="en",L=(ar,eng)=>en?eng:ar;
 const box=document.createElement("section");box.className="na7n-medical-status";box.setAttribute("aria-label",L("حالة المراجعة الطبية","Medical review status"));
 const heading=document.createElement("h2");heading.textContent=L("التحقق من المراجعة الطبية","Medical review verification");
 const message=document.createElement("p");message.className="na7n-medical-status-message";message.textContent=L("جارٍ التحقق من حالة هذه النسخة...","Checking review status for this exact page...");
 box.append(heading,message);main.before(box);
 const style=document.createElement("style");
 style.textContent=`.na7n-medical-status{width:min(940px,calc(100% - 36px));margin:16px auto 30px;padding:18px;border:1px solid #ded8e4;border-radius:16px;background:#fbf9fd;font:15px/1.7 system-ui,Tahoma,Arial,sans-serif;color:#453d4f;box-sizing:border-box}.na7n-medical-status h2{font-size:19px;margin:0 0 8px;color:#47305e}.na7n-medical-status-message{margin:0 0 6px}.na7n-medical-status[data-verified="true"]{border-inline-start:6px solid #242424;border-radius:0;background:#f4f4f4;color:#202020}.na7n-medical-status[data-verified="true"] h2{color:#202020;font-size:18px}.na7n-medical-status[data-approved="true"]{border-inline-start-color:#2c8a52;background:#f2fbf5}.na7n-medical-status[data-approved="true"] h2{color:#166b3f}.na7n-medical-physicians{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:12px;margin:14px 0}.na7n-medical-physician{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid #cbe1d1;border-radius:12px;background:white}.na7n-medical-physician img{width:53px;height:53px;object-fit:cover;border-radius:100%;flex:none}.na7n-medical-physician strong{font-size:14px;display:block}.na7n-medical-physician small{font-size:12px;color:#526457;display:block}.na7n-medical-status-footer{color:#5d5d61;font-size:12px;margin-top:10px}`;
 document.head.append(style);
 const key="sb_publishable_QlDRz3T6CwgTHI3cdGJLMA_BwH4qlwO";
 const dbUrl="https://wobpwxdlfrzfugzocdie.supabase.co/rest/v1/rpc/na7n_medical_public_status";
 const hex=a=>Array.from(new Uint8Array(a),v=>v.toString(16).padStart(2,"0")).join("");
 async function run(){
  const response=await fetch(file+"?medical-status="+Date.now(),{cache:"no-store",credentials:"omit"});
  if(!response.ok)throw Error("Fetch");
  const hash=hex(await crypto.subtle.digest("SHA-256",await response.arrayBuffer()));
  const r=await fetch(dbUrl,{method:"POST",headers:{"Content-Type":"application/json","apikey":key},body:JSON.stringify({p_page_path:file,p_sha256:hash}),cache:"no-store"});
  if(!r.ok)throw Error("Review status unavailable");
  const data=await r.json();
  const physicians=Array.isArray(data?.physicians)?data.physicians:[];
  box.dataset.reviewCount=String(physicians.length);
  if(physicians.length>=1){
   box.dataset.verified="true";
   box.dataset.approved=String(data?.approved===true);
   heading.textContent=L("✓ تمت مراجعة الصفحة طبيًا","✓ Physician-reviewed content");
   message.textContent=physicians.length===1
    ? L("راجع هذه النسخة طبيب مؤهل واحد على الأقل:","This version was reviewed by at least one qualified physician:")
    : L("راجع هذه النسخة أطباء مؤهلون:","This version was reviewed by qualified physicians:");
  }else{
   heading.textContent=L("مراجعة طبية قيد الاستكمال","Physician review in progress");
   message.textContent=L("لم يراجع طبيب مؤهل هذه النسخة بعد.","No qualified physician has reviewed this version yet.");
  }
  const list=document.createElement("div");list.className="na7n-medical-physicians";
  for(const p of physicians){
   const item=document.createElement("div");item.className="na7n-medical-physician";
   if(typeof p.photo_path==="string" && /^\/assets\/reviewers\/[\w/-]+\.(png|jpg|jpeg|webp)$/.test(p.photo_path)){
    const img=document.createElement("img");img.src=p.photo_path;img.alt=L("صورة الطبيب المراجع","Reviewing physician photo");img.loading="lazy";item.append(img);
   }
   const txt=document.createElement("span"),name=document.createElement("strong"),specialty=document.createElement("small"),date=document.createElement("small");
   name.textContent=en?p.name_en:p.name_ar;specialty.textContent=en?p.specialty_en:p.specialty_ar;
   date.textContent=L("المراجعة: ","Reviewed: ")+(p.reviewed_at?new Date(p.reviewed_at).toLocaleDateString(en?"en-US":"ar-AE"):"");
   txt.append(name,specialty,date);item.append(txt);list.append(item);
  }
  if(physicians.length)box.append(list);
  // Keep the older editorial disclosure consistent with a verified, current-version approval.
  if(physicians.length){
   const phrases=["بانتظار اعتماد طبيب مراجع","Pending documented clinician review","Pending clinician review"];
   document.querySelectorAll("main p").forEach(p=>{
    const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);
    let node;while((node=walker.nextNode())){
     if(phrases.some(x=>node.nodeValue.includes(x))){
      for(const phrase of phrases)node.nodeValue=node.nodeValue.replace(phrase,L("تمت مراجعة هذه النسخة من طبيب مؤهل واحد على الأقل.","Reviewed by at least one qualified physician for this version."));
     }
    }
   });
  }
  const note=document.createElement("p");note.className="na7n-medical-status-footer";note.textContent=L("المراجعة تخص هذه النسخة تحديدًا، والمعلومات للتثقيف ولا تحل محل المشورة الطبية الشخصية.","This review applies to this specific revision. Education does not replace personal medical advice.");
  box.append(note);
 }
 run().catch(()=>{message.textContent=L("تعذر التحقق من حالة المراجعة الطبية حاليًا؛ لا يعني ذلك أن الصفحة معتمدة.","Review status could not be verified. Approval is not being asserted.");});
})();

