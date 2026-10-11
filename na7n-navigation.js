/* NA7N public navigation - Arabic first, progressive enhancement, no health data storage. */
(() => {
  "use strict";
  const lang = document.documentElement.lang === "en" ? "en" : "ar";
  const en = lang === "en";
  const home = en ? "index-en.html" : "index.html";
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const slug = file.replace(/-en\.html$|\.html$/g, "");
  const isHome = file === "index.html" || file === "index-en.html" || file === "";
  const labels = {
    "about-lupus": ["افهم الذئبة", "Understand lupus"],
    "newly-diagnosed": ["شُخِّصت حديثًا", "Newly diagnosed"],
    symptoms: ["الأعراض والتغيرات الصحية", "Symptoms and changes"],
    treatment: ["فهم العلاج", "Understanding treatment"],
    appointment: ["الاستعداد للموعد", "Prepare for an appointment"],
    living: ["الحياة مع الذئبة", "Living with lupus"],
    pregnancy: ["الحمل والذئبة", "Pregnancy and lupus"],
    "diagnosis-tests": ["الفحوص والتشخيص", "Diagnosis and tests"],
    kidneys: ["الكلى والذئبة", "Kidneys and lupus"],
    "skin-sun": ["الشمس والجلد", "Sun and skin"],
    fatigue: ["التعب والإرهاق", "Fatigue"],
    faq: ["الأسئلة الشائعة", "Frequently asked questions"],
    articles: ["اسأل وتعلّم", "Questions and learning"],
    stories: ["قصص وتجارب المرضى", "Patient stories"],
    tools: ["أدوات المريض", "Patient tools"],
    assessment: ["متابعة صحتك", "Track your health"],
    about: ["عن نَحْنُ", "About NA7N"]
  };
  const t = (ar, english) => en ? english : ar;
  const page = labels[slug] ? labels[slug][en ? 1 : 0] : document.title.split("|")[0].trim();
  const local = (name) => name + (en ? "-en.html" : ".html");
  const targets = [
    [t("الرئيسية", "Home"), home + "#needs", "home"],
    [t("المواضيع", "Topics"), home + "#topics", "topics"],
    [t("الأدوات", "Tools"), home + "#tools", "tools"]
  ];
  const createLink = (label, href, className) => {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (className) a.className = className;
    return a;
  };

  // Standard header on every public page. The original HTML is still a no-JS fallback.
  const header = document.querySelector("header.site-header");
  if (header) {
    const links = [
      [t("الرئيسية", "Home"), home, isHome],
      [t("افهم الذئبة", "Understand lupus"), local("about-lupus"), slug === "about-lupus"],
      [t("العلاج", "Treatment"), local("treatment"), slug === "treatment"],
      [t("الحياة اليومية", "Everyday life"), local("living"), slug === "living"],
      [t("الأدوات", "Tools"), local("tools"), slug === "tools"],
      [t("قصصنا", "Stories"), local("stories"), slug === "stories"],
      [t("عن نحن", "About"), local("about"), slug === "about"]
    ];
    header.classList.add("na7n-standard-header");
    const shell = document.createElement("div");
    shell.className = "na7n-header-brand";
    const brand = createLink("", home, "na7n-header-logo");
    brand.setAttribute("aria-label", t("نحن، الصفحة الرئيسية", "NA7N home"));
    const image = document.createElement("img");
    image.src = "na7n-logo-mark.svg";
    image.alt = "";
    image.width = 42;
    image.height = 42;
    brand.append(image);
    const name = document.createElement("span");
    name.textContent = t("نَحْنُ | الذئبة", "NA7N | Lupus");
    brand.append(name);
    shell.append(brand);
    const siblingFile = slug + (en ? ".html" : "-en.html");
    const cross = slug === "fatigue" ? "living-en.html" : (isHome ? (en ? "index.html" : "index-en.html") : siblingFile);
    const switcher = createLink(en ? "العربية" : "English", cross, "na7n-lang-switch");
    switcher.lang = en ? "ar" : "en";
    switcher.dir = en ? "rtl" : "ltr";
    switcher.setAttribute("aria-label", en ? "العربية" : "Switch to English");
    shell.append(switcher);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "na7n-menu-toggle";
    toggle.setAttribute("aria-controls", "na7n-global-menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", t("فتح قائمة التنقل", "Open navigation menu"));
    toggle.textContent = "☰";
    const menu = document.createElement("nav");
    menu.id = "na7n-global-menu";
    menu.className = "na7n-global-menu";
    menu.setAttribute("aria-label", t("القائمة الرئيسية", "Main navigation"));
    links.forEach(([title, href, current]) => {
      const a = createLink(title, href);
      if (current) { a.setAttribute("aria-current", "page"); a.classList.add("active"); }
      menu.append(a);
    });
    if (!en && document.querySelector('.site-header a[href="account.html"]')) {
      menu.append(createLink(t("حسابي", "My account"), "account.html", "account-link"));
    }
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? t("فتح قائمة التنقل", "Open navigation menu") : t("إغلاق قائمة التنقل", "Close navigation menu"));
      toggle.textContent = open ? "☰" : "×";
      menu.classList.toggle("open", !open);
    });
    menu.addEventListener("click", event => {
      if (event.target.closest("a")) {
        toggle.setAttribute("aria-expanded", "false");
        menu.classList.remove("open");
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.click();
        toggle.focus();
      }
    });
    header.replaceChildren(shell, toggle, menu);
  }

  // Breadcrumb is a stable location cue even on a page opened from an external link.
  const main = document.querySelector("main");
  if (main && !isHome) {
    const crumb = document.createElement("nav");
    crumb.className = "na7n-breadcrumb";
    crumb.setAttribute("aria-label", t("مسار التصفح", "Breadcrumb"));
    crumb.append(createLink(t("الرئيسية", "Home"), home + "#needs"));
    const sep = document.createElement("span");
    sep.textContent = "‹";
    sep.setAttribute("aria-hidden", "true");
    crumb.append(sep);
    const current = document.createElement("span");
    current.textContent = page;
    current.setAttribute("aria-current", "page");
    crumb.append(current);
    main.before(crumb);

    // Suggestions are navigational, not medical recommendations or individualized advice.
    const related = {
      "newly-diagnosed": ["about-lupus", "appointment"],
      "about-lupus": ["treatment", "symptoms"],
      treatment: ["appointment", "tools"],
      symptoms: ["appointment", "tools"],
      appointment: ["tools", "treatment"],
      living: ["fatigue", "tools"],
      fatigue: ["living", "appointment"],
      pregnancy: ["appointment", "treatment"],
      "diagnosis-tests": ["about-lupus", "appointment"],
      kidneys: ["appointment", "treatment"],
      "skin-sun": ["living", "appointment"],
      stories: ["living", "about-lupus"],
      tools: ["appointment", "assessment"],
      assessment: ["appointment", "tools"],
      articles: ["faq", "about-lupus"],
      faq: ["about-lupus", "appointment"],
      about: ["about-lupus", "stories"]
    };
    const section = document.createElement("section");
    section.className = "na7n-context";
    section.setAttribute("aria-label", t("خيارات المتابعة", "Continue exploring"));
    const heading = document.createElement("h2");
    heading.textContent = t("إلى أين بعد ذلك؟", "Where next?");
    section.append(heading);
    const p = document.createElement("p");
    p.textContent = t("اختر ما يناسبك، أو ارجع إلى جميع الخيارات. لا يوجد ترتيب إلزامي للتصفح.", "Choose what matters to you, or return to all options. There is no required reading order.");
    section.append(p);
    const actions = document.createElement("div");
    actions.className = "na7n-context-actions";
    actions.append(createLink(t("العودة إلى احتياجاتي", "Back to my options"), home + "#needs", "na7n-return-link"));
    (related[slug] || ["about-lupus", "tools"]).filter(k => !en || k !== "fatigue").forEach(k => {
      if (labels[k]) actions.append(createLink(labels[k][en ? 1 : 0], local(k)));
    });
    section.append(actions);

    // Optional four-step route, enabled on the starting page or by an explicit URL parameter.
    const steps = ["newly-diagnosed", "about-lupus", "treatment", "appointment"];
    const stepIndex = steps.indexOf(slug);
    const inJourney = stepIndex === 0 || (stepIndex >= 0 && new URLSearchParams(location.search).get("journey") === "start");
    if (inJourney) {
      const route = document.createElement("nav");
      route.className = "na7n-guided-path";
      route.setAttribute("aria-label", t("مسار تعليمي اختياري", "Optional learning path"));
      const label = document.createElement("p");
      label.className = "na7n-guided-label";
      label.textContent = t("مسار تعليمي اختياري", "Optional learning path") + " · " + t("الخطوة ", "Step ") + (stepIndex + 1) + t(" من 4", " of 4");
      route.append(label);
      const meter = document.createElement("div");
      meter.className = "na7n-guided-meter";
      meter.setAttribute("role", "progressbar");
      meter.setAttribute("aria-label", t("تقدم المسار", "Path progress"));
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", "4");
      meter.setAttribute("aria-valuenow", String(stepIndex + 1));
      for (let i = 0; i < 4; i++) { const bar = document.createElement("span"); if (i <= stepIndex) bar.className = "complete"; meter.append(bar); }
      route.append(meter);
      const nav = document.createElement("div");
      nav.className = "na7n-path-actions";
      if (stepIndex > 0) nav.append(createLink(t("الخطوة السابقة", "Previous step"), local(steps[stepIndex - 1]) + "?journey=start"));
      if (stepIndex < 3) nav.append(createLink(t("الخطوة التالية", "Next step") + ": " + labels[steps[stepIndex + 1]][en ? 1 : 0], local(steps[stepIndex + 1]) + "?journey=start", "na7n-path-next"));
      else nav.append(createLink(t("استكشف الخيارات الأخرى", "Explore other options"), home + "#needs", "na7n-path-next"));
      route.append(nav);
      section.prepend(route);
    }
    main.append(section);
  }

  // Always-available mobile hub; no account, tracking or local storage required.
  const bottom = document.createElement("nav");
  bottom.className = "na7n-bottom-nav";
  bottom.setAttribute("aria-label", t("التنقل السريع", "Quick navigation"));
  const icon = {home:"⌂",topics:"☰",tools:"▤"};
  for (const [label, href, key] of targets) {
    const a = createLink("", href);
    const symbol = document.createElement("span");
    symbol.className = "na7n-bottom-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = icon[key];
    const txt = document.createElement("span");
    txt.textContent = label;
    a.append(symbol, txt);
    if ((key === "home" && isHome && !location.hash) || (key === "topics" && location.hash === "#topics") || (key === "tools" && slug === "tools")) {
      a.setAttribute("aria-current", "page");
    }
    bottom.append(a);
  }
  document.body.append(bottom);
})();
