/* NA7N patient-led learning: four steps in place, no account or tracking. */
(() => {
 "use strict";
 const root=document.querySelector(".na7n-newly .na7n-learning-shell");
 if(!root)return;
 const stages=[...root.querySelectorAll(".na7n-learning-stage")];
 const selectors=[...root.querySelectorAll(".na7n-step-btn")];
 const progress=[...root.querySelectorAll(".na7n-learning-progress span")];
 const live=root.querySelector(".na7n-step-announcement");
 if(stages.length!==4||selectors.length!==4)return;
 let active=-1;
 function revealDeepLink(hash) {
   let target=null;
   if(hash){try{target=document.getElementById(decodeURIComponent(hash.replace(/^#/,"")))}catch(_){}}
   return target&&root.contains(target)?target:null;
 }
 function activate(index,opts={}) {
   if(index<0||index>=stages.length)return;
   const changed=active!==index;active=index;
   stages.forEach((section,i)=>{section.hidden=i!==index;});
   selectors.forEach((btn,i)=>{btn.setAttribute("aria-current",i===index?"step":"false");btn.setAttribute("aria-pressed",String(i===index));});
   progress.forEach((bar,i)=>bar.classList.toggle("is-active",i<=index));
   if(live)live.textContent=selectors[index].innerText.replace(/\s+/g," ").trim();
   if(changed && opts.updateUrl){
     const url=location.pathname+location.search+"#"+stages[index].id;
     history.pushState({na7nLearningStep:index},"",url);
   }
   if(opts.scroll){
     const preferred=window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
     root.scrollIntoView({block:"start",behavior:preferred});
     const h=stages[index].querySelector("h3");if(h)h.focus({preventScroll:true});
   }
 }
 function openTarget(target) {
   if(target.tagName==="DETAILS")target.open=true;
   const stage=target.closest(".na7n-learning-stage");
   if(stage)activate(stages.indexOf(stage));
   let p=target.parentElement;
   while(p&&p!==root){if(p.tagName==="DETAILS")p.open=true;p=p.parentElement;}
 }
 selectors.forEach((btn,i)=>btn.addEventListener("click",()=>activate(i,{updateUrl:true,scroll:true})));
 root.querySelectorAll("[data-go-step]").forEach(btn=>btn.addEventListener("click",()=>activate(Number(btn.dataset.goStep)-1,{updateUrl:true,scroll:true})));
 document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",()=>{
   let target=null;
   try { target=document.getElementById(decodeURIComponent(a.hash.slice(1))); } catch (_) {}
   if(!target)return;
   if(root.contains(target))openTarget(target);
   else openTarget(target);
 }));
 function sync(){
  const hash=location.hash;
  const target=revealDeepLink(hash);
  if(target){openTarget(target);return;}
  let outside=null;
  try { outside=document.getElementById(decodeURIComponent(hash.slice(1))); } catch (_) {}
  if(outside)openTarget(outside);
  activate(0);
 }
 window.addEventListener("popstate",sync);
 window.addEventListener("hashchange",sync);
 sync();
})();
