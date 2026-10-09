(() => {
  const form = document.getElementById("checkin-form"), msg = document.getElementById("checkin-msg");
  const button = form.querySelector('button[type="submit"]');
  let saving = false, saved = false;
  document.getElementById("checkin-date").textContent = "تاريخ المتابعة: " + new Intl.DateTimeFormat("ar-AE", {
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
    msg.textContent = "جارٍ حفظ المتابعة…";
    try {
      const s = window.na7nSupabase;
      if (!s) { msg.textContent = window.na7nAuthError; return; }
      const { data: { user }, error } = await s.auth.getUser();
      if (error || !user) { msg.textContent = "سجّل الدخول أولًا حتى نحفظ المتابعة في حسابك."; return; }
      const vals = [...new FormData(form).entries()].map(([metric_key, value]) => ({ metric_key, value: Number(value) }));
      if (vals.length !== 4 || vals.some(row => !Number.isFinite(row.value) || row.value < 0 || row.value > 10)) {
        msg.textContent = "تحقق من إجابات المتابعة وحاول مجددًا."; return;
      }
      const { data: assessment, error: createError } = await s.from("na7n_assessments").insert({
        user_id: user.id, assessment_key: "na7n-health-checkin", language: "ar",
        overall_score: vals.reduce((sum, row) => sum + row.value, 0) / vals.length
      }).select("id").single();
      if (createError) { msg.textContent = "تعذر حفظ المتابعة. حاول مرة أخرى."; return; }
      const { error: responseError } = await s.from("na7n_responses").insert(vals.map(row => ({
        ...row, assessment_id: assessment.id, user_id: user.id
      })));
      if (responseError) {
        const { error: cleanupError } = await s.from("na7n_assessments").delete().eq("id", assessment.id).eq("user_id", user.id);
        msg.textContent = cleanupError ? "تعذر إكمال المتابعة. قد توجد زيارة دون إجابات؛ أعد تحميل الصفحة قبل المحاولة." :
          "تعذر حفظ الإجابات. لم تُحفظ هذه المتابعة، حاول مرة أخرى.";
        return;
      }
      saved = true;
      msg.textContent = "";
      document.getElementById("save-success").hidden = false;
      form.querySelectorAll("input").forEach(input => { input.disabled = true; });
    } catch {
      msg.textContent = "تعذر التأكد من اكتمال الحفظ. راجع متابعتك قبل إعادة المحاولة.";
    } finally {
      saving = false;
      button.disabled = saved;
    }
  });
})();
