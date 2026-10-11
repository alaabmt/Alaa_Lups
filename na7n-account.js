(() => {
  // One shared authentication implementation; only display text differs by language.
  const accountEnglish=document.documentElement.lang==="en";
  const accountTranslations={"إخفاء":"Hide","إظهار":"Show","إخفاء ":"Hide ","إظهار ":"Show ","تعذر تحميل خدمة الحساب.":"Account service is unavailable.","تأثير التعب":"Fatigue impact","تأثير النوم":"Sleep impact","تأثير الصحة على النشاط اليومي":"Impact on daily activities","جودة الحياة":"Quality of life","تم تسجيل الدخول، لكن تعذر حفظ الملف الشخصي. يمكنك إعادة تحميل الصفحة والمحاولة لاحقًا.":"Signed in, but your profile could not be saved. Reload the page and try again later.","تم تسجيل الدخول: ":"Signed in: ","تعذر تحميل المتابعات. أعد تحميل الصفحة للمحاولة مجددًا.":"Could not load check-ins. Reload the page to try again.","أول قراءة":"First reading","لا تغيير عن السابقة":"No change from previous"," عن السابقة":" compared with previous","تعذر الاتصال بخدمة الحساب. حاول مجددًا.":"Could not connect to the account service. Please try again.","تعذر تحميل الرسم البياني. نتائجك معروضة أعلاه.":"The chart could not be loaded. Your results are shown above.","لا توجد قراءة محفوظة لهذا المحور.":"There are no saved readings for this measure.","هذه أول قراءة محفوظة لهذا المحور.":"This is the first saved reading for this measure.","آخر قراءة ":"Latest reading ","/10، والقراءة السابقة ":"/10; previous reading ","/10. التغير الرقمي وحده لا يحدد تحسن أو نشاط المرض.":"/10. A numeric change alone cannot establish improvement or lupus activity.","هذا البريد مسجّل بالفعل. استخدم تسجيل الدخول بكلمة مرور حسابك الحالي.":"This email is already registered. Sign in using your current password.","البريد الإلكتروني أو كلمة المرور غير صحيحة.":"Incorrect email or password.","هذا الحساب لا يزال يتطلب تأكيد البريد وفق إعدادات خدمة الحساب. يُرجى التواصل مع إدارة نَحْنُ.":"Your email still needs confirmation according to the account service settings. Contact NA7N support.","تعذر إرسال بيانات التسجيل بصورة صحيحة. أعد تحميل الصفحة ثم حاول مجددًا.":"The registration details could not be submitted correctly. Reload and try again.","إنشاء الحسابات غير متاح حاليًا.":"New account registration is currently unavailable.","اختر كلمة مرور أقوى وحاول مجددًا.":"Choose a stronger password and try again.","تعذر إكمال الطلب. تحقق من اتصالك وبياناتك وحاول مجددًا.":"The request could not be completed. Check your connection and details, then try again.","أدخل بريدًا إلكترونيًا صحيحًا.":"Enter a valid email address.","أدخل كلمة المرور.":"Enter your password.","جارٍ تسجيل الدخول…":"Signing in…","أدخل اسمك أولًا.":"Enter your name first.","أدخل رقم هاتف صحيحًا (من 7 إلى 15 رقمًا).":"Enter a valid phone number (7 to 15 digits).","اختر كلمة مرور من 8 أحرف على الأقل.":"Choose a password with at least 8 characters.","كلمتا المرور غير متطابقتين.":"Passwords do not match.","نحتاج موافقتك على إنشاء الحساب وحفظ المتابعة.":"Consent is required to create an account and save check-ins.","جارٍ إنشاء الحساب…":"Creating your account…","لم يتم تسجيل الدخول تلقائيًا. ما زال إعداد تأكيد البريد مفعّلًا في خدمة الحساب، أو تعذر إصدار جلسة. يُرجى التواصل مع إدارة نَحْنُ.":"You were not signed in automatically. Email confirmation may still be enabled, or the account service did not issue a session. Contact NA7N support.","تعذر تسجيل الخروج من الحساب الحالي. حاول مجددًا.":"Could not sign out of the current account. Try again.","تعذر تسجيل الخروج. حاول مجددًا.":"Could not sign out. Try again."};
  const L=ar=>accountEnglish?(accountTranslations[ar]??ar):ar;
  const $ = id => document.getElementById(id);
  // Password visibility works even when the Supabase library cannot load.
  const passwordToggles = [...document.querySelectorAll(".password-toggle")];
  function setPasswordVisibility(toggle, show) {
    const field = $(toggle.dataset.target);
    if (!field) return;
    field.type = show ? "text" : "password";
    toggle.textContent = show ? L("إخفاء") : L("إظهار");
    toggle.setAttribute("aria-pressed", String(show));
    toggle.setAttribute("aria-label", (show ? L("إخفاء ") : L("إظهار ")) + toggle.dataset.label);
  }
  passwordToggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      const field = $(toggle.dataset.target);
      if (field) setPasswordVisibility(toggle, field.type === "password");
    });
  });
  const s = window.na7nSupabase;
  if (!s) {
    $("msg").textContent = (accountEnglish ? L("تعذر تحميل خدمة الحساب.") : (window.na7nAuthError || L("تعذر تحميل خدمة الحساب.")));
    $("login").disabled = $("signup").disabled = true;
    return;
  }
  let trendChart, trendRows = [], busy = false, stateVersion = 0;
  const metricNames = {
    fatigue_impact: L("تأثير التعب"), sleep_impact: L("تأثير النوم"),
    daily_activity_impact: L("تأثير الصحة على النشاط اليومي"), quality_of_life: L("جودة الحياة")
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
      if (profileError) $("dashboard-msg").textContent = L("تم تسجيل الدخول، لكن تعذر حفظ الملف الشخصي. يمكنك إعادة تحميل الصفحة والمحاولة لاحقًا.");
      if ($("login-password")) $("login-password").value = "";
      $("signed-in-as").textContent = L("تم تسجيل الدخول: ") + user.email;
      $("dashboard").classList.remove("hidden");
      const { data, error: loadError } = await s.from("na7n_responses")
        .select("metric_key,value,created_at,assessment_id")
        .eq("user_id", user.id).order("created_at").order("id");
      if (version !== stateVersion) return;
      if (loadError) {
        $("dashboard-msg").textContent = L("تعذر تحميل المتابعات. أعد تحميل الصفحة للمحاولة مجددًا.");
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
        const change = delta === null ? L("أول قراءة") : delta === 0 ? L("لا تغيير عن السابقة") :
          (delta > 0 ? "+" : "") + delta.toFixed(1) + L(" عن السابقة");
        return '<article class="summary-card"><strong>' + name + '</strong><span class="summary-value">' +
          last.toFixed(1) + '/10</span><span class="summary-change">' + change + '</span></article>';
      }).join("");
      if (trendRows.length) renderTrend("fatigue_impact");
    } catch {
      if (version === stateVersion) $("msg").textContent = L("تعذر الاتصال بخدمة الحساب. حاول مجددًا.");
    }
  }
  function renderTrend(key) {
    document.querySelectorAll(".trend-filter").forEach(button => button.classList.toggle("active", button.dataset.key === key));
    const rows = trendRows.filter(row => row.metric_key === key);
    const values = rows.map(row => Number(row.value));
    trendChart?.destroy();
    if (!window.Chart) {
      $("trend-context").textContent = L("تعذر تحميل الرسم البياني. نتائجك معروضة أعلاه.");
      return;
    }
    trendChart = new Chart($("trend"), {
      type: "line",
      data: { labels: rows.map(row => new Intl.DateTimeFormat(accountEnglish?"en-US":"ar-AE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(row.created_at))),
        datasets: [{ label: metricNames[key], data: values, tension: .25, pointRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        scales: { y: { min: 0, max: 10, ticks: { stepSize: 2 } } }, plugins: { legend: { display: false } } }
    });
    $("trend-context").textContent = !values.length ? L("لا توجد قراءة محفوظة لهذا المحور.") : values.length === 1 ?
      L("هذه أول قراءة محفوظة لهذا المحور.") : L("آخر قراءة ") + values.at(-1).toFixed(1) + L("/10، والقراءة السابقة ") +
      values.at(-2).toFixed(1) + L("/10. التغير الرقمي وحده لا يحدد تحسن أو نشاط المرض.");
  }
  function authError(error) {
    const messages = {
      user_already_exists: L("هذا البريد مسجّل بالفعل. استخدم تسجيل الدخول بكلمة مرور حسابك الحالي."),
      invalid_credentials: L("البريد الإلكتروني أو كلمة المرور غير صحيحة."),
      email_not_confirmed: L("هذا الحساب لا يزال يتطلب تأكيد البريد وفق إعدادات خدمة الحساب. يُرجى التواصل مع إدارة نَحْنُ."),
      anonymous_provider_disabled: L("تعذر إرسال بيانات التسجيل بصورة صحيحة. أعد تحميل الصفحة ثم حاول مجددًا."),
      signup_disabled: L("إنشاء الحسابات غير متاح حاليًا."),
      weak_password: L("اختر كلمة مرور أقوى وحاول مجددًا.")
    };
    // Do not expose database details or echo submitted credentials in UI/logs.
    return messages[error?.code] || L("تعذر إكمال الطلب. تحقق من اتصالك وبياناتك وحاول مجددًا.");
  }
  function showAuthPanel(mode) {
    const signup = mode === "signup";
    $("login-panel").classList.toggle("hidden", signup);
    $("signup-panel").classList.toggle("hidden", !signup);
    $("show-login").classList.toggle("primary", !signup);
    $("show-login").classList.toggle("secondary", signup);
    $("show-signup").classList.toggle("primary", signup);
    $("show-signup").classList.toggle("secondary", !signup);
    passwordToggles.forEach(toggle => setPasswordVisibility(toggle, false));
    $("msg").textContent = "";
  }
  async function login() {
    if (busy) return;
    const email=$("login-email").value.trim(), password=$("login-password").value;
    if(!email||!$("login-email").checkValidity()){ $("msg").textContent=L("أدخل بريدًا إلكترونيًا صحيحًا."); $("login-email").focus(); return; }
    if(!password){ $("msg").textContent=L("أدخل كلمة المرور."); $("login-password").focus(); return; }
    busy=true; $("login").disabled=true; $("msg").textContent=L("جارٍ تسجيل الدخول…");
    try{ const result=await s.auth.signInWithPassword({email,password}); if(result.error){$("msg").textContent=authError(result.error);return;} $("login-password").value=""; await state(); }
    catch{$("msg").textContent=L("تعذر الاتصال بخدمة الحساب. حاول مجددًا.")} finally{busy=false;$("login").disabled=false}
  }
  async function signup() {
    if (busy) return;
    const name=$("signup-name").value.trim(),email=$("signup-email").value.trim(),phone=$("signup-phone").value.trim(),password=$("signup-password").value,password2=$("signup-password2").value;
    if(name.length<2){$("msg").textContent=L("أدخل اسمك أولًا."); $("signup-name").focus();return}
    if(!email||!$("signup-email").checkValidity()){$("msg").textContent=L("أدخل بريدًا إلكترونيًا صحيحًا."); $("signup-email").focus();return}
    const phoneDigits=phone.replace(/\D/g,"");
    if(!/^\+?[0-9\s().-]+$/.test(phone) || phoneDigits.length<7 || phoneDigits.length>15){$("msg").textContent=L("أدخل رقم هاتف صحيحًا (من 7 إلى 15 رقمًا)."); $("signup-phone").focus();return}
    if(password.length<8){$("msg").textContent=L("اختر كلمة مرور من 8 أحرف على الأقل."); $("signup-password").focus();return}
    if(password!==password2){$("msg").textContent=L("كلمتا المرور غير متطابقتين."); $("signup-password2").focus();return}
    if(!$("signup-consent").checked){$("msg").textContent=L("نحتاج موافقتك على إنشاء الحساب وحفظ المتابعة.");return}
    busy=true;$("signup").disabled=true;$("msg").textContent=L("جارٍ إنشاء الحساب…");
    try{
      const metadata={full_name:name, phone};
      const result=await s.auth.signUp({email,password,options:{data:metadata}});
      if(result.error){$("msg").textContent=authError(result.error);return}
      $("signup-password").value=$("signup-password2").value="";
      if (result.data?.session) {
        await state(); // Immediate dashboard when Supabase Auth has email confirmation disabled.
      } else {
        // Never claim instant activation when the backend did not issue a session.
        showAuthPanel("login");
        $("login-email").value = email;
        $("msg").textContent = L("لم يتم تسجيل الدخول تلقائيًا. ما زال إعداد تأكيد البريد مفعّلًا في خدمة الحساب، أو تعذر إصدار جلسة. يُرجى التواصل مع إدارة نَحْنُ.");
      }
    }catch{$("msg").textContent=L("تعذر الاتصال بخدمة الحساب. حاول مجددًا.")}finally{busy=false;$("signup").disabled=false}
  }
  $("trend-controls").innerHTML = Object.entries(metricNames).map(([key, name]) =>
    '<button type="button" class="trend-filter" data-key="' + key + '">' + name + '</button>').join("");
  $("trend-controls").addEventListener("click", event => {
    const button = event.target.closest(".trend-filter");
    if (button && trendRows.length) renderTrend(button.dataset.key);
  });
  $("show-login").addEventListener("click",()=>showAuthPanel("login"));
  $("show-signup").addEventListener("click",()=>showAuthPanel("signup"));
  $("login").addEventListener("click",login);
  $("signup").addEventListener("click",signup);
  $("login-password").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();login()}});
  $("new-account").addEventListener("click",async()=>{
    $("new-account").disabled = true;
    try {
      const { error } = await s.auth.signOut({scope:"local"});
      if (error) { $("dashboard-msg").textContent = L("تعذر تسجيل الخروج من الحساب الحالي. حاول مجددًا."); return; }
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
      if (error) { $("dashboard-msg").textContent = L("تعذر تسجيل الخروج. حاول مجددًا."); return; }
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
