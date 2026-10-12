(() => {
  const form = document.getElementById("checkin-form"), msg = document.getElementById("checkin-msg");
  const button = form.querySelector('button[type="submit"]');
  const en = document.documentElement.lang === "en";
  const t = (ar, english) => en ? english : ar;
  let saving = false, saved = false;
  document.getElementById("checkin-date").textContent = t("تاريخ المتابعة: ", "Check-in date: ") + new Intl.DateTimeFormat(en ? "en-AE" : "ar-AE", {
    day: "numeric", month: "long", year: "numeric"
  }).format(new Date());
  form.querySelectorAll('input[type="range"]').forEach(input => {
    const output = form.querySelector('output[for="' + input.id + '"]');
    input.addEventListener("input", () => { output.textContent = input.value; });
    output.textContent = input.value;
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (saving || saved) return;
    saving = true;
    button.disabled = true;
    msg.textContent = t("جارٍ حفظ المتابعة…", "Saving check-in…");
    try {
      const s = window.na7nSupabase;
      if (!s) { msg.textContent = t(window.na7nAuthError || "تعذر الاتصال بالحساب.", "Account service unavailable. Try again later."); return; }
      const { data: { user }, error } = await s.auth.getUser();
      if (error || !user) { msg.textContent = t("سجّل الدخول أولًا حتى نحفظ المتابعة في حسابك.", "Please sign in before saving your check-in to your account."); return; }
      const vals = [...new FormData(form).entries()].map(([metric_key, value]) => ({ metric_key, value: Number(value) }));
      if (vals.length !== 4 || vals.some(row => !Number.isFinite(row.value) || row.value < 0 || row.value > 10)) {
        msg.textContent = t("تحقق من إجابات المتابعة وحاول مجددًا.", "Check your answers and try again."); return;
      }
      const { data: assessment, error: createError } = await s.from("na7n_assessments").insert({
        user_id: user.id, assessment_key: "na7n-health-checkin", language: en ? "en" : "ar",
        overall_score: vals.reduce((sum, row) => sum + row.value, 0) / vals.length
      }).select("id").single();
      if (createError) { msg.textContent = t("تعذر حفظ المتابعة. حاول مرة أخرى.", "Unable to save your check-in. Please try again."); return; }
      const { error: responseError } = await s.from("na7n_responses").insert(vals.map(row => ({
        ...row, assessment_id: assessment.id, user_id: user.id
      })));
      if (responseError) {
        const { error: cleanupError } = await s.from("na7n_assessments").delete().eq("id", assessment.id).eq("user_id", user.id);
        msg.textContent = cleanupError ? t("تعذر إكمال المتابعة. قد توجد زيارة دون إجابات؛ أعد تحميل الصفحة قبل المحاولة.", "Check-in incomplete. An empty assessment may remain; refresh before trying again.") :
          t("تعذر حفظ الإجابات. لم تُحفظ هذه المتابعة، حاول مرة أخرى.", "Answers could not be saved; this check-in was not saved. Please try again.");
        return;
      }
      saved = true;
      msg.textContent = "";
      document.getElementById("save-success").hidden = false;
      form.querySelectorAll("input").forEach(input => { input.disabled = true; });
    } catch {
      msg.textContent = t("تعذر التأكد من اكتمال الحفظ. راجع متابعتك قبل إعادة المحاولة.", "Unable to verify the save. Check your account history before trying again.");
    } finally {
      saving = false;
      button.disabled = saved;
    }
  });
})();
