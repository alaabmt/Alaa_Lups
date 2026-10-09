const NA7N_SUPABASE_URL="https://dqrsjhcfmpjhcxvtxosy.supabase.co";
const NA7N_SUPABASE_KEY="sb_publishable_7nFtuefzXknxLJyonReR-A_7IsnbJDP";
const na7nSupabase=window.supabase.createClient(NA7N_SUPABASE_URL,NA7N_SUPABASE_KEY);
window.na7nSupabase=na7nSupabase;

async function na7nRefreshAccountLinks(){
  const {data:{user}}=await na7nSupabase.auth.getUser();
  document.querySelectorAll('a[href="account.html"]').forEach(link=>{
    link.textContent=user?"متابعتي":"حسابي";
    link.classList.add("account-link");
    if(user) link.setAttribute("aria-label","متابعتي الصحية وحسابي");
  });
}
document.addEventListener("DOMContentLoaded",na7nRefreshAccountLinks);
na7nSupabase.auth.onAuthStateChange(()=>na7nRefreshAccountLinks());
