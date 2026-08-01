/* ACCESSIA Pro — Canvas "Mon copilote IA", local et sans stockage */
"use strict";

(function () {
  const form = document.getElementById("copilot-canvas-form");
  if (!form) return;

  const result = document.getElementById("copilot-canvas-result");
  const summary = document.getElementById("copilot-canvas-summary");
  const exportButton = document.getElementById("copilot-canvas-export");
  const status = document.getElementById("copilot-canvas-status");
  let currentCanvas = null;

  const labels = Object.freeze({
    problem: "Problème métier",
    users: "Utilisateurs et responsable",
    currentProcess: "Processus actuel",
    dataClass: "Données autorisées",
    humanDecision: "Décision humaine conservée",
    successMetric: "Mesure de réussite",
    stopRule: "Critère d’arrêt",
  });

  function clean(value, maximum = 600) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
  }

  function readCanvas() {
    const data = new FormData(form);
    return {
      version: "1.0",
      generatedAt: new Date().toISOString(),
      localOnly: true,
      problem: clean(data.get("problem")),
      users: clean(data.get("users")),
      currentProcess: clean(data.get("currentProcess")),
      dataClass: clean(data.get("dataClass"), 120),
      humanDecision: clean(data.get("humanDecision")),
      successMetric: clean(data.get("successMetric")),
      stopRule: clean(data.get("stopRule")),
      disclaimer:
        "Canvas pédagogique : à faire valider par les responsables métier, données, sécurité et juridique compétents.",
    };
  }

  function render(canvas) {
    summary.replaceChildren();
    for (const [key, label] of Object.entries(labels)) {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const value = document.createElement("dd");
      term.textContent = label;
      value.textContent = canvas[key];
      item.append(term, value);
      summary.appendChild(item);
    }
    result.hidden = false;
    exportButton.disabled = false;
    result.focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    currentCanvas = readCanvas();
    render(currentCanvas);
    status.textContent =
      "Canvas généré localement. Vérifiez-le avec les responsables concernés avant tout projet.";
  });

  form.addEventListener("reset", function () {
    currentCanvas = null;
    result.hidden = true;
    exportButton.disabled = true;
    summary.replaceChildren();
    status.textContent = "Aucune donnée n’est conservée après réinitialisation ou fermeture de la page.";
  });

  exportButton.addEventListener("click", function () {
    if (!currentCanvas) return;
    const blob = new Blob([`${JSON.stringify(currentCanvas, null, 2)}\n`], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "canvas-mon-copilote-ia.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    status.textContent = "Canvas exporté en JSON. Le fichier reste sous votre contrôle.";
  });
})();
