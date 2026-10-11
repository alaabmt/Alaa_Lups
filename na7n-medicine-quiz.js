/* NA7N interactive medicine understanding checks: client-side only; no storage or tracking. */
(() => {
  "use strict";
  document.querySelectorAll(".med-quiz[data-correct]").forEach(quiz => {
    const options = quiz.querySelectorAll('input[type="radio"]');
    const feedback = quiz.querySelector(".med-quiz-result");
    if (!options.length || !feedback) return;

    function showFeedback() {
      const choice = quiz.querySelector('input[type="radio"]:checked');
      if (!choice) return;
      const isCorrect = choice.value === quiz.dataset.correct;
      feedback.textContent = isCorrect
        ? quiz.dataset.correctFeedback
        : quiz.dataset.incorrectFeedback;
      feedback.classList.toggle("is-correct", isCorrect);
      feedback.classList.toggle("is-incorrect", !isCorrect);
      feedback.hidden = false;

      options.forEach(option => {
        const wrapper = option.closest(".med-quiz-option");
        if (wrapper) wrapper.classList.toggle("is-selected", option.checked);
      });
    }

    options.forEach(option => option.addEventListener("change", showFeedback));
  });
})();
