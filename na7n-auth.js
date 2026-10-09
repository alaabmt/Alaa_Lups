(() => {
  if (window.na7nSupabase) return;
  if (!window.supabase?.createClient) {
    window.na7nAuthError = "تعذر تحميل خدمة الحساب. أعد تحميل الصفحة وحاول مرة أخرى.";
    return;
  }
  const client = window.supabase.createClient(
    "https://dqrsjhcfmpjhcxvtxosy.supabase.co",
    "sb_publishable_7nFtuefzXknxLJyonReR-A_7IsnbJDP"
  );
  window.na7nSupabase = client;
  let currentUser = null;
  function refreshLinks() {
    document.querySelectorAll('a[href="account.html"]').forEach(link => {
      link.textContent = currentUser ? "متابعتي" : "حسابي";
      link.classList.add("account-link");
      link.setAttribute("aria-label", currentUser ? "متابعتي الصحية وحسابي" : "حسابي");
    });
  }
  // Auth callbacks hold a lock. Use the supplied session, never another Auth call.
  client.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    refreshLinks();
  });
  document.addEventListener("DOMContentLoaded", refreshLinks);
})();
