(() => {
  const $ = id => document.getElementById(id);
  const s = window.na7nSupabase;
  if (!s) {
    $("msg").textContent = window.na7nAuthError || "تعذر تحميل خدمة الحساب.";
    $("login").disabled = $("signup").disabled = true;
    return;
  }
  let trendChart, trendRows = [], busy = false, stateVersion = 0;
  const metricNames = {
    fatigue_impact: "تأثير التعب", sleep_impact: "تأثير النوم",
    daily_activity_impact: "تأثير الصحة على النشاط اليومي", quality_of_life: "جودة الحياة"
  };
  function clearDashboard() {
    trendChart?.destroy();
    trendChart = null;
    trendRows = [];
    $("summary").replaceChildren();
    $("signed-in-as").textContent = $("trend-context").textContent = "";
    $("empty").classList.add("hidden");
    $("dashboard-msg").textContent = "";
  }
  // Create the NA7N-only profile after a verified login. Email-confirmation signups
  // have no session yet; their non-health profile fields are read on first login.
  async function ensureProfile(user) {
    const name = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
    if (name.length < 2 || name.length > 80) return null;
    const rawPhone = typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone.trim() : "";
    const phone = rawPhone && rawPhone.length <= 30 ? rawPhone : null;
    const { error } = await s.from("na7n_profiles").upsert(
      { id: user.id, full_name: name, phone },
      { onConflict: "id", ignoreDuplicates: true }
    );
    return error;
  }
  async function state() {
    const version = ++stateVersion;
    clearDashboard();
    $("dashboard").classList.add("hidden");
    try {
      const { data: { user }, error } = await s.auth.getUser();
      if (version !== stateVersion) return;
      $("auth").classList.toggle("hidden", !!user && !error);
      if (!user || error) return;
      const profileError = await ensureProfile(user);
      if (version !== stateVersion) return;
      if (profileError) $("dashboard-msg").textContent = "تم تسجيل الدخول، لكن تعذر حفظ الملف الشخصي. يمكنك إعادة تحميل الصفحة والمحاولة لاحقًا.";
      if ($("login-password")) $("login-password").value = "";
      $("signed-in-as").textContent = "تم تسجيل الدخول: " + user.email;
      $("dashboard").classList.remove("hidden");
      const { data, error: loadError } = await s.from("na7n_responses")
        .select("metric_key,value,created_at,assessment_id")
        .eq("user_id", user.id).order("created_at").order("id");
      if (version !== stateVersion) return;
      if (loadError) {
        $("dashboard-msg").textContent = "تعذر تحميل المتابعات. أعد تحميل الصفحة للمحاولة مجددًا.";
        return;
      }
      trendRows = data || [];
      $("empty").classList.toggle("hidden", trendRows.length > 0);
      const byKey = {};
      trendRows.forEach(row => (byKey[row.metric_key] ??= []).push(row));
      $("summary").innerHTML = Object.entries(metricNames).map(([key, name]) => {
        const rows = byKey[key] || [];
        if (!rows.length) return "";
        const last = Number(rows.at(-1).value);
        const delta = rows.length > 1 ? last - Number(rows.at(-2).value) : null;
        const change = delta === null ? "أول قراءة" : delta === 0 ? "لا تغيير عن السابقة" :
          (delta > 0 ? "+" : "") + delta.toFixed(1) + " عن السابقة";
        return '<article class="summary-card"><strong>' + name + '</strong><span class="summary-value">' +
          last.toFixed(1) + '/10</span><span class="summary-change">' + change + '</span></article>';
      }).join("");
      if (trendRows.length) renderTrend("fatigue_impact");
    } catch {
      if (version === stateVersion) $("msg").textContent = "تعذر الاتصال بخدمة الحساب. حاول مجددًا.";
    }
  }
  function renderTrend(key) {
    document.querySelectorAll(".trend-filter").forEach(button => button.classList.toggle("active", button.dataset.key === key));
    const rows = trendRows.filter(row => row.metric_key === key);
    const values = rows.map(row => Number(row.value));
    trendChart?.destroy();
    if (!window.Chart) {
      $("trend-context").textContent = "تعذر تحميل الرسم البياني. نتائجك معروضة أعلاه.";
      return;
    }
    trendChart = new Chart($("trend"), {
      type: "line",
      data: { labels: rows.map(row => new Intl.DateTimeFormat("ar-AE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(row.created_at))),
        datasets: [{ label: metricNames[key], data: values, tension: .25, pointRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        scales: { y: { min: 0, max: 10, ticks: { stepSize: 2 } } }, plugins: { legend: { display: false } } }
    });
    $("trend-context").textContent = !values.length ? "لا توجد قراءة محفوظة لهذا المحور." : values.length === 1 ?
      "هذه أول قراءة محفوظة لهذا المحور." : "آخر قراءة " + values.at(-1).toFixed(1) + "/10، والقراءة السابقة " +
      values.at(-2).toFixed(1) + "/10. التغير الرقمي وحده لا يحدد تحسن أو نشاط المرض.";
  }
  function authError(error) {
    const messages = {
      user_already_exists: "هذا البريد مسجّل بالفعل. استخدم تسجيل الدخول بكلمة مرور حسابك الحالي.",
      invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      email_not_confirmed: "تحقق من بريدك الإلكتروني لتأكيد الحساب أولًا.",
      anonymous_provider_disabled: "تعذر إرسال بيانات التسجيل بصورة صحيحة. أعد تحميل الصفحة ثم حاول مجددًا.",
      signup_disabled: "إنشاء الحسابات غير متاح حاليًا.",
      weak_password: "اختر كلمة مرور أقوى وحاول مجددًا."
    };
    // Do not expose database details or echo submitted credentials in UI/logs.
    return messages[error?.code] || "تعذر إكمال الطلب. تحقق من اتصالك وبياناتك وحاول مجددًا.";
  }
  function showAuthPanel(mode) {
    const signup = mode === "signup";
    $("login-panel").classList.toggle("hidden", signup);
    $("signup-panel").classList.toggle("hidden", !signup);
    $("show-login").classList.toggle("primary", !signup);
    $("show-login").classList.toggle("secondary", signup);
    $("show-signup").classList.toggle("primary", signup);
    $("show-signup").classList.toggle("secondary", !signup);
    $("msg").textContent = "";
  }
  async function login() {
    if (busy) return;
    const email=$("login-email").value.trim(), password=$("login-password").value;
    if(!email||!$("login-email").checkValidity()){ $("msg").textContent="أدخل بريدًا إلكترونيًا صحيحًا."; $("login-email").focus(); return; }
    if(!password){ $("msg").textContent="أدخل كلمة المرور."; $("login-password").focus(); return; }
    busy=true; $("login").disabled=true; $("msg").textContent="جارٍ تسجيل الدخول…";
    try{ const result=await s.auth.signInWithPassword({email,password}); if(result.error){$("msg").textContent=authError(result.error);return;} $("login-password").value=""; await state(); }
    catch{$("msg").textContent="تعذر الاتصال بخدمة الحساب. حاول مجددًا."} finally{busy=false;$("login").disabled=false}
  }
  async function signup() {
    if (busy) return;
    const name=$("signup-name").value.trim(),email=$("signup-email").value.trim(),phone=$("signup-phone").value.trim(),password=$("signup-password").value,password2=$("signup-password2").value;
    if(name.length<2){$("msg").textContent="أدخل اسمك أولًا."; $("signup-name").focus();return}
    if(!email||!$("signup-email").checkValidity()){$("msg").textContent="أدخل بريدًا إلكترونيًا صحيحًا."; $("signup-email").focus();return}
    if(password.length<8){$("msg").textContent="اختر كلمة مرور من 8 أحرف على الأقل."; $("signup-password").focus();return}
    if(password!==password2){$("msg").textContent="كلمتا المرور غير متطابقتين."; $("signup-password2").focus();return}
    if(!$("signup-consent").checked){$("msg").textContent="نحتاج موافقتك على إنشاء الحساب وحفظ المتابعة.";return}
    busy=true;$("signup").disabled=true;$("msg").textContent="جارٍ إنشاء الحساب…";
    try{
      const metadata={full_name:name}; if(phone) metadata.phone=phone;
      const result=await s.auth.signUp({email,password,options:{data:metadata}});
      if(result.error){$("msg").textContent=authError(result.error);return}
      $("signup-password").value=$("signup-password2").value="";
      if(result.data?.session){await state()} else {$("msg").textContent="تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده، ثم سجّل الدخول."; showAuthPanel("login"); $("login-email").value=email; $("msg").textContent="تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده، ثم سجّل الدخول."}
    }catch{$("msg").textContent="تعذر الاتصال بخدمة الحساب. حاول مجددًا."}finally{busy=false;$("signup").disabled=false}
  }
  $("trend-controls").innerHTML = Object.entries(metricNames).map(([key, name]) =>
    '<button type="button" class="trend-filter" data-key="' + key + '">' + name + '</button>').join("");
  $("trend-controls").addEventListener("click", event => {
    const button = event.target.closest(".trend-filter");
    if (button && trendRows.length) renderTrend(button.dataset.key);
  });
  $("show-login").addEventListener("click",()=>showAuthPanel("login"));
  $("show-signup").addEventListener("click",()=>showAuthPanel("signup"));
  $("cancel-signup").addEventListener("click",()=>showAuthPanel("login"));
  $("login").addEventListener("click",login);
  $("signup").addEventListener("click",signup);
  $("login-password").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();login()}});
  $("new-account").addEventListener("click",async()=>{
    $("new-account").disabled = true;
    try {
      const { error } = await s.auth.signOut({scope:"local"});
      if (error) { $("dashboard-msg").textContent = "تعذر تسجيل الخروج من الحساب الحالي. حاول مجددًا."; return; }
      ++stateVersion;
      clearDashboard();
      $("dashboard").classList.add("hidden");
      $("auth").classList.remove("hidden");
      showAuthPanel("signup");
    } finally { $("new-account").disabled = false; }
  });
  $("logout").addEventListener("click", async () => {
    $("logout").disabled = true;
    try {
      const { error } = await s.auth.signOut({ scope: "local" });
      if (error) { $("dashboard-msg").textContent = "تعذر تسجيل الخروج. حاول مجددًا."; return; }
      ++stateVersion;
      clearDashboard();
      $("login-password").value = $("msg").textContent = "";
      $("dashboard").classList.add("hidden");
      $("auth").classList.remove("hidden");
    } finally { $("logout").disabled = false; }
  });
  // Schedule outside the Auth lock, including cross-tab logout/session expiry.
  s.auth.onAuthStateChange(() => setTimeout(state, 0));
})();
