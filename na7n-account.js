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
  async function state() {
    const version = ++stateVersion;
    clearDashboard();
    $("dashboard").classList.add("hidden");
    try {
      const { data: { user }, error } = await s.auth.getUser();
      if (version !== stateVersion) return;
      $("auth").classList.toggle("hidden", !!user && !error);
      if (!user || error) return;
      $("password").value = "";
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
  async function authenticate(mode) {
    if (busy) return;
    const email = $("email").value.trim(), password = $("password").value;
    $("email").value = email;
    if (!email) {
      $("msg").textContent = "يرجى إدخال البريد الإلكتروني أولًا.";
      $("email").focus();
      return;
    }
    if (!$("email").checkValidity()) {
      $("msg").textContent = "يرجى إدخال بريد إلكتروني صحيح.";
      $("email").focus();
      return;
    }
    if (!password) {
      $("msg").textContent = "يرجى إدخال كلمة المرور أولًا.";
      $("password").focus();
      return;
    }
    if (!$("password").checkValidity()) {
      $("msg").textContent = "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.";
      $("password").focus();
      return;
    }
    busy = true;
    $("login").disabled = $("signup").disabled = true;
    $("msg").textContent = mode === "signup" ? "جارٍ إنشاء الحساب…" : "جارٍ تسجيل الدخول…";
    try {
      let result;
      if (mode === "signup") {
        // Compatibility only: the existing shared trigger requires a 3–30 character username.
        // This is not a login identifier or an authorization claim. Do not derive it from email.
        const bytes = crypto.getRandomValues(new Uint8Array(12));
        const username = "na7n_" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
        result = await s.auth.signUp({ email, password, options: { data: { username } } });
      } else {
        result = await s.auth.signInWithPassword({ email, password });
      }
      if (result.error) {
        $("msg").textContent = authError(result.error);
        return;
      }
      $("password").value = "";
      const needsConfirmation = mode === "signup" && !result.data?.session;
      await state();
      $("msg").textContent = needsConfirmation ?
        "تم استلام طلب إنشاء الحساب. تحقق من بريدك الإلكتروني ورسائل البريد غير المرغوب فيه لتأكيده، ثم سجّل الدخول." :
        mode === "signup" ? "تم إنشاء الحساب وتسجيل الدخول بنجاح." : "تم تسجيل الدخول بنجاح.";
    } catch {
      $("msg").textContent = "تعذر الاتصال بخدمة الحساب. حاول مجددًا.";
    } finally {
      busy = false;
      $("login").disabled = $("signup").disabled = false;
    }
  }
  $("trend-controls").innerHTML = Object.entries(metricNames).map(([key, name]) =>
    '<button type="button" class="trend-filter" data-key="' + key + '">' + name + '</button>').join("");
  $("trend-controls").addEventListener("click", event => {
    const button = event.target.closest(".trend-filter");
    if (button && trendRows.length) renderTrend(button.dataset.key);
  });
  $("login").addEventListener("click", () => authenticate("login"));
  $("signup").addEventListener("click", () => authenticate("signup"));
  $("password").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); authenticate("login"); }
  });
  $("logout").addEventListener("click", async () => {
    $("logout").disabled = true;
    try {
      const { error } = await s.auth.signOut({ scope: "local" });
      if (error) { $("dashboard-msg").textContent = "تعذر تسجيل الخروج. حاول مجددًا."; return; }
      ++stateVersion;
      clearDashboard();
      $("password").value = $("msg").textContent = "";
      $("dashboard").classList.add("hidden");
      $("auth").classList.remove("hidden");
    } finally { $("logout").disabled = false; }
  });
  // Schedule outside the Auth lock, including cross-tab logout/session expiry.
  s.auth.onAuthStateChange(() => setTimeout(state, 0));
})();
