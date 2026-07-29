/* ACCESSIA Pro — autodiagnostic local, sans stockage ni transmission */
"use strict";

(function () {
  const form = document.getElementById("maturity-form");

  if (!form) {
    return;
  }

  const result = document.getElementById("maturity-result");
  const scoreNode = document.getElementById("maturity-score");
  const levelNode = document.getElementById("maturity-level");
  const actionNode = document.getElementById("maturity-action");

  function interpret(score) {
    if (score <= 6) {
      return {
        level: "Explorer avant d’outiller",
        action:
          "Commencez par formuler un problème précis, mesurer la situation actuelle et identifier les données réellement nécessaires.",
      };
    }

    if (score <= 13) {
      return {
        level: "Cadrer les risques et la mesure",
        action:
          "Le besoin paraît assez défini pour préparer un protocole, mais les données, contrôles, utilisateurs ou critères d’arrêt doivent encore être consolidés.",
      };
    }

    return {
      level: "Préparer un test limité",
      action:
        "Les prérequis déclarés permettent d’envisager un test réversible. Vérifiez toutefois chaque exigence juridique, de sécurité et de contrôle humain avant de commencer.",
    };
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = new FormData(form);
    let score = 0;

    for (let index = 1; index <= 10; index += 1) {
      score += Number.parseInt(data.get(`q${index}`) ?? "0", 10);
    }

    const interpretation = interpret(score);
    scoreNode.textContent = String(score);
    levelNode.textContent = interpretation.level;
    actionNode.textContent = interpretation.action;
    result.hidden = false;
    result.focus();

    if (window.ACCESSIAMeasurement) {
      const bucket = score <= 6 ? "0-6" : score <= 13 ? "7-13" : "14-20";
      window.ACCESSIAMeasurement.track("maturity_assessment_submit", {
        bucketed_value: bucket,
      });
    }
  });
})();
