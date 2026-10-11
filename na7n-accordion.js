/* Accessible deep links to native <details> sections; no data collection. */
(() => {
  "use strict";
  const area=document.querySelector(".na7n-newly");
  if (!area) return;
  function revealHash() {
    const hash=window.location.hash.slice(1);
    if (!hash) return;
    let target;
    try { target=document.getElementById(decodeURIComponent(hash)); } catch (_) { return; }
    if (!target || !area.contains(target)) return;
    const panel=target.matches("details.na7n-topic")?target:target.closest("details.na7n-topic");
    if (panel) panel.open=true;
  }
  for (const link of area.querySelectorAll('a[href^="#"]')) {
    link.addEventListener("click", () => {
      const id=link.hash.slice(1);
      const target=id&&document.getElementById(id);
      const panel=target&&(target.matches("details.na7n-topic")?target:target.closest("details.na7n-topic"));
      if(panel)panel.open=true;
    });
  }
  window.addEventListener("hashchange",revealHash);
  revealHash();
})();
