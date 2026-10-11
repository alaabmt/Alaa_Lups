// NA7N Q-SLAQ SYNTHETIC DEMO cloud history only.
// Real patient results must NEVER be submitted to this project (ap-south-1).
(function() {
"use strict";
const columns=["weight","fatigue","fever","nodes","alopecia","breath","chest","abdomen",
 "forget","depress","headache","muscleWeak","musclePain","jointPain","jointSwelling",
 "malar","sun","sores","global"];
const severity=columns.slice(0,15), binary=columns.slice(15,18);
function isValid(answers){
 if(!answers || typeof answers!=="object" || Array.isArray(answers))return false;
 const keys=Object.keys(answers);
 return keys.length===19 && keys.every(k=>columns.includes(k)) &&
  severity.every(k=>Number.isInteger(answers[k]) && answers[k]>=0 && answers[k]<=3) &&
  binary.every(k=>Number.isInteger(answers[k]) && [0,1].includes(answers[k])) &&
  Number.isInteger(answers.global) && answers.global>=0 && answers.global<=10;
}
async function identity(){
 const client=window.na7nSupabase;
 if(!client)throw new Error("auth_unavailable");
 const {data,error}=await client.auth.getUser();
 const user=data?.user;
 if(error||!user||user.is_anonymous)throw new Error("sign_in_required");
 return {client,user};
}
async function save(answers,generatedThisSession){
 if(generatedThisSession!==true || !isValid(answers))throw new Error("synthetic_only");
 const {client,user}=await identity();
 const {data,error}=await client.from("na7n_qslaq_demo_results")
 .insert({user_id:user.id,answers,is_demo:true,synthetic_attested:true})
 .select("id,completed_at,severity_score,symptom_score,global_score,is_demo")
 .single();
 if(error)throw new Error("save_failed");
 return data;
}
async function history(){
 const {client,user}=await identity();
 const {data,error}=await client.from("na7n_qslaq_demo_results")
 .select("id,answers,completed_at,severity_score,symptom_score,global_score,is_demo")
 .eq("user_id",user.id).order("completed_at",{ascending:false}).limit(100);
 if(error)throw new Error("load_failed");
 return (data||[]).filter(r=>r.is_demo===true);
}
async function remove(id){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  throw new Error("bad_id");
 const {client,user}=await identity();
 const {error}=await client.from("na7n_qslaq_demo_results")
 .delete().eq("id",id).eq("user_id",user.id);
 if(error)throw new Error("delete_failed");
}
window.NA7NQslaQDemo=Object.freeze({save,history,remove,isValid,columns});
})();
