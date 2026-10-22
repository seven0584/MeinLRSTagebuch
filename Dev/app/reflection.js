/* Optional reflection prompts; independent of spelling and tutor providers. */
(function () {
  "use strict";

  const questions = Object.freeze([
    { key: "best", label: "Was war heute schön?", icon: "⭐" },
    { key: "feeling", label: "Wie fühlst du dich gerade?", icon: "💭" },
    { key: "tomorrow", label: "Was wünschst du dir für morgen?", icon: "🌱" },
    { key: "difficult", label: "Was war heute schwierig?", icon: "🌧️", optional: true },
    { key: "learned", label: "Das habe ich heute gelernt", icon: "💡", legacy: true }
  ].map(Object.freeze));

  window.TB_REFLECTION = Object.freeze({
    questions,
    activeQuestions: Object.freeze(questions.filter(question => !question.legacy)),
    labels: Object.freeze(Object.fromEntries(questions.map(question => [question.key, question.label])))
  });

  function mount() {
    const container = document.querySelector(".questions");
    if (!container || container.dataset.reflectionReady) return;
    container.dataset.reflectionReady = "true";
    container.classList.add("reflection");

    // Keep the original fields so saved answers and existing event handling survive.
    const fields = new Map(Array.from(container.querySelectorAll("textarea.qa"), field => [field.dataset.q, field]));
    const heading = document.createElement("h3");
    heading.className = "reflection-heading";
    heading.textContent = "Dein Tagesrückblick";
    const introduction = document.createElement("p");
    introduction.className = "note reflection-intro";
    introduction.textContent = "Nur wenn du möchtest. Ein Wort oder Emoji reicht. Du darfst jede Frage auslassen – auch an einem blöden Tag.";
    container.replaceChildren(heading, introduction);

    for (const question of questions) {
      const label = document.createElement("label");
      label.className = "q reflection-question";
      const caption = document.createElement("span");
      caption.textContent = `${question.icon} ${question.label}`;
      const field = fields.get(question.key) || document.createElement("textarea");
      field.className = "lined qa";
      field.dataset.q = question.key;
      field.rows = 2;
      field.placeholder = "Ein Wort, ein Emoji oder mehr …";
      field.spellcheck = false;
      field.autocomplete = "off";
      field.setAttribute("autocorrect", "off");
      field.setAttribute("autocapitalize", "off");
      field.setAttribute("data-gramm", "false");
      label.append(caption, field);
      if (question.optional || question.legacy) {
        const details = document.createElement("details");
        details.className = "reflection-extra";
        if (question.legacy) details.dataset.reflectionLegacy = "true";
        const summary = document.createElement("summary");
        summary.textContent = question.legacy ? "Noch eine Frage: etwas gelernt?" : "Gab es auch etwas Schwieriges?";
        details.append(summary, label);
        container.append(details);
      } else {
        container.append(label);
      }
    }

  }

  if (document.querySelector(".questions")) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
}());
