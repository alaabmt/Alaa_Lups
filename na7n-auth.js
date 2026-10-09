(() => {
  if (window.na7nSupabase) return;
  if (!window.supabase?.createClient) {
    window.na7nAuthError = "تعذر تحميل خدمة الحساب. أعد تحميل الصفحة وحاول مرة أخرى.";
    return;
  }
  const client = window.supabase.createClient(
    "https://wobpwxdlfrzfugzocdie.supabase.co",
    "sb_publishable_QlDRz3T6CwgTHI3cdGJLMA_BwH4qlwO"
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
